import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { CAPTION_KINDS, type CaptionKind } from "@/lib/media/captionKinds";
import { parseMaterialMediaUrl } from "@/lib/admin/materialMedia";
import { askVisionJson, deepSeekConfig, visionModel } from "@/lib/reel/deepseek";

// What each image of the cases and articles shows, written once per file by DeepSeek's vision
// model and kept in content/media-captions/<cases|articles>/<slug>.json (content/ goes up with
// every publish and is not served as a public file). The entry stores the file's SHA-256: a
// changed image is captioned again; a renamed or copied one reuses the caption it already had.
// Other modules read it with getCaption() (fast, never calls the AI) or ensureCaption() (waits
// for the caption when it is missing).

export { CAPTION_KINDS };
export type { CaptionKind };
export type CaptionShape = "larga" | "vertical" | "quadrada";

export type Caption = {
  /** What the image shows, in Portuguese, one or two sentences. */
  description: string;
  kind: CaptionKind;
  /** From the file's own proportions: larga (≥ 1.15:1), vertical (≤ 0.87:1) or quadrada. */
  shape: CaptionShape;
  /** Short alternative text for the site. */
  alt: string;
  width: number;
  height: number;
  /** SHA-256 of the file the caption was written for. */
  hash: string;
  model: string;
  tokens: number;
  at: string;
};

type CaptionFile = Record<string, Caption>;

const PUBLIC = path.join(process.cwd(), "public");
const STORE = path.join(process.cwd(), "content", "media-captions");
const IMAGE = /\.(png|jpe?g|webp|gif|avif|svg)$/i;
/** Long side of the copy sent to the model: enough to read a screen, a fraction of the tokens of the original. */
const SEND_MAX = 1280;
const CONCURRENCY = 3;
/** After a failure, the same file waits this long before another try (no loop of paid calls). */
const RETRY_AFTER = 10 * 60_000;

/** Where an image URL lives and where its caption is kept: a private Material picture keeps it beside the Material, on this Mac. */
function locate(url: string) {
  const material = parseMaterialMediaUrl(url);
  if (material) return IMAGE.test(material.name) ? { folder: "cases", slug: material.slug, name: material.name, file: material.file, store: path.join(path.dirname(path.dirname(material.file)), "captions.json") } : null;
  const m = /^\/(cases|articles)\/(?:([a-z0-9]+(?:-[a-z0-9]+)*)\/)?([^/\0]+)$/.exec(url);
  if (!m || url.includes("..") || !IMAGE.test(m[3])) return null;
  const [, folder, slug = "", name] = m;
  return { folder, slug, name, file: path.join(PUBLIC, folder, slug, name), store: path.join(STORE, folder, `${slug || "_raiz"}.json`) };
}

export const isCaptionable = (url: string) => locate(url) !== null;

export function shapeOf(width: number, height: number): CaptionShape {
  const ratio = width / Math.max(1, height);
  return ratio >= 1.15 ? "larga" : ratio <= 0.87 ? "vertical" : "quadrada";
}

// ---------------------------------------------------------------- state shared by every route

type State = {
  hashes: Map<string, { key: string; hash: string }>;
  inflight: Map<string, Promise<Caption | null>>;
  queue: string[];
  running: number;
  failures: Map<string, { at: number; message: string }>;
  locks: Map<string, Promise<unknown>>;
  lastError?: string;
};
const g = globalThis as typeof globalThis & { __mediaCaptions?: State };
const state: State = (g.__mediaCaptions ??= { hashes: new Map(), inflight: new Map(), queue: [], running: 0, failures: new Map(), locks: new Map() });

/** SHA-256 of the file, remembered while its size and date stay the same. */
async function hashOf(file: string) {
  const st = await stat(file);
  const key = `${st.size}:${st.mtimeMs}`;
  const hit = state.hashes.get(file);
  if (hit?.key === key) return hit.hash;
  const hash = createHash("sha256").update(await readFile(file)).digest("hex");
  state.hashes.set(file, { key, hash });
  return hash;
}

async function readStore(store: string): Promise<CaptionFile> {
  try { return JSON.parse(await readFile(store, "utf8")) as CaptionFile; } catch { return {}; }
}

/** One writer per caption file at a time; the file is replaced whole, never left half-written. */
function withLock<T>(store: string, work: () => Promise<T>): Promise<T> {
  const next = (state.locks.get(store) ?? Promise.resolve()).catch(() => {}).then(work);
  state.locks.set(store, next);
  return next;
}

async function saveEntry(store: string, folderDir: string, name: string, caption: Caption) {
  await withLock(store, async () => {
    const data = await readStore(store);
    data[name] = caption;
    // entries of files that left the folder go with them
    const present = new Set(await readdir(folderDir).catch(() => [] as string[]));
    const sorted = Object.fromEntries(Object.keys(data).filter((n) => present.has(n)).sort().map((n) => [n, data[n]]));
    await mkdir(path.dirname(store), { recursive: true });
    const tmp = `${store}.${process.pid}.tmp`;
    await writeFile(tmp, `${JSON.stringify(sorted, null, 2)}\n`);
    await rename(tmp, store);
  });
}

/** A caption already written for these exact bytes anywhere (a renamed or copied file, a Material picture now in the case). */
async function findByHash(hash: string): Promise<Caption | null> {
  const material = path.join(process.cwd(), ".admin", "material");
  for (const slug of await readdir(material).catch(() => [] as string[])) {
    const hit = Object.values(await readStore(path.join(material, slug, "captions.json"))).find((c) => c.hash === hash);
    if (hit) return hit;
  }
  for (const folder of ["cases", "articles"]) {
    const dir = path.join(STORE, folder);
    for (const name of await readdir(dir).catch(() => [] as string[])) {
      if (!name.endsWith(".json")) continue;
      const hit = Object.values(await readStore(path.join(dir, name))).find((c) => c.hash === hash);
      if (hit) return hit;
    }
  }
  return null;
}

// ---------------------------------------------------------------- reading

/** The caption of an image, only if it was written for the file as it is now. Never calls the AI. */
export async function getCaption(url: string): Promise<Caption | null> {
  const at = locate(url);
  if (!at) return null;
  const entry = (await readStore(at.store))[at.name];
  if (!entry) return null;
  const hash = await hashOf(at.file).catch(() => null);
  return hash === entry.hash ? entry : null;
}

/** Every current caption of one case's (or article's) folder, by public URL. */
export async function captionsFor(folder: "cases" | "articles", slug: string): Promise<Record<string, Caption>> {
  const store = path.join(STORE, folder, `${slug || "_raiz"}.json`);
  const out: Record<string, Caption> = {};
  for (const [name, entry] of Object.entries(await readStore(store))) {
    const url = `/${folder}/${slug ? `${slug}/` : ""}${name}`;
    const hash = await hashOf(path.join(PUBLIC, folder, slug, name)).catch(() => null);
    if (hash === entry.hash) out[url] = entry;
  }
  return out;
}

// ---------------------------------------------------------------- writing

const SYSTEM = `Você descreve imagens do portfólio de um designer de produto (cases de UX/UI e artigos). Olhe a imagem e responda em JSON:
{
 "description": "o que a imagem mostra, em português, 1 ou 2 frases objetivas: o tipo de peça, o produto ou marca quando aparece, e o conteúdo principal (ex.: quais telas, que fluxo, o que se compara). Sem elogios nem adjetivos de marketing.",
 "kind": "tela-app | tela-web | varias-telas | antes-depois | foto | diagrama | logo | ilustracao",
 "alt": "texto alternativo curto para o site, até 120 caracteres, sem começar com 'imagem de'"
}
Como escolher "kind":
- tela-app: uma única tela de aplicativo de celular (ou um celular mostrando uma tela);
- tela-web: uma única tela de site, sistema web ou painel no computador;
- varias-telas: duas ou mais telas lado a lado ou em sequência (fluxo, grade de telas, mockups juntos);
- antes-depois: a mesma tela ou peça em duas versões para comparar (antes e depois, versão antiga e nova);
- foto: fotografia de pessoas, lugares ou objetos (inclui fotos de workshops e de equipe);
- diagrama: fluxograma, jornada, mapa, gráfico, arquitetura de informação, tabela ou esquema;
- logo: só uma marca ou logotipo;
- ilustracao: ilustração, ícone, arte gráfica, capa ou composição que não se encaixa nas outras.`;

/** The copy the model sees: rasterized (SVG, GIF), flattened on white, long side ≤ SEND_MAX. */
async function prepare(file: string) {
  const image = sharp(file, { animated: false, density: file.endsWith(".svg") ? 144 : undefined });
  const meta = await image.metadata();
  const data = await image
    .resize({ width: SEND_MAX, height: SEND_MAX, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 85 })
    .toBuffer();
  return { data, width: meta.width ?? 0, height: meta.pageHeight ?? meta.height ?? 0 };
}

function normalizeKind(value: unknown): CaptionKind {
  const v = String(value ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s_/]+/g, "-");
  if (v in CAPTION_KINDS) return v as CaptionKind;
  if (v.includes("antes")) return "antes-depois";
  if (v.includes("varias") || v.includes("telas")) return "varias-telas";
  if (v.includes("web")) return "tela-web";
  if (v.includes("app") || v.includes("tela")) return "tela-app";
  if (v.includes("diagram")) return "diagrama";
  if (v.includes("foto")) return "foto";
  if (v.includes("logo")) return "logo";
  return "ilustracao";
}

async function generate(url: string): Promise<Caption | null> {
  const at = locate(url);
  if (!at) return null;
  const hash = await hashOf(at.file);
  const current = (await readStore(at.store))[at.name];
  if (current?.hash === hash) return current;
  const reused = await findByHash(hash);
  if (reused) {
    await saveEntry(at.store, path.dirname(at.file), at.name, reused);
    return reused;
  }
  const cfg = await deepSeekConfig();
  const { data, width, height } = await prepare(at.file);
  const context = `Arquivo: ${at.name}${at.slug ? ` (${at.folder === "cases" ? "case" : "artigo"} "${at.slug}")` : ""}. Tamanho original: ${width}×${height}px.`;
  const { data: answer, usage } = await askVisionJson<{ description?: string; kind?: string; alt?: string }>(cfg, SYSTEM, { data, mime: "image/jpeg" }, context, { maxTokens: 600, timeoutMs: 90_000 });
  const description = String(answer.description ?? "").trim();
  if (!description) throw new Error("A DeepSeek não descreveu a imagem.");
  const caption: Caption = {
    description,
    kind: normalizeKind(answer.kind),
    shape: shapeOf(width, height),
    alt: String(answer.alt ?? "").trim().slice(0, 160) || description.split(/(?<=\.)\s/)[0].slice(0, 160),
    width,
    height,
    hash,
    model: visionModel(),
    tokens: usage.total,
    at: new Date().toISOString(),
  };
  // the file may have changed while the model was reading it; keep the caption only if not
  if ((await hashOf(at.file)) !== hash) return null;
  await saveEntry(at.store, path.dirname(at.file), at.name, caption);
  return caption;
}

/** The caption of an image, written now when it is missing or stale (waits for the AI). */
export async function ensureCaption(url: string): Promise<Caption | null> {
  const ready = await getCaption(url);
  if (ready) return ready;
  let job = state.inflight.get(url);
  if (!job) {
    job = generate(url).finally(() => state.inflight.delete(url));
    state.inflight.set(url, job);
  }
  return job;
}

function pump() {
  while (state.running < CONCURRENCY && state.queue.length) {
    const url = state.queue.shift()!;
    state.running++;
    ensureCaption(url)
      .then(() => { state.failures.delete(url); })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "erro desconhecido";
        state.failures.set(url, { at: Date.now(), message });
        state.lastError = message;
        // without a key or balance every other file would fail the same way: stop the line
        if (/chave|saldo|Configure/i.test(message)) state.queue.length = 0;
      })
      .finally(() => { state.running--; pump(); });
  }
}

/**
 * Captions these images in the background, a few at a time, without holding the caller.
 * Files that already have a current caption, videos and recent failures are skipped.
 */
export async function queueCaptions(urls: string[]) {
  const fresh = [...new Set(urls)].filter((url) => {
    if (!isCaptionable(url) || state.queue.includes(url) || state.inflight.has(url)) return false;
    const failed = state.failures.get(url);
    return !failed || Date.now() - failed.at >= RETRY_AFTER;
  });
  // reserve first (synchronously), so two overlapping calls never queue the same file twice
  state.queue.push(...fresh);
  const done = await Promise.all(fresh.map((url) => getCaption(url).then((c) => c !== null, () => false)));
  fresh.forEach((url, i) => { if (done[i]) { const at = state.queue.indexOf(url); if (at >= 0) state.queue.splice(at, 1); } });
  pump();
}

/** How the background captioning is going, for the gallery to follow along. */
export function captionProgress() {
  const recent = [...state.failures.values()].filter((f) => Date.now() - f.at < RETRY_AFTER);
  return { pending: state.queue.length + state.running, failed: recent.length, error: recent.length ? state.lastError : undefined };
}

import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { SLUG, saveMaterialMedia } from "@/lib/admin/caseStore";
import { queueCaptions } from "@/lib/media/captions";
import { askVisionJson, deepSeekConfig } from "@/lib/reel/deepseek";
import { extractFile, extractText, kindOf, type Segment, type SourceKind } from "./extract";

/**
 * The raw material of each case, as Gutto sent it: the original files and pasted texts, their text
 * by place (slide, page, block) and what was done with their pictures. Kept in
 * `.admin/material/<slug>/`, on this Mac only:
 * - `.admin/` is in .gitignore, so the publish's `git add content` never takes it;
 * - it is in .vercelignore, so `vercel deploy` does not upload it (the CLI ignores .gitignore);
 * - it is outside `public/` and `content/`, so the site never serves it nor bundles it;
 * - its pictures too (`images/`): only the ones a saved block uses are copied to `public/cases/<slug>/`.
 * Decks often carry other people's data and numbers that are not public: they stay on this Mac.
 */
const ROOT = path.join(process.cwd(), ".admin", "material");
export const MAX_FILE_BYTES = 200 * 1024 * 1024;

export type SourceMeta = {
  id: string;
  name: string;
  kind: SourceKind;
  size: number;
  addedAt: string;
  /** Slides or pages, when the file has them. */
  units?: number;
  segments: number;
  chars: number;
  /**
   * Pictures taken from it. New ones are private links (`.admin/material/<slug>/images/`, lib/admin/materialMedia.ts)
   * that go public only when a saved block uses them; sources read before that change point at `public/cases/<slug>/`.
   */
  images: string[];
  skippedImages: number;
  imageHashes?: string[];
  /** For a loose image: what it shows (from the vision model). */
  note?: string;
  /** Tokens spent reading it (images only; files are read on this Mac). */
  tokens?: number;
};
export type Source = SourceMeta & { segmentList: Segment[] };

const dirOf = (slug: string) => {
  if (!SLUG.test(slug)) throw new Error("Case inválido.");
  return path.join(ROOT, slug);
};

// One write at a time per case: several files dropped at once would race on the index.
const g = globalThis as typeof globalThis & { __materialLocks?: Map<string, Promise<unknown>> };
const locks = (g.__materialLocks ??= new Map());
function locked<T>(slug: string, work: () => Promise<T>): Promise<T> {
  const next = (locks.get(slug) ?? Promise.resolve()).catch(() => {}).then(work);
  locks.set(slug, next);
  return next;
}

async function readIndex(slug: string): Promise<SourceMeta[]> {
  try { return (JSON.parse(await readFile(path.join(dirOf(slug), "index.json"), "utf8")) as { sources: SourceMeta[] }).sources ?? []; } catch { return []; }
}
const writeIndex = async (slug: string, sources: SourceMeta[]) => {
  await mkdir(dirOf(slug), { recursive: true });
  await writeFile(path.join(dirOf(slug), "index.json"), `${JSON.stringify({ sources }, null, 2)}\n`);
};

/** Every source with its text, in the order they were added. */
export async function readSources(slug: string): Promise<Source[]> {
  const metas = await readIndex(slug);
  return Promise.all(metas.map(async meta => {
    let segmentList: Segment[] = [];
    try { segmentList = (JSON.parse(await readFile(path.join(dirOf(slug), "text", `${meta.id}.json`), "utf8")) as { segments: Segment[] }).segments; } catch { /* no text */ }
    return { ...meta, segmentList };
  }));
}

const newId = () => `${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
const sha1 = (b: Buffer) => createHash("sha1").update(b).digest("hex");
const MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

/** Pictures kept with the Material, private (named after the file and the slide), captioned in the background; none twice. */
async function keepImages(slug: string, images: { name: string; data: Buffer }[], known: Set<string>) {
  const urls: string[] = [], hashes: string[] = [];
  let repeated = 0;
  for (const img of images) {
    const hash = sha1(img.data);
    if (known.has(hash)) { repeated++; continue; }
    known.add(hash);
    const type = MIME[path.extname(img.name).toLowerCase()];
    if (!type) continue;
    const saved = await saveMaterialMedia(slug, new File([new Uint8Array(img.data)], img.name, { type }));
    urls.push(saved.url);
    hashes.push(hash);
  }
  if (urls.length) void queueCaptions(urls);
  return { urls, hashes, repeated };
}

const VISION = `Você recebe uma imagem que o designer Gutto Rocha mandou como material de um case do portfólio dele (print de Slack, e-mail, dashboard, slide, tela do produto, foto do quadro…).
Responda em JSON:
{"texto": "todo o texto legível da imagem, palavra por palavra e na ordem de leitura; números exatamente como aparecem; sem resumir, sem corrigir, sem traduzir. Vazio se não houver texto.",
 "descricao": "uma frase sobre o que a imagem mostra",
 "usarNoCase": true se for uma tela do produto, foto do trabalho ou diagrama que caberia nas páginas do case; false se for print de conversa, e-mail, planilha ou documento}`;

async function readImage(data: Buffer) {
  const cfg = await deepSeekConfig();
  const send = await sharp(data).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
  const { data: answer, tokens } = await askVisionJson<{ texto?: string; descricao?: string; usarNoCase?: boolean }>(cfg, VISION, { data: send, mime: "image/png" }, "Leia esta imagem.", { maxTokens: 6000 });
  return { text: (answer.texto ?? "").trim(), note: (answer.descricao ?? "").trim(), useInCase: answer.usarNoCase === true, tokens };
}

async function store(slug: string, meta: Omit<SourceMeta, "segments" | "chars">, segments: Segment[]) {
  const dir = dirOf(slug);
  await mkdir(path.join(dir, "text"), { recursive: true });
  await writeFile(path.join(dir, "text", `${meta.id}.json`), JSON.stringify({ segments }));
  const full: SourceMeta = { ...meta, segments: segments.length, chars: segments.reduce((n, s) => n + s.text.length, 0) };
  const index = await readIndex(slug);
  await writeIndex(slug, [...index, full]);
  return full;
}

/** Keeps a dropped file, reads it on this Mac and sends its good pictures to the case's media. */
export function addSourceFile(slug: string, file: File): Promise<SourceMeta> {
  return locked(slug, async () => {
    const kind = kindOf(file.name, file.type);
    if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} passa de 200 MB.`);
    const id = newId();
    const dir = dirOf(slug);
    await mkdir(path.join(dir, "files"), { recursive: true });
    const original = path.join(dir, "files", `${id}${path.extname(file.name).toLowerCase() || ".bin"}`);
    const data = Buffer.from(await file.arrayBuffer());
    await writeFile(original, data);
    try {
      const index = await readIndex(slug);
      const known = new Set(index.flatMap(s => s.imageHashes ?? []));
      const base = { id, name: file.name, size: file.size, addedAt: new Date().toISOString() };
      if (kind === "image") {
        const read = await readImage(data);
        const kept = read.useInCase ? await keepImages(slug, [{ name: file.name.replace(/\.(heic|avif)$/i, ".png"), data: /\.(heic|avif)$/i.test(file.name) ? await sharp(data).png().toBuffer() : data }], known) : { urls: [], hashes: [] };
        return await store(slug, { ...base, kind, images: kept.urls, imageHashes: kept.hashes, skippedImages: read.useInCase ? 0 : 1, note: read.note, tokens: read.tokens }, read.text ? [{ where: "texto da imagem", text: read.text }] : []);
      }
      const extracted = await extractFile(original, file.name, file.type);
      const kept = await keepImages(slug, extracted.images, known);
      return await store(slug, { ...base, kind: extracted.kind, units: extracted.units, images: kept.urls, imageHashes: kept.hashes, skippedImages: extracted.skippedImages + kept.repeated }, extracted.segments);
    } catch (error) {
      await rm(original, { force: true });
      throw error;
    }
  });
}

/** Keeps pasted text (Notion, Google Docs, e-mail, Slack) as a source of its own. */
export function addSourceText(slug: string, text: string, title?: string): Promise<SourceMeta> {
  return locked(slug, async () => {
    const clean = text.trim();
    if (!clean) throw new Error("Cole algum texto.");
    if (clean.length > 2_000_000) throw new Error("O texto passa de 2 milhões de caracteres: divida em partes.");
    const id = newId();
    const dir = dirOf(slug);
    await mkdir(path.join(dir, "files"), { recursive: true });
    await writeFile(path.join(dir, "files", `${id}.txt`), clean);
    const count = (await readIndex(slug)).filter(s => s.kind === "text").length + 1;
    const firstLine = clean.split("\n").find(l => l.trim())?.trim().slice(0, 60) ?? "";
    const name = title?.trim() || `Texto colado ${count}${firstLine ? ` · ${firstLine}` : ""}`;
    return store(slug, { id, name, kind: "text", size: Buffer.byteLength(clean), addedAt: new Date().toISOString(), images: [], skippedImages: 0 }, extractText(clean).segments);
  });
}

import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Case } from "@/lib/cases";
import { CASE_CONTENT_DIR } from "@/lib/caseContent";
import { materialMediaDir, materialMediaIn, materialMediaUrl, parseMaterialMediaUrl } from "@/lib/admin/materialMedia";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { parseReel, type ReelDoc } from "@/lib/reel/types";

/** Escrita dos cases pelo admin (só local): versão para não sobrescrever, e cópia de segurança a cada salvamento. */
export class CaseConflict extends Error {}

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HISTORY_DIR = path.join(process.cwd(), ".content-history");
const HISTORY_KEEP = 30;
const PUBLIC_DIR = path.join(process.cwd(), "public");
const MEDIA_TYPES = /^(image\/(png|jpe?g|webp|gif|avif|svg\+xml)|video\/(mp4|webm))$/;
const MEDIA_MAX_BYTES = 50 * 1024 * 1024;

const sha1 = (value: string | Uint8Array) => createHash("sha1").update(value).digest("hex");
const serialize = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const caseDir = (slug: string) => {
  if (!SLUG.test(slug)) throw new Error("Case inválido.");
  return path.join(CASE_CONTENT_DIR, slug);
};

async function readText(file: string) {
  try { return await readFile(file, "utf8"); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function readCaseFiles(slug: string) {
  const dir = caseDir(slug);
  const [caseText, bodyText, reelText] = await Promise.all([
    readText(path.join(dir, "case.json")), readText(path.join(dir, "body.json")), readText(path.join(dir, "reel.json")),
  ]);
  if (caseText === null) return null;
  return {
    case: JSON.parse(caseText) as Case,
    body: (bodyText ? JSON.parse(bodyText) : []) as NotionBlockNode[],
    /** The case video (reel.json), or null when the case has none. */
    reel: reelText ? parseReel(JSON.parse(reelText)) : null,
    revision: sha1(`${caseText}\0${bodyText ?? ""}\0${reelText ?? ""}`),
  };
}

function validCase(value: unknown, slug: string): value is Case {
  if (!value || typeof value !== "object") return false;
  const c = value as Case;
  return c.slug === slug && typeof c.title === "string" && !!c.title.trim() && typeof c.company === "string";
}

function validBody(value: unknown): value is NotionBlockNode[] {
  const block = (b: unknown): boolean => !!b && typeof b === "object" && typeof (b as NotionBlockNode).id === "string" && typeof (b as NotionBlockNode).type === "string"
    && ((b as NotionBlockNode).children === undefined || (Array.isArray((b as NotionBlockNode).children) && (b as NotionBlockNode).children!.every(block)));
  return Array.isArray(value) && value.every(block);
}

/** Saves made one after another in the same editing session become one version (audit R6, "Versões"). */
const SESSION_FILE = ".session.json";
const SESSION_GAP_MS = 10 * 60 * 1000;
const HISTORY_FILE = /^(.+)-(case|body|reel)\.json$/;

/**
 * Keeps the files as they were before this save, in `.content-history/<slug>/`. With a `session` (the
 * editor's automatic saving), only the first save of a session keeps a copy: the case as it was before
 * that session started. A new session starts with a new id or after 10 minutes without saving. The
 * history keeps the latest HISTORY_KEEP versions (one stamp each, whatever files it holds).
 */
async function keepHistory(slug: string, files: Record<string, string | null>, session?: string) {
  const dir = path.join(HISTORY_DIR, slug);
  await mkdir(dir, { recursive: true });
  const now = Date.now();
  if (session) {
    const last = JSON.parse((await readText(path.join(dir, SESSION_FILE))) ?? "null") as { session?: string; at?: number } | null;
    await writeFile(path.join(dir, SESSION_FILE), JSON.stringify({ session, at: now }));
    if (last?.session === session && typeof last.at === "number" && now - last.at < SESSION_GAP_MS) return;
  }
  const stamps = [...new Set((await readdir(dir)).map(name => HISTORY_FILE.exec(name)?.[1]).filter((s): s is string => !!s))].sort();
  // the same files as the newest version (a version just restored, say) are not kept twice
  const newest = stamps.at(-1);
  if (newest) {
    const same = await Promise.all(Object.entries(files).map(async ([name, text]) => (await readText(path.join(dir, `${newest}-${name}`))) === text));
    if (same.every(Boolean)) return;
  }
  const stamp = new Date(now).toISOString().replace(/[:.]/g, "-");
  for (const [name, text] of Object.entries(files)) if (text !== null) await writeFile(path.join(dir, `${stamp}-${name}`), text);
  stamps.push(stamp);
  const stale = new Set(stamps.slice(0, Math.max(0, stamps.length - HISTORY_KEEP)));
  if (stale.size) await Promise.all((await readdir(dir)).filter(name => stale.has(HISTORY_FILE.exec(name)?.[1] ?? "")).map(name => rm(path.join(dir, name))));
}

/** Saves the case data, body and/or video (null removes it); refuses when the files changed since `revision` was read. */
export async function saveCaseFiles(slug: string, revision: string, next: { case?: unknown; body?: unknown; reel?: unknown }, options: { session?: string } = {}) {
  const dir = caseDir(slug);
  const current = await readCaseFiles(slug);
  if (!current) throw new Error("Case não encontrado.");
  if (current.revision !== revision) throw new CaseConflict("Os arquivos deste case mudaram fora desta tela. Recarregue a página para ver a versão atual.");
  if (next.case !== undefined && !validCase(next.case, slug)) throw new Error("O case precisa de título e empresa.");
  if (next.body !== undefined && !validBody(next.body)) throw new Error("O conteúdo tem um bloco inválido.");
  let reel: ReelDoc | null | undefined;
  if (next.reel !== undefined) {
    reel = next.reel === null ? null : parseReel(next.reel);
    if (next.reel !== null && !reel) throw new Error("O vídeo tem uma cena inválida: confira as batidas de início, que precisam estar em ordem.");
  }
  // Material pictures a block now uses go public; the rest of the Material stays on this Mac.
  const promoted = await promoteMaterialMedia(slug, { case: next.case, body: next.body, reel });
  next = { ...next, case: promoted.value.case, body: promoted.value.body };
  if (reel) reel = promoted.value.reel as ReelDoc;
  // the caption written for the private copy is reused by hash (no new AI call)
  if (promoted.promoted.length) void import("@/lib/media/captions").then(m => m.queueCaptions(promoted.promoted)).catch(() => {});
  const caseFile = path.join(dir, "case.json"), bodyFile = path.join(dir, "body.json"), reelFile = path.join(dir, "reel.json");
  await keepHistory(slug, { "case.json": await readText(caseFile), "body.json": await readText(bodyFile), "reel.json": await readText(reelFile) }, options.session);
  // Each save dates the case: the sitemap tells search engines when it last changed.
  const caseValue = (next.case ?? current.case) as object;
  await writeFile(caseFile, serialize({ ...caseValue, updatedAt: new Date().toISOString().slice(0, 10) }));
  if (next.body !== undefined) await writeFile(bodyFile, serialize(next.body));
  if (reel === null) await rm(reelFile, { force: true });
  else if (reel) await writeFile(reelFile, serialize(reel));
  return (await readCaseFiles(slug))!;
}

export async function createCase(input: { slug: string; title: string; company: string; order: number }) {
  const dir = caseDir(input.slug);
  if (await readText(path.join(dir, "case.json")) !== null) throw new CaseConflict("Já existe um case com esse endereço.");
  if (!input.title.trim() || !input.company.trim()) throw new Error("Informe título e empresa.");
  const data: Case = {
    slug: input.slug, num: String(input.order).padStart(2, "0"), title: input.title.trim(), company: input.company.trim(),
    year: String(new Date().getFullYear()), role: "", tags: [], accentTags: [], placeholder: "#E4E1DA", brandColor: "#5DC153",
    summary: "", context: "", challenge: "", approach: [], stats: [], outcome: "", learning: "", order: input.order, heroVariant: "fullBleed", draft: true,
  };
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "case.json"), serialize(data));
  await writeFile(path.join(dir, "body.json"), serialize([]));
  return data;
}

const exists = (target: string) => stat(target).then(() => true, () => false);

/** A copy as a draft at a new address: data, body and media, with the media links pointing to the copy. */
export async function duplicateCase(from: string, input: { slug: string; title: string; order: number }) {
  const source = await readCaseFiles(from);
  if (!source) throw new Error("Case não encontrado.");
  const dir = caseDir(input.slug);
  if (await exists(dir)) throw new CaseConflict("Já existe um case com esse endereço.");
  if (!input.title.trim()) throw new Error("Informe o título.");
  const relink = <T,>(value: T): T => JSON.parse(JSON.stringify(value).split(`/cases/${from}/`).join(`/cases/${input.slug}/`));
  const data: Case = {
    ...relink(source.case), slug: input.slug, title: input.title.trim(), num: String(input.order).padStart(2, "0"), order: input.order,
    draft: true, archived: undefined, featuredOnSite: undefined,
  };
  const media = path.join(PUBLIC_DIR, "cases", from);
  if (await exists(media)) await cp(media, path.join(PUBLIC_DIR, "cases", input.slug), { recursive: true });
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "case.json"), serialize(data));
  await writeFile(path.join(dir, "body.json"), serialize(relink(source.body)));
  return data;
}

/** Switches the list's flags (archive, Home highlight) without touching the rest of the case. */
export async function setCaseFlags(slug: string, flags: { archived?: boolean; featuredOnSite?: boolean }) {
  const current = await readCaseFiles(slug);
  if (!current) throw new Error("Case não encontrado.");
  const next: Case = { ...current.case };
  for (const key of ["archived", "featuredOnSite"] as const) {
    if (flags[key] === undefined) continue;
    if (flags[key]) next[key] = true; else delete next[key];
  }
  return saveCaseFiles(slug, current.revision, { case: next });
}

/**
 * Deleting moves the case (its translation and material included), its media, its raw material and any legacy local translation to `.content-history/deleted/`, out of the
 * site and the admin; moving them back restores it.
 */
export async function deleteCase(slug: string) {
  const dir = caseDir(slug);
  if (!(await exists(dir))) throw new Error("Case não encontrado.");
  const trash = path.join(HISTORY_DIR, "deleted", `${slug}-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  await mkdir(trash, { recursive: true });
  const moves: [string, string][] = [
    [dir, path.join(trash, "content")],
    [path.join(PUBLIC_DIR, "cases", slug), path.join(trash, "media")],
    [path.join(process.cwd(), ".translations", `${slug}.json`), path.join(trash, "translation.json")],
    // The raw material (decks, documents) sent in the Material tab: on this Mac only, it goes along.
    [path.join(process.cwd(), ".admin", "material", slug), path.join(trash, "raw-material")],
  ];
  for (const [from, to] of moves) if (await exists(from)) await rename(from, to);
  return { trash: path.relative(process.cwd(), trash) };
}

export type MediaFile = {
  name: string; url: string; size: number;
  /** From the Material, still private (`.admin/`): it goes public when a saved block uses it. */
  private?: true;
};

/** Where uploads live: each case, or each article, has its own folder in `public/`. */
export type MediaFolder = "cases" | "articles";
export const mediaFolder = (value: unknown): MediaFolder => (value === "articles" ? "articles" : "cases");

export async function listMedia(slug: string, folder: MediaFolder = "cases"): Promise<MediaFile[]> {
  caseDir(slug);
  const dir = path.join(PUBLIC_DIR, folder, slug);
  let names: string[] = [];
  try { names = await readdir(dir); } catch { /* no public files yet */ }
  const files: MediaFile[] = await Promise.all(names.filter(name => !name.startsWith(".") && /\.(png|jpe?g|webp|gif|avif|svg|mp4|webm)$/i.test(name)).map(async name => ({
    name, url: `/${folder}/${slug}/${name}`, size: (await stat(path.join(dir, name))).size,
  })));
  // a case also lists its private Material pictures, so the editor and the AI can place them
  if (folder === "cases") files.push(...await listMaterialMedia(slug));
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

/** The private pictures taken from the case's Material (not yet in any saved block). */
export async function listMaterialMedia(slug: string): Promise<MediaFile[]> {
  const dir = materialMediaDir(slug);
  let names: string[] = [];
  try { names = await readdir(dir); } catch { return []; }
  return Promise.all(names.filter(name => !name.startsWith(".") && /\.(png|jpe?g|webp|gif|avif|svg|mp4|webm)$/i.test(name)).map(async name => ({
    name, url: materialMediaUrl(slug, name), size: (await stat(path.join(dir, name))).size, private: true as const,
  })));
}

function mediaName(original: string) {
  const ext = path.extname(original).toLowerCase();
  const base = path.basename(original, path.extname(original)).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "arquivo";
  return { base, ext };
}

/** Writes `bytes` in `dir` under the file's clean name, reusing a same-named file with the same bytes. */
async function storeFile(dir: string, original: string, bytes: Uint8Array): Promise<string> {
  await mkdir(dir, { recursive: true });
  const { base, ext } = mediaName(original);
  for (let n = 1; ; n++) {
    const name = `${base}${n > 1 ? `-${n}` : ""}${ext}`;
    const target = path.join(dir, name);
    let existing: Buffer | null = null;
    try { existing = await readFile(target); } catch { /* free name */ }
    if (existing && sha1(existing) !== sha1(bytes)) continue;
    if (!existing) await writeFile(target, bytes);
    return name;
  }
}

async function checkedBytes(file: File) {
  if (!MEDIA_TYPES.test(file.type)) throw new Error("Envie uma imagem (PNG, JPG, WebP, GIF, AVIF, SVG) ou um vídeo (MP4, WebM).");
  if (file.size > MEDIA_MAX_BYTES) throw new Error("O arquivo passa de 50 MB.");
  return new Uint8Array(await file.arrayBuffer());
}

/** Stores an upload in `public/<folder>/<slug>/`: it goes up with the next publish. */
export async function saveMedia(slug: string, file: File, folder: MediaFolder = "cases"): Promise<MediaFile> {
  caseDir(slug);
  const bytes = await checkedBytes(file);
  const name = await storeFile(path.join(PUBLIC_DIR, folder, slug), file.name, bytes);
  return { name, url: `/${folder}/${slug}/${name}`, size: bytes.length };
}

/** Stores a picture taken from the case's Material in `.admin/material/<slug>/images/`: private until a saved block uses it. */
export async function saveMaterialMedia(slug: string, file: File): Promise<MediaFile> {
  caseDir(slug);
  const bytes = await checkedBytes(file);
  const name = await storeFile(materialMediaDir(slug), file.name, bytes);
  return { name, url: materialMediaUrl(slug, name), size: bytes.length, private: true };
}

/**
 * Copies every private Material picture `value` points at into `public/cases/<slug>/` and rewrites
 * the links. The private file stays (the Material still lists it). Returns the new value and the
 * public links made, so their captions can follow.
 */
export async function promoteMaterialMedia<T>(slug: string, value: T): Promise<{ value: T; promoted: string[] }> {
  const text = JSON.stringify(value) ?? "";
  const found = materialMediaIn(text, slug);
  if (!found.length) return { value, promoted: [] };
  let next = text;
  const promoted: string[] = [];
  for (const url of found) {
    const at = parseMaterialMediaUrl(url);
    if (!at) continue;
    let bytes: Buffer;
    try { bytes = await readFile(at.file); } catch { throw new Error(`A imagem ${at.name} do material não está mais nesta máquina: escolha outra antes de salvar.`); }
    const name = await storeFile(path.join(PUBLIC_DIR, "cases", slug), at.name, new Uint8Array(bytes));
    const publicUrl = `/cases/${slug}/${name}`;
    next = next.split(url).join(publicUrl);
    promoted.push(publicUrl);
  }
  return { value: JSON.parse(next) as T, promoted };
}

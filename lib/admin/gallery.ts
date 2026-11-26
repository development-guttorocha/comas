import { mkdir, readFile, readdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { captionsFor } from "@/lib/media/captions";
import type { CaptionKind } from "@/lib/media/captionKinds";

// Every image and video the cases and articles use, in one list: where it lives, its size and
// dimensions, when it changed, and which content files mention it. Deleting moves the file
// into .content-history/deleted-media/ (out of the site, kept on this Mac), never erases it.

const PUBLIC = path.join(process.cwd(), "public");
const CONTENT = path.join(process.cwd(), "content");
const TRASH = path.join(process.cwd(), ".content-history", "deleted-media");
const MEDIA = /\.(png|jpe?g|webp|gif|avif|svg|mp4|webm)$/i;
const ROOTS = ["cases", "articles"] as const;
const ADMIN = path.join(process.cwd(), ".admin");
const RECENT_MS = 24 * 3600_000;

export type GalleryItem = {
  url: string;
  name: string;
  folder: (typeof ROOTS)[number];
  slug: string;
  size: number;
  modified: string;
  width?: number;
  height?: number;
  kind: "image" | "video";
  usedIn: string[];
  /** Mentioned only by AI drafts or the Material (.admin/), not yet by saved content. */
  fromMaterial: boolean;
  /** Sent less than 24 h ago: may still be open in an editor, so it never counts as unused. */
  recent: boolean;
  /** What the image shows (written once by the AI); absent until captioned. */
  description?: string;
  captionKind?: CaptionKind;
  alt?: string;
};

async function walkText(dir: string, out: { file: string; text: string }[]) {
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkText(full, out);
    else if (/\.(json|md|mdx|tsx?|css)$/i.test(entry.name)) out.push({ file: path.relative(process.cwd(), full), text: await readFile(full, "utf8").catch(() => "") });
  }
  return out;
}

const dims = new Map<string, { at: number; width?: number; height?: number }>();
async function dimensions(file: string, mtime: number) {
  const hit = dims.get(file);
  if (hit && hit.at === mtime) return hit;
  const meta = await sharp(file).metadata().catch(() => null);
  const value = { at: mtime, width: meta?.width, height: meta?.height };
  dims.set(file, value);
  return value;
}

export async function listGallery(): Promise<GalleryItem[]> {
  // content files, and the site's own code (pages and components that point at a file)
  const texts = await walkText(CONTENT, []);
  for (const dir of ["app", "components", "lib"]) await walkText(path.join(process.cwd(), dir), texts);
  // the AI drafts and the Material also point at images that no saved content mentions yet
  const hidden: { file: string; text: string }[] = [];
  for (const dir of ["drafts", "material"]) await walkText(path.join(ADMIN, dir), hidden);
  const usage = (url: string) => {
    const keys = [url, encodeURI(url), url.slice(1)];
    const has = (t: { text: string }) => keys.some((k) => t.text.includes(k));
    return {
      usedIn: texts.filter((t) => !t.file.startsWith("lib/admin/") && has(t)).map((t) => t.file),
      material: hidden.filter(has).map((t) => t.file),
    };
  };
  const items: GalleryItem[] = [];
  for (const folder of ROOTS) {
    const base = path.join(PUBLIC, folder);
    for (const entry of await readdir(base, { withFileTypes: true }).catch(() => [])) {
      const dir = entry.isDirectory() ? path.join(base, entry.name) : base;
      const captions = await captionsFor(folder, entry.isDirectory() ? entry.name : "");
      const names = entry.isDirectory() ? await readdir(dir).catch(() => [] as string[]) : [entry.name];
      for (const name of names) {
        if (name.startsWith(".") || !MEDIA.test(name)) continue;
        const file = path.join(dir, name);
        const st = await stat(file).catch(() => null);
        if (!st?.isFile()) continue;
        const slug = entry.isDirectory() ? entry.name : "";
        const url = `/${folder}/${slug ? `${slug}/` : ""}${name}`;
        const video = /\.(mp4|webm)$/i.test(name);
        const d: { width?: number; height?: number } = video ? {} : await dimensions(file, st.mtimeMs);
        const use = usage(url);
        items.push({ url, name, folder, slug, size: st.size, modified: st.mtime.toISOString(), width: d.width, height: d.height, kind: video ? "video" : "image", usedIn: [...use.usedIn, ...use.material], fromMaterial: !use.usedIn.length && use.material.length > 0, recent: Date.now() - st.mtimeMs < RECENT_MS, description: captions[url]?.description, captionKind: captions[url]?.kind, alt: captions[url]?.alt });
      }
    }
  }
  return items;
}

/** Moves the files out of the site into the history folder; returns what was moved. */
export async function trashMedia(urls: string[]) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const moved: { url: string; to: string }[] = [];
  for (const url of urls) {
    if (!/^\/(cases|articles)\/[^\0]+$/.test(url) || url.includes("..") || !MEDIA.test(url)) throw new Error(`Arquivo inválido: ${url}`);
    const from = path.join(PUBLIC, url);
    if (!from.startsWith(PUBLIC + path.sep)) throw new Error(`Arquivo inválido: ${url}`);
    const to = path.join(TRASH, stamp, url);
    await mkdir(path.dirname(to), { recursive: true });
    await rename(from, to);
    moved.push({ url, to: path.relative(process.cwd(), to) });
  }
  return moved;
}

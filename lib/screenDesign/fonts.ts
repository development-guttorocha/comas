import { readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// The family DeepSeek recognises comes from Google Fonts (open licences). When it is not on this
// Mac, its files are fetched from the official repository (github.com/google/fonts) and installed
// in ~/Library/Fonts, where FigCraft reads fonts. Without it, the closest installed one is used.

const USER_FONTS = path.join(os.homedir(), "Library", "Fonts");
const FONT_DIRS = [USER_FONTS, "/Library/Fonts", "/System/Library/Fonts", "/System/Library/Fonts/Supplemental"];
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

async function installed(family: string) {
  const want = squash(family);
  for (const dir of FONT_DIRS) {
    const files = await readdir(dir).catch(() => [] as string[]);
    if (files.some((f) => squash(f.replace(/\.(ttf|otf|ttc)$/i, "")).startsWith(want))) return true;
  }
  return false;
}

/** The family to draw with: the one asked for (installed now if needed) or a fallback. */
export async function ensureFont(family: string | undefined, log: (line: string) => void): Promise<string> {
  const name = (family ?? "").trim();
  if (!name || !/^[A-Za-z0-9 ]{2,40}$/.test(name)) return (await installed("Inter")) ? "Inter" : "Helvetica Neue";
  if (await installed(name)) return name;
  for (const licence of ["ofl", "apache", "ufl"]) {
    const res = await fetch(`https://api.github.com/repos/google/fonts/contents/${licence}/${squash(name)}`, { headers: { Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(20_000) }).catch(() => null);
    if (!res?.ok) continue;
    const list = (await res.json()) as { name: string; download_url: string | null; type: string }[];
    const files = list.filter((f) => f.type === "file" && /\.(ttf|otf)$/i.test(f.name) && f.download_url);
    if (!files.length) continue;
    for (const f of files) {
      const bytes = await fetch(f.download_url!, { signal: AbortSignal.timeout(60_000) }).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
      if (bytes) await writeFile(path.join(USER_FONTS, path.basename(f.name)), Buffer.from(bytes));
    }
    log(`Fonte ${name} instalada do Google Fonts (${files.length} ${files.length === 1 ? "arquivo" : "arquivos"}).`);
    return name;
  }
  log(`Não achei ${name} no Google Fonts; usando a fonte mais próxima instalada.`);
  return (await installed("Inter")) ? "Inter" : "Helvetica Neue";
}

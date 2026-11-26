/**
 * Exporta os cases do Notion para o repositório: `content/cases/<slug>/case.json` (dados) e
 * `body.json` (corpo em blocos). A mídia hospedada no Notion (links S3 que expiram) é baixada
 * para `public/cases/<slug>/` e os links passam a apontar para lá.
 *
 *   node --env-file=.env.local --import tsx scripts/export-notion-cases.ts [--force]
 *
 * Sem `--force`, não sobrescreve um case que já existe em `content/cases/`.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { CASE_CONTENT_DIR } from "@/lib/caseContent";
import { resolveNotionBodyPageId } from "@/lib/caseDetailLocale";
import { fetchNotionPageBlockTree, type NotionBlockNode } from "@/lib/notionBlockTree";
import { fetchNotionCases } from "@/lib/notionCases";

const PUBLIC_DIR = path.join(process.cwd(), "public");
/** Files uploaded to Notion: signed S3 links that expire within the hour. */
const NOTION_FILE_URL = /https:\/\/[a-z0-9.-]*amazonaws\.com\/[^\s"'\\)<>]+/g;
/** Notion bookkeeping that says nothing about the content. */
const NOISE = new Set(["object", "parent", "created_time", "last_edited_time", "created_by", "last_edited_by", "archived", "in_trash", "request_id", "expiry_time"]);

const force = process.argv.includes("--force");
const sha1 = (bytes: Uint8Array) => createHash("sha1").update(bytes).digest("hex");

function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !NOISE.has(key)).map(([key, v]) => [key, clean(v)]));
}

function fileName(url: string) {
  const last = decodeURIComponent(new URL(url).pathname.split("/").pop() || "arquivo");
  const ext = path.extname(last).toLowerCase();
  const base = path.basename(last, path.extname(last)).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "arquivo";
  return { base, ext };
}

async function exists(file: string) {
  try { await stat(file); return true; } catch { return false; }
}

/** Downloads one file into the case's media folder, reusing a same-named file with the same bytes. */
async function download(url: string, slug: string, taken: Set<string>): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao baixar ${fileName(url).base}: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const dir = path.join(PUBLIC_DIR, "cases", slug);
  await mkdir(dir, { recursive: true });
  const { base, ext } = fileName(url);
  for (let n = 1; ; n++) {
    const name = `${base}${n > 1 ? `-${n}` : ""}${ext}`;
    const file = path.join(dir, name);
    if (taken.has(name)) continue;
    if (await exists(file) && sha1(await readFile(file)) !== sha1(bytes)) continue;
    await writeFile(file, bytes);
    taken.add(name);
    return `/cases/${slug}/${name}`;
  }
}

async function main() {
  // Notion breaks ties in `order` by its own row order; the files keep the sequence the site shows.
  const cases = (await fetchNotionCases()).map((c, i) => ({ ...c, order: i + 1 }));
  const token = process.env.NOTION_TOKEN!.trim();
  console.log(`${cases.length} cases no Notion.`);
  for (const c of cases) {
    const dir = path.join(CASE_CONTENT_DIR, c.slug);
    if (!force && await exists(path.join(dir, "case.json"))) {
      console.log(`- ${c.slug}: já existe, pulado (use --force para sobrescrever).`);
      continue;
    }
    const pageId = resolveNotionBodyPageId(c, "pt");
    const blocks = pageId ? await fetchNotionPageBlockTree(pageId, token) : [];
    let json = JSON.stringify({ case: c, body: clean(blocks) as NotionBlockNode[] });
    const urls = [...new Set(json.match(NOTION_FILE_URL) ?? [])];
    const taken = new Set<string>();
    for (const url of urls) json = json.split(url).join(await download(url, c.slug, taken));
    const { case: data, body } = JSON.parse(json) as { case: unknown; body: NotionBlockNode[] };
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "case.json"), `${JSON.stringify(data, null, 2)}\n`);
    await writeFile(path.join(dir, "body.json"), `${JSON.stringify(body, null, 2)}\n`);
    console.log(`- ${c.slug}: ${body.length} blocos, ${urls.length} arquivos de mídia.`);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

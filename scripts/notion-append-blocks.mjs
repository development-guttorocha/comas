/**
 * Anexa blocos a uma página Notion (API v1).
 *
 * Uso:
 *   NOTION_TOKEN=secret_xxx NOTION_PAGE_ID=<uuid da página do case> node scripts/notion-append-blocks.mjs notion/loft-case-body.blocks.json
 *
 * A página deve estar partilhada com a integração. Máx. 100 blocos por pedido
 * (este ficheiro faz chunking automático).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const token = process.env.NOTION_TOKEN?.trim();
const file = process.argv[2] || "notion/loft-case-body.blocks.json";
const pageIdRaw = process.env.NOTION_PAGE_ID?.trim() || process.argv[3];

if (!token) {
  console.error("Defina NOTION_TOKEN");
  process.exit(1);
}
if (!pageIdRaw) {
  console.error("Defina NOTION_PAGE_ID ou passe como 3º argumento");
  process.exit(1);
}

const pageId = pageIdRaw.replace(/-/g, "");
const path = resolve(process.cwd(), file);
const { children } = JSON.parse(readFileSync(path, "utf8"));
if (!Array.isArray(children)) {
  console.error("JSON precisa de { \"children\": [ ... ] }");
  process.exit(1);
}

const CHUNK = 100;
const base = `https://api.notion.com/v1/blocks/${pageId}/children`;

for (let i = 0; i < children.length; i += CHUNK) {
  const batch = children.slice(i, i + CHUNK);
  const res = await fetch(base, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({ children: batch }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(res.status, t);
    process.exit(1);
  }
  console.log(`OK blocos ${i + 1}–${i + batch.length} de ${children.length}`);
}

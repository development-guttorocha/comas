import path from "node:path";

/** Pure comparisons behind the publish list (lib/admin/publish/plan.ts); tested in publish.test.ts. */

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** A repo-relative path is one of `roots` or inside one (a folder or a single file). */
export const underPaths = (file: string, roots: string[]) => roots.some(r => file === r || file.startsWith(`${r}/`));

const parse = (text: string | null): unknown => { try { return text === null ? null : JSON.parse(text); } catch { return text; } };

/** Two JSON files differ in content (formatting aside); a missing file is null. */
export const jsonChanged = (before: string | null, after: string | null) => JSON.stringify(parse(before)) !== JSON.stringify(parse(after));

/** case.json changed in something the site shows (each save rewrites `updatedAt`). */
export function caseDataChanged(before: string | null, after: string | null): boolean {
  const strip = (text: string | null) => {
    const v = parse(text);
    if (!v || typeof v !== "object") return v;
    const { updatedAt: _ignored, ...rest } = v as Record<string, unknown>;
    return rest;
  };
  return JSON.stringify(strip(before)) !== JSON.stringify(strip(after));
}

export type BlockChanges = { added: number; removed: number; changed: number; moved: boolean };

/** Top-level blocks compared by id: new, gone, edited (their children count as part of them) and reordered. */
export function blockChanges(before: unknown[], after: unknown[]): BlockChanges {
  const byId = (list: unknown[]) => new Map(list.map((b, i) => [String((b as { id?: unknown })?.id ?? `#${i}`), JSON.stringify(b)]));
  const a = byId(before), b = byId(after);
  let added = 0, removed = 0, changed = 0;
  for (const [id, json] of b) { if (!a.has(id)) added++; else if (a.get(id) !== json) changed++; }
  for (const id of a.keys()) if (!b.has(id)) removed++;
  const order = (m: Map<string, string>, other: Map<string, string>) => [...m.keys()].filter(id => other.has(id)).join("\0");
  return { added, removed, changed, moved: order(a, b) !== order(b, a) };
}

/** The case components a body names (`[case:Name]`). */
export const embedNames = (text: string) => [...new Set([...text.matchAll(/\[case:\s*(\w+)\]/g)].map(m => m[1]))];

/** The names the committed renderer (NotionCaseEmbed.tsx at HEAD) has no `case "Name":` for. */
export const missingEmbeds = (names: string[], registry: string) => (registry ? names.filter(n => !registry.includes(`"${n}"`)) : []);

/** A file is in use when some text points at it, plain or URL-encoded, with or without the leading slash. */
export const isReferenced = (url: string, corpus: string) => [url, encodeURI(url), url.slice(1)].some(k => corpus.includes(k));

/** Same file under another format (a converted MP4 next to its MOV, a poster next to its video). */
export const sameStem = (a: string, b: string) => a.replace(/\.[^.]+$/, "") === b.replace(/\.[^.]+$/, "");

const PAGE_NAMES: Record<string, string> = {
  "content/home.json": "Home", "content/pages/home.json": "Home", "content/pages/sobre.json": "Sobre", "content/pages/contato.json": "Contato",
  "content/pages/curriculo.json": "Currículo", "content/pages/cases.json": "Lista de cases", "content/pages/rodape.json": "Rodapé",
  "content/pages/site.json": "Textos gerais do site", "content/reel-tracks.json": "Trilhas dos vídeos", "content/services/hub.json": "Serviços (página geral)",
  "content/recursos/hub.json": "Recursos (página geral)",
};

/** How the list names a page file: its own title when it has one. */
export function pageLabel(file: string, json: { title?: unknown; serviceName?: unknown; navName?: unknown } | null): string {
  if (PAGE_NAMES[file]) return PAGE_NAMES[file];
  const kind = file.startsWith("content/services/") ? "Serviço" : file.startsWith("content/recursos/") ? "Recurso" : "Página";
  const named = [json?.serviceName, json?.title, json?.navName].find((v): v is string => typeof v === "string" && !!v.trim());
  const title = named?.trim() ?? path.basename(file, ".json").replace(/-/g, " ");
  return `${kind}: ${title}`;
}

import { createHash } from "node:crypto";
import type { Case } from "@/lib/cases";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { parseCaseEmbedJson } from "@/lib/notionCaseEmbedFromNotion";

export type TranslationUnit = { key: string; source: string; target: string };
export type TranslationSource = {
  slug: string; title: string; sourceHash: string; units: TranslationUnit[];
  case: Case; blocks: NotionBlockNode[];
};
export type TranslationSnapshot = {
  sourceHash: string; generatedAt: string; model: string; units: TranslationUnit[];
};
export type TranslationRecord = {
  schemaVersion: 1; slug: string; revision: string;
  draft?: TranslationSnapshot; published?: TranslationSnapshot;
  /** The case video's texts (lib/reel/translate.ts): a snapshot of its own, so editing the video never hides the English case. */
  reel?: TranslationSnapshot;
};
const textKeys = new Set([
  "label", "title", "body", "lead", "foot", "heading", "intro", "caption", "alt",
  "sectionLabel", "banner", "attribution", "attributionNote", "editorialSourceNote", "indexLabel",
  "connector", "contextLabel", "context", "continuation", "categories", "date", "display", "values", "subtitle", "source", "quote", "bullets", "figure", "intersection",
]);
const caseTextKeys = new Set([
  "title", "summary", "homeTitle", "homeSummary", "homeLabel", "homeStats", "homeNote", "role", "productTag", "tags", "accentTags", "context", "challenge",
  "approach", "stats", "outcome", "learning", "attributionNote", "editorialSourceNote",
  "heroFullBleedEyebrow", "heroFullBleedTagline", "heroFullBleedContinueLabel",
]);
const embedDefaultLabels: Record<string, string> = {
  CaseStatBand: "// Resultados", CaseResultsJourney: "// Resultados · jornada",
  CaseApproachCards: "// Abordagem", CaseThanksCards: "// Agradecimentos",
};
function object(v: unknown): v is Record<string, unknown> { return !!v && typeof v === "object" && !Array.isArray(v); }
export function hashText(value: string) { return createHash("sha256").update(value).digest("hex"); }

/** Only explicit editorial fields reach the model; URLs, IDs, values and CSS stay in code. */
function mapEditorial(value: unknown, key: string, translate: (key: string, text: string) => string, enabled = false): unknown {
  if (typeof value === "string") return enabled ? translate(key, value) : value;
  if (Array.isArray(value)) return value.map((v, i) => mapEditorial(v, `${key}.${i}`, translate, enabled));
  if (!object(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapEditorial(v, `${key}.${k}`, translate, textKeys.has(k))]));
}
function mapRichText(parts: unknown, key: string, translate: (key: string, text: string) => string) {
  if (!Array.isArray(parts)) return parts;
  return parts.map((part, i) => {
    if (!object(part) || part.type !== "text" || !object(part.text) || typeof part.text.content !== "string") return part;
    const content = translate(`${key}.${i}`, part.text.content);
    return { ...part, plain_text: content, text: { ...part.text, content } };
  });
}
function mapBlocks(blocks: NotionBlockNode[], translate: (key: string, text: string) => string): NotionBlockNode[] {
  return blocks.map((block) => {
    const result = structuredClone(block);
    const payload = result[result.type];
    if (object(payload)) {
      const rt = payload.rich_text;
      const plain = Array.isArray(rt) ? rt.map(p => object(p) && object(p.text) ? p.text.content ?? "" : "").join("") : "";
      const embedMatch = plain.match(/^\s*(\[case:\s*\w+\])\s*(\{[\s\S]*\})\s*$/);
      const embedJson = embedMatch ? embedMatch[2] : block.type === "code" ? plain : undefined;
      let validEmbed = false;
      try { validEmbed = !!embedJson && !!parseCaseEmbedJson(embedMatch ? JSON.stringify({ ...JSON.parse(embedJson), component: embedMatch[1].slice(6, -1).trim() }) : embedJson!); } catch { /* malformed source remains untouched */ }
      if (embedJson && validEmbed) {
        const editorial = JSON.parse(embedJson) as Record<string, unknown>;
        const component = embedMatch ? embedMatch[1].slice(6, -1).trim() : String(editorial.component);
        if (editorial.sectionLabel === undefined && embedDefaultLabels[component]) editorial.sectionLabel = embedDefaultLabels[component];
        const translated = mapEditorial(editorial, `${block.id}.embed`, translate);
        const content = `${embedMatch ? `${embedMatch[1]} ` : ""}${JSON.stringify(translated)}`;
        payload.rich_text = [{ type: "text", plain_text: content, text: { content, link: null } }];
      } else if (block.type !== "code") {
        // Notion navigation markers are renderer instructions, never translated.
        payload.rich_text = mapRichText(rt, `${block.id}.rich_text`, (key, text) => {
          const m = text.match(/^(\s*\[-nav\s*[1-6]\]\s*)([\s\S]*?)(\s*\[\/-nav\s*[1-6]\s*\+\s*(?:true|false)\]\s*)?$/i);
          if (m) return `${m[1]}${translate(key, m[2])}${m[3] ?? ""}`;
          if (/^\s*\[\/?case:/.test(text)) return text;
          return translate(key, text);
        });
      }
      if (payload.caption) payload.caption = mapRichText(payload.caption, `${block.id}.caption`, translate);
      if (Array.isArray(payload.cells)) payload.cells = payload.cells.map((cell, i) => mapRichText(cell, `${block.id}.cells.${i}`, translate));
      if (block.type === "child_page" && typeof payload.title === "string") payload.title = translate(`${block.id}.title`, payload.title);
    }
    if (result.children) result.children = mapBlocks(result.children, translate);
    return result;
  });
}
export function mapDocument(c: Case, blocks: NotionBlockNode[], translate: (key: string, text: string) => string) {
  const mapped = Object.fromEntries(Object.entries(c).map(([key, value]) => [key,
    caseTextKeys.has(key) ? mapEditorial(value, `case.${key}`, translate, true) : value,
  ])) as unknown as Case;
  return { case: mapped, blocks: mapBlocks(blocks, translate) };
}
export function extractSource(c: Case, blocks: NotionBlockNode[]): TranslationSource {
  const units: TranslationUnit[] = [];
  mapDocument(c, blocks, (key, source) => {
    if (source.trim() && !/^https?:\/\//i.test(source.trim())) units.push({ key, source, target: "" });
    return source;
  });
  return { slug: c.slug, title: c.title, units, case: c, blocks,
    sourceHash: hashText(JSON.stringify(units.map(({ key, source }) => [key, source]))) };
}
export function applySnapshot(source: TranslationSource, snapshot: TranslationSnapshot) {
  if (source.sourceHash !== snapshot.sourceHash) throw new Error("A tradução precisa ser atualizada para esta versão do original.");
  const byKey = new Map(snapshot.units.map(unit => [unit.key, unit]));
  return mapDocument(source.case, source.blocks, (key, text) => {
    if (!text.trim() || /^https?:\/\//i.test(text.trim())) return text;
    const unit = byKey.get(key);
    if (!unit || unit.source !== text || !unit.target.trim()) throw new Error(`Tradução incompleta: ${key}`);
    return unit.target;
  });
}
/** "partial": a draft the author is still writing, where a text may still be empty (publishing stays strict). */
export function validateTargets(source: TranslationUnit[], translated: Array<{ key: string; target: string }>, mode: "generated" | "manual" | "partial" = "generated", { wordNumbers = false }: { wordNumbers?: boolean } = {}) {
  if (translated.length !== source.length) throw new Error("A IA não devolveu todos os textos.");
  const byKey = new Map(translated.map(u => [u.key, u.target]));
  if (byKey.size !== source.length) throw new Error("A IA devolveu identificadores repetidos.");
  return source.map(unit => {
    const target = byKey.get(unit.key);
    if (typeof target !== "string" || (mode !== "partial" && !target.trim())) throw new Error(`Texto ausente: ${unit.key}`);
    // Model output must preserve facts; the author can deliberately rewrite editorial text.
    if (mode === "generated") {
      // wordNumbers: "0km" counts as a word (the glossary reads it "new cars"), as in the case video's short texts
      const numbers = (text: string) => ((wordNumbers ? text.replace(/\b0\s?km\b/gi, "") : text).match(/\d+(?:[.,]\d+)?%?/g) ?? []).sort().join("|");
      if (numbers(unit.source) !== numbers(target)) throw new Error(`A tradução alterou os números: ${unit.key}`);
      const links = (text: string) => (text.match(/https?:\/\/[^\s)\]]+/g) ?? []).sort().join("|");
      if (links(unit.source) !== links(target)) throw new Error(`A tradução alterou um link: ${unit.key}`);
    }
    return { ...unit, target };
  });
}

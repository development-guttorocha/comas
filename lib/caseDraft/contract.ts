import { COMPONENT_BY_NAME } from "@/lib/admin/componentSchemas";
import type { FieldDef } from "@/lib/admin/fields";
import { componentRenders, IMAGE_SIZES, type BlockModel } from "@/lib/admin/caseBlocks";
import { RULES } from "@/lib/ai/caseComponents";
import { CHART_TYPES } from "@/lib/chartSpec";
import { FLOW_LAYOUTS, FLOW_TONES } from "@/lib/flowLayout";
import { INFO_ICON_NAMES } from "@/lib/infographicIcons";
import { PANEL_CARD_KINDS } from "@/lib/panel";
import { SPACE_SIZES } from "@/lib/caseEmbedSpace";
import { imagePath } from "./plan";

/**
 * The component schemas (lib/admin/componentSchemas.ts) as the contract of the draft: written out for
 * the prompt, and enforced on the answer. The site's own parser (`tryParseCaseEmbedParagraph`) is not
 * strict enough to be the only lock: it keeps unknown keys, turns a wrong type into "not set" without
 * a word, and accepts a Seção clara or a bento tile with nothing in it. So every prop is read here
 * against its field (type, options, the case's own images), what does not fit is dropped and said, and
 * the site's parser runs last on what is left (`componentRenders`).
 */

/** Fields the model never fills: anchors, colours and pickers that only make sense by hand. */
const SKIP_TYPES = new Set(["url", "color", "tags"]);
/** Advanced fields the draft may still use. */
const ADVANCED_KEPT = new Set(["attributionNote", "editorialSourceNote"]);
/** The props each component cannot render without (from the site's parser). */
export const REQUIRED: Record<string, string[]> = {
  CaseTitleBox: ["title", "body"], CaseSectionSplit: ["label", "body"], CaseStatement: ["body"], CaseChapter: ["title"],
  CaseBigNumber: ["value"], CaseStatBand: ["stats"], CaseIconStats: ["items"], CaseIconRatio: ["value"],
  CaseChart: ["type", "categories", "series"], CasePanel: ["cards"], CaseFlowDiagram: ["layout", "nodes"], CaseFlow: ["steps"],
  CaseTimeline: ["items"], CaseResultsJourney: ["steps"], CaseApproachCards: ["items"], CaseComparison: ["columns", "rows"],
  CaseBeforeAfter: ["before", "after"], CaseBento: ["tiles"], CaseScreens: ["screens"], CaseImageStack: ["items"],
  CaseImageCompare: ["before", "after"], CasePullQuote: ["body"], CaseResultsQuote: ["body", "attribution"], CaseThanksCards: ["items"],
};

const fieldsOf = (name: string) => (COMPONENT_BY_NAME.get(name)?.fields ?? []).filter(f => f.key !== "id" && !SKIP_TYPES.has(f.type) && (!f.advanced || ADVANCED_KEPT.has(f.key)));

/* ---------- The contract, written for the prompt ---------- */

function describe(field: FieldDef, limits: Record<string, number>, at: string): string {
  const limit = limits[at];
  const when = field.when ? ` (só quando ${field.when.key} = ${field.when.is.map(v => `"${v}"`).join(" ou ")})` : "";
  switch (field.type) {
    case "text": case "textarea": return `texto${limit ? ` até ${limit} caracteres` : ""}${field.type === "textarea" ? ", parágrafos separados por \\n\\n" : ""}${when}`;
    case "image": return `caminho de uma imagem da lista${when}`;
    case "number": return `número${when}`;
    case "boolean": return `true ou false${when}`;
    case "select": return `${field.options.map(o => JSON.stringify(o.value)).join(" | ")}${when}`;
    case "icon": return `ícone: ${INFO_ICON_NAMES.join(", ")}${when}`;
    case "focus": return `ponto de foco "x% y%" (o que não pode sair do quadro)${when}`;
    case "indices": return `lista de posições (0, 1…) de ${field.of} em destaque${when}`;
    case "group": return `{ ${field.fields.filter(f => !SKIP_TYPES.has(f.type)).map(f => `"${f.key}": ${describe(f, limits, `${at}.${f.key}`)}`).join(", ")} }`;
    case "list": return `lista de { ${field.item.filter(f => !SKIP_TYPES.has(f.type)).map(f => `"${f.key}": ${describe(f, limits, `${at}[].${f.key}`)}`).join(", ")} }`;
    default: return "texto";
  }
}

/** Props the admin edits in its own editors (chart table, flow canvas, panel cards, comparison table). */
const EXTRA: Record<string, string> = {
  CaseChart: `"type": ${CHART_TYPES.map(t => `"${t}"`).join(" | ")}, "categories": lista de rótulos (2 a 8), "series": lista de { "label": nome da série (nunca "Série 1"), "values": um número por categoria, como está no material }`,
  CaseFlowDiagram: `"layout": ${FLOW_LAYOUTS.filter(l => l !== "custom").map(l => `"${l}"`).join(" | ")} ("org" e "branch" usam "parent"), "nodes": lista de { "id": curto, "title", "subtitle"?, "body"?, "value"?, "tone"?: ${FLOW_TONES.map(t => `"${t}"`).join(" | ")}, "parent"?: id do nó de cima }`,
  CasePanel: `"cards": lista de { "kind": ${PANEL_CARD_KINDS.map(k => `"${k}"`).join(" | ")}, "title", "subtitle"?, "source"? (fonte do dado), "span"?: 1 a 3; chart → "chart": { "type", "categories", "series" como no Gráfico }; quote → "src"? (imagem da lista), "alt"?, "quote" (uma frase); stack → "items": lista de { "label", "figure" (o número), "body"? }; text → "body" e/ou "bullets" (um item por linha) }`,
  CaseComparison: `"columns": lista de { "label", "highlight"?: true } (2 a 4), "rows": lista de { "label", "values": um texto por coluna ("sim", "não", "parcial" ou texto curto) } (3 a 8)`,
};

const NATIVE_CONTRACT: Record<string, string> = {
  text: `{ "style": "paragraph" | "heading_2" | "heading_3" | "bulleted_list_item", "md": texto até 400 caracteres (Markdown simples: **negrito**) }`,
  image: `{ "src": caminho de uma imagem da lista, "caption"?: legenda até 120 caracteres, "size"?: ${IMAGE_SIZES.map(s => JSON.stringify(s.value)).join(" | ")} ("" é a largura do conteúdo; imagem alta vai em "w50") }`,
  images: `{ "images": lista de 2 a 3 { "src": caminho da lista, "caption"?: texto curto } com a mesma proporção }`,
};

/** The contract of one block type, for the fill prompt. */
export function contractOf(type: string): string {
  if (NATIVE_CONTRACT[type]) return `\`${type}\`: ${NATIVE_CONTRACT[type]}`;
  const limits = RULES[type]?.limits ?? {};
  const required = new Set(REQUIRED[type] ?? []);
  const fields = fieldsOf(type).map(f => `"${f.key}"${required.has(f.key) ? "" : "?"}: ${describe(f, limits, f.key)}`);
  const extra = EXTRA[type] ? [EXTRA[type]] : [];
  return `\`${type}\` (${COMPONENT_BY_NAME.get(type)?.label ?? type}): { ${[...extra, ...fields].join(", ")} }`;
}

/* ---------- Enforcing it ---------- */

/** What the filter took out, said in the editor's words. */
export type Dropped = { block: string; reason: string };
export type DraftBlock = { type: string; props: Record<string, unknown> };

type Ctx = { images: ReadonlySet<string>; drop: (reason: string) => void };
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
const FOCUS = /^\d{1,3}(?:\.\d+)?% \d{1,3}(?:\.\d+)?%$/;

function image(value: unknown, ctx: Ctx): string | undefined {
  const src = imagePath(value);
  if (!src) return undefined;
  if (ctx.images.has(src)) return src;
  ctx.drop(`imagem que não está no case (${src.split("/").pop()})`);
  return undefined;
}

function applies(field: FieldDef, raw: Record<string, unknown>) {
  if (!field.when) return true;
  const value = raw[field.when.key] ?? field.when.fallback;
  return field.when.is.includes(String(value));
}

/** One object read against its fields; keys the schema does not have are dropped. */
function readFields(fields: FieldDef[], raw: Record<string, unknown>, ctx: Ctx): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.key === "id" || SKIP_TYPES.has(field.type) || !applies(field, raw) || out[field.key] !== undefined) continue;
    const value = raw[field.key];
    let next: unknown;
    switch (field.type) {
      case "text": case "textarea": next = str(value); break;
      case "image": next = image(value, ctx); break;
      case "number": next = typeof value === "number" && Number.isFinite(value) ? value : undefined; break;
      case "boolean": next = typeof value === "boolean" ? value : undefined; break;
      case "select": next = field.options.find(o => String(o.value) === String(value))?.value; break;
      case "icon": next = typeof value === "string" && (INFO_ICON_NAMES as readonly string[]).includes(value) ? value : undefined; break;
      case "focus": next = typeof value === "string" && FOCUS.test(value.trim()) ? value.trim() : undefined; break;
      case "indices": next = Array.isArray(value) ? value.filter(n => Number.isInteger(n) && n >= 0) : undefined; break;
      case "group": next = record(value) ? readFields(field.fields, value, ctx) : undefined; if (record(next) && !Object.keys(next).length) next = undefined; break;
      case "list": {
        if (!Array.isArray(value)) break;
        const hasImage = field.item.some(f => f.type === "image");
        next = value.filter(record).flatMap(item => {
          const read = readFields(field.item, item, ctx);
          // an item made to show an image is nothing without it
          if (hasImage && imagePath(item.src) && !read.src) return [];
          return Object.keys(read).length ? [read] : [];
        });
        if (!(next as unknown[]).length) next = undefined;
        break;
      }
    }
    if (next !== undefined) out[field.key] = next;
  }
  return out;
}

function chartSpec(raw: Record<string, unknown>) {
  const type = (CHART_TYPES as readonly string[]).includes(raw.type as string) ? raw.type : undefined;
  const categories = Array.isArray(raw.categories) ? raw.categories.map(c => (typeof c === "string" || typeof c === "number" ? String(c).trim() : "")).filter(Boolean).slice(0, 8) : [];
  const series = (Array.isArray(raw.series) ? raw.series : []).filter(record).slice(0, 3).flatMap(s => {
    const label = str(s.label);
    const raw = Array.isArray(s.values) ? s.values as unknown[] : null;
    const values = raw ? categories.map((_, i) => { const v = raw[i]; return typeof v === "number" && Number.isFinite(v) ? v : null; }) : [];
    return label && values.some(v => v !== null) ? [{ label, values }] : [];
  });
  return type && categories.length && series.length ? { type, categories, series } : null;
}

/** Props of the admin's own editors (chart, flow, panel, comparison), kept only when well formed. */
function readExtra(name: string, raw: Record<string, unknown>, ctx: Ctx): Record<string, unknown> {
  switch (name) {
    case "CaseChart": return chartSpec(raw) ?? {};
    case "CaseFlowDiagram": {
      const layout = (FLOW_LAYOUTS as readonly string[]).includes(raw.layout as string) && raw.layout !== "custom" ? raw.layout : "linear";
      const used = new Set<string>();
      const nodes = (Array.isArray(raw.nodes) ? raw.nodes : []).filter(record).slice(0, 8).flatMap((n, i) => {
        const title = str(n.title);
        if (!title && !str(n.body) && !str(n.value)) return [];
        let id = (str(n.id) ?? `n${i + 1}`).replace(/[^\w-]/g, "").slice(0, 24) || `n${i + 1}`;
        while (used.has(id)) id = `${id}-${i + 1}`;
        used.add(id);
        const tone = (FLOW_TONES as readonly string[]).includes(n.tone as string) ? n.tone : undefined;
        return [Object.fromEntries(Object.entries({ id, title: title ?? "", subtitle: str(n.subtitle), body: str(n.body), value: str(n.value), tone, parent: str(n.parent) }).filter(([, v]) => v !== undefined))];
      });
      return nodes.length ? { layout, nodes } : {};
    }
    case "CasePanel": {
      const cards = (Array.isArray(raw.cards) ? raw.cards : []).filter(record).slice(0, 4).flatMap((c): Record<string, unknown>[] => {
        const kind = (PANEL_CARD_KINDS as readonly string[]).includes(c.kind as string) ? c.kind as string : "text";
        const span = typeof c.span === "number" && c.span >= 1 && c.span <= 3 ? Math.round(c.span) : undefined;
        const base = Object.fromEntries(Object.entries({ kind, span, title: str(c.title), subtitle: str(c.subtitle), source: str(c.source) }).filter(([, v]) => v !== undefined));
        if (kind === "chart") { const chart = record(c.chart) ? chartSpec(c.chart) : null; return chart ? [{ ...base, chart }] : []; }
        if (kind === "quote") { const src = image(c.src, ctx); const quote = str(c.quote); return src || quote ? [{ ...base, ...(src ? { src, alt: str(c.alt) ?? "" } : {}), ...(quote ? { quote } : {}) }] : []; }
        if (kind === "stack") {
          const items = (Array.isArray(c.items) ? c.items : []).filter(record).slice(0, 5).flatMap(i => (str(i.figure) ? [{ label: str(i.label) ?? "", figure: str(i.figure)!, ...(str(i.body) ? { body: str(i.body) } : {}) }] : []));
          return items.length ? [{ ...base, items }] : [];
        }
        const body = str(c.body), bullets = str(c.bullets);
        return body || bullets ? [{ ...base, ...(body ? { body } : {}), ...(bullets ? { bullets } : {}) }] : [];
      });
      return cards.length ? { cards } : {};
    }
    case "CaseComparison": {
      const columns = (Array.isArray(raw.columns) ? raw.columns : []).filter(record).slice(0, 4).flatMap(c => (str(c.label) ? [{ label: str(c.label)!, ...(c.highlight === true ? { highlight: true } : {}) }] : []));
      const rows = (Array.isArray(raw.rows) ? raw.rows : []).filter(record).slice(0, 8).flatMap(r => (str(r.label) ? [{ label: str(r.label)!, values: columns.map((_, i) => (Array.isArray(r.values) ? String(r.values[i] ?? "").trim() : "")) }] : []));
      return columns.length >= 2 && rows.length ? { columns, rows } : {};
    }
    default: return {};
  }
}

const SPACE = (value: unknown) => (typeof value === "string" && (SPACE_SIZES as readonly string[]).includes(value) ? value : undefined);

/**
 * A block of the model's answer read against its schema. Returns the block model for the editor, or
 * null with the reason when it cannot be trusted (unknown type, missing required props, the site
 * would not render it). `drop` collects what was taken out along the way.
 */
export function readDraftBlock(raw: DraftBlock, images: ReadonlySet<string>, drop: (reason: string) => void): BlockModel | null {
  const ctx: Ctx = { images, drop };
  const p = record(raw.props) ? raw.props : {};
  switch (raw.type) {
    case "text": {
      const style = ["paragraph", "heading_2", "heading_3", "bulleted_list_item"].includes(p.style as string) ? p.style as "paragraph" : "paragraph";
      const md = str(p.md);
      return md ? { kind: "text", style, md, lossy: false } : null;
    }
    case "image": {
      const src = image(p.src, ctx);
      if (!src) return null;
      const size = IMAGE_SIZES.find(s => s.value === p.size)?.value ?? "";
      return { kind: "image", src, caption: str(p.caption) ?? "", mobileSrc: "", size, crop: "", mobileCrop: "", background: true, border: true, spaceTop: "", spaceBottom: "" };
    }
    case "images": {
      const list = (Array.isArray(p.images) ? p.images : []).filter(record).slice(0, 3).flatMap(i => { const src = image(i.src, ctx); return src ? [{ src, caption: str(i.caption) ?? "", mobileSrc: "" }] : []; });
      return list.length >= 2 ? { kind: "images", images: list } : null;
    }
  }
  const def = COMPONENT_BY_NAME.get(raw.type);
  if (!def || RULES[raw.type]?.generator === "evitar") return null;
  const props: Record<string, unknown> = { ...readExtra(raw.type, p, ctx), ...readFields(fieldsOf(raw.type), p, ctx) };
  const top = SPACE(p.spaceTop), bottom = SPACE(p.spaceBottom);
  if (top) props.spaceTop = top;
  if (bottom) props.spaceBottom = bottom;
  const missing = (REQUIRED[raw.type] ?? []).filter(key => props[key] === undefined);
  if (missing.length) { drop(`faltou ${missing.join(", ")}`); return null; }
  const model = { kind: "component" as const, name: raw.type, props };
  if (!componentRenders(model)) { drop("o site não renderiza com estes campos"); return null; }
  return model;
}

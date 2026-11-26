import { numbersIn } from "@/lib/caseMaterial";
import type { BlockModel } from "@/lib/admin/caseBlocks";

/**
 * "Não inventar", in code. The draft may only use numbers written in its source (the material, or the
 * case's current text when the material is empty) and only quote words that are really someone's.
 * Everything else is cut before the editor sees it: a sentence with an invented number goes; a figure
 * slot (a big number, a stat, a chart) with one takes its item or its block along; a testimonial that
 * is not literal is dropped whole.
 */
export type DraftSource = {
  /** What the AI reads: the material as Markdown, or the case's text. */
  text: string;
  /** Number values written in the source (17,8 → 17.8; 1.200 → 1200). */
  numbers: Set<number>;
  /** Literal quotes: the material's testimonials; null means "anything literal in the text". */
  quotes: string[] | null;
};

/** Numbers spelled out count as written: "dois designers" lets the draft say "2 designers". */
const WORDS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, "três": 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, doze: 12, quinze: 15, vinte: 20, cem: 100, mil: 1000 };

export function draftSource(text: string, quotes: string[] | null): DraftSource {
  const numbers = new Set(numbersIn(text).map(n => n.value));
  for (const word of text.toLowerCase().match(/\p{L}+/gu) ?? []) if (WORDS[word] !== undefined) numbers.add(WORDS[word]);
  return { text, numbers, quotes };
}

export const hasNumber = (source: DraftSource, n: number) => [...source.numbers].some(x => Math.abs(x - n) < 1e-9);

/** Text compared loosely: no accents, quotes, stars or punctuation, single spaces. */
export const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[*“”"'‘’«»]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").toLowerCase().trim();

/** True when `quote` is someone's literal words in the source (a cut of it is fine, a rewrite is not). */
export function isLiteral(source: DraftSource, quote: string): boolean {
  const q = plain(quote);
  if (q.length < 12) return false;
  return source.quotes ? source.quotes.some(x => plain(x).includes(q)) : plain(source.text).includes(q);
}

/** Keys that hold structure, not prose: their digits are positions, sizes or ids. */
const STRUCTURE = new Set(["id", "src", "poster", "alt", "focus", "color", "layout", "kind", "size", "tone", "ratio", "frame", "background", "icon", "type", "number", "indexLabel", "span", "look", "spaceTop", "spaceBottom", "columns", "mirror", "start", "decimals", "yMin", "yMax", "max", "highlight", "emphasizeIndices", "parent", "curve", "style", "display_mode"]);
/**
 * Short fields that are the figure itself: an invented number there takes the whole item. Chart
 * categories and table cells too, so a chart never loses one column and keeps the others.
 */
const FIGURES = new Set(["value", "figure", "display", "date", "categories", "values"]);

const DROP = Symbol("drop");
type Scrubbed = unknown | typeof DROP;

/** Sentences without the invented numbers; "" when nothing is left. */
function cutSentences(text: string, bad: (s: string) => boolean): string {
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs
    .map(p => (p.match(/[^.!?…]+(?:[.!?…]+["”’)]?|$)/g) ?? [p]).filter(s => s.trim() && !bad(s)).join("").trim())
    .filter(Boolean).join("\n\n");
}

/**
 * Takes out what the source does not back. Returns the scrubbed value, or DROP when the container
 * (a list item, or the block itself at the top) must go. `say` records each cut.
 */
function scrub(value: unknown, key: string, source: DraftSource, say: (reason: string) => void): Scrubbed {
  if (STRUCTURE.has(key)) return value;
  if (typeof value === "number") {
    if (hasNumber(source, value)) return value;
    say(`número ${String(value).replace(".", ",")} que não está no material`);
    return DROP;
  }
  if (typeof value === "string") {
    const invented = (s: string) => numbersIn(s).filter(n => !hasNumber(source, n.value));
    const found = invented(value);
    if (!found.length) return value;
    say(`número ${found.map(n => n.written).join(", ")} que não está no material`);
    if (FIGURES.has(key)) return DROP;
    const cut = cutSentences(value, s => invented(s).length > 0);
    return cut || undefined;
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) {
      const next = scrub(item, key, source, say);
      // a list of figures (chart values) is all or nothing; a list of items loses the bad item
      if (next === DROP) { if (item !== null && typeof item === "object") continue; return DROP; }
      if (next !== undefined) out.push(next);
    }
    return out;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const next = scrub(v, k, source, say);
      if (next === DROP) return DROP;
      if (next !== undefined) out[k] = next;
    }
    return out;
  }
  return value;
}

/** One loose value (a case.json field) as far as the source backs it; undefined when nothing is left. */
export function enforceSourceValue(value: unknown, key: string, source: DraftSource, say: (reason: string) => void): unknown {
  const next = scrub(value, key, source, say);
  return next === DROP ? undefined : next;
}

/** Testimonials must be literal: a CaseResultsQuote whole, a bento quote tile by itself. */
function checkQuotes(model: Extract<BlockModel, { kind: "component" }>, source: DraftSource, say: (reason: string) => void): Extract<BlockModel, { kind: "component" }> | null {
  const p = model.props;
  if (model.name === "CaseResultsQuote") {
    if (typeof p.body === "string" && isLiteral(source, p.body)) return model;
    say("depoimento que não é a fala literal do material");
    return null;
  }
  if (model.name === "CaseBento" && Array.isArray(p.tiles)) {
    const tiles = (p.tiles as Record<string, unknown>[]).filter(t => {
      if (t.kind !== "quote") return true;
      const ok = typeof t.body === "string" && isLiteral(source, t.body);
      if (!ok) say("citação no bento que não é literal");
      return ok;
    });
    return tiles.length ? { ...model, props: { ...p, tiles } } : null;
  }
  return model;
}

/**
 * The block as far as the source backs it, or null when nothing trustworthy is left. The caller runs
 * the schema again afterwards: cutting a sentence can empty a required field.
 */
export function enforceSource(model: BlockModel, source: DraftSource, say: (reason: string) => void): BlockModel | null {
  if (model.kind === "text") {
    const md = scrub(model.md, "md", source, say);
    return md === DROP || typeof md !== "string" || !md ? null : { ...model, md };
  }
  if (model.kind === "image") {
    const caption = scrub(model.caption, "caption", source, say);
    return { ...model, caption: typeof caption === "string" ? caption : "" };
  }
  if (model.kind === "images") {
    return { ...model, images: model.images.map(i => { const c = scrub(i.caption, "caption", source, say); return { ...i, caption: typeof c === "string" ? c : "" }; }) };
  }
  if (model.kind !== "component") return model;
  const quoted = checkQuotes(model, source, say);
  if (!quoted) return null;
  const props = scrub(quoted.props, "", source, say);
  if (props === DROP || !props || typeof props !== "object") return null;
  return { ...quoted, props: props as Record<string, unknown> };
}

/**
 * A matéria-prima de um case, organizada: o que a IA tirou dos arquivos, textos e da conversa com o
 * Gutto (aba Material do admin, um chat: lib/material/chat.ts), cada item com a origem (arquivo, slide ou página, trecho literal) para ele
 * conferir. É a entrada do gerador de cases. Vive em `content/cases/<slug>/material.json`, só no
 * admin: o site nunca lê esse arquivo. Os originais ficam em `.admin/material/<slug>/`
 * (`lib/material/sources.ts`).
 *
 * "Não inventar", aqui: um item da IA só vira fato quando cada número dele está no trecho de origem e,
 * num depoimento, a fala está palavra por palavra no material. O resto (e as suposições da IA) fica marcado no painel e fora
 * do que o gerador lê. O que o Gutto escreveu ou confirmou vale como fonte.
 *
 * Este módulo não toca no disco (serve ao navegador e aos testes).
 */

/** Where an item came from. `source: "gutto"` is Gutto's own word (an answer, a confirmation). */
export type MaterialOrigin = {
  source: string;
  /** The file's name, or "Texto colado", or "Você". */
  file: string;
  /** "slide 4", "página 2", "trecho 3", or the question Gutto answered. */
  where?: string;
  /** The literal words of the source that back the item. */
  excerpt?: string;
};

/** Who wrote the item: the AI (checked against its origins) or Gutto (trusted). Absent = Gutto. */
/** `assumed`: the AI went on with a guess instead of asking; it shows as such and stays out until confirmed. */
type Meta = { origins?: MaterialOrigin[]; by?: "ia" | "gutto"; edited?: boolean; assumed?: boolean };

export type MaterialText = Meta & { text: string };
export type MaterialDecision = Meta & { decision?: string; why?: string; tradeoff?: string };
/** `value` como foi escrito ("+46%", "17,8M"); `before`, o número de antes; `source`, onde foi medido. */
export type MaterialResult = Meta & { metric?: string; before?: string; value?: string; source?: string };
export type MaterialQuote = Meta & { text?: string; author?: string; role?: string };
/** Something the material does not say: a short question; Gutto's answer becomes a source. */
export type MaterialQuestion = { id: string; text: string; field?: string; answer?: string };

export const SCALAR_KEYS = ["company", "product", "period", "problem", "roleTitle", "roleTeam", "rolePartners", "changes"] as const;
export type ScalarKey = (typeof SCALAR_KEYS)[number];
export const SCALAR_LABELS: Record<ScalarKey, string> = {
  company: "Empresa", product: "Produto", period: "Período", problem: "Problema de negócio",
  roleTitle: "Função", roleTeam: "Tamanho do time", rolePartners: "Com quem trabalhou", changes: "O que deu errado ou mudou",
};

export type CaseMaterial = Partial<Record<ScalarKey, MaterialText>> & {
  decisions?: MaterialDecision[];
  results?: MaterialResult[];
  quotes?: MaterialQuote[];
  questions?: MaterialQuestion[];
  /** Items Gutto removed: a new organization does not bring them back. */
  dismissed?: string[];
  /** The last organization: when, its cost and how many sources it read. */
  organized?: { at: string; tokens: number; calls: number; sources: number };
  /** Legacy free notes (first version of the tab). */
  notes?: string;
};

export type ListKey = "decisions" | "results" | "quotes";
export const LIST_FIELDS: Record<ListKey, string[]> = {
  decisions: ["decision", "why", "tradeoff"],
  results: ["metric", "before", "value", "source"],
  quotes: ["text", "author", "role"],
};

const LIMIT = { short: 300, long: 20_000, notes: 100_000, items: 30, excerpt: 1200 };

const str = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.slice(0, max) : undefined);

function origins(value: unknown): MaterialOrigin[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value.flatMap(o => {
    if (!o || typeof o !== "object") return [];
    const r = o as Record<string, unknown>;
    const source = str(r.source, 80), file = str(r.file, 200);
    if (!source || !file) return [];
    const out: MaterialOrigin = { source, file };
    const where = str(r.where, 300), excerpt = str(r.excerpt, LIMIT.excerpt);
    if (where) out.where = where;
    if (excerpt) out.excerpt = excerpt;
    return [out];
  }).slice(0, 6);
  return list.length ? list : undefined;
}

function meta(r: Record<string, unknown>): Meta {
  const m: Meta = {};
  const o = origins(r.origins);
  if (o) m.origins = o;
  if (r.by === "ia") m.by = "ia";
  if (r.edited === true) m.edited = true;
  if (r.assumed === true) m.assumed = true;
  return m;
}

function scalar(value: unknown, max: number): MaterialText | undefined {
  if (typeof value === "string") return value.trim() ? { text: value.slice(0, max) } : undefined;
  if (!value || typeof value !== "object") return undefined;
  const r = value as Record<string, unknown>;
  const text = str(r.text, max);
  return text ? { text, ...meta(r) } : undefined;
}

function list(value: unknown, keys: Record<string, number>) {
  if (!Array.isArray(value)) return undefined;
  const items = value.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const r = item as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, max] of Object.entries(keys)) { const v = str(r[key], max); if (v) out[key] = v; }
    return Object.keys(out).length ? [{ ...out, ...meta(r) }] : [];
  }).slice(0, LIMIT.items);
  return items.length ? items : undefined;
}

/**
 * The material in its known shape: unknown keys, non-text values and empty items dropped. Accepts the
 * first version's plain strings (`problem: "…"`, `role: { title }`). Never throws.
 */
export function parseMaterial(value: unknown): CaseMaterial {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const role = raw.role && typeof raw.role === "object" ? raw.role as Record<string, unknown> : {};
  const m: CaseMaterial = {
    company: scalar(raw.company, LIMIT.short),
    product: scalar(raw.product, LIMIT.short),
    period: scalar(raw.period, LIMIT.short),
    problem: scalar(raw.problem, LIMIT.long),
    roleTitle: scalar(raw.roleTitle ?? role.title, LIMIT.short),
    roleTeam: scalar(raw.roleTeam ?? role.team, LIMIT.short),
    rolePartners: scalar(raw.rolePartners ?? role.partners, LIMIT.long),
    changes: scalar(raw.changes, LIMIT.long),
    decisions: list(raw.decisions, { decision: LIMIT.long, why: LIMIT.long, tradeoff: LIMIT.long }) as MaterialDecision[] | undefined,
    results: list(raw.results, { metric: LIMIT.short, before: LIMIT.short, value: LIMIT.short, source: LIMIT.long }) as MaterialResult[] | undefined,
    quotes: list(raw.quotes, { text: LIMIT.long, author: LIMIT.short, role: LIMIT.short }) as MaterialQuote[] | undefined,
    notes: str(raw.notes, LIMIT.notes),
  };
  if (Array.isArray(raw.questions)) {
    const qs = raw.questions.flatMap((q, i) => {
      if (!q || typeof q !== "object") return [];
      const r = q as Record<string, unknown>;
      const text = str(r.text, 400);
      if (!text) return [];
      const out: MaterialQuestion = { id: str(r.id, 40) ?? `q${i + 1}`, text };
      const field = str(r.field, 40), answer = str(r.answer, LIMIT.long);
      if (field) out.field = field;
      if (answer) out.answer = answer;
      return [out];
    }).slice(0, 20);
    if (qs.length) m.questions = qs;
  }
  if (Array.isArray(raw.dismissed)) {
    const d = raw.dismissed.filter((x): x is string => typeof x === "string" && !!x).slice(-200);
    if (d.length) m.dismissed = d;
  }
  if (raw.organized && typeof raw.organized === "object") {
    const o = raw.organized as Record<string, unknown>;
    if (typeof o.at === "string") m.organized = { at: o.at, tokens: Number(o.tokens) || 0, calls: Number(o.calls) || 0, sources: Number(o.sources) || 0 };
  }
  for (const key of Object.keys(m) as (keyof CaseMaterial)[]) if (m[key] === undefined) delete m[key];
  return m;
}

/** No fact, question or note: the generator then reads the case's own text instead. */
export function isEmptyMaterial(m: CaseMaterial): boolean {
  const p = parseMaterial(m);
  return !SCALAR_KEYS.some(k => p[k]) && !p.decisions && !p.results && !p.quotes && !p.notes;
}

// ── números ──────────────────────────────────────────────────────────────────

/**
 * Numbers as people write them: "1.200" (thousands), "5,2" and "5.2" (decimals), "17,8M".
 * Digits stuck to letters on the left (e.g. "B2B", "H1") are names, not numbers.
 */
const NUMBER = /(?<![\p{L}\d])(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)/gu;

/** "1.200" → 1200; "5,2" → 5.2; "5.2" → 5.2; "1.200,5" → 1200.5. */
export function parseWrittenNumber(written: string): number {
  const s = written.trim();
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(s)) return Number(s.replace(/\./g, "").replace(",", "."));
  return Number(s.replace(",", "."));
}

export function numbersIn(textValue: string): { written: string; value: number }[] {
  return [...textValue.matchAll(NUMBER)].map(match => ({ written: match[1], value: parseWrittenNumber(match[1]) })).filter(n => Number.isFinite(n.value));
}

/** Spelled-out numbers count as written: "dois designers" backs "2 designers". */
const WORDS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, "três": 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, quinze: 15, vinte: 20, trinta: 30, cem: 100, mil: 1000 };
function valuesIn(text: string): number[] {
  return [...numbersIn(text).map(n => n.value), ...(text.toLowerCase().match(/\p{L}+/gu) ?? []).flatMap(w => (WORDS[w] !== undefined ? [WORDS[w]] : []))];
}

/** Text compared loosely: no accents, quotes or punctuation, single spaces. */
export const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[*“”"'‘’«»]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").toLowerCase().trim();

// ── checagem de cada item ────────────────────────────────────────────────────

export type AnyItem = MaterialText | MaterialDecision | MaterialResult | MaterialQuote;
const textsOf = (item: AnyItem): string[] => Object.entries(item).filter(([k, v]) => typeof v === "string" && k !== "by").map(([, v]) => v as string);

const trusted = (item: Meta) => item.by !== "ia" || !!item.origins?.some(o => o.source === "gutto");

/**
 * What keeps an AI item from being a fact: no literal excerpt behind it, a number its excerpts do not
 * contain, or (in a testimonial) words that are not literally in the material. Empty = a fact.
 */
export function itemProblems(item: AnyItem, kind?: ListKey): string[] {
  if (trusted(item)) return [];
  if (item.assumed) return ["suposição da IA, falta você confirmar"];
  const excerpts = (item.origins ?? []).map(o => o.excerpt ?? "").filter(Boolean);
  if (!excerpts.length) return ["sem trecho de origem no material"];
  const backed = new Set(excerpts.flatMap(valuesIn));
  const problems: string[] = [];
  const missing = [...new Set(textsOf(item).flatMap(numbersIn).filter(n => ![...backed].some(v => Math.abs(v - n.value) < 1e-9)).map(n => n.written))];
  if (missing.length) problems.push(`${missing.length > 1 ? "números" : "número"} ${missing.join(", ")} sem trecho de origem`);
  if (kind === "quotes") {
    const q = plain((item as MaterialQuote).text ?? "");
    if (!q || !excerpts.some(e => plain(e).includes(q))) problems.push("a fala não está palavra por palavra no material");
  }
  return problems;
}

export const isFact = (item: AnyItem, kind?: ListKey) => itemProblems(item, kind).length === 0;

/** A short mark of an item, to remember the ones Gutto removed. */
export function fingerprint(item: AnyItem): string {
  const main = "decision" in item ? item.decision : "metric" in item || "value" in item ? `${(item as MaterialResult).metric ?? ""} ${(item as MaterialResult).value ?? ""}` : (item as MaterialText).text;
  return plain(main ?? "").slice(0, 90);
}

/**
 * What remembers a removed item: its text and the literal words it came from. The AI may word the
 * same fact differently next time; the excerpt from the file stays the same.
 */
export function dismissKeys(item: AnyItem): string[] {
  const excerpt = item.origins?.find(o => o.excerpt)?.excerpt;
  return [fingerprint(item), ...(excerpt ? [`e:${plain(excerpt).slice(0, 120)}`] : [])].filter(k => k && k !== "e:");
}
export function isDismissed(item: AnyItem, dismissed: Set<string>): boolean {
  const keys = dismissKeys(item);
  if (keys.some(k => dismissed.has(k))) return true;
  // The same fact reworded around the removed words ("Carteira: retirada…" after "Retirada…").
  const print = fingerprint(item);
  return [...dismissed].some(d => !d.startsWith("e:") && d.length >= 20 && print.includes(d));
}

/** Gutto wrote it, edited it or confirmed it: a new organization keeps it as it is. */
export const isMine = (item: AnyItem) => item.by !== "ia" || item.edited === true || !!item.origins?.some(o => o.source === "gutto");

/** Only what passed the checks: what the generator may read. */
export function factsOnly(m: CaseMaterial): CaseMaterial {
  const p = parseMaterial(m);
  const out: CaseMaterial = {};
  for (const key of SCALAR_KEYS) if (p[key] && isFact(p[key]!)) out[key] = p[key];
  for (const key of ["decisions", "results", "quotes"] as const) {
    const items = (p[key] as AnyItem[] | undefined)?.filter(i => isFact(i, key));
    if (items?.length) (out as Record<string, unknown>)[key] = items;
  }
  if (p.notes) out.notes = p.notes;
  return out;
}

/** How many items are facts and how many wait for Gutto. */
export function materialCounts(m: CaseMaterial) {
  const p = parseMaterial(m);
  let facts = 0, flagged = 0;
  for (const key of SCALAR_KEYS) if (p[key]) { if (isFact(p[key]!)) facts++; else flagged++; }
  for (const key of ["decisions", "results", "quotes"] as const) for (const i of (p[key] as AnyItem[] | undefined) ?? []) { if (isFact(i, key)) facts++; else flagged++; }
  return { facts, flagged, decisions: p.decisions?.length ?? 0, open: p.questions?.filter(q => !q.answer?.trim()).length ?? 0 };
}

// ── números e citações, para a trava de "não inventar" do gerador ───────────

export type MaterialNumber = { written: string; value: number; where: string; source?: string; metric?: string };
export type MaterialQuoteFact = { text: string; author?: string; role?: string; where: string };

const originLabel = (o: MaterialOrigin) => [o.file, o.where].filter(Boolean).join(", ");

/** Every number of the facts, with where it is; results carry their source. */
export function materialNumbers(m: CaseMaterial): MaterialNumber[] {
  const f = factsOnly(m);
  const out: MaterialNumber[] = [];
  const add = (where: string, text: string | undefined, extra: { source?: string; metric?: string } = {}) => {
    if (text) for (const n of numbersIn(text)) out.push({ ...n, where, ...extra });
  };
  for (const key of SCALAR_KEYS) add(SCALAR_LABELS[key], f[key]?.text);
  f.decisions?.forEach((d, i) => { add(`Decisão ${i + 1}`, d.decision); add(`Decisão ${i + 1} · porquê`, d.why); add(`Decisão ${i + 1} · abriu mão`, d.tradeoff); });
  f.results?.forEach((r, i) => {
    const extra = { ...(r.source ? { source: r.source } : r.origins?.[0] ? { source: originLabel(r.origins[0]) } : {}), ...(r.metric ? { metric: r.metric } : {}) };
    add(`Resultado ${i + 1} · antes`, r.before, extra);
    add(`Resultado ${i + 1} · depois`, r.value, extra);
  });
  f.quotes?.forEach((q, i) => add(`Depoimento ${i + 1}`, q.text));
  return out;
}

/** The literal testimonials (facts only), with author and role. Only these may appear as someone's words. */
export function materialQuotes(m: CaseMaterial): MaterialQuoteFact[] {
  return (factsOnly(m).quotes ?? []).flatMap((q, i) => (q.text?.trim() ? [{ text: q.text.trim(), author: q.author?.trim() || undefined, role: q.role?.trim() || undefined, where: `Depoimento ${i + 1}` }] : []));
}

/** True when `n` is written in the facts as it is (no number calculated or rounded). */
export const hasMaterialNumber = (m: CaseMaterial, n: number) => materialNumbers(m).some(x => Math.abs(x.value - n) < 1e-9);

/** True when `quote` is literally (all of, or a cut of) one of the testimonials. */
export function isLiteralQuote(m: CaseMaterial, quote: string): boolean {
  const q = plain(quote);
  return q.length > 0 && materialQuotes(m).some(x => plain(x.text).includes(q));
}

// ── leitura para o prompt ────────────────────────────────────────────────────

const trecho = (item: Meta, pad = "   ") => (item.origins ?? []).filter(o => o.excerpt).slice(0, 2).map(o => `${pad}- Trecho (${originLabel(o)}): “${o.excerpt}”`).join("\n");

/**
 * The facts as Markdown for the generator's prompt, each with the literal excerpt it came from. Items
 * that did not pass the checks are left out, so every number here is written in the original files
 * (or was given by Gutto).
 */
export function materialToMarkdown(m: CaseMaterial): string {
  const f = factsOnly(m);
  const parts: string[] = [];
  const line = (key: ScalarKey) => (f[key] ? `- ${SCALAR_LABELS[key]}: ${f[key]!.text}` : "");
  const section = (title: string, lines: string[]) => { const body = lines.filter(Boolean); if (body.length) parts.push(`## ${title}\n${body.join("\n")}`); };
  section("Contexto", [line("company"), line("product"), line("period")]);
  if (f.problem) parts.push(`## Problema de negócio\n${f.problem.text}${trecho(f.problem, "") ? `\n${trecho(f.problem, "")}` : ""}`);
  section("Papel do Gutto", [line("roleTitle"), line("roleTeam"), line("rolePartners")]);
  if (f.decisions?.length) parts.push(`## Decisões\n${f.decisions.map((d, i) => [`${i + 1}. ${d.decision ?? "(decisão sem título)"}`, d.why ? `   - Por quê: ${d.why}` : "", d.tradeoff ? `   - Abriu mão de: ${d.tradeoff}` : "", trecho(d)].filter(Boolean).join("\n")).join("\n")}`);
  if (f.results?.length) parts.push(`## Resultados (cada número com a origem)\n${f.results.map(r => [`- ${[r.metric, r.before ? `antes ${r.before}` : "", r.value ? `${r.before ? "depois " : ""}${r.value}` : ""].filter(Boolean).join(": ")}${r.source ? ` (medido em: ${r.source})` : ""}`, trecho(r)].filter(Boolean).join("\n")).join("\n")}`);
  if (f.quotes?.length) parts.push(`## Depoimentos literais (use palavra por palavra)\n${f.quotes.filter(q => q.text).map(q => `> “${q.text}”\n> — ${[q.author, q.role].filter(Boolean).join(", ") || "autor não informado"}`).join("\n\n")}`);
  if (f.changes) parts.push(`## O que deu errado ou mudou no caminho\n${f.changes.text}`);
  if (f.notes) parts.push(`## Anotações soltas do Gutto\n${f.notes}`);
  return parts.join("\n\n");
}

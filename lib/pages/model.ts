/**
 * Editable pages: each page declares its fields (lib/pages/schemas.ts) and keeps its content in
 * `content/pages/<slug>.json`. Safe on both sides; `lib/pages/store.ts` reads and writes the files.
 *
 * Text fields hold both languages, `{ pt, en, enFrom }`: `enFrom` is the Portuguese the English was written
 * from, so a later change in Portuguese shows the English as out of date. Links, e-mails and other plain
 * values are the same in both languages and hold a single string.
 */
import type { SiteLocale } from "@/lib/siteLocale";

export type Localized = { pt: string; en: string; enFrom?: string };

export type FieldDef =
  /** Translated: Portuguese and English side by side. */
  | { key: string; label: string; type: "text" | "textarea"; hint?: string }
  /** The same in both languages. */
  | { key: string; label: string; type: "plain" | "url" | "email"; hint?: string }
  | { key: string; label: string; type: "list"; itemLabel: string; item: FieldDef[]; hint?: string };

/**
 * `section`: groups of one file shown on a screen of their own in the admin (the site's SEO);
 * `preview`: the page whose share card the admin shows beside the group.
 */
export type PageGroup = { label: string; hint?: string; fields: FieldDef[]; section?: "seo"; preview?: string };
export type PageSchema = {
  slug: string;
  label: string;
  description: string;
  paths: Record<SiteLocale, string>;
  groups: PageGroup[];
};
export type PageValues = Record<string, unknown>;

export const isTranslated = (field: FieldDef) => field.type === "text" || field.type === "textarea";
export const schemaFields = (schema: PageSchema) => schema.groups.flatMap(group => group.fields);

const record = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null);
const str = (value: unknown) => (typeof value === "string" ? value : "");

function normalizeField(field: FieldDef, raw: unknown, fallback: unknown): unknown {
  if (field.type === "list") {
    const items = Array.isArray(raw) ? raw : Array.isArray(fallback) ? fallback : [];
    return items.map(item => normalizeFields(field.item, item, {}));
  }
  if (isTranslated(field)) {
    const value = record(raw), base = record(fallback);
    const pt = value ? str(value.pt) : str(base?.pt);
    const en = value ? str(value.en) : str(base?.en);
    const enFrom = value ? (typeof value.enFrom === "string" ? value.enFrom : undefined) : (typeof base?.enFrom === "string" ? base.enFrom : base ? pt : undefined);
    return enFrom === undefined ? { pt, en } : { pt, en, enFrom };
  }
  return typeof raw === "string" ? raw : str(fallback);
}

/** Whatever the file holds, the page's exact shape: unknown keys dropped, missing ones from the defaults. */
export function normalizeFields(fields: FieldDef[], raw: unknown, fallback: PageValues): PageValues {
  const value = record(raw) ?? {};
  return Object.fromEntries(fields.map(field => [field.key, normalizeField(field, field.key in value ? value[field.key] : undefined, fallback[field.key])]));
}

type Resolved<V> = { [K in keyof V]: V[K] extends Localized ? string : V[K] extends Array<infer I> ? Array<Resolved<I>> : V[K] };

/** The page in one language: English falls back to the Portuguese while it is still empty. */
export function resolveFields<V = Record<string, unknown>>(fields: FieldDef[], values: PageValues, locale: SiteLocale): Resolved<V> {
  return Object.fromEntries(fields.map(field => {
    const value = values[field.key];
    if (field.type === "list") return [field.key, (Array.isArray(value) ? value : []).map(item => resolveFields(field.item, item as PageValues, locale))];
    if (isTranslated(field)) {
      const text = value as Localized;
      return [field.key, locale === "en" ? (text.en.trim() ? text.en : text.pt) : text.pt];
    }
    return [field.key, value];
  })) as Resolved<V>;
}

export type TextState = "ok" | "missing" | "stale";
export function textState(text: Localized): TextState {
  if (!text.pt.trim()) return "ok";
  if (!text.en.trim()) return "missing";
  return text.enFrom !== undefined && text.enFrom !== text.pt ? "stale" : "ok";
}

type Leaf = { path: string; text: Localized };
function leaves(fields: FieldDef[], values: PageValues, prefix = ""): Leaf[] {
  return fields.flatMap(field => {
    const value = values[field.key];
    if (field.type === "list") return (Array.isArray(value) ? value : []).flatMap((item, i) => leaves(field.item, item as PageValues, `${prefix}${field.key}.${i}.`));
    return isTranslated(field) ? [{ path: `${prefix}${field.key}`, text: value as Localized }] : [];
  });
}

/** How many texts still need English: missing, or written from an older Portuguese. */
export function translationCounts(fields: FieldDef[], values: PageValues) {
  const states = leaves(fields, values).map(leaf => textState(leaf.text));
  return { total: states.length, missing: states.filter(s => s === "missing").length, stale: states.filter(s => s === "stale").length };
}

/** The texts to send for translation, keyed by their path in the page. */
export function pendingUnits(fields: FieldDef[], values: PageValues) {
  return leaves(fields, values).filter(leaf => textState(leaf.text) !== "ok").map(leaf => ({ key: leaf.path, source: leaf.text.pt, target: leaf.text.en }));
}

/** Writes translated English back, remembering which Portuguese it came from. */
export function applyUnits(fields: FieldDef[], values: PageValues, units: Array<{ key: string; source: string; target: string }>): PageValues {
  const next = structuredClone(values);
  for (const unit of units) {
    const path = unit.key.split(".");
    let node: unknown = next;
    for (const step of path.slice(0, -1)) node = Array.isArray(node) ? node[Number(step)] : (node as Record<string, unknown>)?.[step];
    const text = (node as Record<string, Localized> | undefined)?.[path.at(-1)!];
    if (text && typeof text === "object" && text.pt === unit.source) Object.assign(text, { en: unit.target, enFrom: unit.source });
  }
  return normalizeFields(fields, next, {});
}

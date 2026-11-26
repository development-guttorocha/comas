import assert from "node:assert/strict";
import test from "node:test";
import { applyUnits, normalizeFields, pendingUnits, resolveFields, schemaFields, translationCounts, type FieldDef } from "./model";
import { PAGE_DEFAULTS } from "./defaults";
import { PAGE_SCHEMAS } from "./schemas";

const fields: FieldDef[] = [
  { key: "title", label: "Título", type: "text" },
  { key: "email", label: "E-mail", type: "email" },
  { key: "items", label: "Itens", type: "list", itemLabel: "Item", item: [
    { key: "label", label: "Nome", type: "text" },
    { key: "href", label: "Link", type: "url" },
  ] },
];
const defaults = { title: { pt: "Olá", en: "Hello" }, email: "a@b.c", items: [{ label: { pt: "Um", en: "One" }, href: "https://x.y" }] };

test("defaults fill a missing file and count as translated", () => {
  const values = normalizeFields(fields, null, defaults);
  assert.deepEqual(values.title, { pt: "Olá", en: "Hello", enFrom: "Olá" });
  assert.deepEqual(translationCounts(fields, values), { total: 2, missing: 0, stale: 0 });
});

test("the file wins over the defaults, and unknown keys are dropped", () => {
  const values = normalizeFields(fields, { title: { pt: "Oi", en: "" }, email: "z@z.z", junk: 1, items: [] }, defaults);
  assert.deepEqual(values, { title: { pt: "Oi", en: "" }, email: "z@z.z", items: [] });
});

test("English is pending when missing or written from an older Portuguese", () => {
  const values = normalizeFields(fields, {
    title: { pt: "Oi de novo", en: "Hello", enFrom: "Olá" },
    email: "a@b.c",
    items: [{ label: { pt: "Dois", en: "" }, href: "https://x.y" }, { label: { pt: "Três", en: "Three", enFrom: "Três" }, href: "" }],
  }, defaults);
  assert.deepEqual(translationCounts(fields, values), { total: 3, missing: 1, stale: 1 });
  assert.deepEqual(pendingUnits(fields, values).map(u => u.key), ["title", "items.0.label"]);
});

test("translations land on their path and record their source", () => {
  const values = normalizeFields(fields, { title: { pt: "Oi", en: "" }, email: "", items: [{ label: { pt: "Dois", en: "" }, href: "" }] }, defaults);
  const next = applyUnits(fields, values, [{ key: "title", source: "Oi", target: "Hi" }, { key: "items.0.label", source: "Dois", target: "Two" }]);
  assert.deepEqual(next.title, { pt: "Oi", en: "Hi", enFrom: "Oi" });
  assert.deepEqual((next.items as Array<{ label: unknown }>)[0].label, { pt: "Dois", en: "Two", enFrom: "Dois" });
  // A Portuguese edited while the translation ran keeps its English pending.
  const raced = applyUnits(fields, values, [{ key: "title", source: "Outro", target: "Other" }]);
  assert.deepEqual(raced.title, { pt: "Oi", en: "" });
});

test("each language reads its own text; empty English falls back to Portuguese", () => {
  const values = normalizeFields(fields, { title: { pt: "Oi", en: "" }, email: "a@b.c", items: [{ label: { pt: "Um", en: "One" }, href: "h" }] }, defaults);
  assert.deepEqual(resolveFields(fields, values, "en"), { title: "Oi", email: "a@b.c", items: [{ label: "One", href: "h" }] });
  assert.deepEqual(resolveFields(fields, values, "pt"), { title: "Oi", email: "a@b.c", items: [{ label: "Um", href: "h" }] });
});

test("every page's defaults are complete in both languages", () => {
  for (const schema of PAGE_SCHEMAS) {
    const values = normalizeFields(schemaFields(schema), null, PAGE_DEFAULTS[schema.slug]);
    assert.equal(pendingUnits(schemaFields(schema), values).length, 0, schema.slug);
  }
});

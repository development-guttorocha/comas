import test from "node:test";
import assert from "node:assert/strict";
import type { Case } from "@/lib/cases";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { extractSource, applySnapshot, validateTargets } from "./document";
import { sameOrigin, createSession, validSession } from "./auth";

const c: Case = { slug: "teste", num: "01", title: "Produto melhor", company: "PicPay", year: "2024", role: "Design", tags: [], accentTags: [], placeholder: "#000", brandColor: "#000", summary: "Crescimento de 20%", context: "", challenge: "", approach: [], stats: [{ value: "20%", label: "Crescimento" }], outcome: "", learning: "" };
const rich = (content: string) => ({ type: "text", plain_text: content, text: { content, link: { url: "https://example.com" } }, annotations: { bold: true } });
const blocks: NotionBlockNode[] = [
  { id: "nav", type: "heading_1", heading_1: { rich_text: [rich("[-nav1] Resultado [/-nav1+false]")] } },
  { id: "paragraph", type: "paragraph", paragraph: { rich_text: [rich("Texto original")] } },
  { id: "embed", type: "paragraph", paragraph: { rich_text: [rich('[case:CaseStatBand] {"stats":[{"value":"20%","label":"Crescimento"}],"heading":"Resultados","borderClass":"no-border"}')] } },
  { id: "code", type: "code", code: { rich_text: [rich("const texto = 'Olá';")] } },
  { id: "image", type: "image", image: { file: { url: "https://example.com/signed?token=old" }, caption: [rich("Legenda")] } },
];
test("extracts only editorial text and preserves Notion components, code, links and metrics", () => {
  const source = extractSource(c, blocks);
  assert.ok(source.units.some(u => u.key === "embed.embed.stats.0.label"));
  assert.ok(source.units.some(u => u.key === "embed.embed.sectionLabel" && u.source === "// Resultados"));
  assert.ok(!source.units.some(u => /token=|no-border|const texto|20%$/.test(u.source) && u.key !== "case.summary"));
  const snapshot = { sourceHash: source.sourceHash, model: "fixture", generatedAt: "2026-10-09", units: source.units.map(u => ({ ...u, target: `EN ${u.source}` })) };
  const mapped = applySnapshot(source, snapshot);
  const rt = (mapped.blocks[1].paragraph as { rich_text: ReturnType<typeof rich>[] }).rich_text[0];
  assert.equal(rt.text.link.url, "https://example.com");
  assert.equal(rt.annotations.bold, true);
  assert.deepEqual(mapped.blocks[3], blocks[3]);
  assert.equal(mapped.case.stats[0].value, "20%");
  assert.match(JSON.stringify(mapped.blocks[0]), /\[-nav1\] EN Resultado \[\/-nav1\+false\]/);
  assert.match(JSON.stringify(mapped.blocks[2]), /no-border/);
});
test("expiring media URLs do not invalidate translations; changed text does", () => {
  const before = extractSource(c, blocks);
  const changed = structuredClone(blocks);
  (changed[4].image as { file: { url: string } }).file.url = "https://example.com/signed?token=new";
  assert.equal(extractSource(c, changed).sourceHash, before.sourceHash);
  assert.notEqual(extractSource({ ...c, title: "Novo título" }, changed).sourceHash, before.sourceHash);
});
test("rejects missing units, changed numbers, URLs and stale snapshots", () => {
  const source = [{ key: "a", source: "20% https://example.com", target: "" }];
  assert.throws(() => validateTargets(source, []));
  assert.throws(() => validateTargets(source, [{ key: "a", target: "30% https://example.com" }]));
  assert.throws(() => validateTargets(source, [{ key: "a", target: "20% https://other.com" }]));
  assert.throws(() => applySnapshot(extractSource(c, blocks), { sourceHash: "old", generatedAt: "", model: "fixture", units: [] }));
});
test("same-origin protection accepts Next's internal URL while rejecting foreign origins", () => {
  const request = (origin: string) => new Request("http://localhost:3000/api/translations", { headers: { host: "127.0.0.1:3000", origin } });
  assert.equal(sameOrigin(request("http://127.0.0.1:3000")), true);
  assert.equal(sameOrigin(request("https://malicious.example")), false);
  assert.equal(sameOrigin(new Request("http://localhost:3000")), false);
});
test("the author can rewrite a numbered title while AI generation remains strict", () => {
  const source = extractSource({ ...c, title: "Catálogo 0km feito para SEO do zero" }, blocks);
  const targets = source.units.map(u => ({ key: u.key, target: u.key === "case.title" ? "The new Webmotors catalog designed for SEO" : u.source }));
  assert.throws(() => validateTargets(source.units, targets), /alterou os números: case.title/);
  const units = validateTargets(source.units, targets, "manual");
  const mapped = applySnapshot(source, { sourceHash: source.sourceHash, generatedAt: "fixture", model: "fixture", units });
  assert.equal(mapped.case.title, "The new Webmotors catalog designed for SEO");
  assert.equal(mapped.case.stats[0].value, "20%");
  assert.deepEqual(mapped.blocks[3], blocks[3]);
  assert.throws(() => validateTargets(source.units, targets.slice(1), "manual"));
  assert.throws(() => validateTargets(source.units, targets.map(u => ({ ...u, key: "same" })), "manual"));
  assert.throws(() => validateTargets(source.units, targets.map(u => ({ ...u, target: "" })), "manual"));
  assert.throws(() => applySnapshot(source, { sourceHash: "outdated", generatedAt: "fixture", model: "fixture", units }));
});
test("admin sessions reject tampering", () => {
  const previous = process.env.TRANSLATION_ADMIN_TOKEN;
  process.env.TRANSLATION_ADMIN_TOKEN = "test-only-secret";
  const session = createSession(process.env.TRANSLATION_ADMIN_TOKEN);
  assert.equal(validSession(session), true);
  assert.equal(validSession(`${session}broken`), false);
  if (previous === undefined) delete process.env.TRANSLATION_ADMIN_TOKEN; else process.env.TRANSLATION_ADMIN_TOKEN = previous;
});

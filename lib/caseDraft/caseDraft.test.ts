import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { tryParseCaseEmbedParagraph } from "@/lib/notionCaseEmbedFromNotion";
import { RULES, readCaseBody, imageSources } from "@/lib/ai/caseComponents";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { DRAFT_VOCABULARY, parsePlan, type CasePlan } from "./plan";
import { contractOf, readDraftBlock, type DraftBlock } from "./contract";
import { draftSource, enforceSource } from "./fidelity";
import { planWarnings } from "./generate";

const read = (block: DraftBlock, images: string[] = []) => {
  const reasons: string[] = [];
  const model = readDraftBlock(block, new Set(images), r => reasons.push(r));
  return { model, reasons };
};

test("the vocabulary is every component the guide lets the generator use", () => {
  const placed = new Set(["section", "divider", "spacer", "video", "embed"]);
  const expected = Object.entries(RULES).filter(([name, rule]) => rule.generator !== "evitar" && !placed.has(name)).map(([name]) => name).sort();
  assert.deepEqual([...DRAFT_VOCABULARY].sort(), expected);
  for (const type of DRAFT_VOCABULARY) assert.match(contractOf(type), new RegExp(`^\`${type}\``));
});

test("the site's parser alone is not a lock: it renders props the schema does not have", () => {
  // an empty light panel, unknown keys and a wrong type all render on the site…
  assert.ok(tryParseCaseEmbedParagraph(`[case:CaseLightPanel] {}`));
  assert.ok(tryParseCaseEmbedParagraph(`[case:CaseStatement] {"body":"Frase.","invented":"x","caption":42}`));
  assert.ok(tryParseCaseEmbedParagraph(`[case:CaseImageStack] {"items":[{"src":"/cases/outro/a.png"},{"src":"https://evil.example/b.png"}]}`));
  // …while the draft reads them against the schema
  const stack = read({ type: "CaseImageStack", props: { items: [{ src: "/cases/outro/a.png" }, { src: "https://evil.example/b.png" }] } });
  assert.equal(stack.model, null);
  assert.ok(stack.reasons.some(r => r.startsWith("imagem que não está no case")));
  const statement = read({ type: "CaseStatement", props: { body: "Frase.", invented: "x", caption: 42 } });
  assert.deepEqual(statement.model, { kind: "component", name: "CaseStatement", props: { body: "Frase." } });
  assert.equal(read({ type: "CaseLightPanel", props: {} }).model?.kind, "component", "a seção clara não tem campo obrigatório no site");
});

test("the schema keeps valid options and drops the rest", () => {
  const { model } = read({ type: "CaseImageStack", props: { layout: "fan", ratio: "phone", frame: "moldura", items: [{ src: "/cases/x/a.png", focus: "50% 0%" }, { src: "/cases/x/b.png", focus: "topo" }, { src: "/cases/x/c.png" }] } }, ["/cases/x/a.png", "/cases/x/b.png"]);
  assert.equal(model?.kind, "component");
  const props = (model as { props: Record<string, unknown> }).props;
  assert.equal(props.layout, "fan");
  assert.equal(props.ratio, "phone");
  assert.equal(props.frame, undefined);
  assert.deepEqual(props.items, [{ src: "/cases/x/a.png", focus: "50% 0%" }, { src: "/cases/x/b.png" }]);
  assert.equal(read({ type: "CaseBigNumber", props: { label: "sem número" } }).model, null);
  assert.equal(read({ type: "CaseMediaFigure", props: { src: "/cases/x/a.png" } }, ["/cases/x/a.png"]).model, null, "componente 'evitar'");
  assert.equal(read({ type: "image", props: { src: "https://www.guttorocha.com.br/cases/x/a.png", size: "w50" } }, ["/cases/x/a.png"]).model?.kind, "image");
});

test("an invented number takes its sentence, its item or its block", () => {
  const source = draftSource("O time foi de 2 → 15 pessoas em 2021. Dois designers no começo. Sessões: 5,2M → 17,8M.", null);
  const notes: string[] = [];
  const say = (r: string) => notes.push(r);
  const split = enforceSource({ kind: "component", name: "CaseSectionSplit", props: { label: "O time", body: "Crescemos de 2 para 15 pessoas. Fizemos 40 entrevistas. Foi em 2021." } }, source, say);
  assert.equal((split as unknown as { props: { body: string } }).props.body, "Crescemos de 2 para 15 pessoas. Foi em 2021.");
  assert.ok(notes.some(n => n.includes("40")));
  assert.equal(enforceSource({ kind: "component", name: "CaseBigNumber", props: { value: "+46%", label: "conversão" } }, source, say), null);
  const band = enforceSource({ kind: "component", name: "CaseStatBand", props: { stats: [{ value: "17,8M", label: "sessões" }, { value: "+46%", label: "conversão" }] } }, source, say);
  assert.deepEqual((band as unknown as { props: { stats: unknown[] } }).props.stats, [{ value: "17,8M", label: "sessões" }]);
  // spelled out in the source, in digits in the draft
  assert.ok(enforceSource({ kind: "component", name: "CaseStatement", props: { body: "2 designers." } }, source, say));
  // a chart with one invented value loses that series
  const chart = enforceSource({ kind: "component", name: "CaseChart", props: { type: "column", categories: ["Antes", "Depois"], series: [{ label: "Sessões", values: [5.2, 17.8] }, { label: "Outra", values: [1, 99] }] } }, source, say);
  assert.equal((chart as unknown as { props: { series: unknown[] } }).props.series.length, 1);
});

test("a testimonial must be literal", () => {
  const source = draftSource("material", ["O Gutto organizou o time pelo problema do lojista, não pelo organograma."]);
  const say = () => {};
  assert.ok(enforceSource({ kind: "component", name: "CaseResultsQuote", props: { body: "organizou o time pelo problema do lojista", attribution: "Ana" } }, source, say));
  assert.equal(enforceSource({ kind: "component", name: "CaseResultsQuote", props: { body: "O Gutto organizou tudo pelo lojista.", attribution: "Ana" } }, source, say), null);
});

test("the published cases pass the draft's schema (the contract is not stricter than the site)", () => {
  let checked = 0;
  for (const slug of ["picpay", "plenno", "webmotors", "creator-ads"]) {
    const blocks = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "cases", slug, "body.json"), "utf8")) as NotionBlockNode[];
    const items = readCaseBody(blocks);
    const images = imageSources(items);
    for (const item of items) {
      if (item.model.kind !== "component" || !(DRAFT_VOCABULARY as readonly string[]).includes(item.type)) continue;
      const { model, reasons } = read({ type: item.type, props: item.props }, images);
      assert.ok(model, `${slug} · ${item.type}: ${reasons.join("; ")}`);
      checked++;
    }
  }
  assert.ok(checked > 30, `só ${checked} blocos conferidos`);
});

test("the plan keeps the case's images and known components, and its checks run without the AI", () => {
  const images = new Set(["/cases/x/a.png", "/cases/x/foto.png"]);
  const plan: CasePlan = parsePlan({
    kind: "historia",
    sections: [
      { label: "O começo de tudo, com rótulo longo demais", blocks: [{ component: "CaseTitleBox", idea: "contexto" }, { component: "Inventado" }, { component: "CaseStatement", idea: "frase" }] },
      { label: "Telas", blocks: [{ component: "CaseImageStack", images: ["https://www.guttorocha.com.br/cases/x/a.png", "/cases/x/foto.png", "/cases/y/z.png"] }, { component: "CaseBigNumber" }, { component: "CaseBigNumber" }] },
      { label: "Vazia", blocks: [{ component: "Nada" }] },
    ],
  }, images);
  assert.equal(plan.sections.length, 2);
  assert.equal(plan.sections[0]!.label.length <= 24, true);
  assert.deepEqual(plan.sections[0]!.blocks.map(b => b.component), ["CaseTitleBox", "CaseStatement"]);
  assert.deepEqual(plan.sections[1]!.blocks[0]!.images, ["/cases/x/a.png", "/cases/x/foto.png"]);
  const warnings = planWarnings(plan, { "/cases/x/foto.png": "foto" });
  assert.ok(warnings.some(w => w.message.includes("no máximo 1 por case")));
  assert.ok(warnings.some(w => w.message.includes("feito para telas") && w.section === 1 && w.block === 0));
  assert.ok(warnings.some(w => w.message.includes("seções")));
});

test("the case data fills only empty fields, within limits and backed by the source", async () => {
  const { emptyDataKeys, readCaseData, mergeCaseData } = await import("./caseData");
  const current = { title: "SulAmérica Viagem", company: "SulAmérica", role: "", summary: "", tags: [], homeStats: [], heroMegaWord: "" };
  const keys = emptyDataKeys(current);
  assert.ok(!keys.includes("title") && keys.includes("role") && keys.includes("summary") && keys.includes("homeStats"));
  const source = draftSource("Liderei o design do app. A conversão subiu 46% em 2026.", null);
  const cut: string[] = [];
  const data = readCaseData({
    title: "Outro título", role: "Head de Design", summary: "Liderei o design do app. Fizemos 30 entrevistas. A conversão subiu 46%.",
    homeStats: [{ value: "+46%", label: "conversão" }, { value: "+80%", label: "inventado" }, { value: "Ótimo", label: "sem número" }],
    tags: ["Produto", "Produto", "Seguros"], heroMegaWord: "SulAmérica", homeLabel: 42, invented: "x",
  }, keys, source, r => cut.push(r));
  assert.equal(data.title, undefined, "campo já preenchido não é pedido");
  assert.equal(data.role, "Head de Design");
  assert.equal(data.summary, "Liderei o design do app. A conversão subiu 46%.");
  assert.deepEqual(data.homeStats, [{ value: "+46%", label: "conversão" }]);
  assert.deepEqual(data.tags, ["Produto", "Seguros"]);
  assert.equal(data.heroMegaWord, "SULAMÉRICA");
  assert.equal((data as Record<string, unknown>).homeLabel, undefined);
  assert.ok(cut.some(r => r.includes("30")) && cut.some(r => r.includes("80")));
  // the editor merges over what is still empty, never over what Gutto typed meanwhile
  const merged = mergeCaseData({ ...current, role: "Design Manager" }, data);
  assert.equal(merged.role, "Design Manager");
  assert.equal(merged.summary, data.summary);
  assert.equal(merged.title, "SulAmérica Viagem");
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createBlock, type BlockModel } from "@/lib/admin/caseBlocks";
import { COMPONENTS } from "@/lib/admin/componentSchemas";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import {
  CASE_COMPONENTS_FILE, CHECKS, REFERENCE_CASES, RULES, caseComponentsPrompt, checkCase, checkHero, imageShape, imageSources,
  loadImageSizes, parseComponentNotes, readCaseBody, type CheckId, type Finding, type ImageSizes,
} from "./caseComponents";

/* ---------- The guide and the code agree ---------- */

const markdown = fs.readFileSync(CASE_COMPONENTS_FILE, "utf8");
const notes = parseComponentNotes(markdown);
const NATIVE = ["section", "divider", "spacer", "text", "image", "images", "video", "embed"];

test("every component has a rule and a section in the guide, and nothing else does", () => {
  const names = COMPONENTS.map(c => c.name);
  for (const name of names) {
    assert.ok(RULES[name], `sem regra em caseComponents.ts: ${name}`);
    assert.ok(notes[name], `sem seção em case-components.md: ${name}`);
  }
  assert.deepEqual(Object.keys(RULES).sort(), [...names, ...NATIVE].sort());
  assert.deepEqual(Object.keys(notes).sort(), Object.keys(RULES).sort());
});

test("weight, generator use, maximum, list size and text limits match between the guide and the code", () => {
  for (const [name, rule] of Object.entries(RULES)) {
    const note = notes[name]!;
    const meta = note.match(/\*\*Peso:\*\* (\S+) · \*\*Gerador:\*\* (\S+) · \*\*Máx\. por case:\*\* (\S+)/);
    assert.ok(meta, `${name}: falta a linha de peso no .md`);
    assert.equal(meta[1], rule.weight === "medio" ? "médio" : rule.weight, `${name}: peso`);
    assert.equal(meta[2], rule.generator, `${name}: gerador`);
    assert.equal(meta[3], rule.maxPerCase ? String(rule.maxPerCase) : "—", `${name}: máximo por case`);

    const limitsLine = note.match(/\*\*Limites:\*\*(.*)/)?.[1] ?? "";
    const limits = Object.fromEntries([...limitsLine.matchAll(/`([\w.[\]]+)` ≤ (\d+)/g)].map(m => [m[1]!, Number(m[2])]));
    assert.deepEqual(limits, rule.limits, `${name}: limites (mude o .md e lib/ai/caseComponents.ts juntos)`);

    const items = note.match(/\*\*Itens:\*\* `(\w+)` de (\d+) a (\d+)/);
    assert.deepEqual(items ? { field: items[1], min: Number(items[2]), max: Number(items[3]) } : undefined, rule.count, `${name}: itens`);
  }
});

test("every check is described in the guide", () => {
  for (const id of Object.keys(CHECKS)) assert.ok(markdown.includes(`\`${id}\``), `checagem sem descrição no .md: ${id}`);
});

test("the prompt carries rhythm, structure and the usable components only", () => {
  const prompt = caseComponentsPrompt();
  for (const ref of Object.values(REFERENCE_CASES)) assert.ok(prompt.toLowerCase().includes(ref.slug), `modelo ${ref.slug} fora do prompt`);
  assert.ok(prompt.includes("### `CaseImageStack`"), "imagens sobrepostas no prompt");
  assert.ok(prompt.includes("Ritmo da página"));
  assert.ok(prompt.includes("Estrutura típica"));
  assert.ok(prompt.includes("### `CaseStatement`"));
  assert.ok(!prompt.includes("### `CaseMediaFigure`"), "componente 'evitar' no prompt");
  assert.ok(!prompt.includes("Visto em"), "o prompt não precisa dos exemplos de onde foi usado");
});

/* ---------- Building bodies ---------- */

const section = (label: string, position = 1): BlockModel => ({ kind: "section", position, label, visible: false });
const component = (name: string, props: Record<string, unknown>): BlockModel => ({ kind: "component", name, props });
const image = (src: string, size: "" | "w50" | "bleed" = ""): BlockModel => ({ kind: "image", src, caption: "", mobileSrc: "", size, crop: "", mobileCrop: "", background: true, border: true, spaceTop: "", spaceBottom: "" });
const divider: BlockModel = { kind: "divider", color: "#161c20", size: "bleed", align: "", spaceTop: "lg", spaceBottom: "lg" };
const spacer: BlockModel = { kind: "spacer" };
const text = (md: string): BlockModel => ({ kind: "text", style: "paragraph", md, lossy: false });
const body = (...models: BlockModel[]): NotionBlockNode[] => models.map(createBlock);

const titleBox = component("CaseTitleBox", { title: "Dois designers", continuation: "para uma unidade inteira.", body: "A situação.\n\nO meu papel." });
const iconStats = component("CaseIconStats", { columns: 3, items: [{ icon: "users", value: "2 → 15", label: "pessoas" }, { icon: "target", value: "3", label: "tribos" }, { icon: "globe", value: "1", label: "mercado novo" }] });
const statement = (b: string) => component("CaseStatement", { body: b, caption: "Uma linha de apoio." });
const bigNumber = component("CaseBigNumber", { value: "+99%", label: "de creators ganhando dinheiro" });
const chart = component("CaseChart", { type: "column", title: "Creators", categories: ["2022", "2023", "2024"], series: [{ label: "Creators", values: [1, 2, 3] }] });
const split = component("CaseSectionSplit", { label: "Uma decisão", body: "O texto da decisão." });

const SIZES: ImageSizes = { "/wide.png": { width: 1920, height: 1080 }, "/phone.png": { width: 390, height: 844 }, "/square.png": { width: 1000, height: 1000 }, "/wide-b.png": { width: 1920, height: 1000 } };

/** A short case in the reference rhythm: four sections, each opening differently, ending on an idea. */
const good = () => [
  divider, section("Contexto"), titleBox, iconStats,
  divider, section("Decisão", 2), statement("A direção ficou clara."), image("/wide.png"),
  divider, section("Resultados", 3), statement("Mais creators, monetizando"), bigNumber, chart,
  divider, section("O que ficou", 4), titleBox,
];
const checks = (findings: Finding[]) => findings.map(f => f.check);
const has = (findings: Finding[], id: CheckId) => findings.some(f => f.check === id);

/* ---------- Checks ---------- */

test("a case in the reference rhythm passes clean", () => {
  assert.deepEqual(checkCase(body(...good()), { sizes: SIZES }), []);
  // A source note under the chart does not count as a block of its own.
  const noted = good();
  noted.splice(13, 0, text("\\*Números do Q3 de 2023 ao Q4 de 2024."));
  assert.deepEqual(checkCase(body(...noted), { sizes: SIZES }), []);
});

test("structure: starts with a section, sections have content", () => {
  assert.ok(has(checkCase(body(titleBox, ...good())), "secao-abertura"));
  const thin = good();
  thin.splice(7, 1); // "Decisão" keeps only its statement
  assert.ok(has(checkCase(body(...thin)), "secao-curta"));
  // The product model (Plenno): every section opens with the side text and shows the product. That is fine.
  const product = [0, 1, 2, 3].flatMap(i => [section(`Parte ${i}`, i + 1), split, image("/wide.png")]);
  assert.deepEqual(checkCase(body(...product), { sizes: SIZES }), []);
  assert.ok(has(checkCase(body(...good().map(m => (m.kind === "section" && m.label === "Contexto" ? section("Um contexto muito longo para o menu") : m)))), "secao-rotulo"));
});

test("how a case opens and closes is free; only thanks have a place (last)", () => {
  const opensOnImage = good();
  opensOnImage.splice(2, 0, image("/wide.png"));
  assert.deepEqual(checkCase(body(...opensOnImage), { sizes: SIZES }), []);
  const compare = component("CaseImageCompare", { before: { src: "/wide.png", label: "Antes" }, after: { src: "/wide.png", label: "Depois" } });
  assert.deepEqual(checkCase(body(...good(), compare), { sizes: SIZES }), [], "o case pode fechar numa imagem");
  const thanks = component("CaseThanksCards", { columns: 1, items: [{ title: "Obrigado", body: "Ana, Bia" }] });
  assert.ok(!has(checkCase(body(...good(), divider, thanks)), "agradecimentos"));
  assert.ok(has(checkCase(body(...good().slice(0, 4), thanks, ...good().slice(4))), "agradecimentos"));
});

test("rhythm: statements need proof, headlines and reading blocks do not touch", () => {
  const lonely = good();
  lonely.splice(7, 1, statement("Outra frase."));
  const f = checkCase(body(...lonely));
  assert.ok(has(f, "frase-seguida"));
  assert.ok(has(f, "frase-sem-prova"));
  // Statement → big number → chart is the allowed exception (it is in the good case).
  assert.ok(!has(checkCase(body(...good())), "frase-seguida"));
  const reading = good();
  reading.splice(3, 0, split);
  assert.ok(has(checkCase(body(...reading)), "texto-seguido"));
  const dense = good();
  dense.splice(3, 1, component("CaseApproachCards", { columns: 2, items: [{ title: "A", body: "a" }, { title: "B", body: "b" }] }), component("CasePanel", { cards: [{ kind: "text", body: "um" }, { kind: "text", body: "dois" }] }));
  assert.ok(has(checkCase(body(...dense)), "denso-seguido"));
});

test("rhythm: runs of images and of the same component", () => {
  const gallery = good();
  gallery.splice(7, 1, image("/wide.png"), image("/wide.png"), image("/wide.png"), image("/wide.png"));
  assert.deepEqual(checks(checkCase(body(...gallery))).filter(c => c === "imagens-seguidas"), ["imagens-seguidas"]);
  const repeated = good();
  repeated.splice(3, 1, iconStats, iconStats, iconStats);
  assert.ok(has(checkCase(body(...repeated)), "componente-repetido"));
});

test("dividers sit at section changes, and every section gets one", () => {
  const inside = good();
  inside.splice(3, 0, divider);
  assert.ok(has(checkCase(body(...inside)), "divisor-solto"));
  const doubled = good();
  doubled.splice(0, 0, divider);
  assert.ok(has(checkCase(body(...doubled)), "divisor-duplo"));
  const missing = good();
  missing.splice(4, 1);
  assert.ok(has(checkCase(body(...missing)), "divisor-faltando"));
});

test("empty paragraphs: one at a time, never at the end", () => {
  const f = checkCase(body(...good().slice(0, 4), spacer, spacer, ...good().slice(4), spacer));
  assert.deepEqual(f.filter(x => x.check === "espaco").length, 2);
  assert.ok(!has(checkCase(body(...good().slice(0, 4), spacer, ...good().slice(4))), "espaco"));
});

test("text limits warn, and error past one and a half times", () => {
  const long = (n: number) => "a".repeat(n);
  const at = (n: number) => checkCase(body(...good().map(m => (m === bigNumber ? component("CaseBigNumber", { value: "+99%", label: long(n) }) : m)))).filter(f => f.check === "texto-longo");
  assert.equal(at(80).length, 0);
  assert.equal(at(81)[0]?.severity, "aviso");
  assert.equal(at(121)[0]?.severity, "erro");
});

test("list sizes and components limited per case", () => {
  const two = component("CaseIconStats", { items: [{ icon: "users", value: "1", label: "a" }, { icon: "users", value: "2", label: "b" }] });
  assert.ok(has(checkCase(body(...good().map(m => (m === iconStats ? two : m)))), "contagem"));
  const stack = component("CaseImageStack", { layout: "spotlight", items: [1, 2, 3, 4].map(() => ({ src: "/phone.png", alt: "Tela" })) });
  assert.ok(has(checkCase(body(...good().slice(0, 4), stack, ...good().slice(4))), "contagem"), "destaque comporta até 3");
  const twice = good();
  twice.splice(3, 0, bigNumber);
  assert.ok(has(checkCase(body(...twice)), "repeticao"));
});

test("invented components, placeholders, quotes without attribution", () => {
  const f = checkCase(body(...good().slice(0, 4), component("CaseHeroBanner", { body: "x" }), ...good().slice(4)));
  assert.ok(f.some(x => x.check === "componente-desconhecido" && x.severity === "erro"));
  assert.ok(has(checkCase(body(...good().map(m => (m === bigNumber ? component("CaseBigNumber", { value: "+99%", label: "O que este número mede" }) : m)))), "placeholder"));
  assert.ok(has(checkCase(body(...good().slice(0, 4), component("CaseResultsQuote", { body: "Vender mais." }), ...good().slice(4))), "atribuicao"));
  assert.ok(has(checkCase(body(...good().map(m => (m === bigNumber ? component("CaseBigNumber", { value: "Muito", label: "de creators" }) : m)))), "numero-sem-numero"));
});

test("image shapes match their slot", () => {
  assert.equal(imageShape({ width: 390, height: 844 }), "alta");
  assert.equal(imageShape({ width: 1920, height: 1080 }), "larga");
  const withImage = (m: BlockModel) => good().map(x => (x.kind === "image" ? m : x));
  const vertical = checkCase(body(...withImage(image("/phone.png"))), { sizes: SIZES });
  assert.ok(vertical.some(f => f.check === "imagem-formato" && f.severity === "erro"), "imagem alta na largura do conteúdo");
  const half = checkCase(body(...withImage(image("/phone.png", "w50"))), { sizes: SIZES }).filter(f => f.check === "imagem-formato");
  assert.deepEqual(half.map(f => f.severity), ["aviso"], "a 50% uma tela alta é tolerada");
  assert.ok(!has(checkCase(body(...withImage(image("/square.png", "w50"))), { sizes: SIZES }), "imagem-formato"));
  assert.ok(!has(checkCase(body(...withImage(image("/wide.png", "bleed"))), { sizes: SIZES }), "imagem-formato"));
  const bento = component("CaseBento", { tiles: [{ kind: "image", size: "2x1", src: "/phone.png", alt: "Tela" }, { kind: "image", size: "1x2", src: "/phone.png", alt: "Tela" }, { kind: "text", title: "Ideia", body: "Curta." }] });
  assert.equal(checkCase(body(...withImage(bento)), { sizes: SIZES }).filter(f => f.check === "imagem-formato").length, 1, "só o bloco 2x1 com tela de celular");
  const chapter = component("CaseChapter", { title: "O mercado novo", src: "/phone.png" });
  assert.ok(has(checkCase(body(...good().slice(0, 4), chapter, ...good().slice(4)), { sizes: SIZES }), "imagem-formato"));
});

test("screen components get screens, by the image caption", () => {
  const stack = (ratio: string, srcs: string[]) => component("CaseImageStack", { layout: "fan", ratio, items: srcs.map(src => ({ src, alt: "Tela" })) });
  const kinds = { "/app-1.png": "tela-app", "/app-2.png": "tela-app", "/web.png": "tela-web", "/foto.png": "foto" } as const;
  const run = (m: BlockModel) => checkCase(body(...good().slice(0, 4), m, ...good().slice(4)), { kinds }).filter(f => f.check === "imagem-tipo");
  assert.deepEqual(run(stack("phone", ["/app-1.png", "/app-2.png"])), []);
  assert.equal(run(stack("phone", ["/app-1.png", "/foto.png"])).length, 1, "foto em imagens sobrepostas");
  assert.equal(run(stack("phone", ["/app-1.png", "/web.png"])).length, 1, "tela web em quadro de celular");
  assert.equal(run(stack("wide", ["/app-1.png", "/app-2.png"])).length, 1, "tela de app em quadro de computador");
});

test("before and after images must share a proportion", () => {
  const compare = (after: string) => component("CaseImageCompare", { before: { src: "/wide.png", label: "Antes" }, after: { src: after, label: "Depois" } });
  assert.ok(!has(checkCase(body(...good().map(m => (m.kind === "image" ? compare("/wide.png") : m))), { sizes: SIZES }), "imagem-par"));
  assert.ok(has(checkCase(body(...good().map(m => (m.kind === "image" ? compare("/wide-b.png") : m))), { sizes: SIZES }), "imagem-par"));
});

test("hero: full bleed needs a wide, sharp cover", () => {
  assert.deepEqual(checkHero({ heroVariant: "fullBleed", heroImage: "/c.png", summary: "Resumo." }, { width: 1920, height: 940 }), []);
  assert.equal(checkHero({ heroVariant: "fullBleed" })[0]?.severity, "erro");
  assert.equal(checkHero({ heroVariant: "fullBleed", heroImage: "/c.png" }, { width: 800, height: 450 }).length, 1);
  assert.equal(checkHero({ heroVariant: "fullBleed", heroImage: "/c.png" }, { width: 2000, height: 2000 }).length, 1);
  assert.equal(checkHero({ heroMegaWord: "UMA PALAVRA LONGA" }).length, 1);
});

/* ---------- The published cases ---------- */

test("the published cases read without breaking, and PicPay (the reference) has no errors", async () => {
  const dir = path.join(process.cwd(), "content", "cases");
  for (const slug of fs.readdirSync(dir).filter(s => s !== "modelo" && fs.existsSync(path.join(dir, s, "body.json")))) {
    const blocks = JSON.parse(fs.readFileSync(path.join(dir, slug, "body.json"), "utf8")) as NotionBlockNode[];
    const { sizes, missing } = await loadImageSizes(imageSources(readCaseBody(blocks)));
    assert.deepEqual(missing, [], `${slug}: imagens que não existem em public/`);
    const findings = checkCase(blocks, { sizes });
    if (slug === "picpay") assert.deepEqual(findings.filter(f => f.severity === "erro"), []);
  }
});

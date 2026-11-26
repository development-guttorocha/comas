import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Case } from "@/lib/cases";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { tryParseCaseEmbedParagraph } from "@/lib/notionCaseEmbedFromNotion";
import { extractSource } from "@/lib/translations/document";
import { createBlock, readBlock, writeBlock } from "./caseBlocks";
import { mdToRich, richPlain, richToMd } from "./richText";

const root = path.join(process.cwd(), "content", "cases");
const cases = readdirSync(root).map(slug => ({
  slug,
  data: JSON.parse(readFileSync(path.join(root, slug, "case.json"), "utf8")) as Case,
  body: JSON.parse(readFileSync(path.join(root, slug, "body.json"), "utf8")) as NotionBlockNode[],
}));
const plain = (block: NotionBlockNode) => richPlain((block[block.type] as { rich_text?: unknown })?.rich_text);

test("rewriting every block without edits keeps the text, the components and the translations", () => {
  assert.ok(cases.length > 0);
  for (const { slug, data, body } of cases) {
    const rewritten = body.map(block => writeBlock(block, readBlock(block)));
    assert.equal(extractSource(data, rewritten).sourceHash, extractSource(data, body).sourceHash, `${slug}: tradução continua válida`);
    rewritten.forEach((block, i) => {
      const original = body[i]!;
      assert.equal(block.id, original.id);
      assert.equal(plain(block).trim(), plain(original).trim(), `${slug}: texto do bloco ${i}`);
      const embed = tryParseCaseEmbedParagraph(plain(original));
      if (embed) assert.deepEqual(tryParseCaseEmbedParagraph(plain(block)), embed, `${slug}: componente do bloco ${i}`);
    });
  }
});

test("every block reads as something the editor understands", () => {
  const kinds = new Map<string, number>();
  for (const { body } of cases) for (const block of body) {
    const kind = readBlock(block).kind;
    kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
  }
  assert.equal(kinds.get("raw") ?? 0, 0, `blocos sem editor: ${JSON.stringify(Object.fromEntries(kinds))}`);
});

test("markdown carries bold, italic, code, strike and links both ways", () => {
  const md = "Um **negrito**, _itálico_, `código`, ~~riscado~~ e [um **link**](https://example.com). Asterisco literal: 5\\*.";
  const parts = mdToRich(md);
  assert.equal(richPlain(parts), "Um negrito, itálico, código, riscado e um link. Asterisco literal: 5*.");
  assert.equal(richToMd(parts), md);
  assert.ok(parts.find(p => p.plain_text === "link")?.annotations.bold);
  assert.equal(parts.find(p => p.plain_text === "link")?.href, "https://example.com");
});

test("real formatted texts survive the markdown round trip", () => {
  for (const { body } of cases) for (const block of body) {
    const parts = (block[block.type] as { rich_text?: unknown[] })?.rich_text;
    if (!parts?.length) continue;
    const again = mdToRich(richToMd(parts));
    assert.equal(richPlain(again), richPlain(parts));
  }
});

test("new blocks get fresh ids and render", () => {
  const a = createBlock({ kind: "component", name: "CasePullQuote", props: { body: "Frase" } });
  const b = createBlock({ kind: "component", name: "CasePullQuote", props: { body: "Frase" } });
  assert.notEqual(a.id, b.id);
  assert.ok(tryParseCaseEmbedParagraph(plain(a)));
  const section = createBlock({ kind: "section", position: 2, label: "Impacto", visible: false });
  assert.equal(plain(section), "[-nav 2] Impacto [/-nav 2+false]");
  assert.deepEqual(readBlock(section), { kind: "section", position: 2, label: "Impacto", visible: false });
});

test("an image keeps the width chosen in the admin", () => {
  const block: NotionBlockNode = { id: "img", type: "image", has_children: false, image: { type: "file", file: { url: "/cases/x.png" }, caption: [] } };
  const model = readBlock(block);
  assert.equal(model.kind === "image" && model.size, "");
  const bleed = writeBlock(block, { ...model, size: "bleed" } as typeof model);
  assert.equal((bleed.image as { case_size?: string }).case_size, "bleed");
  const back = readBlock(bleed);
  assert.equal(back.kind === "image" && back.size, "bleed");
  assert.equal("case_size" in (writeBlock(bleed, { ...back, size: "" } as typeof back).image as object), false);
});

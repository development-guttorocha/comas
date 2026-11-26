import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { bodyToEditor, editorToBody, type EditorBlock } from "./editorConvert";

const root = path.join(process.cwd(), "content", "cases");
const bodies = readdirSync(root).map(slug => ({ slug, body: JSON.parse(readFileSync(path.join(root, slug, "body.json"), "utf8")) as NotionBlockNode[] }));
const originals = (body: NotionBlockNode[]) => new Map(body.map(b => [b.id, b]));

test("opening a case in the editor and saving without edits returns the same body", () => {
  for (const { slug, body } of bodies) {
    const doc = bodyToEditor(body);
    // The editor adds an empty line at the end for typing.
    doc.push({ id: "trailing", type: "paragraph", content: [] });
    assert.deepEqual(editorToBody(doc, originals(body)), body, slug);
  }
});

test("edits reach only the edited block, and new blocks are written", () => {
  const { body } = bodies.find(b => b.slug === "picpay")!;
  const doc = bodyToEditor(body);
  const i = doc.findIndex(b => b.type === "caseComponent");
  const editedId = doc[i]!.id;
  const props = JSON.parse(doc[i]!.props!.data as string);
  doc[i] = { ...doc[i]!, props: { ...doc[i]!.props, data: JSON.stringify({ ...props, label: "Novo título" }) } };
  doc.splice(1, 0, { id: "new-text", type: "paragraph", content: [{ type: "text", text: "Olá ", styles: {} }, { type: "link", href: "https://example.com", content: [{ type: "text", text: "mundo", styles: { bold: true } }] }] } as EditorBlock);
  const next = editorToBody(doc, originals(body));
  assert.equal(next.length, body.length + 1);
  assert.equal(next[1]!.id, "new-text");
  const text = (next[1]!.paragraph as { rich_text: Array<{ plain_text: string; href: string | null; annotations: { bold: boolean } }> }).rich_text;
  assert.equal(text.map(p => p.plain_text).join(""), "Olá mundo");
  assert.equal(text.at(-1)!.href, "https://example.com");
  assert.ok(text.at(-1)!.annotations.bold);
  assert.match(JSON.stringify(next.find(b => b.id === editedId)), /Novo título/);
  assert.deepEqual(next.filter(b => b.id !== editedId && b.id !== "new-text"), body.filter(b => b.id !== editedId));
});

test("a paragraph keeps its size, alignment and colour through the editor", () => {
  const doc = [{ id: "p", type: "paragraph", props: { size: "xl", textAlignment: "center", color: "#FF3366" }, content: [{ type: "text", text: "Frase", styles: {} }] }] as EditorBlock[];
  const [block] = editorToBody(doc, new Map());
  assert.deepEqual({ ...(block!.paragraph as object), rich_text: undefined }, { rich_text: undefined, color: "default", case_size: "xl", case_align: "center", case_color: "#FF3366" });
  const [back] = bodyToEditor([block!]);
  assert.deepEqual(back!.props, { size: "xl", textAlignment: "center", color: "#FF3366" });
  // Left is the default: nothing is written for it.
  const plain = editorToBody([{ ...doc[0]!, props: { size: "", textAlignment: "left", color: "" } }], new Map());
  assert.deepEqual(Object.keys(plain[0]!.paragraph as object).sort(), ["color", "rich_text"]);
});

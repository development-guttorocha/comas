import assert from "node:assert/strict";
import test from "node:test";
import { layoutFlow, parseFlowDiagram, readingOrder, toCustom, type FlowNode } from "./flowLayout";

const nodes = (...ids: string[]): FlowNode[] => ids.map(id => ({ id, title: id.toUpperCase() }));
const cells = (flow: ReturnType<typeof layoutFlow>) => Object.fromEntries(flow.nodes.map(n => [n.id, `${n.col},${n.row}`]));

test("linear and vertical chain the nodes in order", () => {
  const line = layoutFlow({ layout: "linear", nodes: nodes("a", "b", "c") });
  assert.deepEqual(cells(line), { a: "0,0", b: "1,0", c: "2,0" });
  assert.deepEqual(line.edges.map(e => `${e.from}>${e.to}`), ["a>b", "b>c"]);
  assert.deepEqual(cells(layoutFlow({ layout: "vertical", nodes: nodes("a", "b") })), { a: "0,0", b: "0,1" });
});

test("branch puts children in the next column, one leaf per row", () => {
  const flow = layoutFlow({ layout: "branch", nodes: [{ id: "a", title: "A" }, { id: "b", title: "B", parent: "a" }, { id: "c", title: "C", parent: "a" }, { id: "d", title: "D", parent: "b" }] });
  assert.deepEqual(cells(flow), { a: "0,0", b: "1,0", c: "1,1", d: "2,0" });
  assert.deepEqual(flow.edges.map(e => `${e.from}>${e.to}`), ["a>b", "a>c", "b>d"]);
});

test("branch survives a parent loop", () => {
  const flow = layoutFlow({ layout: "branch", nodes: [{ id: "a", title: "A", parent: "b" }, { id: "b", title: "B", parent: "a" }] });
  assert.equal(flow.nodes.length, 2);
});

test("cycle loops back to the start", () => {
  const flow = layoutFlow({ layout: "cycle", nodes: nodes("a", "b", "c", "d") });
  assert.deepEqual(cells(flow), { a: "0,0", b: "1,0", c: "1,1", d: "0,1" });
  assert.equal(flow.edges.at(-1)?.to, "a");
});

test("hub puts the first node in the centre, linked to the rest", () => {
  const flow = layoutFlow({ layout: "hub", nodes: nodes("c", "n", "e", "s", "w") });
  assert.deepEqual(cells(flow), { c: "1,1", n: "1,0", e: "2,1", s: "1,2", w: "0,1" });
  assert.ok(flow.edges.every(e => e.from === "c"));
});

test("custom keeps cells, moves clashes below and drops broken edges", () => {
  const flow = layoutFlow({ layout: "custom", nodes: [{ id: "a", title: "A", col: 2, row: 1 }, { id: "b", title: "B", col: 2, row: 1 }, { id: "c", title: "C" }], edges: [{ from: "a", to: "b" }, { from: "a", to: "x" }] });
  assert.deepEqual(cells(flow), { a: "2,0", b: "0,1", c: "1,1" });
  assert.deepEqual(flow.edges, [{ from: "a", to: "b" }]);
});

test("toCustom freezes a model into editable cells and arrows", () => {
  const frozen = toCustom({ layout: "cycle", nodes: nodes("a", "b", "c", "d") });
  assert.equal(frozen.layout, "custom");
  assert.deepEqual(cells(layoutFlow(frozen)), cells(layoutFlow({ layout: "cycle", nodes: nodes("a", "b", "c", "d") })));
  assert.equal(frozen.edges?.length, 4);
});

test("reading order follows the arrows", () => {
  const flow = layoutFlow({ layout: "custom", nodes: [{ id: "c", title: "C", col: 0, row: 0 }, { id: "a", title: "A", col: 1, row: 0 }, { id: "b", title: "B", col: 2, row: 0 }], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }] });
  assert.deepEqual(readingOrder(flow).map(n => n.id), ["a", "b", "c"]);
});

test("parse drops empty nodes and unknown layouts", () => {
  const diagram = parseFlowDiagram({ layout: "zigzag", nodes: [{ id: "a", title: "A" }, { id: "b", title: "" }, { title: "C", tone: "brand" }] });
  assert.equal(diagram?.layout, "linear");
  assert.deepEqual(diagram?.nodes.map(n => [n.id, n.tone]), [["a", undefined], ["n2", "brand"]]);
  assert.equal(parseFlowDiagram({ nodes: [] }), null);
});

test("org chart: parents above, covering their children's columns", () => {
  const flow = layoutFlow({ layout: "org", nodes: [{ id: "h", title: "Head" }, { id: "a", title: "A", parent: "h" }, { id: "b", title: "B", parent: "h" }, { id: "c", title: "C", parent: "h" }] });
  assert.deepEqual(flow.nodes.map(n => [n.id, n.col, n.row, n.span]), [["h", 0, 0, 3], ["a", 0, 1, 1], ["b", 1, 1, 1], ["c", 2, 1, 1]]);
  assert.equal(flow.cols, 3);
  assert.deepEqual(flow.edges.map(e => `${e.from}>${e.to}`), ["h>a", "h>b", "h>c"]);
});

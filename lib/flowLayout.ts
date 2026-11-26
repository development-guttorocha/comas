/**
 * Fluxos do case: cartões (nós) e ligações (setas), desenhados numa grade. Cada modelo põe os
 * nós em colunas e linhas por conta própria; o "livre" guarda a posição de cada nó.
 */
export const FLOW_LAYOUTS = ["linear", "vertical", "branch", "org", "cycle", "funnel", "hub", "circles", "custom"] as const;
export type FlowLayout = (typeof FLOW_LAYOUTS)[number];
export const FLOW_TONES = ["neutral", "soft", "focus", "brand", "light"] as const;
export type FlowTone = (typeof FLOW_TONES)[number];

export type FlowNode = {
  id: string;
  title: string;
  /** A line under the title. */
  subtitle?: string;
  body?: string;
  /** A list under a divider, one item per line. */
  bullets?: string;
  /** A short note at the foot of the card ("Foco deste trabalho"). */
  foot?: string;
  /** A number or short value above the title (the funnel's main figure). */
  value?: string;
  tone?: FlowTone;
  /** Branch: the node this one comes from. */
  parent?: string;
  /** Free layout: the node's cell. */
  col?: number;
  row?: number;
};
export type FlowEdge = { from: string; to: string; label?: string };
export type FlowDiagram = {
  layout: FlowLayout;
  nodes: FlowNode[];
  /** Free layout only; the other models draw their own arrows. */
  edges?: FlowEdge[];
  /** Circles: stacked down, side by side, or a Venn of two or three. */
  arrange?: "vertical" | "horizontal" | "venn";
  /** Circles in Venn: the text where they meet. */
  intersection?: string;
  sectionLabel?: string;
  heading?: string;
  intro?: string;
  caption?: string;
  id?: string;
};

/** `span`: the columns a card covers (an org chart's parent covers its children). */
export type PlacedNode = FlowNode & { col: number; row: number; span?: number };
export type PlacedFlow = { nodes: PlacedNode[]; edges: FlowEdge[]; cols: number; rows: number };

export const FLOW_LAYOUT_LABELS: Record<FlowLayout, { label: string; hint: string }> = {
  linear: { label: "Linha", hint: "Etapas lado a lado, da esquerda para a direita." },
  vertical: { label: "Vertical", hint: "Etapas de cima para baixo." },
  branch: { label: "Ramificação", hint: "Cada etapa pode abrir caminhos; escolha de onde cada uma vem." },
  org: { label: "Organograma", hint: "De cima para baixo: cada cartão se estende sobre os que vêm dele." },
  cycle: { label: "Ciclo", hint: "As etapas voltam ao começo." },
  funnel: { label: "Funil", hint: "Etapas que afunilam, cada uma com um número." },
  hub: { label: "Hub", hint: "Um centro ligado a tudo em volta: o primeiro cartão é o centro." },
  circles: { label: "Círculos", hint: "Círculos que se sobrepõem: empilhados, lado a lado ou em Venn (2 ou 3)." },
  custom: { label: "Livre", hint: "Posicione cada cartão e ligue os que quiser." },
};

const chain = (nodes: FlowNode[]): FlowEdge[] => nodes.slice(1).map((node, i) => ({ from: nodes[i]!.id, to: node.id }));

/** Moves every placement so the top-left one sits at 0,0. */
function normalize(nodes: PlacedNode[], edges: FlowEdge[]): PlacedFlow {
  if (!nodes.length) return { nodes, edges, cols: 0, rows: 0 };
  const minCol = Math.min(...nodes.map(n => n.col)), minRow = Math.min(...nodes.map(n => n.row));
  const placed = nodes.map(n => ({ ...n, col: n.col - minCol, row: n.row - minRow }));
  const ids = new Set(placed.map(n => n.id));
  return {
    nodes: placed,
    edges: edges.filter(e => e.from !== e.to && ids.has(e.from) && ids.has(e.to)),
    cols: Math.max(...placed.map(n => n.col + (n.span ?? 1))),
    rows: Math.max(...placed.map(n => n.row)) + 1,
  };
}

/** A tree read left to right: depth is the column; each leaf takes a row; a parent sits on its first child's row. */
function branch(nodes: FlowNode[]): PlacedFlow {
  const ids = new Set(nodes.map(n => n.id));
  const parentOf = (n: FlowNode) => (n.parent && n.parent !== n.id && ids.has(n.parent) ? n.parent : undefined);
  const children = new Map<string, FlowNode[]>();
  for (const n of nodes) { const p = parentOf(n); if (p) children.set(p, [...(children.get(p) ?? []), n]); }
  const placed: PlacedNode[] = [];
  const seen = new Set<string>();
  let nextRow = 0;
  const visit = (n: FlowNode, depth: number): number => {
    seen.add(n.id);
    const kids = (children.get(n.id) ?? []).filter(k => !seen.has(k.id));
    let row: number;
    if (!kids.length) row = nextRow++;
    else { row = visit(kids[0]!, depth + 1); for (const k of kids.slice(1)) visit(k, depth + 1); }
    placed.push({ ...n, col: depth, row });
    return row;
  };
  // Roots in order; a node in a parent loop becomes a root too, so nothing is lost.
  for (const n of nodes) if (!parentOf(n) && !seen.has(n.id)) visit(n, 0);
  for (const n of nodes) if (!seen.has(n.id)) visit(n, 0);
  const edges = nodes.flatMap(n => { const p = parentOf(n); return p ? [{ from: p, to: n.id }] : []; });
  return normalize(nodes.map(n => placed.find(p => p.id === n.id)!), edges);
}

/** Top down: depth is the row; each leaf takes a column; a parent covers its children's columns. */
function org(nodes: FlowNode[]): PlacedFlow {
  const ids = new Set(nodes.map(n => n.id));
  const parentOf = (n: FlowNode) => (n.parent && n.parent !== n.id && ids.has(n.parent) ? n.parent : undefined);
  const children = new Map<string, FlowNode[]>();
  for (const n of nodes) { const p = parentOf(n); if (p) children.set(p, [...(children.get(p) ?? []), n]); }
  const placed = new Map<string, PlacedNode>();
  let nextCol = 0;
  const visit = (n: FlowNode, depth: number) => {
    placed.set(n.id, { ...n, col: 0, row: depth });
    const kids = (children.get(n.id) ?? []).filter(k => !placed.has(k.id));
    if (!kids.length) { placed.set(n.id, { ...n, col: nextCol++, row: depth, span: 1 }); return; }
    for (const k of kids) visit(k, depth + 1);
    const first = placed.get(kids[0]!.id)!, last = placed.get(kids.at(-1)!.id)!;
    placed.set(n.id, { ...n, col: first.col, row: depth, span: last.col + (last.span ?? 1) - first.col });
  };
  for (const n of nodes) if (!parentOf(n) && !placed.has(n.id)) visit(n, 0);
  for (const n of nodes) if (!placed.has(n.id)) visit(n, 0);
  const edges = nodes.flatMap(n => { const p = parentOf(n); return p ? [{ from: p, to: n.id }] : []; });
  return normalize(nodes.map(n => placed.get(n.id)!), edges);
}

/** Two rows that loop: left to right on top, right to left below, back to the start. */
function cycle(nodes: FlowNode[]): PlacedFlow {
  if (nodes.length < 3) return normalize(nodes.map((n, i) => ({ ...n, col: i, row: 0 })), chain(nodes));
  const top = Math.ceil(nodes.length / 2);
  const placed = nodes.map((n, i) => (i < top ? { ...n, col: i, row: 0 } : { ...n, col: top - 1 - (i - top), row: 1 }));
  return normalize(placed, [...chain(nodes), { from: nodes.at(-1)!.id, to: nodes[0]!.id }]);
}

// The hub's ring around the centre (1,1): the sides first, then the corners.
const RING: [number, number][] = [[1, 0], [2, 1], [1, 2], [0, 1], [0, 0], [2, 0], [2, 2], [0, 2]];
function hub(nodes: FlowNode[]): PlacedFlow {
  const [centre, ...around] = nodes;
  if (!centre) return normalize([], []);
  const placed: PlacedNode[] = [{ ...centre, col: 1, row: 1 }, ...around.map((n, i) => {
    const ring = RING[i];
    // Past eight, the rest line up below.
    return ring ? { ...n, col: ring[0], row: ring[1] } : { ...n, col: (i - RING.length) % 3, row: 3 + Math.floor((i - RING.length) / 3) };
  })];
  return normalize(placed, around.map(n => ({ from: centre.id, to: n.id })));
}

function custom(nodes: FlowNode[], edges: FlowEdge[]): PlacedFlow {
  const taken = new Set<string>();
  const valid = (n: FlowNode) => Number.isFinite(n.col) && Number.isFinite(n.row);
  const cells = new Map<string, [number, number]>();
  for (const n of nodes) {
    if (!valid(n)) continue;
    const key = `${Math.round(n.col!)},${Math.round(n.row!)}`;
    if (taken.has(key)) continue;
    taken.add(key);
    cells.set(n.id, [Math.round(n.col!), Math.round(n.row!)]);
  }
  // Nodes without a cell (or on a taken one) line up on a new row below.
  const spareRow = cells.size ? Math.max(...[...cells.values()].map(([, row]) => row)) + 1 : 0;
  let spareCol = 0;
  const placed = nodes.map(n => {
    const cell = cells.get(n.id) ?? [spareCol++, spareRow];
    return { ...n, col: cell[0], row: cell[1] };
  });
  return normalize(placed, edges);
}

export function layoutFlow(diagram: Pick<FlowDiagram, "layout" | "nodes" | "edges">): PlacedFlow {
  const nodes = diagram.nodes;
  switch (diagram.layout) {
    case "vertical":
    case "funnel":
      return normalize(nodes.map((n, i) => ({ ...n, col: 0, row: i })), chain(nodes));
    case "branch": return branch(nodes);
    case "org": return org(nodes);
    case "cycle": return cycle(nodes);
    case "hub": return hub(nodes);
    case "circles": return normalize(nodes.map((n, i) => ({ ...n, col: i, row: 0 })), []);
    case "custom": return custom(nodes, diagram.edges ?? []);
    default: return normalize(nodes.map((n, i) => ({ ...n, col: i, row: 0 })), chain(nodes));
  }
}

/** The order to read the flow in a single column (phones): along the arrows, from the first node. */
export function readingOrder(flow: PlacedFlow): PlacedNode[] {
  const byId = new Map(flow.nodes.map(n => [n.id, n]));
  const next = new Map<string, string[]>();
  for (const e of flow.edges) next.set(e.from, [...(next.get(e.from) ?? []), e.to]);
  const order: PlacedNode[] = [];
  const seen = new Set<string>();
  const walk = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    order.push(byId.get(id)!);
    for (const to of next.get(id) ?? []) walk(to);
  };
  const incoming = new Set(flow.edges.map(e => e.to));
  for (const n of flow.nodes) if (!incoming.has(n.id)) walk(n.id);
  for (const n of flow.nodes) walk(n.id);
  return order;
}

/** Freezes any model into the free layout: the same places and arrows, now editable one by one. */
export function toCustom(diagram: FlowDiagram): FlowDiagram {
  const flow = layoutFlow(diagram);
  return {
    ...diagram, layout: "custom",
    nodes: diagram.nodes.map(n => { const p = flow.nodes.find(x => x.id === n.id)!; const { parent, ...rest } = n; void parent; return { ...rest, col: p.col, row: p.row }; }),
    // An org chart's wide parents become single cells; their place is the first of their columns.
    edges: flow.edges,
  };
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** Reads a flow from the case JSON; null when it has no usable node. */
export function parseFlowDiagram(obj: Record<string, unknown>): FlowDiagram | null {
  const layout = (FLOW_LAYOUTS as readonly string[]).includes(obj.layout as string) ? (obj.layout as FlowLayout) : "linear";
  const nodes: FlowNode[] = [];
  const ids = new Set<string>();
  for (const raw of Array.isArray(obj.nodes) ? obj.nodes : []) {
    if (!raw || typeof raw !== "object") continue;
    const n = raw as Record<string, unknown>;
    const id = str(n.id) ?? `n${nodes.length + 1}`;
    if (ids.has(id) || !(str(n.title) || str(n.body) || str(n.value) || str(n.bullets))) continue;
    ids.add(id);
    const tone = (FLOW_TONES as readonly string[]).includes(n.tone as string) ? (n.tone as FlowTone) : undefined;
    nodes.push({ id, title: str(n.title) ?? "", subtitle: str(n.subtitle), body: str(n.body), bullets: str(n.bullets), foot: str(n.foot), value: str(n.value), tone, parent: str(n.parent), col: num(n.col), row: num(n.row) });
  }
  if (!nodes.length) return null;
  const edges = (Array.isArray(obj.edges) ? obj.edges : []).flatMap(raw => {
    if (!raw || typeof raw !== "object") return [];
    const e = raw as Record<string, unknown>;
    const from = str(e.from), to = str(e.to);
    return from && to && ids.has(from) && ids.has(to) && from !== to ? [{ from, to, label: str(e.label) }] : [];
  });
  const arrange = obj.arrange === "horizontal" || obj.arrange === "venn" ? obj.arrange : obj.arrange === "vertical" ? "vertical" : undefined;
  return { layout, nodes, edges, arrange, intersection: str(obj.intersection), sectionLabel: str(obj.sectionLabel), heading: str(obj.heading), intro: str(obj.intro), caption: str(obj.caption), id: str(obj.id) };
}

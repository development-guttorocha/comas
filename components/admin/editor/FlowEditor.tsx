"use client";

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { FlowEdges, useFlowEdges } from "@/components/case/blocks/CaseFlowDiagram";
import { FLOW_LAYOUT_LABELS, FLOW_LAYOUTS, FLOW_TONES, layoutFlow, toCustom, type FlowEdge, type FlowLayout, type FlowNode, type FlowTone, type PlacedNode } from "@/lib/flowLayout";
import { COMPONENT_BY_NAME } from "@/lib/admin/componentSchemas";
import type { Values } from "@/lib/admin/fields";
import { Fields } from "../Fields";
import { PlusIcon, TrashIcon } from "../icons";
import styles from "./FlowEditor.module.css";

/**
 * O fluxo editado no próprio desenho: escolha o modelo, escreva nos cartões e use os "+" nos lados
 * para crescer naquela direção. No modelo Livre, arraste os cartões e ligue os que quiser.
 */

type Side = "top" | "right" | "bottom" | "left";
const DELTA: Record<Side, [number, number]> = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
const SIDE_LABEL: Record<Side, string> = { top: "acima", right: "à direita", bottom: "abaixo", left: "à esquerda" };
const TONE_LABEL: Record<FlowTone, string> = { neutral: "Neutro", soft: "Suave", focus: "Foco", brand: "Cor do case", light: "Claro" };

const newId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const blank = (): FlowNode => ({ id: newId(), title: "Nova etapa" });

/** Which "+" each model offers, and what it means there. */
function sidesFor(layout: FlowLayout, node: PlacedNode, isCentre: boolean): Side[] {
  switch (layout) {
    case "linear": case "cycle": case "circles": return ["left", "right"];
    case "vertical": case "funnel": return ["top", "bottom"];
    case "branch": return node.parent ? ["top", "right", "bottom"] : ["right", "bottom"];
    case "org": return node.parent ? ["left", "right", "bottom"] : ["bottom"];
    case "hub": return isCentre ? ["bottom"] : ["right"];
    default: return ["top", "right", "bottom", "left"];
  }
}
const sideHint = (layout: FlowLayout, side: Side) =>
  layout === "org" ? (side === "bottom" ? "Adicionar abaixo deste" : side === "right" ? "Ao lado, depois" : "Ao lado, antes")
  : layout === "branch" ? (side === "right" ? "Abrir um caminho a partir daqui" : side === "bottom" ? "Caminho paralelo abaixo" : "Caminho paralelo acima")
  : layout === "hub" ? "Adicionar ao redor do centro"
  : layout === "custom" ? `Novo cartão ${SIDE_LABEL[side]}, ligado a este`
  : side === "left" || side === "top" ? "Nova etapa antes" : "Nova etapa depois";

// Small pictures of each model for the picker.
const MODEL_PICS: Record<FlowLayout, ReactNode> = {
  linear: <><rect x="2" y="10" width="9" height="8" rx="2" /><rect x="15.5" y="10" width="9" height="8" rx="2" /><rect x="29" y="10" width="9" height="8" rx="2" /><path d="M11.5 14h3.5M25 14h3.5" /></>,
  vertical: <><rect x="14" y="1.5" width="12" height="6.5" rx="2" /><rect x="14" y="11" width="12" height="6.5" rx="2" /><rect x="14" y="20.5" width="12" height="6.5" rx="2" /><path d="M20 8v2.5M20 17.5V20" /></>,
  branch: <><rect x="2" y="10.5" width="10" height="7" rx="2" /><rect x="27" y="3" width="11" height="7" rx="2" /><rect x="27" y="18" width="11" height="7" rx="2" /><path d="M12 14h5.5c1 0 1.5-.5 1.5-1.5v-5c0-1 .5-1 1.5-1H27M19 14v6c0 1 .5 1.5 1.5 1.5H27" /></>,
  org: <><rect x="6" y="2" width="28" height="7" rx="2" /><rect x="3" y="18" width="9" height="8" rx="2" /><rect x="15.5" y="18" width="9" height="8" rx="2" fill="currentColor" fillOpacity=".25" /><rect x="28" y="18" width="9" height="8" rx="2" /><path d="M20 9v4.5M7.5 18v-4.5h25V18M20 13.5V18" /></>,
  cycle: <><rect x="4" y="3" width="12" height="8" rx="2" /><rect x="24" y="3" width="12" height="8" rx="2" /><rect x="24" y="17" width="12" height="8" rx="2" /><rect x="4" y="17" width="12" height="8" rx="2" /><path d="M16 7h8M30 11v6M24 21h-8M10 17v-6" /></>,
  funnel: <><rect x="4" y="2" width="32" height="6.5" rx="2" /><rect x="9" y="11" width="22" height="6.5" rx="2" /><rect x="14" y="20" width="12" height="6.5" rx="2" /></>,
  hub: <><rect x="14.5" y="10.5" width="11" height="7" rx="2" fill="currentColor" fillOpacity=".25" /><rect x="15.5" y="1" width="9" height="5" rx="1.5" /><rect x="15.5" y="22" width="9" height="5" rx="1.5" /><rect x="2" y="11.5" width="8" height="5" rx="1.5" /><rect x="30" y="11.5" width="8" height="5" rx="1.5" /><path d="M20 6v4.5M20 17.5V22M10 14h4.5M25.5 14H30" /></>,
  circles: <><circle cx="20" cy="9.5" r="8" fill="currentColor" fillOpacity=".25" /><circle cx="20" cy="19" r="8" /></>,
  custom: <><rect x="3" y="3" width="10" height="7" rx="2" /><rect x="27" y="7" width="10" height="7" rx="2" /><rect x="12" y="19" width="10" height="7" rx="2" /><path d="M13 6.5h6.5c1 0 1.5.5 1.5 1.5v2.5h6M8 10v12.5h4" strokeDasharray="2 2" /></>,
};

function readNodes(values: Values): FlowNode[] {
  return (Array.isArray(values.nodes) ? values.nodes : []).filter((n): n is FlowNode => !!n && typeof n === "object" && typeof (n as FlowNode).id === "string");
}

/** Everything below the node's place in the list: itself and its descendants (branch). */
function subtreeEnd(nodes: FlowNode[], id: string) {
  const inside = new Set([id]);
  let end = nodes.findIndex(n => n.id === id);
  for (let i = end + 1; i < nodes.length; i++) {
    if (nodes[i]!.parent && inside.has(nodes[i]!.parent!)) { inside.add(nodes[i]!.id); end = i; } else break;
  }
  return end;
}

export default function FlowEditor({ values, onChange }: { values: Values; onChange: (values: Values) => void }) {
  const def = COMPONENT_BY_NAME.get("CaseFlowDiagram")!;
  const layout: FlowLayout = (FLOW_LAYOUTS as readonly string[]).includes(values.layout as string) ? (values.layout as FlowLayout) : "linear";
  const nodes = useMemo(() => readNodes(values), [values]);
  const edges = useMemo<FlowEdge[]>(() => (Array.isArray(values.edges) ? (values.edges as FlowEdge[]) : []), [values]);
  const flow = useMemo(() => layoutFlow({ layout, nodes, edges }), [layout, nodes, edges]);
  const [linking, setLinking] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; x0: number; y0: number; x: number; y: number } | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const layoutKey = JSON.stringify([layout, flow.nodes.map(n => [n.id, n.col, n.row, n.span, n.title, n.subtitle, n.body, n.bullets, n.foot, n.value]), flow.edges]);
  const { paths, w, h } = useFlowEdges(canvas, flow.edges, layoutKey, layout === "org" ? "trunk" : "route");

  const save = (next: { layout?: FlowLayout; nodes?: FlowNode[]; edges?: FlowEdge[] }) => {
    const out: Values = { ...values, ...next };
    if ((next.layout ?? layout) !== "custom") delete out.edges;
    onChange(out);
  };
  const patch = (id: string, change: Partial<FlowNode>) => save({ nodes: nodes.map(n => (n.id === id ? { ...n, ...change } : n)) });

  /** The free layout keeps cells: write the drawn ones back before moving anything. */
  const placed = () => flow.nodes.map(({ col, row, ...n }) => ({ ...nodes.find(x => x.id === n.id)!, col, row }));

  function switchLayout(next: FlowLayout) {
    if (next === layout) return;
    setLinking(null);
    if (next === "custom") { const frozen = toCustom({ layout, nodes, edges }); save({ layout: "custom", nodes: frozen.nodes, edges: frozen.edges }); return; }
    // Leaving the free layout keeps the cards; a branch starts as a chain, ready to split.
    const kept = nodes.map(({ col, row, ...n }) => { void col; void row; return n; });
    const flat = !kept.some(n => n.parent);
    // A branch starts as a chain; an org chart as one head over everyone else.
    const chained = !flat ? kept : next === "branch" ? kept.map((n, i) => (i ? { ...n, parent: kept[i - 1]!.id } : n)) : next === "org" ? kept.map((n, i) => (i ? { ...n, parent: kept[0]!.id } : n)) : kept;
    save({ layout: next, nodes: chained });
  }

  function add(node: PlacedNode, side: Side) {
    const fresh = blank();
    const at = nodes.findIndex(n => n.id === node.id);
    if (layout === "custom") {
      const [dx, dy] = DELTA[side];
      let cells = placed();
      const target = { col: node.col + dx, row: node.row + dy };
      // A taken cell makes room: everything from there on moves one step that way.
      if (cells.some(n => n.col === target.col && n.row === target.row)) {
        cells = cells.map(n => {
          if (dx > 0 && n.col >= target.col) return { ...n, col: n.col + 1 };
          if (dx < 0 && n.col >= node.col) return { ...n, col: n.col + 1 };
          if (dy > 0 && n.row >= target.row) return { ...n, row: n.row + 1 };
          if (dy < 0 && n.row >= node.row) return { ...n, row: n.row + 1 };
          return n;
        });
        if (dx < 0) target.col = node.col;
        if (dy < 0) target.row = node.row;
      }
      save({ nodes: [...cells, { ...fresh, ...target }], edges: [...edges, { from: node.id, to: fresh.id }] });
      return;
    }
    const next = [...nodes];
    if (layout === "org") {
      if (side === "bottom") next.splice(subtreeEnd(nodes, node.id) + 1, 0, { ...fresh, parent: node.id });
      else if (side === "right") next.splice(subtreeEnd(nodes, node.id) + 1, 0, { ...fresh, parent: node.parent });
      else next.splice(at, 0, { ...fresh, parent: node.parent });
    } else if (layout === "branch") {
      if (side === "right") next.splice(subtreeEnd(nodes, node.id) + 1, 0, { ...fresh, parent: node.id });
      else if (side === "bottom") next.splice(subtreeEnd(nodes, node.id) + 1, 0, { ...fresh, parent: node.parent });
      else next.splice(at, 0, { ...fresh, parent: node.parent });
    } else if (layout === "hub" && at === 0) next.push(fresh);
    else next.splice(side === "left" || side === "top" ? at : at + 1, 0, fresh);
    save({ nodes: next });
  }

  function remove(id: string) {
    const gone = nodes.find(n => n.id === id);
    // Its branches hang from its own parent instead.
    const rest = nodes.filter(n => n.id !== id).map(n => (n.parent === id ? { ...n, parent: gone?.parent } : n));
    save({ nodes: rest, edges: edges.filter(e => e.from !== id && e.to !== id) });
    if (linking === id) setLinking(null);
  }

  function toggleEdge(from: string, to: string) {
    if (from === to) return;
    const exists = edges.some(e => e.from === from && e.to === to);
    save({ edges: exists ? edges.filter(e => !(e.from === from && e.to === to)) : [...edges, { from, to }] });
  }

  /** Free layout: drop a card on another cell (a taken one swaps); past the edges grows the grid. */
  function drop(id: string, clientX: number, clientY: number) {
    const el = canvas.current;
    if (!el) return;
    const style = getComputedStyle(el);
    const tracks = (value: string) => value.split(" ").map(parseFloat).filter(Number.isFinite);
    const cell = (pos: number, sizes: number[], gap: number) => {
      let edge = 0;
      for (let i = 0; i < sizes.length; i++) { if (pos < edge + sizes[i]! + gap / 2) return pos < 0 ? -1 : i; edge += sizes[i]! + gap; }
      return sizes.length;
    };
    const r = el.getBoundingClientRect();
    const scale = r.width / el.offsetWidth || 1;
    const col = cell((clientX - r.left) / scale, tracks(style.gridTemplateColumns), parseFloat(style.columnGap) || 0);
    const row = cell((clientY - r.top) / scale, tracks(style.gridTemplateRows), parseFloat(style.rowGap) || 0);
    const cells = placed();
    const moving = cells.find(n => n.id === id)!;
    const other = cells.find(n => n.col === col && n.row === row);
    save({ nodes: cells.map(n => (n.id === id ? { ...n, col, row } : other && n.id === other.id ? { ...n, col: moving.col, row: moving.row } : n)) });
  }

  function startDrag(event: ReactPointerEvent, id: string) {
    event.preventDefault();
    // Keeps the drag when the pointer leaves the handle; not every pointer can be captured.
    try { (event.target as HTMLElement).setPointerCapture(event.pointerId); } catch { /* moves still reach the canvas */ }
    setDrag({ id, x0: event.clientX, y0: event.clientY, x: event.clientX, y: event.clientY });
  }

  return (
    <div className={styles.editor}>
      <div className={styles.models} role="radiogroup" aria-label="Modelo do fluxo">
        {FLOW_LAYOUTS.map(id => (
          <button key={id} type="button" role="radio" aria-checked={layout === id} className={styles.model} onClick={() => switchLayout(id)} title={FLOW_LAYOUT_LABELS[id].hint}>
            <svg viewBox="0 0 40 28" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{MODEL_PICS[id]}</svg>
            <span>{FLOW_LAYOUT_LABELS[id].label}</span>
          </button>
        ))}
      </div>
      <p className={styles.hint}>
        {FLOW_LAYOUT_LABELS[layout].hint}
        {layout === "custom" ? " Arraste pela alça ⠿ para mover; use ↗ para ligar ou desligar uma seta." : layout === "funnel" ? " O número de cada etapa fica em destaque." : layout === "circles" ? " Cada círculo tem número, título e texto; a cor de cada um muda pela bolinha." : " Para mover cartões à vontade e escrever nas setas, use Livre."}
      </p>

      {layout === "circles" ? (
        <div className={styles.circleOptions}>
          <label>Arranjo
            <select value={(values.arrange as string) ?? "vertical"} onChange={e => onChange({ ...values, arrange: e.target.value === "vertical" ? undefined : e.target.value })}>
              <option value="vertical">Empilhados</option>
              <option value="horizontal">Lado a lado</option>
              <option value="venn">Venn (2 ou 3 círculos)</option>
            </select>
          </label>
          {values.arrange === "venn" ? (
            <label>Texto na interseção
              <input value={(values.intersection as string) ?? ""} placeholder="Opcional" onChange={e => onChange({ ...values, intersection: e.target.value || undefined })} />
            </label>
          ) : null}
        </div>
      ) : null}

      <div className={styles.scroller}>
        <div ref={canvas} className={styles.canvas} data-layout={layout} data-linking={linking ? "" : undefined}
          style={{ ["--cols" as string]: Math.max(flow.cols, 1), ["--rows" as string]: Math.max(flow.rows, 1) }}
          onPointerMove={event => { if (drag) setDrag({ ...drag, x: event.clientX, y: event.clientY }); }}
          onPointerUp={event => { if (drag) { drop(drag.id, event.clientX, event.clientY); setDrag(null); } }}>
          {flow.nodes.map((node, i) => {
            const isCentre = layout === "hub" && i === 0;
            const tone = node.tone ?? "neutral";
            return (
              <div key={node.id} data-node={node.id} className={styles.node} data-tone={tone} data-dragging={drag?.id === node.id || undefined}
                data-link-target={linking && linking !== node.id ? "" : undefined}
                style={{ gridColumn: `${node.col + 1} / span ${node.span ?? 1}`, gridRow: node.row + 1, transform: drag?.id === node.id ? `translate(${drag.x - drag.x0}px, ${drag.y - drag.y0}px)` : undefined }}
                onClick={() => { if (linking && linking !== node.id) toggleEdge(linking, node.id); }}>
                <div className={styles.nodeTools}>
                  {layout === "custom" ? <button type="button" className={styles.handle} aria-label={`Mover ${node.title || "cartão"}`} title="Arraste para mover" onPointerDown={event => startDrag(event, node.id)}>⠿</button> : null}
                  <button type="button" className={styles.tone} data-tone={tone} aria-label={`Cor: ${TONE_LABEL[tone]}. Trocar`} title={`Cor: ${TONE_LABEL[tone]}`}
                    onClick={() => patch(node.id, { tone: FLOW_TONES[(FLOW_TONES.indexOf(tone) + 1) % FLOW_TONES.length] === "neutral" ? undefined : FLOW_TONES[(FLOW_TONES.indexOf(tone) + 1) % FLOW_TONES.length] })} />
                  {isCentre ? <span className={styles.badge}>centro</span> : null}
                  <span style={{ flex: 1 }} />
                  {layout === "custom" ? <button type="button" className={styles.tool} data-on={linking === node.id || undefined} aria-pressed={linking === node.id} title={linking === node.id ? "Clique nos cartões para ligar; clique aqui para terminar" : "Ligar a outros cartões"} onClick={event => { event.stopPropagation(); setLinking(linking === node.id ? null : node.id); }}>↗</button> : null}
                  <button type="button" className={styles.tool} aria-label={`Remover ${node.title || "cartão"}`} title="Remover" disabled={nodes.length < 2} onClick={() => remove(node.id)}><TrashIcon /></button>
                </div>
                <input className={styles.value} value={node.value ?? ""} placeholder={layout === "funnel" ? "Número" : "Número (opcional)"} aria-label="Número" onChange={e => patch(node.id, { value: e.target.value || undefined })} />
                <input className={styles.title} value={node.title} placeholder="Título" aria-label="Título" onChange={e => patch(node.id, { title: e.target.value })} />
                <input className={styles.subtitle} value={node.subtitle ?? ""} placeholder="Subtítulo (opcional)" aria-label="Subtítulo" onChange={e => patch(node.id, { subtitle: e.target.value || undefined })} />
                <textarea className={styles.body} value={node.body ?? ""} placeholder="Texto (opcional)" aria-label="Texto" rows={1} onChange={e => patch(node.id, { body: e.target.value || undefined })} />
                <textarea className={`${styles.body} ${styles.bullets}`} value={node.bullets ?? ""} placeholder="Lista: um item por linha (opcional)" aria-label="Lista" rows={1} onChange={e => patch(node.id, { bullets: e.target.value || undefined })} />
                <input className={styles.foot} value={node.foot ?? ""} placeholder="Nota no pé (opcional)" aria-label="Nota no pé" onChange={e => patch(node.id, { foot: e.target.value || undefined })} />
                {(layout === "branch" || layout === "org") && i > 0 ? (
                  <select className={styles.parent} value={node.parent ?? ""} aria-label="Vem de" onChange={e => patch(node.id, { parent: e.target.value || undefined })}>
                    <option value="">{layout === "org" ? "No topo" : "Começa um caminho"}</option>
                    {nodes.filter(n => n.id !== node.id).map(n => <option key={n.id} value={n.id}>Vem de: {n.title || "sem título"}</option>)}
                  </select>
                ) : null}
                {sidesFor(layout, node, isCentre).map(side => (
                  <button key={side} type="button" className={styles.plus} data-side={side} aria-label={sideHint(layout, side)} title={sideHint(layout, side)} onClick={event => { event.stopPropagation(); add(node, side); }}><PlusIcon /></button>
                ))}
              </div>
            );
          })}
          {layout !== "funnel" && layout !== "circles" ? <FlowEdges paths={paths} w={w} h={h} className={styles.edges} labelClass={styles.edgeLabel} arrows={layout !== "org"} /> : null}
        </div>
      </div>

      {layout === "custom" && edges.length ? (
        <div className={styles.links}>
          <span className={styles.linksTitle}>Setas</span>
          {edges.map((edge, i) => {
            const name = (id: string) => nodes.find(n => n.id === id)?.title || "sem título";
            return (
              <div key={`${edge.from}>${edge.to}:${i}`} className={styles.link}>
                <span className={styles.linkPath}>{name(edge.from)} → {name(edge.to)}</span>
                <input className={styles.linkLabel} value={edge.label ?? ""} placeholder="Texto na seta (opcional)" aria-label="Texto na seta"
                  onChange={e => save({ edges: edges.map((x, j) => (j === i ? { ...x, label: e.target.value || undefined } : x)) })} />
                <button type="button" className={styles.tool} aria-label="Remover seta" onClick={() => save({ edges: edges.filter((_, j) => j !== i) })}><TrashIcon /></button>
              </div>
            );
          })}
        </div>
      ) : null}

      <Fields defs={def.fields} values={values} onChange={onChange} />
    </div>
  );
}

"use client";

import type { KeyboardEvent } from "react";
import type { CareerTrackContent } from "@/lib/resources";
import styles from "@/app/(pt)/recursos/flow.module.css";

type Flow = CareerTrackContent["flow"];
type Node = Flow["nodes"][number];
type Pt = { x: number; y: number };

/**
 * A career drawn the way designers draw user flows: roles as nodes, neighboring areas dashed,
 * arrows going up, sideways and back, each labeled with what it takes to follow it.
 * `hero` walks a "you are here" pin along a non-linear path; `pick` lets the visitor choose a
 * role and lights the paths that leave it.
 */
export const W = 1360, H = 690;
const nodeW = (n: Node) => n.label.length * (n.kind === "role" ? 12.2 : 11) + 48;
const NODE_H = 56;

/** Where the line from a node's center towards (dx, dy) leaves its box. */
function exit(n: Node, dx: number, dy: number, pad = 8): Pt {
  const hw = nodeW(n) / 2 + pad, hh = NODE_H / 2 + pad;
  const t = Math.min(hw / Math.abs(dx || 1e-6), hh / Math.abs(dy || 1e-6));
  return { x: n.x + dx * t, y: n.y + dy * t };
}

/** A straight arrow from box edge to box edge; `center` runs node center to center, for the pin. */
export function edgeGeometry(a: Node, b: Node) {
  const s = exit(a, b.x - a.x, b.y - a.y), e = exit(b, a.x - b.x, a.y - b.y);
  return { d: `M${s.x} ${s.y} L${e.x} ${e.y}`, center: `M${a.x} ${a.y} L${b.x} ${b.y}` };
}

export default function CareerFlow({ flow, mode, selected, onSelect, youLabel, label, hint = false }: {
  flow: Flow; mode: "hero" | "pick"; selected?: string; onSelect?: (id: string) => void; youLabel?: string; label: string; hint?: boolean;
}) {
  const at = new Map(flow.nodes.map(n => [n.id, n]));
    const edges = flow.edges.map(e => ({ ...e, ...edgeGeometry(at.get(e.from)!, at.get(e.to)!) }));
  const walkEdges = mode === "hero" ? flow.walk.slice(1).map((id, i) => edges.find(e => e.from === flow.walk[i] && e.to === id)!).filter(Boolean) : [];
  const walkPath = walkEdges.map((e, i) => (i ? e.center.replace(/^M[^L]+/, "") : e.center)).join(" ");
  const onWalk = new Set(walkEdges.map(e => `${e.from}-${e.to}`));
  const out = new Set(mode === "pick" ? flow.edges.filter(e => e.from === selected).map(e => e.to) : []);

  const key = (id: string) => (ev: KeyboardEvent) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onSelect?.(id); } };

  return (
    <svg className={styles.flow} data-mode={mode} data-hint={hint || undefined} viewBox={`0 0 ${W} ${H}`} role={mode === "hero" ? "img" : "group"} aria-label={label}>
      <defs>
        <pattern id={`dots-${mode}`} width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" className={styles.dot} /></pattern>
        <marker id={`arrow-${mode}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" className={styles.arrowHead} /></marker>
        <marker id={`arrow-on-${mode}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" className={styles.arrowHeadOn} /></marker>
      </defs>
      <rect width={W} height={H} fill={`url(#dots-${mode})`} />

      {/* Layers: every line first, then the labels, then the nodes, so lines always pass behind text. */}
      {edges.map(e => {
        const lit = mode === "pick" ? e.from === selected : onWalk.has(`${e.from}-${e.to}`);
        return <path key={`${e.from}-${e.to}`} d={e.d} className={styles.edge} data-lit={lit || undefined} markerEnd={`url(#${lit ? "arrow-on" : "arrow"}-${mode})`} />;
      })}

      {/* A lit path's label sits by the role it leads to, never on the line, so labels cannot
          meet each other: the roles are already spaced on a grid. */}
      {edges.filter(e => (mode === "pick" ? e.from === selected : onWalk.has(`${e.from}-${e.to}`))).map(e => {
        const to = at.get(e.to)!, from = at.get(e.from)!;
        // On the side the arrow does not come from, so the line never runs through its own label.
        const below = from.y < to.y - 1;
        return (
          <foreignObject key={`l-${e.from}-${e.to}`} x={to.x - 160} y={below ? to.y + NODE_H / 2 + 4 : to.y - NODE_H / 2 - 38} width="320" height="34">
            <div className={styles.edgeLabelWrap}><span className={styles.edgeLabel}>{e.label}</span></div>
          </foreignObject>
        );
      })}

      {flow.nodes.map(n => {
        const w = nodeW(n);
        const isSel = n.id === selected;
        const reach = out.has(n.id);
        const interactive = mode === "pick";
        return (
          <g key={n.id} className={styles.node} data-kind={n.kind} data-selected={isSel || undefined} data-reach={reach || undefined}
            data-dim={mode === "pick" && selected && !isSel && !reach ? true : undefined}
            transform={`translate(${n.x - w / 2} ${n.y - NODE_H / 2})`}
            {...(interactive ? { role: "button", tabIndex: 0, "aria-pressed": isSel, "aria-label": n.label, onClick: () => onSelect?.(n.id), onKeyDown: key(n.id) } : {})}>
            <rect width={w} height={NODE_H} rx="12" />
            <text x={w / 2} y={NODE_H / 2 + 7} textAnchor="middle">{n.label}</text>
          </g>
        );
      })}

      {mode === "hero" && walkPath ? (
        <>
          <g className={styles.pin}>
            <animateMotion dur="11s" repeatCount="indefinite" path={walkPath} keyPoints="0;0;1;1" keyTimes="0;0.08;0.82;1" calcMode="linear" />
            {/* Seen only while it moves: resting on a role, its label would cover the role's name. */}
            <animate attributeName="opacity" dur="11s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0;0.06;0.11;0.8;0.85;1" />
            <circle r="12" />
            <foreignObject x="18" y="-46" width="180" height="44"><div className={styles.pinLabelWrap}><span className={styles.pinLabel}>{youLabel}</span></div></foreignObject>
          </g>
        </>
      ) : null}
    </svg>
  );
}

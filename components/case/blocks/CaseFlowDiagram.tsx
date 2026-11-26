"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { layoutFlow, readingOrder, type FlowDiagram, type FlowEdge, type PlacedNode } from "@/lib/flowLayout";
import story from "./CaseStoryBlocks.module.css";
import styles from "./CaseFlowDiagram.module.css";

/**
 * Fluxo em vários modelos (linha, vertical, ramificação, ciclo, funil, hub ou livre). Os cartões
 * ficam numa grade; as setas são desenhadas por cima, a partir da posição real de cada cartão.
 */

type Box = { x: number; y: number; w: number; h: number };
export type EdgePath = { key: string; d: string; label?: string; lx: number; ly: number };

const GAP = 6;
/** A path through `points` with rounded corners. */
function rounded(points: [number, number][], radius = 10) {
  let d = `M${points[0]![0]} ${points[0]![1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1]!, [x, y] = points[i]!, [nx, ny] = points[i + 1]!;
    const r = Math.min(radius, Math.hypot(x - px, y - py) / 2, Math.hypot(nx - x, ny - y) / 2);
    const ax = x - Math.sign(x - px) * r, ay = y - Math.sign(y - py) * r;
    const bx = x + Math.sign(nx - x) * r, by = y + Math.sign(ny - y) * r;
    d += ` L${ax} ${ay} Q${x} ${y} ${bx} ${by}`;
  }
  const [lx, ly] = points.at(-1)!;
  return `${d} L${lx} ${ly}`;
}

/** From the side of `a` that faces `b` to the side of `b` that faces `a`: straight when they line up, else one elbow. */
export function route(a: Box, b: Box): { d: string; lx: number; ly: number } {
  const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const gapX = b.x > a.x + a.w ? b.x - (a.x + a.w) : a.x > b.x + b.w ? a.x - (b.x + b.w) : 0;
  const gapY = b.y > a.y + a.h ? b.y - (a.y + a.h) : a.y > b.y + b.h ? a.y - (b.y + b.h) : 0;
  const horizontal = overlapY > 0 ? true : overlapX > 0 ? false : gapX >= gapY;
  if (horizontal) {
    const right = b.x + b.w / 2 > a.x + a.w / 2;
    const sx = right ? a.x + a.w + GAP : a.x - GAP, ex = right ? b.x - GAP : b.x + b.w + GAP;
    const mid = overlapY > 0 ? Math.max(a.y, b.y) + overlapY / 2 : null;
    const sy = mid ?? a.y + a.h / 2, ey = mid ?? b.y + b.h / 2;
    const mx = (sx + ex) / 2;
    return { d: sy === ey ? `M${sx} ${sy} L${ex} ${ey}` : rounded([[sx, sy], [mx, sy], [mx, ey], [ex, ey]]), lx: mx, ly: (sy + ey) / 2 };
  }
  const down = b.y + b.h / 2 > a.y + a.h / 2;
  const sy = down ? a.y + a.h + GAP : a.y - GAP, ey = down ? b.y - GAP : b.y + b.h + GAP;
  const mid = overlapX > 0 ? Math.max(a.x, b.x) + overlapX / 2 : null;
  const sx = mid ?? a.x + a.w / 2, ex = mid ?? b.x + b.w / 2;
  const my = (sy + ey) / 2;
  return { d: sx === ex ? `M${sx} ${sy} L${ex} ${ey}` : rounded([[sx, sy], [sx, my], [ex, my], [ex, ey]]), lx: (sx + ex) / 2, ly: my };
}

/** Org chart: down from the parent's middle, across, and down into the child — siblings share the bar. */
export function trunk(a: Box, b: Box): { d: string; lx: number; ly: number } {
  const sx = a.x + a.w / 2, sy = a.y + a.h, ex = b.x + b.w / 2, ey = b.y;
  const my = (sy + ey) / 2;
  return { d: Math.abs(sx - ex) < 1 ? `M${sx} ${sy} L${ex} ${ey}` : rounded([[sx, sy], [sx, my], [ex, my], [ex, ey]], 8), lx: ex, ly: my };
}

/**
 * Measures the cards inside `canvas` (layout px, so zoom and transforms don't skew it) and routes every
 * edge. It measures again when `layoutKey` changes or anything resizes; `edges` is read as it is then.
 */
export function useFlowEdges(canvas: RefObject<HTMLElement | null>, edges: FlowEdge[], layoutKey: string, routing: "route" | "trunk" = "route") {
  const [paths, setPaths] = useState<{ key: string; paths: EdgePath[]; w: number; h: number }>({ key: "", paths: [], w: 0, h: 0 });
  const current = useRef(edges);
  useLayoutEffect(() => { current.current = edges; });
  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const measure = () => {
      const box = (id: string): Box | null => {
        const node = el.querySelector<HTMLElement>(`[data-node="${CSS.escape(id)}"]`);
        return node && node.offsetParent === el ? { x: node.offsetLeft, y: node.offsetTop, w: node.offsetWidth, h: node.offsetHeight } : null;
      };
      const next = current.current.flatMap((e, i) => {
        const a = box(e.from), b = box(e.to);
        return a && b ? [{ key: `${e.from}>${e.to}:${i}`, label: e.label, ...(routing === "trunk" ? trunk(a, b) : route(a, b)) }] : [];
      });
      setPaths({ key: layoutKey, paths: next, w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.querySelectorAll("[data-node]").forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [canvas, layoutKey, routing]);
  return paths.key === layoutKey ? paths : { key: layoutKey, paths: [], w: 0, h: 0 };
}

/** The arrows over the cards; labels as HTML so they read like the rest of the text. */
export function FlowEdges({ paths, w, h, className, labelClass, arrows = true }: { paths: EdgePath[]; w: number; h: number; className?: string; labelClass?: string; arrows?: boolean }) {
  const marker = `flow-arrow-${useId().replace(/:/g, "")}`;
  if (!w) return null;
  return (
    <>
      <svg className={className ?? styles.edges} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <defs>
          <marker id={marker} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M1 1.5 8 5 1 8.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        {paths.map(p => <path key={p.key} d={p.d} markerEnd={arrows ? `url(#${marker})` : undefined} />)}
      </svg>
      {paths.map(p => (p.label ? <span key={`l${p.key}`} className={labelClass ?? styles.edgeLabel} style={{ left: p.lx, top: p.ly }}>{p.label}</span> : null))}
    </>
  );
}

const toneClass = (tone?: string) => (tone ? styles[`tone_${tone}`] ?? "" : "");

function Header({ diagram }: { diagram: FlowDiagram }) {
  if (!diagram.sectionLabel && !diagram.heading && !diagram.intro) return null;
  return (
    <header className={story.header}>
      {diagram.sectionLabel ? <p className={story.label}>{diagram.sectionLabel}</p> : null}
      {diagram.heading ? <h2 className={story.heading}>{diagram.heading}</h2> : null}
      {diagram.intro ? <p className={story.intro}>{diagram.intro}</p> : null}
    </header>
  );
}

function Card({ node, style, last }: { node: PlacedNode; style?: CSSProperties; last?: boolean }) {
  return (
    <div className={`${styles.node} ${toneClass(node.tone)}`} data-node={node.id} data-last={last || undefined} style={style}>
      {node.value ? <span className={styles.value}>{node.value}</span> : null}
      {node.title ? <h3>{node.title}</h3> : null}
      {node.subtitle ? <p className={styles.subtitle}>{node.subtitle}</p> : null}
      {node.body ? <p>{node.body}</p> : null}
      {node.bullets ? <ul className={styles.bullets}>{node.bullets.split("\n").map(b => b.trim()).filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}</ul> : null}
      {node.foot ? <p className={styles.foot}>{node.foot}</p> : null}
    </div>
  );
}

/** Stacked bars narrowing down, each with its figure: the case colour fades as the funnel closes. */
function Funnel({ nodes }: { nodes: PlacedNode[] }) {
  const n = nodes.length;
  return (
    <ol className={styles.funnel}>
      {nodes.map((node, i) => {
        const step = n > 1 ? i / (n - 1) : 0;
        return (
          <li key={node.id} className={styles.funnelStep} style={{ ["--w" as string]: `${100 - step * 46}%`, ["--mix" as string]: `${62 - step * 44}%` }}>
            {node.value ? <span className={styles.funnelValue}>{node.value}</span> : null}
            <span className={styles.funnelText}>{node.title ? <strong>{node.title}</strong> : null}{node.body ? <span>{node.body}</span> : null}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Circles that overlap; translucent, so where they meet reads lighter. Venn of three: two below, one on top. */
function Circles({ diagram }: { diagram: FlowDiagram }) {
  const nodes = diagram.nodes;
  const arrange = diagram.arrange ?? "vertical";
  const venn = arrange === "venn" && nodes.length >= 2 && nodes.length <= 3;
  return (
    <div className={styles.circles} data-arrange={venn ? `venn${nodes.length}` : arrange === "venn" ? "horizontal" : arrange} style={{ "--count": nodes.length } as CSSProperties}>
      {nodes.map((node, i) => (
        <div key={node.id} className={`${styles.circle} ${toneClass(node.tone)}`} data-index={i}>
          {node.value ? <span className={styles.value}>{node.value}</span> : null}
          {node.title ? <h3>{node.title}</h3> : null}
          {node.body ? <p>{node.body}</p> : null}
        </div>
      ))}
      {venn && diagram.intersection ? <span className={styles.intersection}>{diagram.intersection}</span> : null}
    </div>
  );
}

function Canvas({ diagram }: { diagram: FlowDiagram }) {
  const flow = useMemo(() => layoutFlow(diagram), [diagram]);
  const order = useMemo(() => readingOrder(flow), [flow]);
  const canvas = useRef<HTMLDivElement>(null);
  const layoutKey = JSON.stringify([diagram.layout, flow.nodes.map(n => [n.id, n.col, n.row, n.span, n.title, n.subtitle, n.body, n.bullets, n.foot, n.value])]);
  const org = diagram.layout === "org";
  const { paths, w, h } = useFlowEdges(canvas, flow.edges, layoutKey, org ? "trunk" : "route");
  return (
    <div ref={canvas} className={styles.canvas} data-layout={diagram.layout} style={{ ["--cols" as string]: flow.cols, ["--rows" as string]: flow.rows }}>
      {flow.nodes.map(node => {
        const at = order.indexOf(node);
        return <Card key={node.id} node={node} last={at === order.length - 1} style={{ gridColumn: `${node.col + 1} / span ${node.span ?? 1}`, gridRow: node.row + 1, order: at }} />;
      })}
      <FlowEdges paths={paths} w={w} h={h} arrows={!org} />
    </div>
  );
}

export default function CaseFlowDiagram({ diagram }: { diagram: FlowDiagram }): ReactNode {
  return (
    <section id={diagram.id} className={story.section}>
      <div className="content-wrap">
        <ScrollReveal tone="editorial"><Header diagram={diagram} /></ScrollReveal>
        <ScrollReveal tone="editorial" delay={.06}>
          {diagram.layout === "funnel" ? <Funnel nodes={layoutFlow(diagram).nodes} /> : diagram.layout === "circles" ? <Circles diagram={diagram} /> : <Canvas diagram={diagram} />}
          {diagram.caption ? <p className={styles.caption}>{diagram.caption}</p> : null}
        </ScrollReveal>
      </div>
    </section>
  );
}

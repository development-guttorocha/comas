"use client";

import { arc, area, curveLinear, curveMonotoneX, line, scaleBand, scaleLinear, scalePoint } from "d3";
import { motion } from "framer-motion";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import ScrollReveal from "@/components/ScrollReveal";
import { CHART_EASE, useChartAccent, useChartReveal } from "@/components/case/charts/chartMotion";
import type { ChartSpec } from "@/lib/chartSpec";
import story from "./CaseStoryBlocks.module.css";
import styles from "./CaseChart.module.css";

/**
 * Um gráfico editável: colunas, barras, linha, área, progresso, medidor ou antes e depois, a
 * partir da mesma tabela. As cores seguem a cor do case; as marcas crescem quando o gráfico entra na tela.
 */

const HEIGHT = { s: 220, m: 300, l: 400 } as const;
type Ctx = {
  spec: ChartSpec; accent: string; shown: boolean; reduce: boolean; fmt: (n: number) => string;
  /** A series' colour; with one series, an item's (highlight and tones paint items one by one). */
  color: (series: number, category?: number) => string;
  /** Outside the highlight. */
  quiet: (category: number) => boolean;
  /** Outside the highlight where colour can't tell it (several series): drawn faded. */
  dim: (category: number) => boolean;
};

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

const transition = (ctx: Ctx, i = 0) => ({ duration: ctx.reduce ? 0 : 1.1, delay: ctx.reduce ? 0 : 0.1 + i * 0.06, ease: CHART_EASE });

/** Values of every series at a category, as numbers (empty cells are 0 in stacks). */
const at = (spec: ChartSpec, i: number) => spec.series.map(s => s.values[i] ?? 0);

function YGrid({ ticks, y, left, right, ctx }: { ticks: number[]; y: (n: number) => number; left: number; right: number; ctx: Ctx }) {
  if (ctx.spec.hideGrid) return null;
  return <g className={styles.grid}>{ticks.map(t => <g key={t}><line x1={left} x2={right} y1={y(t)} y2={y(t)} /><text x={left - 8} y={y(t)} dy="0.32em" textAnchor="end">{ctx.fmt(t)}</text></g>)}</g>;
}

/** Category names under the plot, as HTML so long ones wrap. */
function XLabels({ items }: { items: { label: string; x: number; width: number }[] }) {
  return <div className={styles.xLabels}>{items.map((item, i) => <span key={i} style={{ left: item.x, width: item.width }}>{item.label}</span>)}</div>;
}

function Columns({ ctx, width }: { ctx: Ctx; width: number }) {
  const { spec } = ctx;
  const height = HEIGHT[spec.size ?? "m"];
  const left = spec.hideGrid ? 4 : 52, right = width - 4, top = 28, bottom = height - 8;
  const totals = spec.categories.map((_, i) => at(spec, i));
  const max = spec.yMax ?? Math.max(...totals.map(v => (spec.stacked ? v.reduce((a, b) => a + Math.max(0, b), 0) : Math.max(...v))), 0);
  const min = spec.yMin ?? Math.min(0, ...totals.flat());
  const y = scaleLinear().domain([min, max || 1]).nice(4).range([bottom, top]);
  const x = scaleBand<number>().domain(spec.categories.map((_, i) => i)).range([left, right]).padding(0.28);
  const inner = scaleBand<number>().domain(spec.series.map((_, j) => j)).range([0, x.bandwidth()]).padding(0.12);
  const showValues = !spec.hideValues;
  return (
    <>
      <svg width={width} height={height} className={styles.svg}>
        <YGrid ticks={y.ticks(4)} y={y} left={left} right={right} ctx={ctx} />
        <line className={styles.baseline} x1={left} x2={right} y1={y(Math.max(0, min))} y2={y(Math.max(0, min))} />
        {spec.categories.map((_, i) => {
          let stack = 0;
          return (
            <g key={i} opacity={ctx.dim(i) ? 0.35 : 1}>
              {spec.series.map((s, j) => {
                const v = s.values[i];
                if (v === null) return null;
                const from = spec.stacked ? stack : 0, to = from + v;
                if (spec.stacked) stack = to;
                const y0 = y(from), y1 = y(to);
                const bx = spec.stacked ? x(i)! : x(i)! + inner(j)!, bw = spec.stacked ? x.bandwidth() : inner.bandwidth();
                const last = spec.stacked ? j === spec.series.length - 1 : true;
                return (
                  <g key={j}>
                    <motion.rect x={bx} width={bw} y={Math.min(y0, y1)} height={Math.max(1, Math.abs(y0 - y1))} rx={Math.min(6, bw / 4)} fill={ctx.color(j, i)}
                      style={{ transformBox: "fill-box", transformOrigin: v >= 0 ? "bottom" : "top" }}
                      initial={{ scaleY: 0 }} animate={{ scaleY: ctx.shown ? 1 : 0 }} transition={transition(ctx, i)} />
                    {showValues && last ? (
                      <motion.text className={styles.value} x={bx + bw / 2} y={(spec.stacked ? y(stack) : Math.min(y0, y1)) - 8} textAnchor="middle"
                        initial={{ opacity: 0 }} animate={{ opacity: ctx.shown ? 1 : 0 }} transition={{ ...transition(ctx, i), delay: (ctx.reduce ? 0 : 0.6 + i * 0.06) }}>
                        {ctx.fmt(spec.stacked ? stack : v)}
                      </motion.text>
                    ) : null}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <XLabels items={spec.categories.map((label, i) => ({ label, x: x(i)!, width: x.bandwidth() }))} />
    </>
  );
}

/** Horizontal bars in HTML: the labels sit beside them at any length; one series ends each row with its value. */
function Bars({ ctx }: { ctx: Ctx }) {
  const { spec } = ctx;
  const totals = spec.categories.map((_, i) => at(spec, i));
  const max = spec.yMax ?? Math.max(...totals.map(v => (spec.stacked ? v.reduce((a, b) => a + Math.max(0, b), 0) : Math.max(...v))), 0) ?? 1;
  const pct = (v: number) => `${Math.max(0, (v / (max || 1)) * 100)}%`;
  const single = spec.series.length === 1;
  return (
    <div className={styles.bars}>
      {spec.categories.map((label, i) => (
        <div key={i} className={`${styles.barRow} ${single ? styles.barRowSingle : ""}`} style={{ opacity: ctx.dim(i) ? 0.4 : 1 }}>
          <span className={styles.barLabel}>{label}</span>
          {single ? (
            <>
              <div className={styles.barTrack}>
                {spec.series[0]!.values[i] === null ? null : <motion.span className={styles.barSegment} style={{ width: pct(spec.series[0]!.values[i]!), background: ctx.color(0, i) }} initial={{ scaleX: 0 }} animate={{ scaleX: ctx.shown ? 1 : 0 }} transition={transition(ctx, i)} />}
              </div>
              {!spec.hideValues && spec.series[0]!.values[i] !== null ? <span className={styles.barEnd}>{ctx.fmt(spec.series[0]!.values[i]!)}</span> : <span />}
            </>
          ) : (
            <div className={styles.barTracks}>
              {spec.stacked ? (
                <div className={styles.barTrack}>
                  {spec.series.map((s, j) => <motion.span key={j} className={styles.barSegment} style={{ width: pct(s.values[i] ?? 0), background: ctx.color(j, i) }} initial={{ scaleX: 0 }} animate={{ scaleX: ctx.shown ? 1 : 0 }} transition={transition(ctx, i)} />)}
                  {!spec.hideValues ? <span className={styles.barValue}>{ctx.fmt(totals[i]!.reduce((a, b) => a + b, 0))}</span> : null}
                </div>
              ) : spec.series.map((s, j) => (s.values[i] === null ? null : (
                <div key={j} className={styles.barTrack}>
                  <motion.span className={styles.barSegment} style={{ width: pct(s.values[i]!), background: ctx.color(j, i) }} initial={{ scaleX: 0 }} animate={{ scaleX: ctx.shown ? 1 : 0 }} transition={transition(ctx, i)} />
                  {!spec.hideValues ? <span className={styles.barValue}>{ctx.fmt(s.values[i]!)}</span> : null}
                </div>
              )))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Lines({ ctx, width, filled }: { ctx: Ctx; width: number; filled: boolean }) {
  const { spec } = ctx;
  const height = HEIGHT[spec.size ?? "m"];
  const left = spec.hideGrid ? 12 : 52, right = width - 24, top = 28, bottom = height - 8;
  const all = spec.series.flatMap(s => s.values.filter((v): v is number => v !== null));
  const y = scaleLinear().domain([spec.yMin ?? Math.min(0, ...all), spec.yMax ?? Math.max(...all, 0)]).nice(4).range([bottom, top]);
  const x = scalePoint<number>().domain(spec.categories.map((_, i) => i)).range([left, right]).padding(0.25);
  const curve = spec.curve === "smooth" ? curveMonotoneX : curveLinear;
  const step = spec.categories.length > 1 ? x(1)! - x(0)! : right - left;
  return (
    <>
      <svg width={width} height={height} className={styles.svg}>
        <YGrid ticks={y.ticks(4)} y={y} left={left} right={right} ctx={ctx} />
        {spec.series.map((s, j) => {
          const points = s.values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] !== null);
          const path = line<readonly [number, number]>().x(p => x(p[0])!).y(p => y(p[1])).curve(curve)(points) ?? "";
          const fill = area<readonly [number, number]>().x(p => x(p[0])!).y0(y(Math.max(y.domain()[0]!, 0))).y1(p => y(p[1])).curve(curve)(points) ?? "";
          const color = ctx.color(j);
          return (
            <g key={j}>
              {filled ? <motion.path d={fill} fill={color} initial={{ opacity: 0 }} animate={{ opacity: ctx.shown ? (spec.series.length > 1 ? 0.16 : 0.22) : 0 }} transition={transition(ctx, j)} /> : null}
              <motion.path d={path} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: ctx.shown ? 1 : 0 }} transition={{ ...transition(ctx, j), duration: ctx.reduce ? 0 : 1.6 }} />
              {points.map(([i, v], k) => {
                const label = !spec.hideValues && (spec.allValues || k === points.length - 1);
                return (
                  <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: ctx.shown ? (ctx.quiet(i) ? 0.35 : 1) : 0 }} transition={{ ...transition(ctx, i), delay: ctx.reduce ? 0 : 0.3 + i * 0.12 }}>
                    <circle cx={x(i)} cy={y(v)} r={spec.highlight?.includes(i + 1) ? 5.5 : 3.5} fill={color} stroke="var(--color-card)" strokeWidth={2} />
                    {label ? <text className={styles.value} x={x(i)} y={y(v) - 12} textAnchor="middle">{ctx.fmt(v)}</text> : null}
                  </motion.g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <XLabels items={spec.categories.map((label, i) => ({ label, x: x(i)! - step / 2, width: step }))} />
    </>
  );
}

function Progress({ ctx }: { ctx: Ctx }) {
  const { spec } = ctx;
  const max = spec.max ?? 100;
  return (
    <div className={styles.bars}>
      {spec.categories.map((label, i) => {
        const v = spec.series[0]?.values[i];
        if (v === null || v === undefined) return null;
        return (
          <div key={i} className={styles.progress} data-size={spec.size ?? "m"}>
            <div className={styles.progressHead}><span>{label}</span><strong>{ctx.fmt(v)}</strong></div>
            <div className={styles.progressTrack}>
              <motion.span style={{ width: `${Math.min(100, Math.max(0, (v / max) * 100))}%`, background: ctx.color(0, i) }} initial={{ scaleX: 0 }} animate={{ scaleX: ctx.shown ? 1 : 0 }} transition={transition(ctx, i)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Gauges({ ctx }: { ctx: Ctx }) {
  const { spec } = ctx;
  const max = spec.max ?? 100;
  const ring = arc<{ end: number }>().innerRadius(78).outerRadius(94).cornerRadius(8).startAngle(-Math.PI / 2).endAngle(d => d.end);
  return (
    <div className={styles.gauges}>
      {spec.categories.map((label, i) => {
        const v = spec.series[0]?.values[i];
        if (v === null || v === undefined) return null;
        const share = Math.min(1, Math.max(0, v / max));
        return (
          <div key={i} className={styles.gauge}>
            <svg viewBox="-100 -100 200 108" className={styles.gaugeSvg}>
              <path d={ring({ end: Math.PI / 2 }) ?? ""} className={styles.gaugeTrack} />
              <motion.path d={ring({ end: -Math.PI / 2 + Math.PI * share }) ?? ""} fill={ctx.color(0, i)} initial={{ opacity: 0 }} animate={{ opacity: ctx.shown ? 1 : 0 }} transition={transition(ctx, i)} />
            </svg>
            <strong className={styles.gaugeValue}>{ctx.fmt(v)}</strong>
            <span className={styles.gaugeLabel}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Before → after per category: two dots on one scale and the change between them. */
function BeforeAfter({ ctx }: { ctx: Ctx }) {
  const { spec } = ctx;
  const [before, after] = spec.series;
  // "After" is the point of the story: the case colour unless a colour was chosen.
  const afterColor = after?.color ? ctx.color(1) : ctx.accent;
  return (
    <div className={styles.bars}>
      {spec.categories.map((label, i) => {
        const a = before?.values[i], b = after?.values[i];
        if (a === null || a === undefined || b === null || b === undefined) return null;
        // Each row on its own scale: the figures of one row rarely share a unit with the next.
        const max = spec.yMax ?? (Math.max(a, b, 0) / 0.88 || 1);
        const pos = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
        const change = a ? (b / a >= 2 ? `×${(b / a).toLocaleString(undefined, { maximumFractionDigits: 1 })}` : `${b >= a ? "+" : ""}${Math.round(((b - a) / Math.abs(a)) * 100)}%`) : "";
        return (
          <div key={i} className={styles.ba} style={{ opacity: ctx.quiet(i) ? 0.4 : 1 }}>
            <div className={styles.progressHead}><span>{label}</span><span className={styles.baValues}>{ctx.fmt(a)} → <strong>{ctx.fmt(b)}</strong>{change ? <em>{change}</em> : null}</span></div>
            <div className={styles.baTrack}>
              <motion.span className={styles.baLine} style={{ left: pos(Math.min(a, b)), width: `calc(${pos(Math.max(a, b))} - ${pos(Math.min(a, b))})`, background: afterColor }} initial={{ scaleX: 0 }} animate={{ scaleX: ctx.shown ? 1 : 0 }} transition={transition(ctx, i)} />
              <span className={styles.baDot} style={{ left: pos(a), background: "var(--color-muted)" }} />
              <motion.span className={styles.baDot} style={{ left: pos(b), background: afterColor }} initial={{ opacity: 0 }} animate={{ opacity: ctx.shown ? 1 : 0 }} transition={{ ...transition(ctx, i), delay: ctx.reduce ? 0 : 0.8 + i * 0.06 }} />
            </div>
          </div>
        );
      })}
      {before && after ? <Legend ctx={ctx} labels={[[before.label, "var(--color-muted)"], [after.label, afterColor]]} /> : null}
    </div>
  );
}

function Legend({ ctx, labels }: { ctx: Ctx; labels?: [string, string][] }) {
  const items = labels ?? ctx.spec.series.map((s, j) => [s.label, ctx.color(j)] as [string, string]);
  return <ul className={styles.legend}>{items.map(([label, color], i) => <li key={i}><span style={{ background: color }} />{label}</li>)}</ul>;
}

function Plot({ ctx }: { ctx: Ctx }): ReactNode {
  const { ref, width } = useWidth<HTMLDivElement>();
  const type = ctx.spec.type;
  const svg = type === "column" || type === "line" || type === "area";
  return (
    <div ref={ref} className={styles.plot} style={svg ? { minHeight: HEIGHT[ctx.spec.size ?? "m"] } : undefined}>
      {type === "bar" ? <Bars ctx={ctx} />
        : type === "progress" ? <Progress ctx={ctx} />
        : type === "gauge" ? <Gauges ctx={ctx} />
        : type === "beforeAfter" ? <BeforeAfter ctx={ctx} />
        : width ? (type === "column" ? <Columns ctx={ctx} width={width} /> : <Lines ctx={ctx} width={width} filled={type === "area"} />) : null}
    </div>
  );
}

/** The chart itself (legend and plot), for a card of its own or a cell of a panel. */
export function ChartBody({ spec, label }: { spec: ChartSpec; label?: string }) {
  const { locale } = useLocale();
  const accent = useChartAccent();
  const { ref, shown, reduce } = useChartReveal<HTMLDivElement>();
  const number = new Intl.NumberFormat(locale === "en" ? "en-US" : "pt-BR", spec.decimals === undefined ? { maximumFractionDigits: 1 } : { minimumFractionDigits: spec.decimals, maximumFractionDigits: spec.decimals });
  const fmt = (n: number) => `${spec.prefix ?? ""}${number.format(n)}${spec.suffix ?? ""}`;
  const palette = ["brand", "ink", "soft", "muted"];
  const resolve = (name: string) => name === "brand" ? accent : name === "ink" ? "var(--color-ink)" : name === "muted" ? "var(--color-muted)" : name === "soft" ? `color-mix(in srgb, ${accent} 45%, var(--color-card))` : name;
  const highlight = spec.highlight ?? [];
  const quiet = (category: number) => highlight.length > 0 && !highlight.includes(category + 1);
  const single = spec.series.length === 1;
  const n = spec.categories.length;
  const ctx: Ctx = {
    spec, accent, shown, reduce, fmt, quiet,
    dim: category => !single && quiet(category),
    color: (series, category) => {
      const base = resolve(spec.series[series]?.color || palette[series % palette.length]!);
      if (!single || category === undefined) return base;
      // Outside the highlight: a soft shade of the same colour, still readable.
      if (highlight.length) return quiet(category) ? `color-mix(in srgb, ${base} 42%, var(--color-card))` : base;
      // Tones: the first item full, the rest fading towards the card.
      if (spec.tones && n > 1 && category > 0) return `color-mix(in srgb, ${base} ${Math.round(82 - ((category - 1) / Math.max(1, n - 2)) * 42)}%, var(--color-card))`;
      return base;
    },
  };
  const legend = !spec.hideLegend && spec.series.length > 1 && spec.type !== "beforeAfter" && spec.type !== "progress" && spec.type !== "gauge";
  const summary = spec.categories.map((c, i) => `${c}: ${spec.series.map(s => (s.values[i] === null ? "—" : `${spec.series.length > 1 ? `${s.label} ` : ""}${fmt(s.values[i]!)}`)).join(", ")}`).join("; ");
  return (
    <div ref={ref} className={styles.body} style={{ "--chart-accent": accent } as CSSProperties} role="img" aria-label={`${label ? `${label}. ` : ""}${summary}`}>
      {legend ? <Legend ctx={ctx} /> : null}
      <Plot ctx={ctx} />
    </div>
  );
}

export default function CaseChart({ spec }: { spec: ChartSpec }) {
  return (
    <section id={spec.id} className={story.section}>
      <div className="content-wrap">
        {spec.sectionLabel || spec.heading || spec.intro ? (
          <ScrollReveal tone="editorial">
            <header className={story.header}>
              {spec.sectionLabel ? <p className={story.label}>{spec.sectionLabel}</p> : null}
              {spec.heading ? <h2 className={story.heading}>{spec.heading}</h2> : null}
              {spec.intro ? <p className={story.intro}>{spec.intro}</p> : null}
            </header>
          </ScrollReveal>
        ) : null}
        <figure className={styles.card}>
          {spec.title ? <figcaption className={styles.title}>{spec.title}</figcaption> : null}
          <ChartBody spec={spec} label={spec.title} />
          {spec.caption ? <p className={styles.caption}>{spec.caption}</p> : null}
        </figure>
      </div>
    </section>
  );
}

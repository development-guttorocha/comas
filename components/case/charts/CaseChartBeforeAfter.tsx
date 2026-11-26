"use client";

import { scaleLinear } from "d3";
import { motion } from "framer-motion";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { BeforeAfterRow } from "@/lib/caseChartData";
import { CHART_EASE, useChartAccent, useChartReveal, useCountUp } from "./chartMotion";
import styles from "./CaseCharts.module.css";

/** Right-hand room for the "×7,6" label after the furthest dot. */
const PLOT_END = 84;

function Row({ row, index, x, shown, reduce, accent, format }: {
  row: BeforeAfterRow;
  index: number;
  x: (multiple: number) => number;
  shown: boolean;
  reduce: boolean;
  accent: string;
  format: (multiple: number) => string;
}) {
  const multiple = row.to / row.from;
  const delay = reduce ? 0 : 0.2 + index * 0.18;
  const current = useCountUp(multiple, shown, { from: 1, duration: 1.4, delay, instant: reduce });
  const start = x(1);
  const end = x(multiple);
  const transition = { duration: reduce ? 0 : 1.4, delay, ease: CHART_EASE };
  return (
    <div className={styles.row}>
      <div className={styles.rowHead}>
        <span className={styles.rowLabel}>{row.label}</span>
        {row.fromText ? <span className={styles.rowValues}>{row.fromText} → <strong>{row.toText}</strong></span> : null}
      </div>
      <div className={styles.track} aria-hidden>
        <div className={styles.trackLine} />
        <motion.div
          className={styles.growth}
          style={{ left: `${start}%`, width: `${end - start}%`, background: accent }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: shown ? 1 : 0 }}
          transition={transition}
        />
        <span className={`${styles.dot} ${styles.dotFrom}`} style={{ left: `${start}%` }} />
        <motion.span
          className={styles.dot}
          style={{ background: accent }}
          initial={{ left: `${start}%` }}
          animate={{ left: `${shown ? end : start}%` }}
          transition={transition}
        />
        <motion.span
          className={styles.multiple}
          initial={{ left: `${start}%`, opacity: 0 }}
          animate={{ left: `${shown ? end : start}%`, opacity: shown ? 1 : 0 }}
          transition={transition}
        >
          {format(current)}
        </motion.span>
      </div>
    </div>
  );
}

/**
 * Antes → depois de várias métricas na mesma régua. `multiple` mostra quantas vezes cada
 * uma cresceu (×3,4); `gain` mostra o ganho sobre a base (+99%), com a base no zero do eixo.
 */
export default function CaseChartBeforeAfter({ rows, title, period, mode = "multiple" }: {
  rows: BeforeAfterRow[];
  title?: string;
  /** Ex. "jan/2016 → jan/2025". */
  period?: string;
  mode?: "multiple" | "gain";
}) {
  const { locale, t } = useLocale();
  const { ref, shown, reduce } = useChartReveal<HTMLDivElement>();
  const accent = useChartAccent();
  const gain = mode === "gain";
  const heading = title ?? (gain ? t("Quanto cada métrica cresceu") : t("Quantas vezes cada métrica cresceu"));
  const max = Math.max(...rows.map((r) => r.to / r.from));
  const scale = gain
    ? scaleLinear().domain([1, max]).nice(4).range([0, PLOT_END])
    : scaleLinear().domain([0, Math.ceil(max)]).range([0, PLOT_END]);
  const ticks = gain
    ? scale.ticks(4)
    : scale.ticks(Math.min(Math.ceil(max), 8)).filter((v) => v > 0 && Number.isInteger(v));
  const intlLocale = locale === "en" ? "en-US" : "pt-BR";
  const number = new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const percent = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 0 });
  const format = gain
    ? (m: number) => `+${percent.format((m - 1) * 100)}%`
    : (m: number) => `×${number.format(m)}`;
  const tickLabel = gain ? (v: number) => (v === 1 ? t("base") : format(v)) : (v: number) => `${v}×`;
  const summary = rows.map((r) => `${r.label}: ${r.fromText ? `${r.fromText} → ${r.toText} ` : ""}(${format(r.to / r.from)})`).join("; ");

  return (
    <figure ref={ref} className={styles.card} role="img" aria-label={`${heading}. ${summary}`}>
      <figcaption>
        <p className={styles.title}>{heading}</p>
        {period ? <p className={styles.subtitle}>{period}</p> : null}
      </figcaption>
      <div className={styles.beforeAfter} style={{ position: "relative" }}>
        <div className={styles.grid} aria-hidden>
          {ticks.map((v) => <span key={v} className={styles.gridLine} style={{ left: `${scale(v)}%` }} />)}
        </div>
        {rows.map((row, i) => (
          <Row key={row.label} row={row} index={i} x={scale} shown={shown} reduce={reduce} accent={accent} format={format} />
        ))}
      </div>
      <div className={styles.axis} aria-hidden>
        {ticks.map((v) => <span key={v} className={styles.tick} style={{ left: `${scale(v)}%`, transform: v === 1 && gain ? "none" : undefined }}>{tickLabel(v)}</span>)}
      </div>
    </figure>
  );
}

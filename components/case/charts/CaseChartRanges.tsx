"use client";

import { scaleLinear } from "d3";
import { motion } from "framer-motion";
import { CHART_EASE, useChartAccent, useChartReveal } from "./chartMotion";
import styles from "./CaseCharts.module.css";

export type CaseChartRange = {
  label: string;
  /** Percentuais 0–100. */
  min: number;
  max: number;
  /** Faixa em cinza: a referência, não o protagonista. */
  muted?: boolean;
};

/** Faixas estimadas (ex. "30 a 40%") numa régua de 0 a 100%. */
export default function CaseChartRanges({ ranges, title, subtitle, note }: {
  ranges: CaseChartRange[];
  title: string;
  subtitle?: string;
  note?: string;
}) {
  const { ref, shown, reduce } = useChartReveal<HTMLDivElement>();
  const accent = useChartAccent();
  const x = scaleLinear().domain([0, 100]).range([0, 100]);
  const ticks = x.ticks(4);
  const summary = ranges.map((r) => `${r.label}: ${r.min}–${r.max}%`).join("; ");

  return (
    <figure ref={ref} className={styles.card} role="img" aria-label={`${title}. ${summary}`}>
      <figcaption>
        <p className={styles.title}>{title}</p>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </figcaption>
      <div className={styles.bars}>
        {ranges.map((r, i) => {
          const delay = reduce ? 0 : 0.15 + i * 0.2;
          return (
            <div key={r.label} className={styles.bar}>
              <div className={styles.barHead}>
                <span className={styles.barLabel}>{r.label}</span>
                <span className={styles.barValue}>{r.min}–{r.max}%</span>
              </div>
              <div className={styles.barTrack} style={{ position: "relative" }} aria-hidden>
                <motion.div
                  className={styles.barFill}
                  style={{ position: "absolute", left: `${x(r.min)}%`, width: `${x(r.max) - x(r.min)}%`, background: r.muted ? "var(--color-muted)" : accent }}
                  initial={{ opacity: 0, x: "-40%" }}
                  animate={{ opacity: shown ? 1 : 0, x: shown ? "0%" : "-40%" }}
                  transition={{ duration: reduce ? 0 : 0.9, delay, ease: CHART_EASE }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.axis} aria-hidden>
        {ticks.map((v) => <span key={v} className={styles.tick} style={{ left: `${x(v)}%`, transform: v === 0 ? "none" : v === 100 ? "translateX(-100%)" : undefined }}>{v}%</span>)}
      </div>
      {note ? <p className={styles.note}>{note}</p> : null}
    </figure>
  );
}

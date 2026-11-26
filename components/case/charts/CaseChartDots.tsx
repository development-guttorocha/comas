"use client";

import { range } from "d3";
import { motion } from "framer-motion";
import { CHART_EASE, useChartAccent, useChartReveal, useCountUp } from "./chartMotion";
import styles from "./CaseCharts.module.css";

/** Parte de um todo em 100 pontos: os destacados acendem em sequência. */
export default function CaseChartDots({ percent, title, subtitle, highlightLabel, restLabel }: {
  /** 0–100 */
  percent: number;
  title: string;
  subtitle?: string;
  highlightLabel: string;
  restLabel: string;
}) {
  const { ref, shown, reduce } = useChartReveal<HTMLDivElement>();
  const accent = useChartAccent();
  const lit = Math.round(percent);
  const current = useCountUp(lit, shown, { duration: 1.6, delay: 0.1, instant: reduce });

  return (
    <figure ref={ref} className={styles.card} role="img" aria-label={`${title}: ${lit}% ${highlightLabel}, ${100 - lit}% ${restLabel}.`}>
      <figcaption>
        <p className={styles.title}>{title}</p>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </figcaption>
      <div className={styles.dotsLayout}>
        <div className={styles.dotsGrid} aria-hidden>
          {range(100).map((i) => (
            <motion.span
              key={i}
              className={styles.unit}
              initial={false}
              animate={{ backgroundColor: shown && i < lit ? accent : "var(--color-line)", scale: shown && i < lit ? 1 : 0.82 }}
              transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.1 + i * 0.016, ease: CHART_EASE }}
            />
          ))}
        </div>
        <div aria-hidden>
          <p className={styles.dotsFigure}>{Math.round(current)}%</p>
          <div className={styles.legend}>
            <span><i style={{ background: accent }} />{highlightLabel}</span>
            <span><i style={{ background: "var(--color-line)" }} />{restLabel}</span>
          </div>
        </div>
      </div>
    </figure>
  );
}

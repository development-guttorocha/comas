"use client";

import { scaleLinear } from "d3";
import { motion } from "framer-motion";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { CHART_EASE, useChartAccent, useChartReveal, useCountUp } from "./chartMotion";
import styles from "./CaseCharts.module.css";

export type CaseChartBar = {
  label: string;
  /** Detalhe abaixo do rótulo (ex. composição do grupo). */
  detail?: string;
  value: number;
  /** Prefixo ou sufixo mantidos ao contar (ex. "+"). */
  suffix?: string;
  /** Barra em cinza: contexto, não o ponto da história. */
  muted?: boolean;
};

function Bar({ bar, index, width, shown, reduce, accent, format, fractionDigits }: {
  bar: CaseChartBar;
  index: number;
  width: number;
  shown: boolean;
  reduce: boolean;
  accent: string;
  format: (n: number) => string;
  fractionDigits: number;
}) {
  const delay = reduce ? 0 : 0.15 + index * 0.14;
  const current = useCountUp(bar.value, shown, { duration: 1.2, delay, instant: reduce });
  return (
    <div className={styles.bar}>
      <div className={styles.barHead}>
        <span className={styles.barLabel}>{bar.label}{bar.detail ? <span>{bar.detail}</span> : null}</span>
        <span className={styles.barValue}>{format(Number(current.toFixed(fractionDigits)))}{bar.suffix ?? ""}</span>
      </div>
      <div className={styles.barTrack} aria-hidden>
        <motion.div
          className={styles.barFill}
          style={{ width: `${width}%`, background: bar.muted ? "var(--color-muted)" : accent }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: shown ? 1 : 0 }}
          transition={{ duration: reduce ? 0 : 1.2, delay, ease: CHART_EASE }}
        />
      </div>
    </div>
  );
}

/** Barras horizontais na mesma escala linear — comparação de grandeza sem distorcer a diferença. */
export default function CaseChartBars({ bars, title, subtitle, note, scaleMax, fractionDigits = 0 }: {
  bars: CaseChartBar[];
  title: string;
  subtitle?: string;
  note?: string;
  /** Topo fixo da escala (ex. 5 para notas); sem isto, o maior valor. */
  scaleMax?: number;
  fractionDigits?: number;
}) {
  const { locale } = useLocale();
  const { ref, shown, reduce } = useChartReveal<HTMLDivElement>();
  const accent = useChartAccent();
  const scale = scaleLinear().domain([0, scaleMax ?? Math.max(...bars.map((b) => b.value))]).range([0, 100]);
  const format = new Intl.NumberFormat(locale === "en" ? "en-US" : "pt-BR", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format;
  const summary = bars.map((b) => `${b.label}: ${format(b.value)}${b.suffix ?? ""}`).join("; ");

  return (
    <figure ref={ref} className={styles.card} role="img" aria-label={`${title}. ${summary}`}>
      <figcaption>
        <p className={styles.title}>{title}</p>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </figcaption>
      <div className={styles.bars}>
        {bars.map((bar, i) => (
          <Bar key={bar.label} bar={bar} index={i} width={scale(bar.value)} shown={shown} reduce={reduce} accent={accent} format={format} fractionDigits={fractionDigits} />
        ))}
      </div>
      {note ? <p className={styles.note}>{note}</p> : null}
    </figure>
  );
}

import type { ReactNode } from "react";
import type { CaseStat } from "@/lib/cases";
import { beforeAfterRowsFromStats } from "@/lib/caseChartData";
import CaseChartBeforeAfter from "@/components/case/charts/CaseChartBeforeAfter";
import styles from "./CaseEditorialBlocks.module.css";

export interface CaseStatBandProps {
  stats: CaseStat[];
  /** Título em destaque abaixo do eyebrow. */
  heading?: ReactNode;
  intro?: ReactNode;
  /** Rótulo da secção (ex. `// Resultados · simples`). */
  sectionLabel?: string;
  headerPadClass?: string;
  attributionNote?: string;
  editorialSourceNote?: string;
  /** índices para destacar valor (ex. R$ e tempo) */
  emphasizeIndices?: number[];
  id?: string;
  className?: string;
  /** Borda exterior da secção. */
  borderClass?: string;
  /** Gráficos feitos a partir de alguns stats, entre o cabeçalho e os cards. */
  charts?: ReactNode;
  /** Stats que já aparecem em `charts` e saem da grelha. */
  hideIndices?: number[];
}


/** "13 → 23": the old value muted, an arrow, the new one in the case colour. */
function BeforeAfterValue({ value }: { value: string }) {
  const [from, to] = value.split("→").map(part => part.trim());
  return <><span className={styles.statFrom}>{from}</span><span className={styles.statArrow} aria-label="para">→</span><span className={styles.statTo}>{to}</span></>;
}

export default function CaseStatBand({ stats, heading, intro, sectionLabel = "// Resultados", headerPadClass, attributionNote, editorialSourceNote, emphasizeIndices = [], id, className = "", borderClass = "", charts, hideIndices = [], display = "chart" }: CaseStatBandProps & { display?: "chart" | "cards" }) {
  // Todos os valores no formato "A → B": a faixa vira um gráfico de crescimento (ou cards, se pedido).
  const beforeAfter = display === "chart" ? beforeAfterRowsFromStats(stats) : null;
  const cards = stats.map((stat, i) => ({ stat, i })).filter(({ i }) => !hideIndices.includes(i));
  return <section id={id} className={`${styles.statSection} ${borderClass} ${className}`}>
    <div className="content-wrap">
      <header className={headerPadClass ?? styles.statHeader}>
        {sectionLabel ? <p className={styles.sectionLabel}>{sectionLabel}</p> : null}
        {heading ? <h2 className={styles.heading}>{heading}</h2> : null}
        {intro ? <div className={`${styles.body} ${styles.statIntro}`}>{intro}</div> : null}
      </header>
      {beforeAfter ? <CaseChartBeforeAfter rows={beforeAfter} period={stats.find((s) => s.caption)?.caption} /> : <>
        {charts ? <div className={styles.statCharts}>{charts}</div> : null}
        {cards.length ? <div className={`${styles.statGrid} ${cards.length === 1 ? styles.singleColumn : cards.length === 3 ? styles.threeColumns : ""}`}>
          {cards.map(({ stat, i }) => <div key={stat.label} className={`${styles.statCell} ${emphasizeIndices.includes(i) ? styles.statEmphasis : ""}`}>
            <div className={styles.statValue}>{stat.value.includes("→") ? <BeforeAfterValue value={stat.value} /> : stat.value}</div>
            <p className={styles.statLabel}>{stat.label}</p>
            {stat.caption ? <p className={styles.statCaption}>{stat.caption}</p> : null}
          </div>)}
        </div> : null}
      </>}
      {attributionNote || editorialSourceNote ? <div className={styles.notes}>{attributionNote ? <p>{attributionNote}</p> : null}{editorialSourceNote ? <p>{editorialSourceNote}</p> : null}</div> : null}
    </div>
  </section>;
}

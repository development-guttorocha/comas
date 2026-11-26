import type { ReactNode } from "react";
import styles from "./CaseEditorialBlocks.module.css";

export type CaseResultsJourneyStep = {
  title: string;
  body: ReactNode;
  /** Substitui o índice automático (01, 02…) — hoje só usado pelo parser Notion. */
  indexLabel?: string;
};



export interface CaseResultsJourneyProps {
  id?: string;
  className?: string;
  /** Omitido → `// Resultados · jornada`; string vazia oculta o rótulo. */
  sectionLabel?: string;
  /** Título em destaque abaixo do eyebrow. */
  heading?: ReactNode;
  /** Parágrafo de apoio opcional abaixo do título. */
  intro?: ReactNode;
  steps: CaseResultsJourneyStep[];
  /** `true` = sem linha nem marcadores (só texto em grelha). */
  hideStepIndices?: boolean;
  padClass?: string;
  bgClass?: string;
  /** Borda da secção. */
  borderClass?: string;
}


export default function CaseResultsJourney({ id, className = "", sectionLabel = "// Resultados · jornada", heading, intro, steps, hideStepIndices = false, padClass = styles.sectionPad, bgClass = "bg-surface", borderClass = "" }: CaseResultsJourneyProps) {
  const columns = steps.length === 1 ? styles.singleColumn : steps.length === 3 ? styles.threeColumns : "";
  return <section id={id} className={`${padClass} ${bgClass} ${borderClass} ${className}`}>
    <div className="content-wrap">
      <header className={styles.header}>
        {sectionLabel ? <p className={styles.sectionLabel}>{sectionLabel}</p> : null}
        {heading ? <h2 className={styles.heading}>{heading}</h2> : null}
        {intro ? <div className={styles.body}>{intro}</div> : null}
      </header>
      <ol className={`${styles.journeyGrid} ${columns}`}>
        {steps.map((step, i) => <li key={`${step.title}-${i}`} className={styles.step}>
          {!hideStepIndices ? <span className={styles.stepNumber}>{step.indexLabel ?? String(i + 1).padStart(2, "0")}</span> : null}
          <h3 className={styles.itemTitle}>{step.title}</h3>
          <div className={styles.body}>{step.body}</div>
        </li>)}
      </ol>
    </div>
  </section>;
}

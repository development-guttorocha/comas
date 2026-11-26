import type { ReactNode } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import styles from "./CaseEditorialBlocks.module.css";
import { CASE_RESULTS_QUOTE_SECTION_LABEL } from "@/lib/caseTypography";

export interface CaseResultsQuoteProps {
  id?: string;
  className?: string;
  /** Omitir na segunda citação quando o rótulo já apareceu acima. */
  sectionLabel?: string;
  /** Citação / resultado qualitativo. */
  children: ReactNode;
  /** Ex.: nome, papel, fonte. */
  attribution?: ReactNode;
  bgClass?: string;
  padClass?: string;
  /** Borda exterior (ex. `border-t border-line`). */
  borderClass?: string;
}

/**
 * Resultado qualitativo em formato citação — distinto do `CasePullQuote` genérico (foco em impacto narrativo).
 * Segue os depoimentos da Home: solto na página, centralizado, entre aspas.
 */
export default function CaseResultsQuote({
  id,
  className = "",
  sectionLabel,
  children,
  attribution,
  bgClass = "bg-transparent",
  padClass = styles.sectionPad,
  borderClass = "",
}: CaseResultsQuoteProps) {
  return (
    <section
      id={id}
      className={`w-full ${borderClass} ${bgClass} ${padClass} ${className}`.trim()}
    >
      <div className="content-wrap">
        <ScrollReveal tone="editorial">
          <figure className={styles.testimonial}>
            {sectionLabel ? (
              <span className={CASE_RESULTS_QUOTE_SECTION_LABEL}>
                {sectionLabel}
              </span>
            ) : null}
            <blockquote>“{children}”</blockquote>
            {attribution ? (
              <figcaption className={styles.testimonialSource}>
                {attribution}
              </figcaption>
            ) : null}
          </figure>
        </ScrollReveal>
      </div>
    </section>
  );
}

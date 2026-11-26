import type { ReactNode } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { CASE_MEASURE_PROSE, CASE_MEDIA_BLOCK } from "@/lib/caseLayout";
import { CASE_SECTION_LABEL_MEDIA } from "@/lib/caseTypography";
import styles from "./CaseMedia.module.css";

export interface CaseSectionMediaProps {
  id?: string;
  className?: string;
  borderClass?: string;
  /** Rótulo tipo `// Mídia` — linha única acima do bloco, sem coluna lateral. */
  label?: string;
  /** Texto introdutório (mantém largura de leitura; a mídia usa a largura total do wrap). */
  intro?: ReactNode;
  children: ReactNode;
  gapClass?: string;
  padClass?: string;
  tone?: "editorial" | "standard";
}

/**
 * Secção só para blocos de mídia: ocupa a largura do `content-wrap`,
 * sem o layout em duas colunas do `CaseSectionSplit`.
 */
export default function CaseSectionMedia({
  id,
  className = "",
  borderClass = "",
  label = "// Mídia",
  intro,
  children,
  gapClass = styles.sectionGap,
  padClass = styles.sectionSpacing,
  tone = "editorial",
}: CaseSectionMediaProps) {
  return (
    <section id={id} className={`${padClass} ${borderClass} ${className}`.trim()}>
      <div className="content-wrap w-full min-w-0 max-w-full">
        <ScrollReveal tone={tone}>
          <div className={`${CASE_MEDIA_BLOCK} ${gapClass}`}>
            <div className={styles.sectionHeader}>
              <span className={CASE_SECTION_LABEL_MEDIA}>
                {label}
              </span>
              {intro ? (
                <div className={`${CASE_MEASURE_PROSE} ${styles.sectionIntro}`}>
                  {intro}
                </div>
              ) : null}
            </div>
            <div className={styles.sectionContent}>
              {children}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

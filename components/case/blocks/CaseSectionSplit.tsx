import type { ReactNode } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import styles from "./CaseEditorialBlocks.module.css";
import { CASE_MEASURE_PROSE } from "@/lib/caseLayout";

interface CaseSectionSplitProps {
  /** `reversed`: título à direita; `stacked`: título em cima do texto. */
  layout?: "default" | "reversed" | "stacked";
  /** Ex.: // Contexto */
  label: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /**
   * Limite opcional no **grid** inteiro (legacy). Preferir `contentMeasureClass` na coluna de texto.
   * Omitir para o grid usar toda a largura do `content-wrap`.
   */
  maxWidthClass?: string;
  /**
   * Largura máxima só na **coluna de conteúdo** (parágrafos). `false` = usa toda a `1fr` (mídia, grelhas).
   * @default CASE_MEASURE_PROSE
   */
  contentMeasureClass?: string | false;
  padClass?: string;
  borderClass?: string;
  tone?: "editorial" | "standard";
  /** Largura da coluna do label (padrão 240, ex. 220 em algumas páginas) */
  labelColumnPx?: 220 | 240;
  id?: string;
}

/** Label na coluna estreita + conteúdo (padrão de seção editorial). */
export default function CaseSectionSplit({
  label,
  children,
  className = "",
  contentClassName = "",
  maxWidthClass = "",
  contentMeasureClass = CASE_MEASURE_PROSE,
  padClass = styles.sectionPad,
  borderClass = "",
  tone = "editorial",
  id,
  layout = "default",
}: CaseSectionSplitProps) {
  const measurePart =
    contentMeasureClass === false ? "" : contentMeasureClass;
  return (
    <section id={id} className={`${padClass} ${borderClass} ${className}`.trim()}>
      <div className="content-wrap">
        <ScrollReveal tone={tone}>
          <div
            className={`grid w-full min-w-0 items-start ${styles.grid} ${styles.twoColumns} ${layout === "reversed" ? styles.splitReversed : layout === "stacked" ? styles.splitStacked : ""} ${maxWidthClass}`.trim()}
          >
            {label ? (
              <h2 className={styles.heading}>{label}</h2>
            ) : <span aria-hidden />}
            <div
              className={`min-w-0 ${measurePart} ${contentClassName}`.trim()}
            >
              {children}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

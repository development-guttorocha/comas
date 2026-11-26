import type { ReactNode } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import {
  CASE_MEASURE_MEDIA_STAGE,
  CASE_MEASURE_PROSE,
  CASE_MEDIA_BLOCK,
} from "@/lib/caseLayout";
import {
  CASE_TEXT_BEFORE_AFTER_SECTION_HEADING,
} from "@/lib/caseTypography";
import { cn } from "@/lib/cn";
import styles from "./CaseEditorialBlocks.module.css";

export type CaseBeforeAfterColumnProps = {
  /** Ex.: Antes */
  label: string;
  /** Texto ou bloco introdutório */
  lead?: ReactNode;
  /** Área ilustrativa (chips, diagrama, etc.) */
  children: ReactNode;
  /** Texto opcional abaixo do slot */
  foot?: ReactNode;
  /** Hierarquia do título: secundário no “antes”, principal no “depois”. */
  variant?: "muted" | "emphasis";
};

export interface CaseBeforeAfterProps {
  id?: string;
  className?: string;
  /** Kicker acima do título (ex. `// Comparativo`) — sans, não mono. */
  sectionLabel?: string;
  /** Título da secção (opcional) */
  heading?: ReactNode;
  /** Bloco entre título e grelha (diagrama, imagem) */
  banner?: ReactNode;
  before: CaseBeforeAfterColumnProps;
  after: CaseBeforeAfterColumnProps;
  padClass?: string;
  bgClass?: string;
  borderClass?: string;
  maxWidthClass?: string;
}

function Column({
  label,
  lead,
  children,
  foot,
  variant = "muted",
}: CaseBeforeAfterColumnProps) {
  return (
    <div className={cn(styles.column, styles.compareColumn)} data-variant={variant}>
      <h3 className={cn(styles.columnTitle, variant === "muted" && styles.mutedTitle)}>
        {label}
      </h3>
      {lead ? (
        <div className={styles.body}>
          {lead}
        </div>
      ) : null}
      <div className={cn(CASE_MEDIA_BLOCK, styles.columnMedia)}>
        {children}
      </div>
      {foot ? (
        <div className={cn(styles.body, styles.columnFoot)}>
          {foot}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Duas colunas reais, com a mesma largura e hierarquia tipográfica.
 */
export default function CaseBeforeAfter({
  id,
  className = "",
  sectionLabel,
  heading,
  banner,
  before,
  after,
  padClass = styles.sectionPad,
  /** Fundo herdado da secção pai — sem “card” próprio. */
  bgClass = "",
  borderClass = "",
  maxWidthClass = "",
}: CaseBeforeAfterProps) {
  const b: CaseBeforeAfterColumnProps = {
    variant: "muted",
    ...before,
  };
  const a: CaseBeforeAfterColumnProps = {
    variant: "emphasis",
    ...after,
  };

  return (
    <section
      id={id}
      className={`w-full ${padClass} ${borderClass} ${bgClass} ${className}`.trim()}
    >
      <div
        className={`content-wrap w-full min-w-0 max-w-full ${maxWidthClass}`.trim()}
      >
        <ScrollReveal tone="editorial">
          {sectionLabel ? (
            <p className={styles.sectionLabel}>
              {sectionLabel}
            </p>
          ) : null}
          {heading ? (
            <div className={`${styles.header} ${CASE_MEASURE_PROSE}`}>
              {typeof heading === "string" ? (
                <h2 className={CASE_TEXT_BEFORE_AFTER_SECTION_HEADING}>{heading}</h2>
              ) : (
                heading
              )}
            </div>
          ) : null}
          {banner ? (
            <div
              className={`${CASE_MEDIA_BLOCK} ${styles.banner} ${CASE_MEASURE_MEDIA_STAGE}`}
            >
              {banner}
            </div>
          ) : null}
          <div className={`${styles.grid} ${styles.twoColumns} ${styles.compareGrid}`}>
            <Column {...b} />
            <Column {...a} />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

import type { ReactNode } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { CASE_MEASURE_PROSE } from "@/lib/caseLayout";
import {
  CASE_RESULTS_HERO_DESCRIPTION,
  CASE_RESULTS_HERO_INTRO,
  CASE_RESULTS_HERO_SECTION_LABEL,
  CASE_RESULTS_HERO_VALUE,
  CASE_RESULTS_HERO_VALUE_WRAP,
} from "@/lib/caseTypography";

export interface CaseResultsHeroMetricProps {
  id?: string;
  className?: string;
  sectionLabel?: string;
  /** Número ou texto principal (pode incluir símbolos). */
  value: ReactNode;
  /** Subtítulo / descrição abaixo do destaque. */
  description: ReactNode;
  intro?: ReactNode;
  padClass?: string;
  /**
   * `gradient` — degradê só com ink e opacidade (light/dark).
   * `solid` — texto ink sem degradê.
   */
  valueStyle?: "solid" | "gradient";
}

/**
 * Um resultado único em destaque: número grande ao centro com subtítulo.
 * Degradê opcional apenas em escala de cinza / opacidade do token `ink`.
 */
export default function CaseResultsHeroMetric({
  id,
  className = "",
  sectionLabel = "// Resultados · destaque",
  value,
  description,
  intro,
  padClass = "py-24 md:py-32",
  valueStyle = "gradient",
}: CaseResultsHeroMetricProps) {
  const gradientText =
    valueStyle === "gradient"
      ? "bg-gradient-to-b from-ink via-ink/75 to-ink/30 bg-clip-text text-transparent"
      : "text-ink";

  return (
    <section
      id={id}
      className={`w-full border-y border-line bg-surface ${padClass} ${className}`.trim()}
    >
      <div className="content-wrap">
        <ScrollReveal tone="editorial">
          <div className={`mx-auto border-t-[3px] border-accent pt-8 text-center ${CASE_MEASURE_PROSE}`}>
            <span className={CASE_RESULTS_HERO_SECTION_LABEL}>
              {sectionLabel}
            </span>
            {intro ? (
              <p className={CASE_RESULTS_HERO_INTRO}>
                {intro}
              </p>
            ) : null}

            <div
              className={`${CASE_RESULTS_HERO_VALUE_WRAP} ${gradientText}`}
            >
              <span className={CASE_RESULTS_HERO_VALUE}>{value}</span>
            </div>

            <div className={CASE_RESULTS_HERO_DESCRIPTION}>
              {description}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

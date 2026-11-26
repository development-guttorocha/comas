import type { ReactNode } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import {
  CASE_RESULTS_CHARTS_FOOTER,
  CASE_RESULTS_CHARTS_INTRO,
} from "@/lib/caseTypography";

/** Ponto da série (ex. mês no eixo X). */
export type CaseResultsChartPoint = {
  label: string;
  value: number;
};

export interface CaseResultsChartsProps {
  id?: string;
  className?: string;
  intro?: ReactNode;
  sectionLabel?: string;
  /** Série temporal ou categórica — barras verticais “pill”, escala automática. */
  points: CaseResultsChartPoint[];
  /** Nota pequena abaixo do gráfico (ex. período ou disclaimer). */
  footerNote?: ReactNode;
  headerPadClass?: string;
  /** Altura útil do gráfico (área das barras). */
  chartHeightClass?: string;
}

function yAxisTicks(max: number, steps: number): number[] {
  if (max <= 0) return [0];
  const n = Math.max(2, steps);
  return Array.from({ length: n }, (_, i) => {
    const v = max * (1 - i / (n - 1));
    return Math.round(v * 100) / 100;
  });
}

/** Gráfico de barras verticais — cantos rectos (punk), tokens ink/accent. */
export default function CaseResultsCharts({
  id,
  className = "",
  intro,
  sectionLabel = "// Resultados · gráficos",
  points,
  footerNote,
  headerPadClass = "pt-24 pb-6",
  chartHeightClass = "h-[200px] md:h-[260px]",
}: CaseResultsChartsProps) {
  const max =
    points.length === 0 ? 1 : Math.max(...points.map((p) => p.value), 1e-9);
  const ticks = yAxisTicks(max, 5);

  return (
    <section
      id={id}
      className={`relative w-full overflow-x-clip border-y border-line bg-surface ${className}`.trim()}
    >
      <div className="content-wrap relative z-10 min-w-0 max-w-full box-border">
        <div className={headerPadClass}>
          <ScrollReveal tone="editorial">
            <Eyebrow
              as="span"
              variant="blockSection40"
              className={`block ${intro ? "mb-2" : "mb-6"}`}
            >
              {sectionLabel}
            </Eyebrow>
            {intro ? (
              <div className={CASE_RESULTS_CHARTS_INTRO}>
                {intro}
              </div>
            ) : null}
          </ScrollReveal>
        </div>

        <div className="pb-10 md:pb-12">
          <ScrollReveal tone="editorial">
            <div className="flex w-full min-w-0 gap-2 md:gap-4">
              {/* Eixo Y — sem grelha horizontal, só rótulos */}
              <div
                className={`flex shrink-0 flex-col justify-between ${chartHeightClass} py-0.5 pr-1 text-right md:pr-2`}
                aria-hidden
              >
                {ticks.map((t) => (
                  <Eyebrow as="span" key={t} variant="chartTickNumeric">
                    {Number.isInteger(t) ? t : t.toFixed(1)}
                  </Eyebrow>
                ))}
              </div>

              <div
                className="relative min-w-0 flex-1"
                role="img"
                aria-label="Gráfico de barras verticais"
              >
                <div
                  className={`flex items-end justify-between gap-1 md:gap-2 ${chartHeightClass}`}
                >
                  {points.map((p, i) => {
                    const pct = Math.min(
                      100,
                      Math.max(0, (p.value / max) * 100),
                    );
                    return (
                      <div
                        key={`${p.label}-${i}`}
                        className="group/bar flex h-full min-h-0 min-w-0 flex-1 flex-col items-center justify-end"
                      >
                        <div
                          className="w-full max-w-[22px] md:max-w-[28px]"
                          style={{
                            height: `${pct}%`,
                            minHeight: pct > 0 ? "4px" : 0,
                          }}
                        >
                          <div className="h-full min-h-[4px] w-full rounded-none bg-ink/80 shadow-none ring-0 transition-colors group-hover/bar:bg-accent" />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Base do gráfico */}
                <div
                  className="mt-0 h-px w-full bg-line/80"
                  aria-hidden
                />

                <div className="mt-3 flex justify-between gap-1 md:gap-2">
                  {points.map((p, i) => (
                    <Eyebrow
                      as="span"
                      key={`${p.label}-x-${i}`}
                      variant="chartAxisCategory"
                      className="min-w-0 flex-1 text-center"
                    >
                      {p.label}
                    </Eyebrow>
                  ))}
                </div>
              </div>
            </div>

            {footerNote ? (
              <p className={CASE_RESULTS_CHARTS_FOOTER}>
                {footerNote}
              </p>
            ) : null}
          </ScrollReveal>
        </div>
      </div>
      <div className="h-8 md:h-10" aria-hidden />
    </section>
  );
}

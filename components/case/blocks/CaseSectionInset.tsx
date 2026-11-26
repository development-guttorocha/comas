import type { ReactNode } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { CASE_SECTION_LABEL_INSET } from "@/lib/caseTypography";

export interface CaseSectionInsetProps {
  id?: string;
  className?: string;
  /** Rótulo mono (ex. `// CaseMetaRow`). */
  label: string;
  intro?: ReactNode;
  children: ReactNode;
  borderClass?: string;
  bgClass?: string;
  padClass?: string;
}

/**
 * Secção editorial com borda superior, `content-wrap` e intro — padrão para blocos compactos (meta row, notas).
 */
export default function CaseSectionInset({
  id,
  className = "",
  label,
  intro,
  children,
  borderClass = "border-t border-line",
  bgClass = "bg-surface",
  padClass = "pad-section-md",
}: CaseSectionInsetProps) {
  return (
    <section
      id={id}
      className={`w-full ${borderClass} ${bgClass} ${padClass} ${className}`.trim()}
    >
      <div className="content-wrap">
        <ScrollReveal tone="editorial">
          <span className={CASE_SECTION_LABEL_INSET}>
            {label}
          </span>
          {intro}
          {children}
        </ScrollReveal>
      </div>
    </section>
  );
}

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CASE_EYEBROW_VARIANT_CLASS } from "@/lib/caseTypography";

export type EyebrowVariant =
  | "strip"
  | "stripInk"
  | "meta"
  | "metaYear"
  | "section"
  | "sectionMutedOnAccent"
  | "displayAccent"
  | "errorAccent"
  | "worksCounter"
  | "worksFooter"
  | "resumeSection"
  | "heroFullBleed"
  /** Secção editorial 10px / ink·40 (stat band, approach, charts, before/after, split). */
  | "blockSection40"
  /** Eixo Y de gráficos — números, sem uppercase. */
  | "chartTickNumeric"
  /** Eixo X de gráficos — categorias curtas. */
  | "chartAxisCategory"
  /** Rótulo de célula de métrica (stat band). */
  | "blockStatLabel"
  /** Legenda pequena sob métrica (stat band). */
  | "blockStatCaption"
  /** Rótulo de coluna “muted” (antes/depois). */
  | "blockColumnMuted"
  /** Rótulo de coluna destaque (antes/depois). */
  | "blockColumnAccent"
  /** Legenda sob figura — inclui md:text-center. */
  | "blockFigureCaption"
  /** Rótulo acima de pull quote. */
  | "blockQuoteLabel"
  /** Painel “Ir para” no CaseNav — 10px dim, sem bold da strip. */
  | "navPanelHint";

type Props = {
  as?: "p" | "span" | "div" | "h2" | "figcaption";
  variant?: EyebrowVariant;
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">;

const variantClass: Record<EyebrowVariant, string> = {
  ...CASE_EYEBROW_VARIANT_CLASS,
  sectionMutedOnAccent:
    "font-mono text-[14px] font-medium uppercase tracking-[0.22em] text-ink/75",
  displayAccent:
    "font-mono text-[14px] uppercase tracking-[0.3em] text-accent md:text-[16px]",
  errorAccent:
    "font-mono text-[14px] font-medium uppercase tracking-[0.22em] text-accent",
  worksCounter:
    "font-mono text-[14px] font-medium uppercase tracking-[0.14em] md:text-[14px]",
  worksFooter:
    "max-w-[320px] font-mono text-[14px] uppercase tracking-[0.1em]",
  resumeSection:
    "font-mono text-[14px] font-medium uppercase tracking-[.2em] text-dim",
};

/**
 * Rótulo mono pequeno (meta de case, secções, faixa editorial).
 * Use `className` para cor contextual em variantes `meta` / `metaYear`.
 */
export function Eyebrow({
  as: Tag = "p",
  variant = "section",
  className,
  children,
  ...rest
}: Props) {
  return (
    <Tag className={cn(variantClass[variant], className)} {...rest}>
      {children}
    </Tag>
  );
}

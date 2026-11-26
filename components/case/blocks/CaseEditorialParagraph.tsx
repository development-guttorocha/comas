import type { ReactNode } from "react";
import { CASE_MEASURE_PROSE } from "@/lib/caseLayout";
import { CASE_TEXT_BODY, CASE_TEXT_INSET } from "@/lib/caseTypography";

export interface CaseEditorialParagraphProps {
  children: ReactNode;
  className?: string;
  /** Largura máxima de leitura (Tailwind). `false` = sem classe (ex. pai já limita). */
  maxWidthClass?: string | false;
  /** `inset` = texto de apoio ligeiramente menor (secções tipo showcase). */
  variant?: "body" | "inset";
}

const variantClass: Record<NonNullable<CaseEditorialParagraphProps["variant"]>, string> = {
  body: CASE_TEXT_BODY,
  inset: CASE_TEXT_INSET,
};

/**
 * Parágrafo editorial padrão — mesma lógica em secções de case e resultados.
 */
export default function CaseEditorialParagraph({
  children,
  className = "",
  maxWidthClass,
  variant = "body",
}: CaseEditorialParagraphProps) {
  const base = variantClass[variant];
  const mw =
    variant === "inset"
      ? ""
      : maxWidthClass === false
        ? ""
        : (maxWidthClass ?? CASE_MEASURE_PROSE);
  return <p className={`${base} ${mw} ${className}`.trim()}>{children}</p>;
}

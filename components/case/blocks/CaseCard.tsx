import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  CASE_TEXT_BODY,
  CASE_TEXT_CARD_BODY_PANEL,
  CASE_TEXT_CARD_EYEBROW,
  CASE_TEXT_CARD_TITLE,
  CASE_TEXT_CARD_TITLE_ON_PANEL,
} from "@/lib/caseTypography";

export type CaseCardVariant =
  /** Borda fina, fundo surface — padrão editorial. */
  | "default"
  /** Fundo mais baixo contraste — notas, secundário. */
  | "muted"
  /** Contorno forte — destaque sem ser painel escuro. */
  | "emphasis"
  /** Tracejado — ilustrativo, placeholder, “rascunho”. */
  | "dashed"
  /** Superfície escura (panel) — contraste em secções claras. */
  | "panel";

export type CaseCardPadding = "sm" | "md" | "lg";

const variantClass: Record<CaseCardVariant, string> = {
  default:
    "rounded-[24px] border border-ink/15 bg-surface text-ink",
  muted: "rounded-[24px] border border-ink/8 bg-card-alt text-ink",
  emphasis: "rounded-[24px] border-[2px] border-accent bg-surface text-ink",
  dashed:
    "rounded-[24px] border border-dashed border-white/20 bg-card-alt text-ink",
  panel: "rounded-[24px] border border-white/10 bg-panel text-on-panel",
};

const paddingClass: Record<CaseCardPadding, string> = {
  sm: "p-5 md:p-6",
  md: "p-7 md:p-8",
  lg: "p-8 md:p-10",
};

const eyebrowClass: Record<CaseCardVariant, string> = {
  default: "text-accent",
  muted: "text-accent",
  emphasis: "text-accent",
  dashed: "text-accent",
  panel: "text-accent",
};

const titleClass: Record<CaseCardVariant, string> = {
  default: "text-ink",
  muted: "text-ink",
  emphasis: "text-ink",
  dashed: "text-ink",
  panel: CASE_TEXT_CARD_TITLE_ON_PANEL,
};

export interface CaseCardProps {
  children: ReactNode;
  variant?: CaseCardVariant;
  padding?: CaseCardPadding;
  /** Rótulo mono acima do título (ex. KPI, passo). */
  eyebrow?: string;
  title?: ReactNode;
  className?: string;
  as?: "div" | "article";
}

/**
 * Cartão editorial simples — variantes alinhadas a grelhas de case e listas de evidência.
 */
export default function CaseCard({
  children,
  variant = "default",
  padding = "md",
  eyebrow,
  title,
  className = "",
  as: Tag = "div",
}: CaseCardProps) {
  const v = variantClass[variant];
  const p = paddingClass[padding];
  const eb = eyebrowClass[variant];
  const tc = titleClass[variant];

  return (
    <Tag className={`${v} ${p} ${className}`.trim()}>
      {eyebrow ? (
        <span className={cn(CASE_TEXT_CARD_EYEBROW, eb)}>
          {eyebrow}
        </span>
      ) : null}
      {title ? (
        <h3
          className={cn(
            "mb-4 md:mb-5",
            CASE_TEXT_CARD_TITLE,
            tc,
          )}
        >
          {title}
        </h3>
      ) : null}
      <div
        className={
          variant === "panel"
            ? CASE_TEXT_CARD_BODY_PANEL
            : cn(CASE_TEXT_BODY, "leading-[1.75] [&_strong]:font-semibold [&_strong]:text-ink")
        }
      >
        {children}
      </div>
    </Tag>
  );
}

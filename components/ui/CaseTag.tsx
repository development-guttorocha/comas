import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const SHOWCASE_TRANSITION =
  "transition-colors duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none";

export type CaseTagVariant =
  | "stripAccent"
  | "stripInk"
  | "stripPanel"
  | "metaProductOnDark"
  | "metaProductDefault"
  | "worksIndexCase"
  | "showcaseRole"
  | "showcaseYear"
  | "showcaseChip"
  | "showcaseAccentChip"
  | "liveStatic"
  | "livePulse";

const staticVariantClass: Partial<Record<CaseTagVariant, string>> = {
  stripAccent:
    "case-tag-pill border border-white/15 bg-accent text-surface",
  stripInk:
    "case-tag-pill border border-white/20 bg-white/10 text-on-panel",
  stripPanel: "case-tag-pill border border-white/15 bg-panel text-on-panel",
  metaProductOnDark:
    "case-tag-pill border border-white/25 bg-white/5 text-ink-muted",
  metaProductDefault:
    "case-tag-pill border border-line bg-surface text-subtle",
  worksIndexCase:
    "case-tag-pill mb-5 inline-flex w-fit border border-white/15 bg-panel text-subtle",
  liveStatic:
    "case-tag-pill inline-flex w-fit items-center gap-1.5 bg-accent text-on-panel",
  livePulse:
    "case-tag-pill inline-flex w-fit items-center gap-1.5 text-on-panel",
};

type Props = {
  as?: "span";
  variant: CaseTagVariant;
  /** Para variantes `showcase*`: estado hover/foco do cartão. */
  showcaseActive?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLSpanElement>, "className" | "children">;

/**
 * Pill de meta (hero strip, linha de produto, showcase, Live).
 * Variantes `showcase*` exigem `showcaseActive` quando usadas em `CasesShowcase`.
 */
export function CaseTag({
  as: Tag = "span",
  variant,
  showcaseActive = false,
  className,
  children,
  ...rest
}: Props) {
  const staticCls = staticVariantClass[variant];
  if (staticCls) {
    return (
      <Tag className={cn(staticCls, className)} {...rest}>
        {children}
      </Tag>
    );
  }

  if (variant === "showcaseRole") {
    return (
      <Tag
        className={cn(
          "case-tag-pill uppercase",
          SHOWCASE_TRANSITION,
          showcaseActive ? "text-white/85" : "text-dim",
          className,
        )}
        {...rest}
      >
        {children}
      </Tag>
    );
  }
  if (variant === "showcaseYear") {
    return (
      <Tag
        className={cn(
          "case-tag-pill normal-case tracking-[.06em]",
          SHOWCASE_TRANSITION,
          showcaseActive ? "text-white/85" : "text-dim",
          className,
        )}
        {...rest}
      >
        {children}
      </Tag>
    );
  }
  if (variant === "showcaseChip" || variant === "showcaseAccentChip") {
    return (
      <Tag
        className={cn(
          "case-tag-pill border",
          SHOWCASE_TRANSITION,
          showcaseActive
            ? "border-white/35 bg-black text-white"
            : "border-line bg-card-alt text-subtle",
          className,
        )}
        {...rest}
      >
        {children}
      </Tag>
    );
  }

  return (
    <Tag className={cn("case-tag-pill", className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Classes da variante (ex.: `motion.span` no Live com animação de fundo). */
export function caseTagClass(
  variant: CaseTagVariant,
  options?: { showcaseActive?: boolean; className?: string },
): string {
  const { showcaseActive = false, className } = options ?? {};
  const staticCls = staticVariantClass[variant];
  if (staticCls) return cn(staticCls, className);
  if (variant === "showcaseRole") {
    return cn(
      "case-tag-pill uppercase",
      SHOWCASE_TRANSITION,
      showcaseActive ? "text-white/85" : "text-dim",
      className,
    );
  }
  if (variant === "showcaseYear") {
    return cn(
      "case-tag-pill normal-case tracking-[.06em]",
      SHOWCASE_TRANSITION,
      showcaseActive ? "text-white/85" : "text-dim",
      className,
    );
  }
  if (variant === "showcaseChip" || variant === "showcaseAccentChip") {
    return cn(
      "case-tag-pill border",
      SHOWCASE_TRANSITION,
      showcaseActive
        ? "border-white/35 bg-black text-white"
        : "border-line bg-card-alt text-subtle",
      className,
    );
  }
  return cn("case-tag-pill", className);
}

/**
 * Matriz única de classes para botões / CTAs.
 * Documentação legível: `CTA-VARIANTS.md` na mesma pasta.
 */
import { cn } from "@/lib/cn";

export const focusRingSurface =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export const focusRingOnBlack =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black";

const focusRingOnAccent =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-accent";

/** Todas as variantes de ação (botão ou aspeto de botão). */
export type ButtonVariant =
  | "outline"
  | "pill"
  | "solidAccent"
  | "solidAccentSans"
  | "outlineOnAccent"
  | "accentFill"
  | "footerPill"
  | "fullBleedCta";

export type CtaVariant = ButtonVariant;

export type ButtonSize = "sm" | "md" | "nav";

export type ButtonClassNameOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /**
   * Só para `fullBleedCta`: incluir `bg-accent`.
   * `false` quando o fundo vem de `style` (cor de marca no `CaseHeroFullBleed`).
   */
  fullBleedUseAccentBg?: boolean;
};

// ─── Home hero: pílula partida (Figma) — shell + lead + ação ───

/** Wrapper do `Link` no hero da home (dois segmentos). */
export const homeHeroCtaShellClass = cn(
  "group flex max-w-full flex-col gap-1 overflow-hidden rounded-[24px] border p-0.5 sm:gap-2 sm:p-1 sm:flex-row sm:items-stretch",
  "border-line bg-card",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  "focus-visible:ring-accent focus-visible:ring-offset-surface",
);

export const homeHeroCtaLeadClass =
  "px-3 py-2 text-center font-mono text-[14px] font-medium uppercase leading-snug tracking-[0.12em] text-ink sm:flex-1 sm:px-6 sm:py-3 sm:text-left sm:text-[14px] sm:tracking-[0.14em] md:px-8 md:py-4 md:text-[14px] lg:mr-12";

/** Segmento accent à direita (texto do CTA). */
export const homeHeroCtaActionClass =
  "inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-[24px] bg-accent px-4 py-2 font-mono text-[14px] font-medium uppercase tracking-[0.12em] text-on-accent sm:min-h-0 sm:px-6 sm:py-3 sm:text-[14px] sm:tracking-[0.14em] md:py-4 md:text-[14px]";

export function buttonClassName({
  variant = "outline",
  size = "md",
  className,
  fullBleedUseAccentBg = true,
}: ButtonClassNameOptions): string {
  const sizePad =
    variant === "solidAccent" ||
    variant === "solidAccentSans" ||
    variant === "accentFill" ||
    variant === "outlineOnAccent" ||
    variant === "pill" ||
    variant === "footerPill" ||
    variant === "fullBleedCta"
      ? ""
      : size === "nav"
        ? "min-h-[44px] px-6 py-3"
        : size === "sm"
          ? "min-h-[40px] px-4 py-2 text-[14px] tracking-[0.1em]"
          : "min-h-[44px] px-5 py-3";

  const variants: Record<ButtonVariant, string> = {
    outline: cn(
      "rounded-[24px] border border-ink/20 bg-transparent font-mono text-[14px] font-medium uppercase tracking-[0.12em] text-ink transition-colors duration-300 hover:border-accent hover:bg-accent hover:text-on-accent",
      focusRingSurface,
    ),
    pill: cn(
      "min-h-[44px] rounded-[24px] border border-line bg-card font-mono text-[14px] font-medium uppercase tracking-[0.1em] text-ink shadow-lg transition-colors duration-300 px-8",
      focusRingSurface,
    ),
    solidAccent: cn(
      "rounded-[24px] bg-accent px-8 py-3 font-mono text-[14px] font-medium uppercase tracking-[0.12em] text-on-accent transition-opacity hover:opacity-90",
      focusRingSurface,
    ),
    solidAccentSans: cn(
      "rounded-[24px] bg-accent px-8 py-3 font-sans text-[14px] font-semibold leading-none text-on-accent transition-opacity hover:opacity-90",
      focusRingOnBlack,
    ),
    outlineOnAccent: cn(
      "min-h-[44px] rounded-[24px] border border-ink/45 bg-black/15 px-7 py-2.5 font-mono text-[14px] font-medium uppercase tracking-[0.18em] text-ink transition-colors hover:bg-black/25",
      focusRingOnAccent,
    ),
    accentFill: cn(
      "w-full rounded-[24px] bg-accent px-5 py-3 text-center font-mono text-[14px] font-medium uppercase tracking-[0.14em] text-on-accent transition-opacity hover:opacity-90 sm:px-6 sm:py-3.5 sm:text-[14px] md:px-6 md:py-4 md:text-[14px]",
      focusRingSurface,
    ),
    footerPill: cn(
      "inline-flex min-h-[44px] items-center rounded-[24px] bg-white px-[18px] py-3 font-sans text-[14px] font-bold uppercase tracking-[0.025em] text-[#303030] transition-colors duration-200 hover:bg-[#eee]",
      focusRingSurface,
    ),
    fullBleedCta: cn(
      "inline-flex items-center justify-center gap-2 rounded-[24px] px-8 py-3 text-[15px] font-semibold text-white",
      "transition-opacity hover:opacity-90 active:opacity-80",
      focusRingOnBlack,
    ),
  };

  const accentBg =
    variant === "fullBleedCta" && fullBleedUseAccentBg ? "bg-accent text-on-accent" : "";

  return cn(
    "inline-flex items-center justify-center gap-2",
    variants[variant],
    accentBg,
    sizePad,
    className,
  );
}

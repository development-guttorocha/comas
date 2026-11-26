# Shared UI components

Next.js 16 App Router + React 19, CSS Modules + Tailwind v4 tokens (`@theme`). Custom components, no UI library.

### `components/ui/Button.tsx`

```tsx
import Link, { type LinkProps } from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  buttonClassName,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/buttonStyles";

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  /** Só `variant="fullBleedCta"`: ver `buttonClassName` / `CTA-VARIANTS.md`. */
  fullBleedUseAccentBg?: boolean;
};

export type ButtonProps = Common &
  (
    | (Omit<LinkProps, "className" | "children"> & { href: string; children: ReactNode })
    | (ButtonHTMLAttributes<HTMLButtonElement> & {
        href?: undefined;
        children: ReactNode;
      })
  );

export function Button(props: ButtonProps) {
  const {
    variant = "outline",
    size = "md",
    className,
    children,
    fullBleedUseAccentBg = true,
  } = props;
  const cls = buttonClassName({
    variant,
    size,
    className,
    fullBleedUseAccentBg,
  });

  if ("href" in props && props.href !== undefined) {
    const p = props as Common & LinkProps;
    const {
      href,
      variant: _v,
      size: _s,
      className: _c,
      children: _ch,
      fullBleedUseAccentBg: _f,
      ...linkRest
    } = p;
    return (
      <Link href={href} className={cls} {...linkRest}>
        {children}
      </Link>
    );
  }

  const p = props as Common & ButtonHTMLAttributes<HTMLButtonElement>;
  const {
    variant: _v,
    size: _s,
    className: _c,
    children: _ch,
    fullBleedUseAccentBg: _f,
    type: _t,
    ...btnRest
  } = p;
  return (
    <button type="button" className={cls} {...btnRest}>
      {children}
    </button>
  );
}

export { buttonClassName } from "@/components/ui/buttonStyles";

```

### `components/ui/CaseTag.tsx`

```tsx
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

```

### `components/ui/DisplayHeading.tsx`

```tsx
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DisplayHeadingPreset =
  | "index"
  | "sobreHero"
  | "sobreSectionWide"
  | "sobreSectionNarrow"
  | "contactHero"
  | "notFoundTitle"
  | "iaSection"
  | "curriculumName"
  | "nextCaseTitle"
  | "worksRowTitle";

const presetClass: Record<DisplayHeadingPreset, string> = {
  index:
    "mt-6 text-[clamp(40px,8vw,88px)] font-extrabold leading-[0.95] tracking-[-0.045em] text-ink",
  sobreHero:
    "mb-8 mt-8 max-w-[800px] text-[clamp(28px,5vw,72px)] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink md:mb-12",
  sobreSectionWide:
    "mb-10 max-w-[800px] text-[clamp(22px,4vw,44px)] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink md:mb-16",
  sobreSectionNarrow:
    "max-w-[720px] text-[clamp(26px,3.5vw,40px)] font-extrabold leading-[1.12] tracking-[-0.03em] text-ink",
  contactHero:
    "text-[clamp(2.75rem,9vw,9rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-ink",
  notFoundTitle:
    "text-[clamp(1.75rem,4.5vw,2.75rem)] font-extrabold leading-[1.08] tracking-[-0.045em] text-ink",
  iaSection:
    "relative z-10 max-w-[680px] text-[clamp(28px,4.2vw,66px)] font-extrabold leading-[1.08] tracking-[-0.035em] text-ink",
  curriculumName:
    "text-[clamp(32px,5vw,52px)] font-extrabold leading-[1.05] tracking-[-.04em] text-ink",
  nextCaseTitle:
    "text-[clamp(40px,6vw,88px)] font-extrabold text-ink tracking-[-.04em] leading-[0.92] block transition-transform duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none group-hover:translate-x-3",
  worksRowTitle:
    "text-[clamp(1.375rem,4vw,2.5rem)] font-bold leading-snug tracking-[-0.02em] text-ink",
};

export function displayHeadingClass(
  preset: DisplayHeadingPreset,
  className?: string,
): string {
  return cn(presetClass[preset], className);
}

type Props = {
  as?: "h1" | "h2" | "h3" | "p" | "span";
  preset: DisplayHeadingPreset;
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">;

export function DisplayHeading({
  as: Tag = "h1",
  preset,
  className,
  children,
  ...rest
}: Props) {
  return (
    <Tag className={displayHeadingClass(preset, className)} {...rest}>
      {children}
    </Tag>
  );
}

```

### `components/ui/Eyebrow.tsx`

```tsx
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

```

### `components/ui/InlineCode.tsx`

```tsx
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">;

/** Código inline em documentação / texto editorial. */
export function InlineCode({ className, children, ...rest }: Props) {
  return (
    <code
      className={cn("font-mono text-[14px] text-subtle", className)}
      {...rest}
    >
      {children}
    </code>
  );
}

```

### `components/ui/PunkLink.tsx`

```tsx
import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = Omit<LinkProps, "className"> & {
  className?: string;
  children: ReactNode;
};

/** Link de texto com o estilo compartilhado de navegação. */
export function PunkLink({ className, children, ...props }: Props) {
  return (
    <Link className={cn("punk-link", className)} {...props}>
      {children}
    </Link>
  );
}

```

### `components/ui/buttonStyles.ts`

```ts
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

```

### `components/ui/navLinkStyles.ts`

```ts
import { cn } from "@/lib/cn";

/** Tons do link desktop da nav principal (PrimaryNav). */
export type PrimaryNavDesktopLinkTone =
  | "contactDark"
  | "homeDark"
  | "homeLight"
  | "inner";

const homeDark = cn(
  "text-[14px] font-bold tracking-[0.04em] text-ink no-underline",
  "transition-opacity duration-200 ease-out hover:opacity-75",
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
);

const homeLight = cn(
  "text-[14px] font-bold tracking-[0.04em] text-ink no-underline",
  "transition-opacity duration-200 ease-out hover:opacity-75",
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 focus-visible:ring-offset-on-panel",
);

const inner = cn(
  "text-[14px] font-bold tracking-[0.04em] text-ink no-underline",
  "transition-opacity duration-200 ease-out hover:opacity-70",
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
);

const contactDark = cn(
  "text-[14px] font-bold tracking-[0.04em] text-ink no-underline",
  "transition-opacity duration-200 ease-out hover:opacity-75",
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-accent",
);

const toneClass: Record<PrimaryNavDesktopLinkTone, string> = {
  contactDark,
  homeDark,
  homeLight,
  inner,
};

/** Classes do item desktop + hook visual `.punk-link` (globals.css). */
export function primaryNavDesktopLinkClass(
  tone: PrimaryNavDesktopLinkTone,
): string {
  return cn(toneClass[tone], "punk-link inline-block");
}

```


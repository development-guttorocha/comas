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

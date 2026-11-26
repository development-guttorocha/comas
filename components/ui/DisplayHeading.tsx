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

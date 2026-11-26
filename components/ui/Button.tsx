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

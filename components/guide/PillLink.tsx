import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./guide.module.css";

export const pillClassName = styles.pill;

/** Outlined pill CTA from the Sobre summary. External URLs render a plain anchor in a new tab. */
export function PillLink({ href, children, arrow = "↗", className, ...props }: {
  href: string;
  children: ReactNode;
  arrow?: ReactNode;
} & Omit<ComponentPropsWithoutRef<"a">, "href">) {
  const content = <>{children}{arrow ? <span aria-hidden>{arrow}</span> : null}</>;
  const classes = [styles.pill, className].filter(Boolean).join(" ");
  if (/^https?:\/\//.test(href)) return <a {...props} href={href} className={classes} target="_blank" rel="noopener noreferrer">{content}</a>;
  if (href.startsWith("#") || /^(mailto|tel):/.test(href)) return <a {...props} href={href} className={classes}>{content}</a>;
  return <Link {...props} href={href} className={classes}>{content}</Link>;
}

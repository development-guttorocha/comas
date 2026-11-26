import type { ComponentPropsWithoutRef, ElementType } from "react";
import styles from "./guide.module.css";

type SectionProps<T extends ElementType> = {
  as?: T;
  /** `content` uses the Sobre grid (80% / 86% / 24px gutters); `full` spans the viewport. */
  width?: "content" | "full";
  pad?: "none" | "md" | "lg";
} & ComponentPropsWithoutRef<T>;

export function Section<T extends ElementType = "section">({ as, width = "content", pad = "none", className, ...props }: SectionProps<T>) {
  const Tag: ElementType = as ?? "section";
  return <Tag {...props} data-pad={pad} className={[width === "full" ? styles.full : styles.section, className].filter(Boolean).join(" ")} />;
}

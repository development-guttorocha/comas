"use client";

import { useCaseImageTheme } from "@/components/ImageVeil";
import type { DividerStyle } from "@/lib/caseDivider";
import { SPACE_VALUES } from "@/lib/caseEmbedSpace";
import styles from "./CaseDivider.module.css";

const DEFAULT_SPACE = "48px";

/** The case's divider: its line (or none, keeping only the space), its width and side, and the space around it. */
export default function CaseDivider({ style }: { style: DividerStyle }) {
  const accent = useCaseImageTheme()?.color ?? "var(--color-ink)";
  const color = style.color === "none" ? "transparent" : style.color === "brand" ? accent : style.color === "ink" ? "var(--color-ink)" : style.color === "muted" ? "var(--color-muted)" : style.color || "var(--color-line)";
  return (
    <div role="separator" aria-hidden={style.color === "none" || undefined} className={styles.divider}
      style={{ paddingTop: style.spaceTop ? SPACE_VALUES[style.spaceTop] : DEFAULT_SPACE, paddingBottom: style.spaceBottom ? SPACE_VALUES[style.spaceBottom] : DEFAULT_SPACE }}>
      <div className={styles.line} data-size={style.size || undefined} data-align={style.align || undefined} style={{ background: color }} />
    </div>
  );
}

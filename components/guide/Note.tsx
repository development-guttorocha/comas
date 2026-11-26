import type { ComponentPropsWithoutRef } from "react";
import styles from "./guide.module.css";

/** Reading card from the Sobre chapters: quiet surface, muted copy, ink for emphasis. */
export function Note({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div {...props} className={[styles.note, className].filter(Boolean).join(" ")} />;
}

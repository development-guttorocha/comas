import type { ReactNode } from "react";
import styles from "./HomeChapters.module.css";

/** The question at the end of a chapter; the next chapter answers it. */
export default function NextCue({ href, children }: { href: string; children: ReactNode }) {
  return <a className={styles.next} href={href}>{children}<span aria-hidden="true">↓</span></a>;
}

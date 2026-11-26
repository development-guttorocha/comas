import type { ReactNode } from "react";
import styles from "@/app/(pt)/artigos/artigos.module.css";

/**
 * A place for a third-party ad (AdSense, once the account is approved). Until there is one,
 * or when the article turns ads off, the slot shows its fallback (a service of Gutto's) or
 * nothing, so the text never has a hole in it.
 */
export function AdSlot({ format, enabled, fallback }: { format: "rail" | "inline"; enabled: boolean; fallback?: ReactNode }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!enabled || !client) return fallback ? <div className={styles.slot} data-format={format}>{fallback}</div> : null;
  // The AdSense unit itself arrives with the consent banner (later step); the space is already held.
  return (
    <div className={styles.slot} data-format={format} data-network="">
      <p className={styles.slotLabel}>Publicidade</p>
      <div className={styles.slotBox} />
    </div>
  );
}

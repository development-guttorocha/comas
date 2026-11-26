import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { brl, type Band, type Verdict } from "@/lib/salaryBands";
import styles from "@/app/(pt)/recursos/ruler.module.css";

/** One designer per place on the ruler: below the band, in it, above it. */
export const FIGURES = ["/home/redesign/portrait-creator-ads.png", "/home/redesign/portrait.png", "/home/redesign/portrait-loft.png"];
export const ZONE: Record<Verdict, number> = { below: 0, low: 1, mid: 1, above: 2 };

/** The ruler gives each zone a third, whatever the role: below p25, p25–p75, above p75. */
export function place(x: number, b: Band) {
  const lo = b.p25 * 0.6, hi = b.p75 * 1.4;
  const t = x < b.p25 ? (x - lo) / (b.p25 - lo) / 3 : x <= b.p75 ? 1 / 3 + (x - b.p25) / (b.p75 - b.p25) / 3 : 2 / 3 + (x - b.p75) / (hi - b.p75) / 3;
  return `${Math.min(98, Math.max(2, t * 100))}%`;
}

/**
 * Three designers standing on a salary ruler, a bubble over the one that is lit. Shared by the
 * salary page's hero and the survey's ending, so both read the same way. Decorative: the verdict
 * it shows is always written out next to it.
 */
export default function SalaryRuler({ lit, bubble, bubbleKey, band, mine, youLabel, zones, medianRead, compact = false, priority = false }: {
  lit: number; bubble: ReactNode; bubbleKey: string; band: Band | null; mine?: number | null; youLabel: string;
  zones: Array<{ label: string; read?: string }>; medianRead?: string; compact?: boolean; priority?: boolean;
}) {
  return (
    <div className={styles.stage} data-compact={compact || undefined} aria-hidden="true">
      <div className={styles.bubbleRow} style={{ "--at": `${(lit * 2 + 1) * (100 / 6)}%` } as CSSProperties}>
        <p className={styles.bubble} key={bubbleKey}>{bubble}</p>
        <span className={styles.tail} key={`t${lit}`} />
      </div>
      <div className={styles.figures}>
        {FIGURES.map((src, i) => (
          <div key={src} className={styles.figure} data-on={i === lit || undefined}>
            <Image src={src} alt="" width={1024} height={1536} sizes={compact ? "160px" : "(max-width: 1023px) 32vw, 18vw"} priority={priority && i === 1} />
          </div>
        ))}
      </div>
      <div className={styles.ruler}>
        <span className={styles.rulerBand} />
        {band ? <span className={styles.rulerMedian} style={{ left: place(band.p50, band) }} /> : null}
        {band && mine ? <span className={styles.rulerYou} style={{ left: place(mine, band) }}><i>{youLabel} · {brl(mine)}</i></span> : null}
      </div>
      <ol className={styles.zones}>
        {zones.map((z, i) => (
          <li key={z.label} data-on={i === lit || undefined}>
            <strong>{z.label}</strong>
            {z.read ? <span>{z.read}</span> : null}
            {i === 1 && medianRead ? <span className={styles.medianRead}>{medianRead}</span> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

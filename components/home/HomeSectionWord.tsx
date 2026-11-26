"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HomeCasesSection.module.css";

const SLICES = 10;
// Fixed per-band offsets (in % of the line) so each band travels its own distance.
const OFFSETS = [38, -54, 26, -42, 60, -30, 46, -58, 34, -48];

/** The word fixed at the foot of the screen during the cases. When the
 * case column has passed it, it switches from "cases" to "depôs" in horizontal bands
 * that slide apart and back (after the "Kinetic countdown" pen). */
export default function HomeSectionWord({ from, to }: { from: string; to: string }) {
  const word = useRef<HTMLDivElement>(null);
  const [swapped, setSwapped] = useState(false);

  useEffect(() => {
    const element = word.current;
    const column = document.querySelector("[data-cases-column]");
    if (!element || !column) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      // Swap once the last case has scrolled past the top of the word.
      setSwapped(column.getBoundingClientRect().bottom < element.getBoundingClientRect().top + element.offsetHeight * .35);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); removeEventListener("scroll", schedule); removeEventListener("resize", schedule); };
  }, []);

  return <div ref={word} className={styles.word} data-swapped={swapped} aria-hidden="true" style={{ "--n": SLICES } as CSSProperties}>
    {OFFSETS.map((offset, index) => <span key={index} className={styles.slice} style={{ "--i": index, "--off": `${offset}%` } as CSSProperties}>
      <span className={styles.from}>{from}</span>
      <span className={styles.to}>{to}</span>
    </span>)}
  </div>;
}

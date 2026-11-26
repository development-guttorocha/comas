"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./HomeChapters.module.css";

/** Apple-style reveal: the statement holds in the middle of the screen and its words
 * light up one by one with the scroll. A single `--p` (0–1) drives every word in CSS. */
export default function HomeStatementReveal({ text }: { text: string }) {
  const paragraph = useRef<HTMLParagraphElement>(null);
  const words = text.split(/\s+/);

  useEffect(() => {
    const element = paragraph.current, section = element?.closest("section");
    if (!element || !section) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = section.getBoundingClientRect();
      const travel = Math.max(1, box.height - innerHeight);
      // Fully lit a little before the section lets go, so the last words can be read.
      element.style.setProperty("--p", String(Math.max(0, Math.min(1, -box.top / travel / .85))));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); removeEventListener("scroll", schedule); removeEventListener("resize", schedule); };
  }, []);

  return <p ref={paragraph} className={styles.reveal} style={{ "--n": words.length } as CSSProperties}>
    {words.map((word, index) => <span key={index} style={{ "--i": index } as CSSProperties}>{index ? " " : ""}{word}</span>)}
  </p>;
}

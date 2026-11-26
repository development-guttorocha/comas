"use client";

import { useRef } from "react";
import Image from "next/image";
import { useInView } from "framer-motion";
import styles from "./SobreStory.module.css";

/** The supplied wheel rotates around its hub, aligned with each axle in the original frame. */
export function StoryBike({ label }: { label: string }) {
  const ref = useRef<HTMLElement>(null);
  const visible = useInView(ref, { margin: "100px" });
  return <figure ref={ref} className={styles.bikeScene} data-playing={visible ? "true" : undefined} aria-label={label}>
    <div className={styles.bikeDrawing}>
      <div className={styles.bikeWheel} style={{ left: "3.26%", top: "30.11%" }}><Image src="/sobre2/figma/bike-wheel.webp" width={1576} height={1583} alt="" sizes="(max-width: 767px) 30vw, 18vw" /></div>
      <div className={styles.bikeWheel} style={{ left: "61.13%", top: "30.34%" }}><Image src="/sobre2/figma/bike-wheel.webp" width={1576} height={1583} alt="" sizes="(max-width: 767px) 30vw, 18vw" /></div>
      <svg className={styles.bikeFrame} viewBox="0 0 1296 563.79" aria-hidden="true"><image href="/sobre2/figma/bike-frame.webp" width="1296" height="729" /></svg>
    </div>
  </figure>;
}

"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, type ReactNode } from "react";
import styles from "./SobreStory.module.css";

/** Scroll-driven scenes use native scrolling and never intercept wheel/touch input. */
export function StoryMotion({ children, className, variant = "section" }: {
  children: ReactNode; className?: string; variant?: "section" | "object";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, .3, .7, 1], variant === "object" ? [100, 0, 0, -90] : [64, 0, 0, -48]);
  const scale = useTransform(scrollYProgress, [0, .35, .7, 1], variant === "object" ? [.84, 1, 1, 1.04] : [.97, 1, 1, .98]);
  const opacity = useTransform(scrollYProgress, [0, .2, .8, 1], [.4, 1, 1, .4]);
  return <motion.div ref={ref} className={className} style={reduce ? undefined : { y, scale, opacity }}>{children}</motion.div>;
}

export function StoryCoverMotion({ image, children, glitch = false }: { image: ReactNode; children: ReactNode; glitch?: boolean }) {
  const [entered, setEntered] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.25, 1.06]);
  const textY = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const opacity = useTransform(scrollYProgress, [0, .25, .65, 1], [.15, 1, 1, .15]);
  const shade = useTransform(scrollYProgress, [0, .35, .65, 1], [.9, .66, .66, .9]);
  return (
    <motion.header ref={ref} className={styles.eraCover} data-glitch={glitch && entered && !reduce ? "active" : undefined} viewport={{ amount: .55 }} onViewportEnter={() => { if (glitch && !reduce) setEntered(true); }} onViewportLeave={() => { if (glitch) setEntered(false); }}>
      <motion.div className={styles.coverMedia} style={reduce ? undefined : { y: imageY, scale }}><div className={styles.glitchFrame}>{image}</div></motion.div>
      <motion.div className={styles.coverShade} style={reduce ? undefined : { opacity: shade }} />
      <motion.div className={styles.coverCopy} style={reduce ? undefined : { y: textY, opacity }}>{children}</motion.div>
    </motion.header>
  );
}

export function StoryMemoryCard({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      className={styles.memoryCard}
      initial={reduce ? false : { opacity: 0, y: 48 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ amount: .25 }}
      transition={{ duration: .4, ease: [.16, 1, .3, 1] }}
    >{children}</motion.article>
  );
}

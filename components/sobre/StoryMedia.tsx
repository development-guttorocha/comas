"use client";

import { VeiledImage } from "@/components/ImageVeil";
import { motion, useInView, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import assets from "./storyAssets.json";
import styles from "./SobreStory.module.css";

type PosterName = keyof typeof assets;
type AnimationName = "panic" | "mask" | "corona" | "jetsons" | "vader" | "han" | "future";

export function StoryAnimation({ name, poster, className }: { name: AnimationName; poster: PosterName; className?: string }) {
  const asset = assets[poster];
  return <picture className={`${styles.animatedMedia}${className ? ` ${className}` : ""}`}>
    <source media="(prefers-reduced-motion: reduce)" srcSet={asset.src} />
    <VeiledImage src={`/sobre2/motion/${name}.webp`} width={asset.width} height={asset.height} alt="" unoptimized />
  </picture>;
}

/** Original Figma clips load near the viewport and pause when the reader moves away. */
export function StoryVideo({ name, poster, className, label }: {
  name: "car" | "magazines" | "bike"; poster: PosterName; className?: string; label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const near = useInView(ref, { margin: "200px" });
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (near && !reduce) void el.play().catch(() => {});
    else el.pause();
  }, [near, reduce]);
  return <div ref={ref} className={className}>
    {reduce || !near ? <VeiledImage {...assets[poster]} alt={label} sizes="80vw" /> : <video
      ref={video} src={`/sobre2/motion/${name}.mp4`} poster={assets[poster].src}
      autoPlay={near} loop muted playsInline preload="none" aria-label={label}
    />}
  </div>;
}

export function StoryPandemicScreen() {
  return <div className={styles.pandemicDesktop}>
    <VeiledImage {...assets.remoteWallpaper} alt="" sizes="70vw" className={styles.pandemicWallpaper} />
    <StoryAnimation name="panic" poster="panicPoster" className={styles.panicWindow} />
    <StoryAnimation name="mask" poster="maskPoster" className={styles.maskWindow} />
    <StoryAnimation name="corona" poster="coronaPoster" className={styles.coronaWindow} />
  </div>;
}

const futureFilms = [
  { name: "jetsons", poster: "jetsonsPoster" },
  { name: "vader", poster: "vaderPoster" },
  { name: "han", poster: "hanPoster" },
  { name: "future", poster: "futurePoster" },
] as const;

const reveal = (progress: number, start: number, end: number) => Math.max(0, Math.min(1, (progress - start) / (end - start)));

function FutureFilm({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const start = .54 + index * .09;
  const opacity = useTransform(progress, p => reveal(p, start - .015, start + .02) * (index === 3 ? 1 : 1 - reveal(p, start + .075, start + .11)));
  const scale = useTransform(progress, p => 1.07 - .07 * reveal(p, start - .015, start + .12));
  const filter = useTransform(progress, p => `blur(${(1 - reveal(p, start - .015, start + .02)) * 4}px)`);
  return <motion.div className={styles.filmLayer} style={{ opacity }}>
    <motion.div className={styles.filmCamera} style={{ scale, filter }}><StoryAnimation {...futureFilms[index]} /></motion.div>
  </motion.div>;
}

/** Geometry follows Figma frames 121:459 → 121:558; native scroll is the timeline. */
export function StoryVisionJourney({ question, response, ending: [asked, answered], restart, label }: {
  question: string; response: string; ending: [string, string]; restart: string; label: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [prompt, setPrompt] = useState(question);
  const [film, setFilm] = useState(-1);
  const { scrollYProgress: progress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // Width ratios: 440 / 712.7466, 1, 1034 / 712.7466, 2704 / 712.7466, 3618 / 712.7466.
  const scale = useTransform(progress, [0, .08, .16, .27, .35, .53], [.617, 1, 1.451, 3.794, 5.076, 5.076]);
  // Function transforms retain exact scene offsets on browsers with native scroll timelines.
  const hardwareOpacity = useTransform(progress, p => 1 - reveal(p, .5, .55));
  // Phones: the prompt follows the zoom only until it spans the screen (1.65 × the 86vw headset).
  const compactPromptScale = useTransform(scale, s => Math.min(s / 1.65, 1));
  const promptOpacity = useTransform(progress, p => p < .07 ? .25 * reveal(p, 0, .07) : (.25 + .75 * reveal(p, .07, .15)) * (1 - reveal(p, .5, .54)));
  const promptText = useTransform(progress, p => {
    if (p < .34) return question;
    if (p < .4) return question.slice(0, Math.round((.4 - p) / .06 * question.length));
    return response.slice(0, Math.min(response.length, Math.round((p - .4) / .1 * response.length)));
  });
  const filmIndex = useTransform(progress, p => p < .5 ? -1 : Math.max(0, Math.min(3, Math.floor((p - .54) / .09))));
  useMotionValueEvent(promptText, "change", setPrompt);
  useMotionValueEvent(filmIndex, "change", setFilm);
  const filmOpacity = useTransform(progress, p => reveal(p, .52, .56) * (1 - .82 * reveal(p, .8, .84)));
  const questionOpacity = useTransform(progress, p => reveal(p, .8, .83) * (1 - reveal(p, .9, .925)));
  const answerOpacity = useTransform(progress, p => reveal(p, .935, .955));

  const promptContent = <>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><rect x="9" y="2" width="6" height="13" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" /></svg>
    <span>{reduce ? question : prompt}<span className={styles.visionCaret} aria-hidden>│</span></span>
  </>;

  return <section ref={ref} id="vision-journey" className={styles.visionJourney} data-reduced={reduce ? "true" : undefined} aria-label={label}>
    <div className={styles.visionStage}>
      <div className={styles.visionAnchor}>
        <motion.div className={styles.visionHardware} style={reduce ? undefined : { scale, opacity: hardwareOpacity }}>
          <VeiledImage {...assets.visionFront} alt="Apple Vision Pro" sizes="(max-width: 767px) 90vw, 90vw" />
          <motion.div className={styles.visionPrompt} style={reduce ? undefined : { opacity: promptOpacity }}>{promptContent}</motion.div>
        </motion.div>
        {!reduce ? <motion.div className={styles.visionPromptCompact} style={{ x: "-50%", y: "-50%", scale: compactPromptScale, opacity: promptOpacity }} aria-hidden>{promptContent}</motion.div> : null}
      </div>
      {!reduce && film >= 0 ? <motion.div className={styles.visionFilm} style={{ opacity: filmOpacity }} aria-hidden>
        {futureFilms.map((item, index) => Math.abs(index - film) <= 1 ? <FutureFilm key={item.name} index={index} progress={progress} /> : null)}
        <div className={styles.filmFinish} />
      </motion.div> : null}
      <div className={styles.visionEnding}>
        {!reduce ? <motion.p style={{ opacity: questionOpacity }}>{asked}</motion.p> : null}
        <motion.p style={reduce ? undefined : { opacity: answerOpacity }}>{answered}</motion.p>
      </div>
      <button type="button" className={styles.visionRestart} onClick={() => ref.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" })}>{restart} <span aria-hidden>↻</span> 2030</button>
    </div>
  </section>;
}

"use client";

import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { VeiledImage } from "@/components/ImageVeil";
import assets from "./storyAssets.json";
import styles from "./SobreStory.module.css";

function useBox<T extends HTMLElement>(ref: RefObject<T | null>) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setBox({ width: el.clientWidth, height: el.clientHeight }));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return box;
}

/** A vertical scroll moves the memories from left to right, revealing the beginning last. */
export function StoryMemoryRail({ title, children, label, titleId = "memories-title", direction = "reverse", long = false }: {
  title: ReactNode; children: ReactNode; label: string; titleId?: string; direction?: "forward" | "reverse"; long?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const content = useBox(track);
  const windowBox = useBox(viewport);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const distance = Math.max(0, content.width - windowBox.width);
  const x = useTransform(scrollYProgress, [0, 1], direction === "reverse" ? [-distance, 0] : [0, -distance]);
  return <section ref={ref} className={styles.memoryScene} aria-labelledby={titleId} data-long={long || undefined} data-reduced={reduce ? "true" : undefined}>
    <div className={styles.memoryStage}>
      <div className={styles.wrap}>{title}</div>
      <div ref={viewport} className={styles.memoryWindow} role="region" aria-label={label} tabIndex={0}>
        <motion.div ref={track} className={styles.memoryTrack} style={reduce ? undefined : { x }}>{children}</motion.div>
      </div>
    </div>
  </section>;
}

type OrbitKey = "flipphone" | "smartphone" | "monitor" | "notebook" | "tv" | "television" | "imac";
const orbitKeys = new Set<string>(["flipphone", "smartphone", "monitor", "notebook", "tv", "television", "imac"]);
type OrbitItem = { key: string; label: string; caption: string };

function OrbitScreen({ name, className }: { name: "smartphone" | "flip" | "tv-tela-plana"; className: string }) {
  const dimensions = name === "flip" ? [231, 434] : name === "smartphone" ? [500, 500] : [640, 480];
  return <picture className={`${styles.animatedMedia} ${className}`}>
    <source media="(prefers-reduced-motion: reduce)" srcSet={`/sobre2/motion/${name}-poster.png`} />
    <VeiledImage src={`/sobre2/motion/${name}.webp`} width={dimensions[0]} height={dimensions[1]} alt="" unoptimized />
  </picture>;
}

function OrbitHardware({ item }: { item: { key: OrbitKey; label: string } }) {
  if (item.key === "smartphone") return <div className={`${styles.orbitHardware} ${styles.originalIphone}`} role="img" aria-label={item.label}>
    <div className={styles.iphoneCrop}><VeiledImage src="/sobre2/figma/iphone-original.jpg" width={956} height={700} alt="" sizes="500px" /></div>
    <OrbitScreen name="smartphone" className={styles.iphoneScreen} />
  </div>;
  if (item.key === "notebook") return <div className={`${styles.orbitHardware} ${styles.originalMacbook}`}>
    <VeiledImage src="/sobre2/figma/macbook-2008.jpg" width={800} height={430} alt={item.label} sizes="(max-width: 767px) 47vw, 25vw" />
  </div>;
  return <div className={`${styles.orbitHardware} ${styles[`orbit_${item.key}`]}`}>
    <VeiledImage {...assets[item.key]} alt={item.label} sizes="(max-width: 767px) 47vw, 25vw" />
    {item.key === "flipphone" ? <OrbitScreen name="flip" className={styles.flipScreen} /> : null}
    {item.key === "television" ? <OrbitScreen name="tv-tela-plana" className={styles.lcdScreen} /> : null}
    {item.key === "tv" ? <StoryGif year={1990} className={styles.crtScreen} /> : null}
    {item.key === "monitor" ? <StoryGif year={2000} className={styles.beigeScreen} /> : null}
    {item.key === "imac" ? <span className={styles.imacHello} aria-hidden="true"><VeiledImage src="/sobre2/figma/imac-hello.webp" width={3200} height={2400} alt="" sizes="(max-width: 767px) 12vw, 6vw" /></span> : null}
  </div>;
}

function OrbitDevice({ item, index, progress, width, count }: {
  item: { key: OrbitKey; label: string }; index: number; progress: MotionValue<number>; width: number; count: number;
}) {
  // Reverse the original rotation; the first half of each pair becomes its successor.
  const angle = (p: number) => -p * Math.PI * 2 + index / count * Math.PI * 2;
  const depth = (p: number) => (Math.cos(angle(p)) + 1) / 2;
  const transform = useTransform(progress, p => `translate(calc(-50% + ${Math.sin(angle(p)) * width * .35}px), calc(-50% - ${(1 - depth(p)) * 95}px)) scale(${.42 + depth(p) * .58}) rotateY(${Math.sin(angle(p)) * -15}deg)`);
  const opacity = useTransform(progress, p => .15 + depth(p) * .85);
  const zIndex = useTransform(progress, p => Math.round(depth(p) * 100));
  const filter = useTransform(progress, p => `blur(${(1 - depth(p)) * 3}px)`);
  return <motion.figure className={styles.orbitDevice} style={{ transform, opacity, zIndex, filter }}>
    <OrbitHardware item={item} />
    <figcaption>{item.label}</figcaption>
  </motion.figure>;
}

export function StoryDeviceOrbit({ devices: list, label, children }: { devices: OrbitItem[]; label: string; children?: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const box = useBox(stage);
  const reduce = useReducedMotion();
  // Only devices the code can draw: an unknown name in the admin is left out.
  const devices = list.filter((item): item is OrbitItem & { key: OrbitKey } => orbitKeys.has(item.key));
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", p => setActive(Math.round(p * devices.length) % devices.length));
  return <section ref={ref} className={styles.orbitScene} aria-label={label} data-reduced={reduce ? "true" : undefined}>
    <div className={styles.orbitStage}>
      <div ref={stage} className={styles.orbit}>
        <div className={styles.orbitRing} aria-hidden />
        {reduce ? <div className={styles.orbitStatic}>{devices.map(item => <figure key={item.key}><OrbitHardware item={item} /><figcaption>{item.caption}</figcaption></figure>)}</div> : devices.map((item, index) => <OrbitDevice key={item.key} item={item} index={index} progress={scrollYProgress} width={box.width} count={devices.length} />)}
      </div>
      {reduce ? null : <p className={styles.orbitCaption}>{devices[active]?.caption}</p>}
      {children ? <div className={styles.orbitHeading}>{children}</div> : null}
    </div>
  </section>;
}

function GalleryColumn({ children, progress, stageHeight }: {
  children: ReactNode; progress: MotionValue<number>; stageHeight: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const box = useBox(ref);
  const reduce = useReducedMotion();
  const y = useTransform(progress, p => p * (stageHeight - box.height));
  return <motion.div ref={ref} className={styles.galleryColumn} style={reduce ? undefined : { y }}>{children}</motion.div>;
}

export function StoryProjectGallery({ columns, label }: { columns: ReactNode[]; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const box = useBox(stage);
  const reduce = useReducedMotion();
  const [travel, setTravel] = useState(600);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => {
      const longest = Math.max(...Array.from(element.children, child => child.scrollHeight));
      setTravel(Math.max(0, longest - element.clientHeight));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    Array.from(element.children).forEach(child => observer.observe(child));
    return () => observer.disconnect();
  }, []);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 110px", "end end"] });
  return <div ref={ref} className={styles.galleryScene} style={{ "--gallery-travel": `${travel}px` } as CSSProperties} role="group" aria-label={label} data-reduced={reduce ? "true" : undefined}>
    <div ref={stage} className={`${styles.wrap} ${styles.galleryStage}`}>
      {columns.map((column, index) => <GalleryColumn key={index} progress={scrollYProgress} stageHeight={box.height}>{column}</GalleryColumn>)}
    </div>
  </div>;
}

/** The supplied animation lives inside the hardware; reduced motion receives its poster. */
export function StoryGif({ year, className }: { year: 1990 | 2000 | 2010; className?: string }) {
  const size = year === 1990 ? [320, 180] : year === 2000 ? [500, 500] : [400, 290];
  return <picture className={`${styles.animatedMedia}${className ? ` ${className}` : ""}`}>
    <source media="(prefers-reduced-motion: reduce)" srcSet={`/sobre2/motion/${year}-poster.png`} />
    <VeiledImage src={`/sobre2/motion/${year}.webp`} width={size[0]} height={size[1]} alt="" unoptimized />
  </picture>;
}


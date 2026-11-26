"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "./StoryCarSequence.module.css";

const FRAME_COUNT = 98;
const frameUrl = (index: number) => `/sobre2/bmw-sequence/ezgif-frame-${String(index + 1).padStart(3, "0")}.webp`;

/** Native scroll scrubs a bounded cache of frames; no wheel or pointer interception. */
export function StoryCarSequence({ caption, hint, alt, label }: { caption: string; hint: string; alt: string; label: string }) {
  const regionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const region = regionRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!region || !stage || !canvas || !context) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frames = new Map<number, HTMLImageElement>();
    const pending = new Set<number>();
    const failed = new Set<number>();
    let disposed = false;
    let visible = false;
    let raf = 0;
    let target = 0;
    let current = 0;
    let drawn = -1;
    let lastTime = 0;

    function schedule() {
      if (!disposed && visible && !preference.matches && !raf) raf = requestAnimationFrame(render);
    }

    function load(index: number) {
      if (index < 0 || index >= FRAME_COUNT || frames.has(index) || pending.has(index) || failed.has(index) || pending.size >= 4) return;
      pending.add(index);
      const image = new window.Image();
      image.decoding = "async";
      image.onload = () => {
        pending.delete(index);
        if (disposed) return;
        frames.set(index, image);
        // Keep decoded memory bounded instead of retaining all 98 full-HD frames.
        if (frames.size > 12) {
          const furthest = [...frames.keys()].sort((a, b) => Math.abs(b - current) - Math.abs(a - current))[0];
          frames.delete(furthest);
        }
        schedule();
      };
      image.onerror = () => { pending.delete(index); failed.add(index); schedule(); };
      image.src = frameUrl(index);
    }

    function render(time: number) {
      raf = 0;
      if (disposed || !visible || preference.matches || !canvas || !context) return;
      const elapsed = lastTime ? Math.min(time - lastTime, 64) : 16;
      lastTime = time;
      current += (target - current) * (1 - Math.exp(-elapsed / 140));
      if (Math.abs(target - current) < .05) current = target;
      const index = Math.round(current);
      load(index);
      const direction = target >= current ? 1 : -1;
      for (let offset = 1; offset <= 4; offset++) { load(index + offset * direction); load(index - offset * direction); }
      const nearest = frames.has(index) ? index : [...frames.keys()].sort((a, b) => Math.abs(a - index) - Math.abs(b - index))[0];
      const image = frames.get(nearest);
      if (image && nearest !== drawn) {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.style.opacity = "1";
        drawn = nearest;
      }
      if (current !== target) schedule();
    }

    const update = () => {
      const top = Number.parseFloat(getComputedStyle(stage).top) || 0;
      const distance = Math.max(1, region.offsetHeight - stage.offsetHeight);
      target = Math.max(0, Math.min(1, (top - region.getBoundingClientRect().top) / distance)) * (FRAME_COUNT - 1);
      schedule();
    };
    const preferenceChanged = () => {
      cancelAnimationFrame(raf); raf = 0; lastTime = 0;
      if (preference.matches) { frames.clear(); canvas.style.opacity = "0"; drawn = -1; }
      else update();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) update();
      else { cancelAnimationFrame(raf); raf = 0; lastTime = 0; }
    }, { rootMargin: "600px" });
    observer.observe(region);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    preference.addEventListener("change", preferenceChanged);
    return () => {
      disposed = true;
      observer.disconnect(); cancelAnimationFrame(raf); frames.clear();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      preference.removeEventListener("change", preferenceChanged);
    };
  }, []);

  return <figure ref={regionRef} className={styles.sequence} aria-label={label}>
    <div ref={stageRef} className={styles.stage}>
      <div className={styles.media}>
        <Image src={frameUrl(0)} alt={alt} width={1920} height={1080} unoptimized className={styles.poster} />
        <canvas ref={canvasRef} width={1920} height={1080} className={styles.canvas} aria-hidden />
      </div>
      <figcaption className={styles.caption}>{caption}<span className={styles.hint}>{hint}</span></figcaption>
    </div>
  </figure>;
}

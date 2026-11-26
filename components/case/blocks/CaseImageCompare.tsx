"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import type { ImageCompare } from "@/lib/imageCompare";
import story from "./CaseStoryBlocks.module.css";
import styles from "./CaseImageCompare.module.css";

const clamp = (n: number) => Math.min(100, Math.max(0, n));

/**
 * Antes e depois em imagens, sobrepostas: o divisor se arrasta (ou se move pelas setas do teclado).
 * No celular, só um arraste para o lado move o divisor; rolar a página continua livre.
 */
export default function CaseImageCompare({ data }: { data: ImageCompare }) {
  const [pos, setPos] = useState(data.start ?? 50);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const moveTo = (clientX: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (rect?.width) setPos(clamp(((clientX - rect.left) / rect.width) * 100));
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    // A touch that lands on the image may be the start of a scroll: only a drag moves the divider.
    if (e.pointerType === "mouse") moveTo(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => { if (dragging.current) moveTo(e.clientX); };
  const stop = () => { dragging.current = false; };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 10 : 2;
    const next = e.key === "ArrowLeft" || e.key === "ArrowDown" ? pos - step
      : e.key === "ArrowRight" || e.key === "ArrowUp" ? pos + step
      : e.key === "Home" ? 0 : e.key === "End" ? 100 : null;
    if (next === null) return;
    e.preventDefault();
    setPos(clamp(next));
  };

  const { before, after } = data;
  const edge = pos < 12 ? "after" : pos > 88 ? "before" : undefined;
  return (
    <section id={data.id} className={story.section}>
      <div className="content-wrap">
        {data.sectionLabel || data.heading || data.intro ? (
          <ScrollReveal tone="editorial">
            <header className={story.header}>
              {data.sectionLabel ? <p className={story.label}>{data.sectionLabel}</p> : null}
              {data.heading ? <h2 className={story.heading}>{data.heading}</h2> : null}
              {data.intro ? <p className={story.intro}>{data.intro}</p> : null}
            </header>
          </ScrollReveal>
        ) : null}
        <ScrollReveal tone="editorial">
          <figure className={styles.figure}>
            <div
              ref={frame}
              className={styles.frame}
              data-edge={edge}
              data-background={data.background}
              data-border={data.border === false ? "none" : undefined}
              style={{ "--pos": `${pos}%`, ...(data.color ? { "--compare-bg": data.color } : {}) } as CSSProperties}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={stop}
              onPointerCancel={stop}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- the "before" image sets the frame's own proportion */}
              <img src={before.src} alt={before.alt ?? before.label ?? ""} loading="lazy" decoding="async" />
              <div className={styles.after}>
                {/* eslint-disable-next-line @next/next/no-img-element -- laid over the "before" image, cropped to it */}
                <img src={after.src} alt={after.alt ?? after.label ?? ""} loading="lazy" decoding="async" />
              </div>
              {before.label ? <span className={`${styles.tag} ${styles.tagBefore}`} aria-hidden>{before.label}</span> : null}
              {after.label ? <span className={`${styles.tag} ${styles.tagAfter}`} aria-hidden>{after.label}</span> : null}
              <span className={styles.divider} aria-hidden />
              <button
                type="button"
                className={styles.handle}
                role="slider"
                aria-label={[before.label, after.label].filter(Boolean).join(" / ") || "Comparar"}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pos)}
                aria-valuetext={`${Math.round(pos)}%`}
                onKeyDown={onKeyDown}
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 5 2 10l5 5M13 5l5 5-5 5" /></svg>
              </button>
            </div>
            {data.caption ? <figcaption className={styles.caption}>{data.caption}</figcaption> : null}
          </figure>
        </ScrollReveal>
      </div>
    </section>
  );
}

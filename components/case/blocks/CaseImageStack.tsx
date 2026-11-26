"use client";

import { useContext, useRef, type CSSProperties } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import ScrollReveal, { StaticReveal } from "@/components/ScrollReveal";
import { LAYOUT_RATIO, RATIO_VALUE, stackLayout, type ImageStack } from "@/lib/imageStack";
import story from "./CaseStoryBlocks.module.css";
import styles from "./CaseImageStack.module.css";

/**
 * Imagens sobrepostas: prints em cascata, em leque ou com um em destaque, uns por cima dos outros.
 * Entram em sequência quando a composição aparece; no computador, passar o mouse sobre um quadro
 * o traz para a frente (para ver o que ficou escondido).
 */
export default function CaseImageStack({ data }: { data: ImageStack }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px -8% 0px" });
  const reduceMotion = useReducedMotion();
  const still = useContext(StaticReveal) || !!reduceMotion;

  const ratio = data.ratio ?? LAYOUT_RATIO[data.layout];
  const { height, slots } = stackLayout(data.layout, data.items.length, ratio, data.mirror);
  const items = data.items.slice(0, slots.length);

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
        <figure className={styles.figure}>
          <div
            className={styles.stage}
            data-background={data.background}
            style={data.color ? ({ "--stack-bg": data.color } as CSSProperties) : undefined}
          >
            <div
              ref={ref}
              className={styles.canvas}
              data-in={inView || still ? "" : undefined}
              data-frame={data.frame}
              data-layout={data.layout}
              style={{ "--h": height, "--r": RATIO_VALUE[ratio] } as CSSProperties}
            >
              {items.map((item, i) => {
                const slot = slots[i];
                return (
                  <div
                    key={i}
                    className={styles.layer}
                    style={{ "--x": slot.x, "--y": slot.y, "--w": slot.w, "--rot": slot.rotate, "--d": `${i * 0.09}s`, zIndex: slot.z + 1 } as CSSProperties}
                  >
                    {data.frame === "browser" ? <span className={styles.bar} aria-hidden><i /><i /><i /></span> : null}
                    {/* eslint-disable-next-line @next/next/no-img-element -- each frame crops its picture to the composition's proportion */}
                    <img src={item.src} alt={item.alt ?? ""} loading="lazy" decoding="async" style={item.focus ? { objectPosition: item.focus } : undefined} />
                  </div>
                );
              })}
            </div>
          </div>
          {data.caption ? <figcaption className={styles.caption}>{data.caption}</figcaption> : null}
        </figure>
      </div>
    </section>
  );
}

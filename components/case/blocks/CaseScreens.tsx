import type { CSSProperties } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import type { ScreenGallery } from "@/lib/screens";
import story from "./CaseStoryBlocks.module.css";
import styles from "./CaseScreens.module.css";

/** Telas lado a lado, cada uma com a sua legenda; no celular, uma faixa que rola para o lado. */
export default function CaseScreens({ data }: { data: ScreenGallery }) {
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
        <ol className={styles.row} data-frame={data.frame} style={{ "--count": data.screens.length } as CSSProperties}>
          {data.screens.map((screen, i) => (
            <li key={i} className={styles.item}>
              <ScrollReveal tone="editorial" delay={i * 0.06}>
                <figure className={styles.figure}>
                  <div className={styles.screen}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- screens keep their own crop inside the frame */}
                    <img src={screen.src} alt={screen.alt ?? screen.label ?? ""} loading="lazy" />
                  </div>
                  {screen.label || screen.caption ? (
                    <figcaption className={styles.caption}>
                      {screen.label ? <strong>{screen.label}</strong> : null}
                      {screen.caption ? <span>{screen.caption}</span> : null}
                    </figcaption>
                  ) : null}
                </figure>
              </ScrollReveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

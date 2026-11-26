"use client";

import type { CSSProperties } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import type { Panel, PanelCard } from "@/lib/panel";
import { ChartBody } from "./CaseChart";
import story from "./CaseStoryBlocks.module.css";
import styles from "./CasePanel.module.css";

/** Painel: cards lado a lado, cada um com o seu título, conteúdo e fonte no pé. */

/** From a light tint of the case colour to the colour itself; the last block is the punchline. */
const stackTone = (i: number, n: number) => (i === n - 1 && n > 1 ? 100 : 14 + i * 10);

function Card({ card, columns }: { card: PanelCard; columns: number }) {
  const span = Math.min(card.span ?? 1, columns);
  return (
    <article className={styles.card} data-kind={card.kind} data-span={span} style={span > 1 ? { gridColumn: `span ${span}` } : undefined}>
      {card.title || card.subtitle ? (
        <header className={styles.head}>
          {card.title ? <h3 className={styles.title}>{card.title}</h3> : null}
          {card.subtitle ? <p className={styles.subtitle}>{card.subtitle}</p> : null}
        </header>
      ) : null}
      <div className={styles.content}>
        {card.kind === "chart" && card.chart ? <ChartBody spec={card.chart} label={card.title} /> : null}
        {card.kind === "quote" ? (
          <>
            {card.src ? (
              <div className={styles.media}>
                {/* eslint-disable-next-line @next/next/no-img-element -- a print or a chart from a source, at its own proportions */}
                <img src={card.src} alt={card.alt ?? ""} loading="lazy" />
              </div>
            ) : null}
            {card.quote ? <p className={styles.quote}>{card.quote}</p> : null}
          </>
        ) : null}
        {card.kind === "stack" && card.items ? (
          <div className={styles.stackWrap}>
          <div className={styles.stack} data-layout={card.layout} data-look={card.look}>
            {card.items.map((item, i, all) => {
              const tone = stackTone(i, all.length);
              return (
                <div key={i} className={styles.stackItem} data-strong={tone === 100 || undefined} style={{ "--tone": `${tone}%` } as CSSProperties}>
                  {item.label ? <span className={styles.stackLabel}>{item.label}</span> : null}
                  {item.figure ? <strong className={styles.stackFigure}>{item.figure}</strong> : null}
                  {item.body ? <span className={styles.stackBody}>{item.body}</span> : null}
                </div>
              );
            })}
          </div>
          </div>
        ) : null}
        {card.kind === "text" ? (
          <>
            {card.body ? card.body.split(/\n\s*\n/).map((p, i) => <p key={i} className={styles.text}>{p}</p>) : null}
            {card.bullets ? <ul className={styles.bullets}>{card.bullets.split("\n").map(b => b.trim()).filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}</ul> : null}
          </>
        ) : null}
      </div>
      {card.source ? <p className={styles.source}>{card.source}</p> : null}
    </article>
  );
}

export default function CasePanel({ data }: { data: Panel }) {
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
        <ScrollReveal tone="editorial" delay={.06}>
          <div className={styles.grid} data-columns={data.columns} style={{ "--columns": data.columns } as CSSProperties}>
            {data.cards.map((card, i) => <Card key={i} card={card} columns={data.columns} />)}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

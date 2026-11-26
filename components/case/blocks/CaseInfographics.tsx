"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { CHART_EASE, useChartReveal } from "@/components/case/charts/chartMotion";
import { InfoIcon } from "@/lib/infographicIcons";
import { cellMark, type Comparison, type IconRatio, type IconStats, type Timeline } from "@/lib/infographics";
import story from "./CaseStoryBlocks.module.css";
import styles from "./CaseInfographics.module.css";

/** Infográficos: proporção com ícones, números com ícone, linha do tempo e comparação lado a lado. */

function Header({ sectionLabel, heading, intro }: { sectionLabel?: string; heading?: string; intro?: string }) {
  if (!sectionLabel && !heading && !intro) return null;
  return (
    <ScrollReveal tone="editorial">
      <header className={story.header}>
        {sectionLabel ? <p className={story.label}>{sectionLabel}</p> : null}
        {heading ? <h2 className={story.heading}>{heading}</h2> : null}
        {intro ? <p className={story.intro}>{intro}</p> : null}
      </header>
    </ScrollReveal>
  );
}

/** "7 in 10": a grid of icons, the first ones painted in the case colour, one after another. */
export function CaseIconRatio({ data }: { data: IconRatio }) {
  const { ref, shown, reduce } = useChartReveal<HTMLDivElement>();
  const whole = Math.floor(data.value), part = data.value - whole;
  // Tens read best in rows of ten (10 × 10 for a hundred); other totals in a wide block.
  const columns = data.total <= 10 ? data.total : data.total % 10 === 0 && data.total <= 100 ? 10 : Math.ceil(Math.sqrt(data.total * 2));
  const display = data.display ?? `${data.value.toLocaleString("pt-BR")} de ${data.total}`;
  return (
    <section id={data.id} className={story.section}>
      <div className="content-wrap">
        <Header {...data} />
        <div ref={ref} className={styles.ratio} role="img" aria-label={`${display}${data.label ? ` ${data.label}` : ""}`}>
          <div className={styles.ratioCopy}>
            <strong className={styles.ratioValue}>{display}</strong>
            {data.label ? <p className={styles.ratioLabel}>{data.label}</p> : null}
          </div>
          <div className={styles.ratioGrid} style={{ "--columns": columns } as CSSProperties} aria-hidden>
            {Array.from({ length: data.total }, (_, i) => {
              const fill = i < whole ? 1 : i === whole ? part : 0;
              return (
                <span key={i} className={styles.ratioIcon}>
                  <InfoIcon name={data.icon} className={styles.ratioBase} />
                  {fill > 0 ? (
                    <motion.span className={styles.ratioFill} style={{ clipPath: `inset(0 ${100 - fill * 100}% 0 0)` }}
                      initial={{ opacity: 0, scale: .6 }} animate={{ opacity: shown ? 1 : 0, scale: shown ? 1 : .6 }}
                      transition={{ duration: reduce ? 0 : .45, delay: reduce ? 0 : .2 + i * Math.min(.08, 1.2 / data.total), ease: CHART_EASE }}>
                      <InfoIcon name={data.icon} filled />
                    </motion.span>
                  ) : null}
                </span>
              );
            })}
          </div>
        </div>
        {data.caption ? <p className={styles.caption}>{data.caption}</p> : null}
      </div>
    </section>
  );
}

export function CaseIconStats({ data }: { data: IconStats }) {
  const columns = data.columns ?? (data.items.length % 3 === 0 || data.items.length > 4 ? 3 : Math.min(4, data.items.length));
  return (
    <section id={data.id} className={story.section}>
      <div className="content-wrap">
        <Header {...data} />
        <ScrollReveal tone="editorial" delay={.06}>
          <div className={styles.stats} style={{ "--columns": columns } as CSSProperties}>
          {data.items.map((item, i) => (
            <div key={i} className={styles.stat}>
              <span className={styles.statIcon}><InfoIcon name={item.icon} /></span>
              {item.value ? <strong className={styles.statValue}>{item.value}</strong> : null}
              {item.label ? <span className={styles.statLabel}>{item.label}</span> : null}
              {item.body ? <p className={styles.statBody}>{item.body}</p> : null}
            </div>
          ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

export function CaseTimeline({ data }: { data: Timeline }) {
  const vertical = data.layout === "vertical";
  return (
    <section id={data.id} className={story.section}>
      <div className="content-wrap">
        <Header {...data} />
        <ScrollReveal tone="editorial" delay={.06}>
          <ol className={`${styles.timeline} ${vertical ? styles.timelineVertical : ""}`} style={{ "--items": data.items.length } as CSSProperties}>
            {data.items.map((item, i) => (
              <li key={i} className={styles.milestone} data-highlight={item.highlight || undefined}>
                <span className={styles.milestoneDot} aria-hidden />
                {item.date ? <span className={styles.milestoneDate}>{item.date}</span> : null}
                {item.title ? <h3 className={styles.milestoneTitle}>{item.title}</h3> : null}
                {item.body ? <p className={styles.milestoneBody}>{item.body}</p> : null}
              </li>
            ))}
          </ol>
        </ScrollReveal>
      </div>
    </section>
  );
}

const MARK_LABEL = { yes: "Sim", no: "Não", partial: "Em parte" } as const;
function Mark({ value }: { value: string }) {
  const mark = cellMark(value);
  if (mark === "empty") return <span className={styles.markEmpty} aria-label="—">—</span>;
  if (mark === "text") return <span className={styles.markText}>{value}</span>;
  return (
    <span className={styles.mark} data-mark={mark} role="img" aria-label={MARK_LABEL[mark]}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {mark === "yes" ? <path d="m6.5 12.5 3.5 3.5 7.5-8" /> : mark === "no" ? <path d="M7.5 7.5l9 9M16.5 7.5l-9 9" /> : <path d="M7 12h10" />}
      </svg>
    </span>
  );
}

export function CaseComparison({ data }: { data: Comparison }) {
  const highlighted = data.columns.findIndex(c => c.highlight);
  return (
    <section id={data.id} className={story.section}>
      <div className="content-wrap">
        <Header {...data} />
        <ScrollReveal tone="editorial" delay={.06} className={styles.compareWrap}>
          <table className={styles.compare} style={{ "--columns": data.columns.length } as CSSProperties}>
            <thead>
              <tr>
                <td />
                {data.columns.map((c, i) => <th key={i} scope="col" data-highlight={i === highlighted || undefined}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, r) => (
                <tr key={r}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((value, i) => <td key={i} data-highlight={i === highlighted || undefined}><Mark value={value} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollReveal>
        {data.caption ? <p className={styles.caption}>{data.caption}</p> : null}
      </div>
    </section>
  );
}

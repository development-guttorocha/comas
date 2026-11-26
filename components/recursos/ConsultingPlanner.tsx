"use client";

import { track } from "@vercel/analytics";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Kicker, SplitHeading } from "@/components/guide";
import CalendlyInline from "@/components/servicos/CalendlyInline";
import type { CareerConsultingContent } from "@/lib/resources";
import shell from "@/app/(pt)/servicos/service-shell.module.css";
import styles from "@/app/(pt)/recursos/consultoria.module.css";

/**
 * Consultoria de carreira, a landing page with one action: book the free 30-minute call. The
 * hero says what it is and draws the five weeks in three explained stops; the case section lets
 * the visitor see their own problem move, and carries that case to the scheduler, which sits
 * beside the price.
 */
export default function ConsultingPlanner({ copy: s, calendly, page, contact, afterHero, children, afterBook }: {
  copy: CareerConsultingContent; calendly?: string; page: string; contact: { mailto: string; whatsapp?: string };
  afterHero?: ReactNode; children: ReactNode; afterBook?: ReactNode;
}) {
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState(false);
  const p = s.problems[at]!;
  const steps = s.roadmap.steps;
  const last = steps.length - 1;
  const pick = (i: number) => { setAt(i); setPicked(true); track("consultoria_problem", { problem: s.problems[i]!.id }); };

  return (
    <>
      <section id="inicio" className={styles.hero} aria-labelledby="service-title">
        <div className={styles.canvas}>
          <span className={styles.boardTab} aria-hidden="true">{s.hero.boardTab}</span>
          <div className={styles.heroCopy}>
            <p className={shell.heroKicker}>{s.hero.kicker}</p>
            <SplitHeading as="h1" size="display" id="service-title" title={s.hero.title} continuation={s.hero.continuation} className={styles.title} />
            <p className={styles.intro}>{s.hero.intro}</p>
            <div className={styles.heroCta}>
              <a href="#agendar" className={styles.cta} data-cta="consultoria-hero">{s.hero.cta} →</a>
              <p className={styles.ctaNote}>{s.hero.ctaNote}</p>
            </div>
            <dl className={styles.proof}>
              {s.hero.proof.map(x => <div key={x.label}><dt>{x.value}</dt><dd>{x.label}</dd></div>)}
            </dl>
          </div>

          {/* The five weeks in three stops, each one explained. */}
          <ol className={styles.road} aria-label="Como funciona">
            {s.hero.steps.map((step, i) => (
              <li key={step.title} style={{ "--i": i } as CSSProperties} data-finish={i === s.hero.steps.length - 1 || undefined} data-calls={i === 1 || undefined}>
                <span className={styles.stop} aria-hidden="true" />
                <span className={styles.when}>{step.when}</span>
                <h2>{step.title}</h2>
                <small>{step.length}</small>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {afterHero}

      {/* ─── The visitor's case: each conversation and what they leave with ─── */}
      <section id="seu-caso" className={shell.section} aria-labelledby="case-title">
        <div className={shell.heading}>
          <Kicker>{s.how.kicker}</Kicker>
          <SplitHeading id="case-title" title={s.how.title} continuation={s.how.continuation} />
        </div>
        <div className={styles.problems} role="radiogroup" aria-labelledby="case-title">
          {s.problems.map((x, i) => (
            <button key={x.id} type="button" role="radio" aria-checked={i === at} onClick={() => pick(i)}>{x.label}</button>
          ))}
        </div>
        <ol className={styles.how} key={p.id} aria-live="polite">
          {steps.map((step, i) => (
            <li key={step.title} data-finish={i === last || undefined}>
              <span>{step.when}</span>
              <h3>{step.title}<small>{step.length}</small></h3>
              <p>{i === last ? <><b>{s.roadmap.arrive}</b> {p.roadmap[last]!.replace(/^Você sai com /, "")}</> : p.roadmap[i]}</p>
            </li>
          ))}
        </ol>
        <a href="#agendar" className={styles.cta} data-cta="consultoria-caso">{s.how.cta} →</a>
      </section>

      {/* ─── What they receive: the plan's table of contents ─── */}
      <section id="o-que-leva" className={shell.section} aria-labelledby="take-title">
        <div className={styles.take}>
          <div className={shell.heading}>
            <Kicker>{s.takeaway.kicker}</Kicker>
            <SplitHeading id="take-title" title={s.takeaway.title} continuation={s.takeaway.continuation} />
          </div>
          <div className={styles.doc}>
            <p className={styles.docHead}><span>{s.takeaway.doc}</span><b>{p.title}</b></p>
            <ol>
              {s.takeaway.items.map((x, i) => (
                <li key={x.title}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <div><h3>{x.title}</h3><p>{x.body}</p></div>
                </li>
              ))}
            </ol>
            <p className={styles.docNote}>{s.takeaway.docNote}</p>
          </div>
        </div>
      </section>

      {children}

      {/* ─── Price and scheduler together: the one place the page leads to ─── */}
      <section id="agendar" className={styles.bookSection} aria-labelledby="book-title">
        <div className={styles.bookCopy}>
          <p className={styles.kicker}>{s.book.kicker}</p>
          <h2 id="book-title" className={styles.bookTitle}>{s.book.title}</h2>
          <p>{s.book.body}</p>
          <div className={styles.priceCard}>
            <span>{s.price.kicker}</span>
            <strong><small>{s.price.from}</small>{s.price.value}</strong>
            <p>{s.price.note}</p>
            <ul>{s.price.includes.map(x => <li key={x}>{x}</li>)}</ul>
          </div>
          {picked ? <p className={styles.topic}>{s.book.topic.replace("{problem}", p.label)}</p> : null}
          <p className={styles.bookAlt}>
            {s.book.fallback.split(/(WhatsApp|e-mail)/).map((part, i) =>
              part === "WhatsApp" && contact.whatsapp ? <a key={i} href={contact.whatsapp} data-cta="consultoria-whatsapp">{part}</a>
                : part === "e-mail" ? <a key={i} href={contact.mailto} data-cta="consultoria-email">{part}</a>
                : part)}
          </p>
        </div>
        <div className={styles.book}>
          {calendly
            ? <CalendlyInline url={calendly} page={page} note={picked ? p.label : undefined} />
            : <a href={contact.mailto} className={styles.bookFallback}>{s.closing.title} →</a>}
        </div>
      </section>

      {afterBook}
    </>
  );
}

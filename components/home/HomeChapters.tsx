import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import type { SiteLocale } from "@/lib/siteLocale";
import { localizedHref } from "@/lib/navLocalePaths";
import type { HomeContent } from "@/lib/pages/schemas";
import HomeStatementReveal from "./HomeStatementReveal";
import HomeVoiceCarousel from "./HomeVoices";
import styles from "./HomeChapters.module.css";

/** The Home's sections read their texts from `content/pages/home.json` (Páginas → Home). */
export function HomeModel({ content: c }: { content: HomeContent }) {
  return <section id="como-lidero" className={styles.model} aria-labelledby="model-title">
    <div className={styles.modelInner}>
      {/* Title and divider hold together while the pillars scroll past. */}
      <div className={styles.modelAside}>
        <h2 id="model-title" className={styles.modelTitle}><span>{c.modelBefore}</span><strong>{c.modelHighlight}</strong><span>{c.modelAfter}</span></h2>
        {/* eslint-disable-next-line @next/next/no-img-element -- exact line asset, separate from layout */}
        <img className={styles.modelRule} src="/home/redesign/pillars-rule.svg" width={799} height={1} alt="" />
      </div>
      <ol className={styles.pillars}>{c.pillars.map((pillar, index) => <li key={pillar.title}>
        <ScrollReveal className={styles.pillar}>
          <h3><span aria-hidden>{index + 1}.</span> {pillar.title}</h3>
          <p>{pillar.summary}</p>
          <ul className={styles.tags}>{pillar.tags.map(tag => <li key={tag.text}>{tag.text}</li>)}</ul>
        </ScrollReveal>
      </li>)}</ol>
    </div>
  </section>;
}

export function HomeStatement({ content: c, locale = "pt" }: { content: HomeContent; locale?: SiteLocale }) {
  return <section className={styles.manifesto} aria-label={locale === "en" ? "Leadership" : "Liderança"}>
    <div className={styles.manifestoStage}>
      <HomeStatementReveal text={c.manifesto} />
    </div>
  </section>;
}

export function HomeImpact({ content: c }: { content: HomeContent }) {
  return <section id="resultados" className={styles.impact} aria-labelledby="impact-title">
    <ScrollReveal tone="editorial">
      <h2 id="impact-title">{c.impactTitle}<span>{c.impactSubtitle}</span></h2>
    </ScrollReveal>
    {/* The cards come in one after another. */}
    <div className={styles.proofs}>{c.proofs.map((proof, index) => <ScrollReveal key={proof.company} delay={.12 * index}>
      <article className={styles.proof} data-light={index === 0}>
        <header><h3>{proof.company}</h3><p>{proof.role}</p></header>
        {/* eslint-disable-next-line @next/next/no-img-element -- exact separator from Figma */}
        <img src={index === 0 ? "/home/redesign/impact-rule-dark.svg" : "/home/redesign/impact-rule-light.svg"} width={423} height={1} alt="" />
        <div><p>{proof.label}</p><strong>{proof.value}</strong></div>
      </article>
    </ScrollReveal>)}</div>
  </section>;
}

export function HomeCount({ content: c, locale = "pt" }: { content: HomeContent; locale?: SiteLocale }) {
  return <section id="lideranca" className={styles.countSection} aria-labelledby="count-title">
    <ScrollReveal tone="editorial">
      <h2 id="count-title"><strong>{c.countValue}</strong><span>{c.countLabel}</span></h2>
    </ScrollReveal>
    <ScrollReveal tone="snap" delay={.1}>
      <Link href={localizedHref("/curriculo", locale)} className={styles.resumeLink}>{c.resumeBefore} <b>{c.resumeLink}</b></Link>
    </ScrollReveal>
  </section>;
}

export function HomeVoices({ content: c, locale = "pt" }: { content: HomeContent; locale?: SiteLocale }) {
  return <section id="depoimentos" className={styles.closing} aria-labelledby="voices-title">
    <ScrollReveal>
      <HomeVoiceCarousel title={c.voicesTitle} voices={c.voices} locale={locale} />
    </ScrollReveal>
  </section>;
}

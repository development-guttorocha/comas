import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { HomeFeaturedCase } from "@/lib/homeCaseHighlights";
import type { SiteLocale } from "@/lib/siteLocale";
import type { BeltMotion } from "@/lib/homeSettingsModel";
import { getCaseHref } from "@/lib/cases";
import HomeCaseGallery from "./HomeCaseGallery";
import HomeSectionWord from "./HomeSectionWord";
import { localCovers } from "./homeCovers";
import { homeText } from "./homeCopy";
import styles from "./HomeCasesSection.module.css";

function CasePanel({ c, locale }: { c: HomeFeaturedCase; locale: SiteLocale }) {
  const t = (source: string) => homeText(locale, source);
  return <article className={styles.panel} data-featured-case={c.slug}
    style={{ "--panel-color": c.brandColor || "#151a1d" } as CSSProperties} aria-labelledby={`case-${c.slug}`}>
    <div className={styles.media}>
      {/* Same CORS mode as the belt texture, so the head preload serves both from one download. */}
      <picture className="contents">
        {/* A phone version, when the case has one, is composed for its frame: no focus there. */}
        {c.heroImageMobile ? <source media="(max-width: 767px)" srcSet={c.heroImageMobile} /> : null}
        <img className={`${styles.panelImage} ${c.heroImageFocus ? `[object-position:var(--focus)]${c.heroImageMobile ? " max-md:[object-position:50%_50%]" : ""}` : ""}`} src={c.heroImage || localCovers[c.slug]} alt="" crossOrigin="anonymous" fetchPriority="high" style={c.heroImageFocus ? { "--focus": c.heroImageFocus } as CSSProperties : undefined} />
      </picture>
    </div>
    <div className={styles.card}>
      <div className={styles.meta}><span>{c.company}</span><span className={styles.year}>{c.year}</span></div>
      <h3 id={`case-${c.slug}`}>{c.title}</h3>
      <div className={styles.highlight}>
        <p className={styles.label}>{c.highlight.label}</p>
        {c.highlight.text ? <p className={styles.summary}>{c.highlight.text}</p> : null}
        <dl className={styles.stats}>{c.highlight.stats.map((stat, i) => <div key={i}><dt>{stat.label}</dt><dd>{stat.value}</dd>{stat.caption ? <p>{stat.caption}</p> : null}</div>)}</dl>
        {c.highlight.note ? <p className={styles.note}>{c.highlight.note}</p> : null}
      </div>
      <Link href={getCaseHref(c.slug, locale)} className={styles.cta} aria-label={`${t("Ver case")}: ${c.title}`}>{t("Ver case")}<span aria-hidden>↗</span></Link>
    </div>
    {/* The whole panel opens the case; keyboard and screen readers use "Ver case". */}
    <Link href={getCaseHref(c.slug, locale)} className={styles.panelLink} tabIndex={-1} aria-hidden="true" />
  </article>;
}

/** Figma "HomeCasesSection": the pinned conveyor lies flat and hands over to the
 * case column, which scrolls over "cases" — fixed at the foot until the section ends. */
/** `beltCount`: how many of the first cases ride the belt (the highlighted ones); the column lists them all. */
export default function HomeCasesSection({ featured, beltCount, locale, belt }: { featured: HomeFeaturedCase[]; beltCount: number; locale: SiteLocale; belt: BeltMotion }) {
  if (!featured.length) return null;
  return <section id="cases" className={styles.section} aria-labelledby="cases-title">
    <HomeCaseGallery featured={featured.slice(0, beltCount)} locale={locale} belt={belt} />
    <div className={styles.column} data-cases-column>
      {featured.map(c => <CasePanel key={c.slug} c={c} locale={locale} />)}
    </div>
    {/* Visible as the section heading on mobile; on desktop the fixed word below plays that role. */}
    <h2 id="cases-title" className={styles.casesTitle}>cases</h2>
  </section>;
}

/** Cases and testimonials share one layer stack for the word between them, which sits
 * behind the belt, the cases and the testimonials: fixed at the foot during the cases,
 * it becomes "depôs" and follows the scroll up, heading the testimonials. */
export function HomeWordScope({ locale, cases, voices }: { locale: SiteLocale; cases: ReactNode; voices: ReactNode }) {
  return <div className={styles.wordScope}>
    {cases}
    <HomeSectionWord from="cases" to={locale === "en" ? "team" : "depôs"} />
    {voices}
  </div>;
}

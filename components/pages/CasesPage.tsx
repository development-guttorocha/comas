import SiteNav from "@/components/SiteNav";
import ScrollReveal from "@/components/ScrollReveal";
import CaseSectionNav from "@/components/case/CaseSectionNav";
import CasesRail from "@/components/cases/CasesRail";
import { CaseHeroFullBleed } from "@/components/case/blocks";
import { Kicker, PillLink, Section, SplitHeading } from "@/components/guide";
import { caseDetailUi, resolveCaseSummary, resolveCaseTitle } from "@/lib/caseDetailLocale";
import { getCaseCoverSrc } from "@/lib/caseCover";
import { getCaseHref, type Case, type CaseStat } from "@/lib/cases";
import { caseListingHighlight } from "@/lib/homeCaseHighlights";
import { pageCopy } from "@/lib/i18n/metadata";
import { getTranslator } from "@/lib/i18n/messages";
import { serializeJsonLd } from "@/lib/jsonLd";
import { localizedHref } from "@/lib/navLocalePaths";
import { getCaseDataSource, orderCasesForListing } from "@/lib/caseContent";
import type { SiteLocale } from "@/lib/siteLocale";
import { translatedCaseListings } from "@/lib/translations/listing";
import { getPageContent } from "@/lib/pages/store";
import type { CasesContent } from "@/lib/pages/schemas";
import styles from "@/app/(pt)/cases/cases.module.css";

/** The case's own full-bleed hero; its CTA opens the full case, which then glides to its first section. */
function CaseCover({ c, locale, position, total, stats }: { c: Case; locale: SiteLocale; position: number; total: number; stats: CaseStat[] }) {
  const t = getTranslator(locale);
  const ui = caseDetailUi(locale);
  const title = resolveCaseTitle(c, locale);
  const cover = getCaseCoverSrc(c);
  const video = c.heroFullBleedVideoUrl?.trim();
  const firstSection = c.heroFullBleedNextSectionId?.trim() || "case-doc";
  return <CaseHeroFullBleed
    className={styles.caseCover}
    titleAs="h2"
    eyebrow={c.heroFullBleedEyebrow?.trim() || c.productTag?.trim() || ui.overviewEyebrow}
    title={title}
    tagline={c.heroFullBleedTagline?.trim() || resolveCaseSummary(c, locale)}
    nextSectionId={firstSection}
    href={`${getCaseHref(c.slug, locale)}?secao=${firstSection}`}
    continueLabel={t("Ver case")}
    ctaClassName={styles.caseCta}
    counter={`${String(position).padStart(2, "0")} / ${String(total).padStart(2, "0")}`}
    extra={stats.length ? (
      <dl className={styles.caseStats}>
        {stats.map((stat, i) => <div key={i}><dd>{stat.value}</dd><dt>{stat.label}</dt></div>)}
      </dl>
    ) : null}
    company={c.company}
    brandColor={c.brandColor}
    media={video ? { type: "video", src: video, poster: c.heroFullBleedVideoPoster?.trim() }
      : cover ? { type: "image", src: cover, alt: ui.coverImageAlt(title), priority: false, mobileSrc: c.heroImageMobile, focus: c.heroImageFocus } : undefined}
  />;
}

/**
 * Cases: the word, the clients, every case's hero with a side index, and an invitation.
 * The page's own texts come from `content/pages/cases.json` (Páginas → Cases); the cases from their files.
 */
export default async function CasesPage({ locale = "pt" }: { locale?: SiteLocale }) {
  const t = getTranslator(locale);
  const [data, copy, meta] = await Promise.all([getCaseDataSource(), getPageContent<CasesContent>("cases", locale), pageCopy("cases", locale)]);
  const ordered = orderCasesForListing(data.cases);
  const list = locale === "en" ? await translatedCaseListings(ordered) : ordered;
  // The two result numbers the Home's cards show, from each case's first metrics block.
  const originals = new Map(data.cases.map(c => [c.slug, c]));
  const highlights = await Promise.all(list.map(async c => (await caseListingHighlight(originals.get(c.slug) ?? c, c, locale)).stats.slice(0, 2)));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: meta.title,
    description: meta.description,
    numberOfItems: list.length,
    itemListElement: list.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.title, url: getCaseHref(c.slug, locale) })),
  };

  return (
    <>
      <SiteNav />
      <main className={styles.page}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />

        <section className={styles.opening} aria-labelledby="cases-title">
          <ScrollReveal tone="editorial"><h1 id="cases-title" className={styles.word}>{copy.word}</h1></ScrollReveal>
          <ScrollReveal className={styles.openingBottom} delay={.1}>
            <p>{copy.intro}</p>
            <a href="#case-list">{copy.introLink} <span aria-hidden>↓</span></a>
          </ScrollReveal>
        </section>

        <Section pad="md" aria-labelledby="clients-title">
          <SplitHeading id="clients-title" className={styles.head} title={copy.clientsTitle} />
          <ul className={styles.clients}>
            {copy.clients.map(({ name, sector }, index) => <li key={name}>
              <ScrollReveal className={styles.client} delay={index % 4 * .06}>
                <span className={styles.clientName}>{name}</span>
                <span className={styles.clientSector}>{sector}</span>
              </ScrollReveal>
            </li>)}
          </ul>
        </Section>

        <section id="case-list" className={styles.cases} aria-label={t("Cases")}>
          <CaseSectionNav company="Gutto Rocha" items={list.map(c => ({ id: `case-${c.slug}`, label: c.company }))} ariaLabel={t("Navegar pelos cases")} />
          {list.length
            ? <CasesRail ids={list.map(c => `case-${c.slug}`)}>{list.map((c, i) => <CaseCover key={c.slug} c={c} locale={locale} position={i + 1} total={list.length} stats={highlights[i] ?? []} />)}</CasesRail>
            : <p className={styles.empty}>English case studies are being prepared.</p>}
        </section>

        <Section pad="lg" className={styles.coffee} aria-labelledby="coffee-title">
          <ScrollReveal>
            <Kicker>{copy.coffeeKicker}</Kicker>
            <SplitHeading id="coffee-title" title={copy.coffeeTitle} continuation={copy.coffeeContinuation} />
            <p>{copy.coffeeBody}</p>
            <PillLink href={localizedHref("/contato", locale)}>{copy.coffeeCta}</PillLink>
          </ScrollReveal>
        </Section>
      </main>
    </>
  );
}

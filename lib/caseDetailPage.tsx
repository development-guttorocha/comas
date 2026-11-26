import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import { extractSource, applySnapshot } from "@/lib/translations/document";
import { readTranslation } from "@/lib/translations/store";
import { localAdminRequest } from "@/lib/translations/localAdmin";
import { translatedCaseListings } from "@/lib/translations/listing";
import type { ReactElement } from "react";
import { notFound } from "next/navigation";
import CaseShell, { type CaseShellNext } from "@/components/case/CaseShell";
import {
  CaseHeroEditorial,
  CaseHeroFullBleed,
  CaseHeroMetaStrip,
  CaseMediaFullWidth,
} from "@/components/case/blocks";
import NotionPageDocument from "@/components/case/NotionPageDocument";
import {
  caseDetailUi,
  resolveCaseSummary,
  resolveCaseTitle,
} from "@/lib/caseDetailLocale";
import { getCaseHeroMegaWord, getCaseHref } from "@/lib/cases";
import type { Case } from "@/lib/cases";
import { CASE_SCROLL_ANCHOR_CLASS } from "@/lib/caseLayout";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import {
  collectNotionCaseSectionNav,
  type NotionHeadingAnchorMeta,
} from "@/lib/notionCaseNavFromHeadings";
import { getAllCases, getCaseBody, getCaseDataSource, getNextCaseFromList } from "@/lib/caseContent";
import type { SiteLocale } from "@/lib/siteLocale";
import { getCaseCoverSrc } from "@/lib/caseCover";
import { caseChartPlacements } from "@/lib/caseChartPlacements";
import { serializeJsonLd } from "@/lib/jsonLd";
import { caseJsonLd } from "@/lib/seo";
import styles from "@/components/case/CaseChrome.module.css";
import CaseReel from "@/components/reel/CaseReel";
import ReelLauncher from "@/components/reel/ReelLauncher";
import { getCaseReel } from "@/lib/reel/load";
import { applyReelTranslation } from "@/lib/reel/translate";
import { getReelTrack } from "@/lib/reel/trackStore";

const scroll = CASE_SCROLL_ANCHOR_CLASS;

/** `translated`: the English version is published, so each language points to the other. */
export function buildCaseMetadata(c: Case, locale: SiteLocale, { translated = false }: { translated?: boolean } = {}): Metadata {
  const title = resolveCaseTitle(c, locale);
  const summary = resolveCaseSummary(c, locale);
  const full = `${title} · ${c.company} · Gutto Rocha`;
  const pt = getCaseHref(c.slug), en = getCaseHref(c.slug, "en");
  const url = locale === "en" ? en : pt;
  const cover = getCaseCoverSrc(c);
  const images = cover && !/\.(mp4|webm|mov)(\?|$)/i.test(cover) ? [{ url: cover, alt: title }] : undefined;
  return {
    title: full,
    description: summary,
    alternates: {
      canonical: url,
      ...(translated ? { languages: { "pt-BR": pt, en, "x-default": pt } } : {}),
      // The same case as plain text, for AI assistants and readers that prefer it.
      types: { "text/markdown": `${url}.md` },
    },
    openGraph: { type: "article", siteName: "Gutto Rocha", title: full, description: summary, locale: locale === "en" ? "en_US" : "pt_BR", url, ...(images ? { images } : {}) },
    twitter: { card: "summary_large_image", title: full, description: summary, ...(images ? { images: images.map(i => i.url) } : {}) },
  };
}

export async function CaseDetailPage({
  slug,
  locale,
  previewDraft = false,
  override,
}: {
  slug: string;
  locale: SiteLocale;
  previewDraft?: boolean;
  /** The admin's live preview: the case and body on the editor's screen, saved or not (local only). */
  override?: { case: Case; body: NotionBlockNode[] };
}): Promise<ReactElement> {
  const localAdmin = await localAdminRequest();
  if (previewDraft && !localAdmin) notFound();
  // On this machine the admin can preview a draft case; the site never lists or serves one.
  const data = localAdmin ? await getAllCases() : await getCaseDataSource();
  let c = data.cases.find((item) => item.slug === slug);
  if (!c) notFound();
  if (override && localAdmin) c = { ...c, ...override.case, slug };

  const ui = caseDetailUi(locale);


  const nextRaw = getNextCaseFromList(data.cases, slug);
  const nextVisual = { brandColor: nextRaw.brandColor, cover: getCaseCoverSrc(nextRaw) };
  let next: CaseShellNext | undefined = {
    slug: nextRaw.slug,
    title: resolveCaseTitle(nextRaw, locale),
    company: nextRaw.company,
    ...nextVisual,
  };

  let notionSectionNavItems: Array<{ id: string; label: string }> = [
    { id: "case-doc", label: ui.docNavFallbackLabel },
  ];
  // Both languages share the Portuguese body; English swaps in its reviewed texts.
  let notionBlocks: NotionBlockNode[] = override && localAdmin ? override.body : await getCaseBody(slug);
  let notionHeadingAnchors: Record<string, NotionHeadingAnchorMeta> | undefined;
  const originalNav = collectNotionCaseSectionNav(notionBlocks);

  if (locale === "en") {
    const record = await readTranslation(slug);
    // The draft preview shows a half-written translation too: a text still empty stays in Portuguese.
    const draft = record?.draft && { ...record.draft, units: record.draft.units.map(unit => (unit.target.trim() ? unit : { ...unit, target: unit.source })) };
    const snapshot = previewDraft ? draft : record?.published;
    const source = extractSource(c, notionBlocks);
    if (!snapshot || snapshot.sourceHash !== source.sourceHash) {
      return <><SiteNav /><main className={styles.container} style={{ paddingBlock: "96px" }}>
        <h1 className="text-[clamp(40px,6vw,72px)] font-bold leading-tight">English version in preparation.</h1>
        <p className="mt-6 text-[18px]">This case is available in Portuguese while its English translation is being reviewed.</p>
        <Link href={`/cases/${slug}`} className="mt-8 inline-block text-[14px] font-bold">READ IN PORTUGUESE ↗</Link>
      </main></>;
    }
    const translated = applySnapshot(source, snapshot);
    c = { ...translated.case, titleEn: translated.case.title, summaryEn: translated.case.summary };
    notionBlocks = translated.blocks;
    const translatedNext = (await translatedCaseListings(data.cases)).find(item => item.slug === nextRaw.slug);
    next = translatedNext ? { slug: translatedNext.slug, title: translatedNext.title, company: translatedNext.company, ...nextVisual } : undefined;
  }
  const { navItems: fromHeadings, headingAnchors } = collectNotionCaseSectionNav(notionBlocks);
  if (fromHeadings.length > 0) {
    // Keep IDs stable so authored component links still reach the same sections.
    notionHeadingAnchors = Object.fromEntries(Object.entries(headingAnchors).map(([blockId, meta]) => [blockId, { ...meta, anchorId: originalNav.headingAnchors[blockId]?.anchorId ?? meta.anchorId }]));
    const stableIds = new Map(Object.entries(headingAnchors).map(([blockId, meta]) => [meta.anchorId, notionHeadingAnchors![blockId].anchorId]));
    notionSectionNavItems = fromHeadings.map(item => ({ ...item, id: stableIds.get(item.id) ?? item.id }));
  }
  const displayTitle = resolveCaseTitle(c, locale);
  const displaySummary = resolveCaseSummary(c, locale);

  const heroImageUrl = getCaseCoverSrc(c);
  const videoUrl = c.heroFullBleedVideoUrl?.trim();
  const wantsFullBleed = (c.heroVariant ?? "editorial") === "fullBleed";
  const hasFullBleedMedia = Boolean(heroImageUrl || videoUrl);
  const useFullBleedHero = wantsFullBleed && hasFullBleedMedia;
  const fullBleedNext = c.heroFullBleedNextSectionId?.trim() || "case-doc";

  // On this machine a draft video shows too, labeled; the published site never sees it.
  // English shows the video only while its translation matches the current reel.
  const reelPt = await getCaseReel(slug, { drafts: localAdmin });
  const reel = reelPt && locale === "en" ? applyReelTranslation(reelPt, (await readTranslation(slug))?.reel) : reelPt;
  const reelTrack = reel ? await getReelTrack(reel.track) : undefined;
  // Where the video shows (the admin's Vídeo tab): its own block, the cover, the meta row or the text.
  const reelDisplay = reel && reelTrack ? reel.display ?? "destaque" : null;
  const launcher = (variant: "hero" | "card" | "button" | "inline") =>
    reel && reelTrack ? <ReelLauncher doc={reel} track={reelTrack} variant={variant} cover={heroImageUrl} coverFocus={c.heroImageFocus} /> : null;
  // The card and the button float at the bottom of the screen instead of taking a place on the page.
  const metaAside = undefined;
  const floating = reelDisplay === "cartao" ? launcher("card") : reelDisplay === "botao" ? launcher("button") : null;
  const placements = caseChartPlacements(c.slug, locale);

  const jsonLd = caseJsonLd(c, locale, { title: displayTitle, summary: displaySummary, image: heroImageUrl, url: getCaseHref(slug, locale) });
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
    <CaseShell
      locale={locale}
      next={next}
      accentColor={c.brandColor}
      sectionNav={{
        company: c.company,
        items: notionSectionNavItems,
        brandColor: c.brandColor,
      }}
      hero={
        useFullBleedHero ? (
          <>
            <CaseHeroFullBleed
              sectionId="case-hero"
              className={scroll}
              eyebrow={
                c.heroFullBleedEyebrow?.trim() || c.productTag?.trim() || ui.overviewEyebrow
              }
              title={displayTitle}
              tagline={c.heroFullBleedTagline?.trim() || displaySummary}
              ctaAside={reelDisplay === "capa" ? launcher("hero") : undefined}
              nextSectionId={fullBleedNext}
              company={c.company}
              brandColor={c.brandColor}
              continueLabel={c.heroFullBleedContinueLabel?.trim() || (locale === "en" ? "Explore case" : "Explorar case")}
              media={
                videoUrl
                  ? {
                      type: "video",
                      src: videoUrl,
                      poster: c.heroFullBleedVideoPoster?.trim(),
                    }
                  : {
                      type: "image",
                      src: heroImageUrl!,
                      alt: ui.coverImageAlt(displayTitle),
                      mobileSrc: c.heroImageMobile,
                      focus: c.heroImageFocus,
                    }
              }
            />
            <section
              className="relative z-0 w-full bg-surface"
              aria-label={ui.metadataSectionAria}
            >
              <div className={styles.container}>
                <CaseHeroMetaStrip
                  locale={locale}
                  variant="surface"
                  company={c.company}
                  year={c.year}
                  role={c.role}
                  aside={metaAside}
                />
              </div>
            </section>
          </>
        ) : (
          <>
            <CaseHeroEditorial
              locale={locale}
              sectionId="case-hero"
              sectionClassName={scroll}
              placeholder={c.placeholder}
              brandColor={c.brandColor}
              megaWord={getCaseHeroMegaWord(c)}
              titleScale="headline"
              company={c.company}
              year={c.year}
              productTag={c.productTag}
              eyebrow={ui.overviewEyebrow}
              title={displayTitle}
              summary={displaySummary}
              role={c.role}
              tags={c.tags}
              accentTags={c.accentTags}
              paddingClass="pad-section-lg"
              metaAside={metaAside}
            />

            {heroImageUrl ? (
              <div className={styles.container} style={reelDisplay === "capa" ? { position: "relative" } : undefined}>
                <CaseMediaFullWidth
                  src={heroImageUrl}
                  alt={ui.coverImageAlt(displayTitle)}
                />
                {reelDisplay === "capa" ? <div className={styles.coverReel}>{launcher("hero")}</div> : null}
              </div>
            ) : reelDisplay === "capa" ? <div className={styles.container}>{launcher("hero")}</div> : null}
          </>
        )
      }
    >
      {reel && reelTrack && reelDisplay === "destaque" ? <CaseReel doc={reel} track={reelTrack} cover={heroImageUrl} coverFocus={c.heroImageFocus} /> : null}
      {reelDisplay === "texto" ? launcher("inline") : null}
      <NotionPageDocument
        locale={locale}
        anchorId="case-doc"
        anchorClassName={scroll}
        blocks={notionBlocks}
        headingAnchors={notionHeadingAnchors}
        {...placements}
      />
      {floating}
    </CaseShell>
    </>
  );
}

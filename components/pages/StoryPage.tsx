import SiteNav from "@/components/SiteNav";
import type { SiteLocale } from "@/lib/siteLocale";
import { getPageContent } from "@/lib/pages/store";
import type { SobreContent } from "@/lib/pages/schemas";
import { SobreStory, SobreStoryPresent, SobreStoryFuture, SobreStoryReflection } from "@/components/sobre/SobreStory";
import { StoryLeadership } from "@/components/sobre/StoryLeadership";
import CaseSectionNav from "@/components/case/CaseSectionNav";
import { Kicker, Note, PillLink, SplitHeading } from "@/components/guide";
import styles from "@/components/sobre/SobreStory.module.css";

const eraNav = [1990, 2000, 2010, 2020, 2030].map(year => ({ id: `decade-${year}`, label: String(year) }));

/** `**bold**` in the admin's text becomes <strong>. */
function rich(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
}

/** The About page; every text comes from `content/pages/sobre.json`, edited in the admin. */
export default async function StoryPage({ locale = "pt" }: { locale?: SiteLocale }) {
  const content = await getPageContent<SobreContent>("sobre", locale);
  return (
    <>
      <SiteNav />
      <main className={styles.page}>
        <section className={`${styles.wrap} ${styles.hero}`} aria-labelledby="story-title">
          <SplitHeading as="h1" size="display" id="story-title" title={content.heroTitle} continuation={content.heroContinuation} />
          <div className={styles.openingBottom}>
            <p>{content.heroLine}</p>
            <a href="#historia">{content.heroLink} <span aria-hidden>↓</span></a>
          </div>
        </section>

        <section className={styles.summary} aria-labelledby="story-summary">
          <div className={`${styles.wrap} ${styles.chapterIntro}`}>
            <div>
              <Kicker>{content.summaryKicker}</Kicker>
              <SplitHeading id="story-summary" title={content.summaryTitle} continuation={content.summaryContinuation} />
              <p className={styles.summaryExplanation}>{content.summaryExplanation}</p>
              <PillLink className={styles.summaryCta} href="#historia" arrow="↓">{content.summaryCta}</PillLink>
            </div>
            <Note className={styles.summaryBiography}>
              {content.bio.filter(paragraph => paragraph.text.trim()).map((paragraph, i) => <p key={i}>{rich(paragraph.text)}</p>)}
            </Note>
          </div>
        </section>

        <CaseSectionNav company="Gutto Rocha" items={eraNav} ariaLabel={content.navLabel} />
        <SobreStory content={content} />
        <SobreStoryPresent content={content} />

        <section className={`${styles.wrap} ${styles.leadership}`} id="experiencia" aria-labelledby="leadership-title">
          <StoryLeadership content={content} locale={locale} />
        </section>

        <SobreStoryReflection content={content} locale={locale} />
        <SobreStoryFuture content={content} />
      </main>
    </>
  );
}

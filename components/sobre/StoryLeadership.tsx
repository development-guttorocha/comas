import Link from "next/link";
import type { SiteLocale } from "@/lib/siteLocale";
import type { SobreContent } from "@/lib/pages/schemas";
import { localizedHref } from "@/lib/navLocalePaths";
import ScrollReveal from "@/components/ScrollReveal";
import { WorkCard } from "@/components/guide";
import { StoryChat } from "./StoryChat";
import styles from "./SobreStory.module.css";

export function StoryLeadership({ content, locale }: { content: SobreContent; locale: SiteLocale }) {
  return <>
    <section className={styles.leadershipConversation} aria-labelledby="leadership-title">
      <ScrollReveal tone="editorial" className={styles.centered}>
        <h2 id="leadership-title">{content.leadershipTitle}</h2>
      </ScrollReveal>
      {/* A message with no speaker is mine. */}
      <StoryChat english={locale === "en"} label={content.chatLabel} messages={content.chat.map(message => message.speaker ? { speaker: message.speaker, text: message.text } : { mine: true, text: message.text })} />
    </section>
    <section className={styles.leadershipPrinciples} aria-labelledby="leadership-pedaling">
      <ScrollReveal tone="editorial" className={styles.principlesIntro}>
        <h3 id="leadership-pedaling">{content.principlesTitle}</h3>
        <p>{content.principlesBody}</p>
      </ScrollReveal>
      <div className={styles.principlesGrid}>{content.principles.map(item => <ScrollReveal tone="editorial" key={item.title} className={styles.principleCard}><h4>{item.title}</h4><p>{item.body}</p></ScrollReveal>)}</div>
    </section>
  </>;
}

export function StoryLeadershipCases({ content, locale }: { content: SobreContent; locale: SiteLocale }) {
  return <div className={styles.leadershipWork}>
    <div className={styles.workCards}>{content.works.map((work, index) => <WorkCard key={work.company} href={localizedHref(work.href, locale)} company={work.company} role={work.role} date={work.date} title={work.title} metrics={work.metrics} tone={index === 0 ? "light" : "dark"} headingLevel={4} />)}</div>
    <p className={styles.resumeNote}>{content.resumeNote} {" "}<Link href={localizedHref("/curriculo", locale)}>{content.resumeLink}</Link></p>
  </div>;
}

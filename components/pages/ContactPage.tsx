import SiteNav from "@/components/SiteNav";
import { LogoMark } from "@/components/LogoMark";
import { Kicker, PillLink, Section, SplitHeading } from "@/components/guide";
import type { SiteLocale } from "@/lib/siteLocale";
import { getPageContent } from "@/lib/pages/store";
import type { ContactContent } from "@/lib/pages/schemas";
import styles from "@/app/(pt)/contato/contact.module.css";

/** Texts, e-mail and channels come from `content/pages/contato.json`, edited in the admin. */
export default async function ContactPage({ locale = "pt" }: { locale?: SiteLocale }) {
  const c = await getPageContent<ContactContent>("contato", locale);

  return (
    <>
      <SiteNav />

      <main className={styles.page}>
        <Section className={styles.opening} aria-labelledby="contact-title">
          <div className={styles.copy}>
            <Kicker>{c.kicker}</Kicker>
            <SplitHeading as="h1" size="display" id="contact-title" title={c.title} continuation={c.continuation} />
            <p className={styles.intro}>{c.intro}</p>
            <PillLink href={`mailto:${c.email}`}>{c.emailButton}</PillLink>
          </div>
          {/* On desktop the channels sit on a phone screen, as a contact card. */}
          <div className={styles.device}>
            <div className={styles.screen}>
              <div className={styles.statusBar} aria-hidden="true"><span>9:41</span><span className={styles.island} /><span className={styles.signal}><i /><i /><i /><i /></span></div>
              <div className={styles.card} aria-hidden="true">
                <LogoMark variant="onDark" className={styles.avatar} />
                <p>{c.cardName}</p>
              </div>
              <dl className={styles.channels}>
                {c.channels.map((channel, i) => (
                  <div key={i}>
                    <dt>{channel.label}</dt>
                    <dd><a href={channel.href} {...(channel.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{channel.value} <span aria-hidden>↗</span></a></dd>
                  </div>
                ))}
                <div>
                  <dt>{c.locationLabel}</dt>
                  <dd>{c.location}</dd>
                </div>
              </dl>
            </div>
          </div>
        </Section>

      </main>
    </>
  );
}

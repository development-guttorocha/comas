import Link from "next/link";
import type { CSSProperties } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { SplitHeading } from "@/components/guide";
import { getServiceContact, ServiceClosing, ServiceShell, shellStyles } from "@/components/servicos/ServiceShell";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { serviceList, type ServicesHubContent } from "@/lib/services";
import styles from "@/app/(pt)/servicos/hub.module.css";

/** `/servicos`: the three offers side by side, each in its own color, and one way to ask. */
export default async function ServicesHubPage({ hub }: { hub: ServicesHubContent }) {
  const contact = await getServiceContact(hub.closing);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: hub.navName,
    itemListElement: serviceList.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s.name, url: absoluteUrl(s.href) })),
    author: { "@id": `${absoluteUrl("/")}#person`, name: SITE_NAME },
  };

  return (
    <ServiceShell slug="" name={hub.navName} links={serviceList.map(s => ({ label: s.navName, href: s.href }))} accent={{ color: "#f8f8f5", on: "#0b0b0b" }} contact={contact} jsonLd={jsonLd}>
      <section className={styles.hero} aria-labelledby="hub-title">
        <p className={shellStyles.heroKicker}>{hub.hero.kicker}</p>
        <SplitHeading as="h1" size="display" id="hub-title" title={hub.hero.title} continuation={hub.hero.continuation} className={styles.title} />
        <p className={styles.intro}>{hub.hero.intro}</p>
      </section>

      <ul className={styles.cards}>
        {serviceList.map((s, i) => (
          <li key={s.slug}>
            <ScrollReveal delay={i * 0.08} className={styles.cardWrap}>
              <Link href={s.href} className={styles.card} style={{ "--card-accent": s.accent.color, "--card-on": s.accent.on } as CSSProperties} data-cta={`hub-${s.slug}`}>
                <span className={styles.cardNum} aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <h2>{s.name}</h2>
                <p>{s.card.summary}</p>
                <ul>{s.card.points.map(p => <li key={p}>{p}</li>)}</ul>
                <span className={styles.cardCta}>{hub.cardCta}<span aria-hidden="true">→</span></span>
              </Link>
            </ScrollReveal>
          </li>
        ))}
      </ul>

      <ServiceClosing title={hub.closing.title} body={hub.closing.body} whatsappCta={hub.closing.whatsappCta} contact={contact}
        service={hub.navName} page="/servicos" options={{ label: hub.form.serviceLabel, items: serviceList.map(s => s.name) }} />
    </ServiceShell>
  );
}

import ConsultingPlanner from "@/components/recursos/ConsultingPlanner";
import { getServiceContact, ServiceFaq, ServiceHeading, ServiceMarquee, ServiceShell, shellStyles } from "@/components/servicos/ServiceShell";
import ScrollReveal from "@/components/ScrollReveal";
import { voices } from "@/lib/leadership";
import { resourceBreadcrumb, resourcesFamily, type CareerConsultingContent } from "@/lib/resources";
import { absoluteUrl } from "@/lib/seo";
import { servicesHub } from "@/lib/services";
import styles from "@/app/(pt)/recursos/consultoria.module.css";

/**
 * Consultoria de carreira: a closed project, sold by a landing page with one action, the free
 * 30-minute call. The argument: a designer stuck on a career problem doesn't need more advice,
 * they need a decision and a plan. Every section ends at that call; there are no exits midway.
 */
export default async function CareerConsultingPage({ page: s }: { page: CareerConsultingContent }) {
  const contact = await getServiceContact(s.closing);
  const url = absoluteUrl(`/recursos/${s.slug}`);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${url}#service`,
      name: s.serviceName,
      serviceType: s.serviceType,
      description: s.seoDescription,
      url,
      inLanguage: "pt-BR",
      provider: { "@id": `${absoluteUrl("/")}#person` },
      audience: { "@type": "Audience", audienceType: "Designers de produto" },
    },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: s.faq.items.map(q => ({ "@type": "Question", name: q.question, acceptedAnswer: { "@type": "Answer", text: q.answer } })) },
    resourceBreadcrumb(s.serviceName, s.slug),
  ];

  return (
    <ServiceShell slug={s.slug} family={resourcesFamily} name={s.navName} links={s.nav} navCta={{ label: "Agendar", href: "#agendar" }} accent={s.accent} contact={contact} jsonLd={jsonLd}>
      <ConsultingPlanner copy={s} calendly={servicesHub.calendlyUrl} page={`/recursos/${s.slug}`} contact={contact}
        afterHero={<ServiceMarquee label={s.logosLabel} items={s.logos} />}
        afterBook={<ServiceFaq kicker={s.faq.kicker} title={s.faq.title} items={s.faq.items} />}>
        {/* ─── Who conducts it: the same ladder the visitor is climbing, and the other side of the table ─── */}
        <section id="quem-conduz" className={shellStyles.section} aria-labelledby="about-title">
          <div className={styles.about}>
            <div>
              <ServiceHeading id="about-title" kicker={s.about.kicker} title={s.about.title} continuation={s.about.continuation} />
              <p className={styles.aboutBody}>{s.about.body}</p>
              <p className={styles.sideLabel}>{s.about.sideLabel}</p>
              <ul className={styles.side}>{s.about.side.map(x => <li key={x}>{x}</li>)}</ul>
            </div>
            <div className={styles.ladder}>
              <p className={styles.sideLabel}>{s.about.ladderLabel}</p>
              <ol>
                {s.about.ladder.map((x, i) => (
                  <li key={x.year} data-now={i === 0 || undefined}>
                    <span>{x.year}</span>
                    <div><strong>{x.role}</strong><small>{x.where}</small></div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ─── People Gutto led, in their words ─── */}
        <section id="quem-diz" className={shellStyles.section} aria-labelledby="voices-title">
          <ServiceHeading id="voices-title" kicker={s.voices.kicker} title={s.voices.title} continuation={s.voices.continuation} />
          <div className={styles.voices}>
            {voices.slice(0, 3).map((v, i) => (
              <ScrollReveal key={v.quote} delay={i * 0.08} className={styles.voice}>
                <blockquote>“{v.quote.replace(/^…/, "")}”</blockquote>
                <p><strong>{v.position}</strong>{v.context}</p>
              </ScrollReveal>
            ))}
          </div>
          <a href="#agendar" className={styles.cta} data-cta="consultoria-depoimentos">{s.voices.cta} →</a>
        </section>
      </ConsultingPlanner>
    </ServiceShell>
  );
}

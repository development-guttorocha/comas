import Link from "next/link";
import type { CSSProperties } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import { Kicker, PillLink, SplitHeading } from "@/components/guide";
import AiDemo from "@/components/servicos/AiDemo";
import { getServiceContact, ServiceButton, ServiceClosing, ServiceFaq, ServiceFormats, ServiceHeading, ServiceMarquee, ServiceShell, shellStyles } from "@/components/servicos/ServiceShell";
import { serviceJsonLd, servicesHub, type AiPrototypingContent } from "@/lib/services";
import styles from "@/app/(pt)/servicos/prototipagem-ia.module.css";

/**
 * Prototipagem com IA: a prompt being typed in the hero, a live before/after of the same
 * request, the method as a rules file, formats, and the next services in the funnel.
 * Copy comes from `content/services/prototipagem-com-ia.json`; the frame from `ServiceShell`.
 */
export default async function AiPrototypingPage({ service: s }: { service: AiPrototypingContent }) {
  const contact = await getServiceContact(s.closing);

  return (
    <ServiceShell slug={s.slug} name={s.navName} links={s.nav} accent={s.accent} contact={contact} jsonLd={serviceJsonLd({ ...s, offers: s.formats.items })}>
      <div className={styles.page}>
        {/* ─── Hero: a prompt being typed ─── */}
        <section className={styles.hero} aria-labelledby="ai-title">
          <div className={styles.orb} aria-hidden="true" />
          <p className={shellStyles.heroKicker}>{s.hero.kicker}</p>
          <SplitHeading as="h1" size="display" id="ai-title" title={s.hero.title} continuation={s.hero.continuation} className={styles.heroTitle} />

          <a href="#demo" className={styles.promptBar} aria-label={s.hero.secondaryCta}>
            <span className={styles.promptSpark} aria-hidden="true">✦</span>
            <span className={styles.typed} style={{ "--chars": s.hero.prompt.length } as CSSProperties} aria-hidden="true">{s.hero.prompt}</span>
            <span className={styles.promptGo} aria-hidden="true">{s.hero.promptButton} ↵</span>
          </a>
          <div aria-hidden="true">
            {s.hero.fragments.map((f, i) => <span key={f} className={styles.fragment} data-i={i}>{f}</span>)}
          </div>

          <p className={styles.heroIntro}>{s.hero.intro}</p>
          <div className={`${shellStyles.ctaRow} ${styles.heroCtas}`}>
            <ServiceButton href="#contato" cta="hero-contato">{s.hero.primaryCta}</ServiceButton>
            <ServiceButton href="#demo" variant="ghost" arrow="↓">{s.hero.secondaryCta}</ServiceButton>
          </div>
        </section>

        <ServiceMarquee label={s.tools.label} items={s.tools.items} />

        {/* ─── Demo: the page's light band ─── */}
        <section id="demo" className={shellStyles.band} aria-labelledby="demo-title">
          <div>
            <ServiceHeading id="demo-title" kicker={s.demo.kicker} title={s.demo.title} continuation={s.demo.continuation} />
            <AiDemo copy={s.demo} />
          </div>
        </section>

        {/* ─── Pra quem é ─── */}
        <section id="pra-quem" className={shellStyles.section} aria-labelledby="aud-title">
          <ServiceHeading id="aud-title" kicker={s.audience.kicker} title={s.audience.title} continuation={s.audience.continuation} />
          <ul className={styles.audience}>
            {s.audience.items.map((a, i) => (
              <li key={a.title}>
                <ScrollReveal delay={i * 0.06}>
                  <span aria-hidden="true">✦</span>
                  <h3>{a.title}</h3>
                  <p>{a.description}</p>
                </ScrollReveal>
              </li>
            ))}
          </ul>
        </section>

        {/* ─── Método: a rules file ─── */}
        <section id="metodo" className={shellStyles.section} aria-labelledby="method-title">
          <ServiceHeading id="method-title" kicker={s.method.kicker} title={s.method.title} continuation={s.method.continuation} />
          <ScrollReveal className={styles.editor}>
            <div className={styles.editorBar} aria-hidden="true"><i /><i /><i /><span>{s.method.file}</span></div>
            <ol className={styles.rules}>
              <li className={styles.ruleComment} aria-hidden="true"># Regras do time para prototipar com IA</li>
              {s.method.rules.map(r => (
                <li key={r.title}><strong>{r.title}</strong><span>: {r.detail}</span></li>
              ))}
            </ol>
          </ScrollReveal>
        </section>

        <ServiceFormats kicker={s.formats.kicker} title={s.formats.title} continuation={s.formats.continuation} items={s.formats.items} featured={0} />

        {/* ─── Quem conduz ─── */}
        <section className={`${shellStyles.section} ${styles.guide}`} aria-labelledby="guide-title">
          <img src="/curriculo/gutto.webp" alt="Gutto Rocha" width={900} height={900} loading="lazy" className={styles.guidePhoto} />
          <div>
            <Kicker>{s.guide.kicker}</Kicker>
            <h2 id="guide-title" className={styles.guideName}>{s.guide.name}</h2>
            <p className={styles.guideBody}>{s.guide.body}</p>
            <PillLink href={s.guide.href} arrow="→">{s.guide.cta}</PillLink>
          </div>
        </section>

        {/* ─── Próximos serviços ─── */}
        <section className={shellStyles.section} aria-labelledby="next-title">
          <Kicker as="h2"><span id="next-title">{s.next.kicker}</span></Kicker>
          <div className={styles.next}>
            {s.next.items.map(n => (
              <Link key={n.href} href={n.href} className={styles.nextCard}>
                <h3>{n.title}</h3>
                <p>{n.description}</p>
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </section>

        <ServiceFaq kicker={s.faq.kicker} title={s.faq.title} items={s.faq.items} />
        <ServiceClosing title={s.closing.title} body={s.closing.body} whatsappCta={s.closing.whatsappCta} contact={contact}
          service={s.serviceName} page={`/servicos/${s.slug}`} options={{ label: servicesHub.form.formatLabel, items: s.formats.items.map(f => f.title) }} />
      </div>
    </ServiceShell>
  );
}

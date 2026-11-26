import ScrollReveal from "@/components/ScrollReveal";
import { SplitHeading } from "@/components/guide";
import ServiceHeroArt from "@/components/servicos/ServiceHeroArt";
import { getServiceContact, ServiceButton, ServiceCases, ServiceClosing, ServiceFaq, ServiceFormats, ServiceHeading, ServiceMarquee, ServiceShell, shellStyles } from "@/components/servicos/ServiceShell";
import { getCaseDataSource } from "@/lib/caseContent";
import { designersLed, impact, voices } from "@/lib/leadership";
import { serviceJsonLd, servicesHub, type ServiceContent } from "@/lib/services";
import styles from "@/app/(pt)/servicos/servicos.module.css";

/**
 * Head de Design as a service: the offer, who it is for, formats, proof and a way to talk.
 * Copy comes from `content/services/head-de-design.json`; the frame from `ServiceShell`.
 */
export default async function ServicePage({ service: s }: { service: ServiceContent }) {
  const [contact, { cases }] = await Promise.all([getServiceContact(s.closing), getCaseDataSource()]);
  const proofCases = s.proof.cases.map(slug => cases.find(c => c.slug === slug)).filter(c => c !== undefined);
  const numbers = [
    { value: "18", label: "anos fazendo design" },
    { value: String(designersLed), label: "designers liderados" },
    ...impact.slice(0, 2).map(i => ({ value: i.value, label: `${i.label} (${i.company})` })),
  ];

  return (
    <ServiceShell slug={s.slug} name={s.navName} links={s.nav} accent={s.accent} contact={contact} jsonLd={serviceJsonLd({ ...s, offers: s.formats.items })}>
      {/* ─── Hero ─── */}
      <section className={styles.hero} aria-labelledby="service-title">
        <div className={styles.heroCopy}>
          <p className={shellStyles.heroKicker}>{s.hero.kicker}</p>
          <SplitHeading as="h1" size="display" id="service-title" title={s.hero.title} continuation={s.hero.continuation} className={styles.heroTitle} />
          <p className={styles.heroIntro}>{s.hero.intro}</p>
          <div className={shellStyles.ctaRow}>
            <ServiceButton href="#contato" cta="hero-contato">{s.hero.primaryCta}</ServiceButton>
            <ServiceButton href="#formatos" variant="ghost" arrow="↓">{s.hero.secondaryCta}</ServiceButton>
          </div>
          <ul className={styles.heroProof}>{s.hero.proof.map(p => <li key={p}>{p}</li>)}</ul>
        </div>
        <ServiceHeroArt />
      </section>

      <ServiceMarquee label={s.logosLabel} items={s.logos} />

      {/* ─── Pra quem é ─── */}
      <section id="pra-quem" className={shellStyles.section} aria-labelledby="signs-title">
        <ServiceHeading id="signs-title" kicker={s.signs.kicker} title={s.signs.title} continuation={s.signs.continuation} />
        <ol className={styles.signs}>
          {s.signs.items.map((item, i) => (
            <li key={item}>
              <ScrollReveal delay={(i % 3) * 0.06}><span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>{item}</ScrollReveal>
            </li>
          ))}
        </ol>
      </section>

      {/* ─── O que eu faço ─── */}
      <section id="o-que-faco" className={shellStyles.section} aria-labelledby="pillars-title">
        <ServiceHeading id="pillars-title" kicker={s.pillars.kicker} title={s.pillars.title} continuation={s.pillars.continuation} />
        <div className={styles.pillars}>
          {s.pillars.items.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 0.08} className={styles.pillar}>
              <h3>{p.title}</h3>
              <p>{p.summary}</p>
              <ul>{p.points.map(point => <li key={point}>{point}</li>)}</ul>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ─── Como funciona: the page's light band ─── */}
      <section className={shellStyles.band} aria-labelledby="steps-title">
        <div>
          <ServiceHeading id="steps-title" kicker={s.steps.kicker} title={s.steps.title} continuation={s.steps.continuation} />
          <ol className={styles.steps}>
            {s.steps.items.map((step, i) => (
              <li key={step.title}>
                <ScrollReveal delay={i * 0.08}>
                  <span className={styles.stepNum} aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </ScrollReveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ServiceFormats kicker={s.formats.kicker} title={s.formats.title} continuation={s.formats.continuation} items={s.formats.items} featured={1} />

      {/* ─── Resultados ─── */}
      <ServiceCases kicker={s.proof.kicker} title={s.proof.title} continuation={s.proof.continuation} cases={proofCases} cta={s.proof.casesCta}>
        <dl className={styles.numbers}>
          {numbers.map(n => <div key={n.label}><dt>{n.value}</dt><dd>{n.label}</dd></div>)}
        </dl>
      </ServiceCases>

      {/* ─── Depoimentos ─── */}
      <section className={shellStyles.section} aria-labelledby="voices-title">
        <ServiceHeading id="voices-title" kicker={s.voices.kicker} title={s.voices.title} />
        <div className={styles.voices}>
          {voices.map((v, i) => (
            <ScrollReveal key={v.quote} delay={i * 0.08} className={styles.voice}>
              <blockquote>“{v.quote}”</blockquote>
              <p><strong>{v.position}</strong>{v.context}</p>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ─── Comparativo ─── */}
      <section className={shellStyles.section} aria-labelledby="compare-title">
        <ServiceHeading id="compare-title" kicker={s.comparison.kicker} title={s.comparison.title} continuation={s.comparison.continuation} />
        <div className={styles.compareWrap}>
          <table className={styles.compare}>
            <thead>
              <tr><td />{s.comparison.columns.map((col, i) => <th key={col} scope="col" data-ours={i === s.comparison.columns.length - 1 || undefined}>{col}</th>)}</tr>
            </thead>
            <tbody>
              {s.comparison.rows.map(row => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((v, i) => <td key={i} data-ours={i === row.values.length - 1 || undefined}>{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ServiceFaq kicker={s.faq.kicker} title={s.faq.title} items={s.faq.items} />
      <ServiceClosing title={s.closing.title} body={s.closing.body} whatsappCta={s.closing.whatsappCta} contact={contact}
        service={s.serviceName} page={`/servicos/${s.slug}`} options={{ label: servicesHub.form.formatLabel, items: s.formats.items.map(f => f.title) }} />
    </ServiceShell>
  );
}

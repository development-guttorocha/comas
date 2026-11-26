import ScrollReveal from "@/components/ScrollReveal";
import { Kicker, SplitHeading } from "@/components/guide";
import TokenPlayground from "@/components/servicos/TokenPlayground";
import { getServiceContact, ServiceButton, ServiceCases, ServiceClosing, ServiceFaq, ServiceHeading, ServiceShell, shellStyles } from "@/components/servicos/ServiceShell";
import { getCaseDataSource } from "@/lib/caseContent";
import { serviceJsonLd, servicesHub, type DesignSystemContent } from "@/lib/services";
import styles from "@/app/(pt)/servicos/design-system.module.css";

const LAYER_ICONS: Record<string, string> = { frame: "#", group: "▢", rect: "□", text: "T", component: "◆", token: "◉" };
const CURSOR_TONES = ["blue", "purple", "pink"];

/**
 * Design System no Figma: a Figma canvas for a hero, crossing tapes of familiar pain,
 * before/after layer panels and a live token playground. Copy comes from
 * `content/services/design-system-figma.json`; the frame from `ServiceShell`.
 */
export default async function DesignSystemPage({ service: s }: { service: DesignSystemContent }) {
  const [contact, { cases }] = await Promise.all([getServiceContact(s.closing), getCaseDataSource()]);
  const proofCases = s.proof.cases.map(slug => cases.find(c => c.slug === slug)).filter(c => c !== undefined);
  const tape = [...s.marquee, ...s.marquee];

  return (
    <ServiceShell slug={s.slug} name={s.navName} links={s.nav} accent={s.accent} contact={contact} jsonLd={serviceJsonLd(s)}>
      <div className={styles.page}>
        {/* ─── Hero: a Figma canvas ─── */}
        <section className={styles.canvas} aria-labelledby="ds-title">
          <div className={styles.canvasInner}>
            <p className={styles.frameLabel} aria-hidden="true"># {s.hero.frameLabel}</p>
            <Kicker className={styles.heroKicker}>{s.hero.kicker}</Kicker>
            <h1 id="ds-title" className={styles.heroTitle}>
              <span className={styles.selection}>
                {s.hero.titleStart}
                <i className={styles.handle} data-pos="tl" /><i className={styles.handle} data-pos="tr" />
                <i className={styles.handle} data-pos="bl" /><i className={styles.handle} data-pos="br" />
                <span className={styles.dimension} aria-hidden="true">Fill × Hug</span>
              </span>{" "}
              {s.hero.titleMiddle}{" "}
              <span className={styles.titleComponent}>
                <span className={styles.componentLabel} aria-hidden="true">◆ {s.hero.componentLabel}</span>
                {s.hero.titleComponent}
              </span>
            </h1>
            <div className={styles.heroBottom}>
              <p className={styles.heroIntro}>{s.hero.intro}</p>
              <div className={shellStyles.ctaRow}>
                <ServiceButton href="#contato" variant="ink" cta="hero-contato">{s.hero.primaryCta}</ServiceButton>
                <ServiceButton href="#playground" variant="ghostInk" arrow="↓">{s.hero.secondaryCta}</ServiceButton>
              </div>
            </div>
            <p className={styles.sticky} aria-hidden="true">{s.hero.sticky}</p>
            {s.hero.cursors.map((name, i) => (
              <span key={name} className={styles.cursor} data-tone={CURSOR_TONES[i % CURSOR_TONES.length]} data-i={i} aria-hidden="true">
                <svg viewBox="0 0 16 20" width="16" height="20"><path d="M1 1l14 8.5-6.2 1.6L6 19z" fill="currentColor" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" /></svg>
                <b>{name}</b>
              </span>
            ))}
          </div>
        </section>

        {/* ─── Crossing tapes ─── */}
        <div className={styles.tapes} aria-label="Problemas comuns">
          <div className={styles.tape} data-tone="purple" aria-hidden="true">
            <div>{tape.map((t, i) => <span key={i}>{t}<i>✕</i></span>)}</div>
          </div>
          <div className={styles.tape} data-tone="lime">
            <ul>{tape.map((t, i) => <li key={i} aria-hidden={i >= s.marquee.length || undefined}>{t}<i aria-hidden="true">✕</i></li>)}</ul>
          </div>
        </div>

        {/* ─── Antes e depois ─── */}
        <section id="antes-depois" className={shellStyles.section} aria-labelledby="ba-title">
          <ServiceHeading id="ba-title" kicker={s.beforeAfter.kicker} title={s.beforeAfter.title} continuation={s.beforeAfter.continuation} />
          <div className={styles.beforeAfter}>
            {[s.beforeAfter.before, s.beforeAfter.after].map((side, i) => (
              <ScrollReveal key={side.label} delay={i * 0.1} className={styles.layersCol}>
                <div className={styles.layers} data-side={i === 0 ? "before" : "after"}>
                  <div className={styles.layersHead}><span>Layers</span><span>{side.label}</span></div>
                  <ul>
                    {side.layers.map(l => (
                      <li key={l.name} data-type={l.type}>
                        <span className={styles.layerIcon} aria-hidden="true">{LAYER_ICONS[l.type]}</span>
                        {l.name}
                        {"flag" in l ? <em>{String(l.flag)}</em> : null}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className={styles.layersCaption}>{side.caption}</p>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* ─── Playground: the page's light band ─── */}
        <section id="playground" className={shellStyles.band} aria-labelledby="pg-title">
          <div>
            <ScrollReveal className={styles.pgHead}>
              <div>
                <Kicker>{s.playground.kicker}</Kicker>
                <SplitHeading id="pg-title" title={s.playground.title} continuation={s.playground.continuation} />
              </div>
              <p>{s.playground.hint}</p>
            </ScrollReveal>
            <TokenPlayground copy={s.playground} />
          </div>
        </section>

        {/* ─── Entregáveis ─── */}
        <section id="entregaveis" className={shellStyles.section} aria-labelledby="dl-title">
          <ServiceHeading id="dl-title" kicker={s.deliverables.kicker} title={s.deliverables.title} continuation={s.deliverables.continuation} />
          <ol className={styles.deliverables}>
            {s.deliverables.items.map((d, i) => (
              <li key={d.title}>
                <ScrollReveal delay={(i % 3) * 0.07}>
                  <span className={styles.bigNum} aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{d.title}</h3>
                  <p>{d.description}</p>
                </ScrollReveal>
              </li>
            ))}
          </ol>
        </section>

        {/* ─── Processo ─── */}
        <section id="processo" className={shellStyles.section} aria-labelledby="pr-title">
          <ServiceHeading id="pr-title" kicker={s.process.kicker} title={s.process.title} continuation={s.process.continuation} />
          <ol className={styles.timeline}>
            {s.process.items.map((step, i) => (
              <li key={step.title}>
                <ScrollReveal delay={i * 0.08}>
                  <span className={styles.when}>{step.when}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </ScrollReveal>
              </li>
            ))}
          </ol>
          <p className={styles.processNote}>{s.process.note}</p>
          <ScrollReveal className={styles.partners}>
            <div className={styles.partnersAvatars} aria-hidden="true"><span>G</span><span>+</span><span>+</span></div>
            <div className={styles.partnersCopy}>
              <p className={styles.partnersLabel}>{s.partners.label}</p>
              <h3>{s.partners.title}</h3>
              <p>{s.partners.body}</p>
            </div>
            <ServiceButton href="#contato" variant="ink" cta="parceiros-prazo">{s.partners.cta}</ServiceButton>
          </ScrollReveal>
        </section>

        <ServiceCases kicker={s.proof.kicker} title={s.proof.title} continuation={s.proof.continuation} cases={proofCases} cta={s.proof.casesCta} />
        <ServiceFaq kicker={s.faq.kicker} title={s.faq.title} items={s.faq.items} />
        <ServiceClosing
          title={s.closing.title} body={s.closing.body} whatsappCta={s.closing.whatsappCta} contact={contact}
          service={s.serviceName} page={`/servicos/${s.slug}`} options={{ label: servicesHub.form.formatLabel, items: s.offers.map(o => o.title) }}
          related={{ text: s.closing.related, label: s.closing.relatedCta, href: s.closing.relatedHref }}
        />
      </div>
    </ServiceShell>
  );
}

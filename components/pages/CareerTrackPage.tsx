import type { CSSProperties } from "react";
import { SplitHeading } from "@/components/guide";
import ScrollReveal from "@/components/ScrollReveal";
import CareerFlow from "@/components/recursos/CareerFlow";
import FloatingGate from "@/components/recursos/FloatingGate";
import MaterialGate from "@/components/recursos/MaterialGate";
import MaterialPreview from "@/components/recursos/MaterialPreview";
import TrackExplorer from "@/components/recursos/TrackExplorer";
import { getServiceContact, ServiceFaq, ServiceHeading, ServiceShell, shellStyles } from "@/components/servicos/ServiceShell";
import { careerConsulting, getResourceHref, resourceBreadcrumb, resourcesFamily, type CareerTrackContent } from "@/lib/resources";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import styles from "@/app/(pt)/recursos/trilha.module.css";

/**
 * Trilha de carreira. The argument: designers draw journeys for users and leave their own to
 * chance. The page draws a career the way they draw a user flow (roles as nodes, labeled arrows
 * going every way), lets the visitor find themselves in it, and asks for the e-mail where the
 * locked roles begin.
 */
export default async function CareerTrackPage({ page: s }: { page: CareerTrackContent }) {
  const contact = await getServiceContact(s.closing);
  const m = s.material;
  const href = getResourceHref(s.slug);
  const gate = (id: string) => <MaterialGate id={id} copy={s.gate} material={s.serviceName} page={href} href={`${href}/completa`} consultingHref={getResourceHref(careerConsulting.slug)} />;
  const doubts = [...s.doubts, ...s.doubts];
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      name: m.title,
      description: s.seoDescription,
      url: absoluteUrl(href),
      inLanguage: "pt-BR",
      isAccessibleForFree: true,
      learningResourceType: "Template",
      audience: { "@type": "Audience", audienceType: "Designers de produto" },
      author: { "@id": `${absoluteUrl("/")}#person`, name: SITE_NAME },
    },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: s.faq.items.map(q => ({ "@type": "Question", name: q.question, acceptedAnswer: { "@type": "Answer", text: q.answer } })) },
    resourceBreadcrumb(s.serviceName, s.slug),
  ];

  return (
    <ServiceShell slug={s.slug} family={resourcesFamily} name={s.navName} links={s.nav} navCta={{ label: s.hero.primaryCta, href: "#receber" }}
      accent={s.accent} contact={contact} jsonLd={jsonLd}>
      {/* ─── Hero: a full-screen board, the question over it, the career drawn as a flow ─── */}
      <section id="inicio" className={styles.hero} aria-labelledby="track-title">
        <div className={styles.canvas}>
          <span className={styles.boardTab} aria-hidden="true">◇ Fluxo / Carreira em design</span>
          <div className={styles.heroCopy}>
            <p className={shellStyles.heroKicker}>{s.hero.kicker}</p>
            <SplitHeading as="h1" size="display" id="track-title" title={s.hero.title} continuation={s.hero.continuation} className={styles.title} />
            <p className={styles.intro}>{s.hero.intro}</p>
            <div id="receber">
              <FloatingGate inline title={s.gate.title} body={s.gate.body} pill={s.hero.primaryCta} hideWhen="fim" openWhile="inicio">{gate("form-topo")}</FloatingGate>
            </div>
          </div>
          <div className={styles.heroFlow}>
            <CareerFlow flow={s.flow} mode="hero" youLabel={s.hero.you} label="Uma carreira em design desenhada como fluxo: papéis ligados por caminhos em várias direções" />
          </div>
        </div>
      </section>

      <FloatingGate title={s.gate.title} body={s.gate.body} pill={s.hero.primaryCta} hideWhen="fim" openWhile="inicio">{gate("form-flutuante")}</FloatingGate>

      {/* ─── The doubts, as notes passing by ─── */}
      <div className={styles.doubts}>
        <p>{s.doubtsLabel}</p>
        <ul className={styles.srOnly}>{s.doubts.map(d => <li key={d}>{d}</li>)}</ul>
        <div className={styles.doubtsTrack} aria-hidden="true">
          {doubts.map((d, i) => <span key={i} style={{ "--tilt": `${((i * 7) % 5) - 2}deg` } as CSSProperties}>{d}</span>)}
        </div>
      </div>

      {/* ─── Demonstration: find yourself in the flow ─── */}
      <section id="onde-voce-esta" className={shellStyles.section} aria-labelledby="explorer-title">
        <div className={styles.explorerHead}>
          <ServiceHeading id="explorer-title" kicker={s.explorer.kicker} title={s.explorer.title} continuation={s.explorer.continuation} />
          <p>{s.explorer.hint}</p>
        </div>
        <TrackExplorer content={s} gateHref="#receber" />
      </section>

      {/* ─── The point of view ─── */}
      <section id="escada" className={shellStyles.section} aria-label={s.manifesto.kicker}>
        <p className={styles.manifestoKicker}>{s.manifesto.kicker}</p>
        <ol className={styles.manifesto}>
          {s.manifesto.items.map((x, i) => (
            <li key={x.title}><ScrollReveal delay={i * 0.08}><h2>{x.title}</h2><p>{x.body}</p></ScrollReveal></li>
          ))}
        </ol>
      </section>

      {/* ─── What arrives: the printed track and how to use it ─── */}
      <section id="o-que-recebe" className={`${shellStyles.section} ${styles.receive}`} aria-labelledby="receive-title">
        <div>
          <ServiceHeading id="receive-title" kicker={s.receive.kicker} title={s.receive.title} continuation={s.receive.continuation} />
          <ol className={styles.steps}>{s.receive.steps.map((x, i) => <li key={x}><span>{i + 1}</span>{x}</li>)}</ol>
          <p className={styles.receiveNote}>{s.receive.note}</p>
        </div>
        <MaterialPreview material={m} />
      </section>

      <ServiceFaq kicker={s.faq.kicker} title={s.faq.title} items={s.faq.items} />

      <section id="fim" className={shellStyles.closing} aria-labelledby="fim-title">
        <div className={shellStyles.closingCopy}>
          <h2 id="fim-title">{s.closingGate.title}</h2>
          <p>{s.closingGate.body}</p>
        </div>
        <div className={shellStyles.closingForm}>{gate("form-fim")}</div>
      </section>
    </ServiceShell>
  );
}

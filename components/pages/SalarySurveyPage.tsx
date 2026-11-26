import { SplitHeading } from "@/components/guide";
import SalarySurveyFlow from "@/components/recursos/SalarySurveyFlow";
import SurveyResults from "@/components/recursos/SurveyResults";
import { getServiceContact, ServiceFaq, ServiceHeading, ServiceShell, shellStyles } from "@/components/servicos/ServiceShell";
import { getResourceHref, resourceBreadcrumb, resourcesFamily, salaryGuide, type SalarySurveyContent } from "@/lib/resources";
import { getLiveSalaryBands } from "@/lib/salaryBandsServer";
import { getLiveSurveyResults } from "@/lib/salarySurveyResultsServer";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import shared from "@/app/(pt)/recursos/recursos.module.css";
import styles from "@/app/(pt)/recursos/survey.module.css";

/**
 * The salary survey: someone arrived from a colleague's link. What stops them is distrust, so the
 * page shows the exact record that will be sent, with no line for a name or a company, and the
 * first question is already on it. Then what happens to the answer, and live aggregated cuts.
 */
export default async function SalarySurveyPage({ page: s }: { page: SalarySurveyContent }) {
  const [contact, liveBands, liveResults] = await Promise.all([
    getServiceContact({ emailSubject: "Pesquisa salarial", whatsappMessage: "Oi, Gutto! Vi a pesquisa salarial e queria conversar." }),
    getLiveSalaryBands(),
    getLiveSurveyResults(),
  ]);
  const guideHref = getResourceHref(salaryGuide.slug);
  const heroKicker = liveResults.totalApproved > 0
    ? `${s.hero.kicker} · ${liveResults.totalApproved} ${liveResults.totalApproved === 1 ? "resposta aprovada" : "respostas aprovadas"}`
    : s.hero.kicker;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: s.serviceName,
      description: s.seoDescription,
      url: absoluteUrl(getResourceHref(s.slug)),
      inLanguage: "pt-BR",
      author: { "@id": `${absoluteUrl("/")}#person`, name: SITE_NAME },
    },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: s.faq.items.map(q => ({ "@type": "Question", name: q.question, acceptedAnswer: { "@type": "Answer", text: q.answer } })) },
    resourceBreadcrumb(s.serviceName, s.slug),
  ];

  return (
    <ServiceShell slug={s.slug} family={resourcesFamily} name={s.navName} links={[{ label: "Como é anônima", href: "#anonima" }, { label: "Resultados", href: "#resultados" }, { label: "FAQ", href: "#faq" }]}
      navCta={{ label: "Responder", href: "#responder" }} accent={s.accent} contact={contact} jsonLd={jsonLd} className={shared.page}>
      <SalarySurveyFlow content={s} guideHref={guideHref} showBands={liveBands.reviewed || process.env.NODE_ENV !== "production"} bandsData={liveBands}
        heading={<>
          <p className={shellStyles.heroKicker}>{heroKicker}</p>
          <SplitHeading as="h1" size="display" id="survey-title" title={s.hero.title} continuation={s.hero.continuation} className={styles.title} />
          <p className={styles.intro}>{s.hero.intro}</p>
        </>} />

      {/* ─── What happens to the answer ─── */}
      <section id="anonima" className={shellStyles.section} aria-labelledby="journey-title">
        <ServiceHeading id="journey-title" kicker={s.journey.kicker} title={s.journey.title} continuation={s.journey.continuation} />
        <ol className={styles.journey}>
          {s.journey.steps.map((x, i) => (
            <li key={x.title}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{x.title}</h3>
              <p>{x.body.replace("{min}", String(s.results.minGroup))}</p>
            </li>
          ))}
        </ol>
      </section>

      <SurveyResults content={s} results={liveResults} guideHref={guideHref} />

      <ServiceFaq kicker={s.faq.kicker} title={s.faq.title} items={s.faq.items} />
    </ServiceShell>
  );
}

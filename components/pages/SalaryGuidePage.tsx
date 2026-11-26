import Link from "next/link";
import { SplitHeading } from "@/components/guide";
import SalaryStage from "@/components/recursos/SalaryStage";
import { getServiceContact, ServiceFaq, ServiceShell, shellStyles } from "@/components/servicos/ServiceShell";
import { getArticleHref, getArticles } from "@/lib/articles";
import { careerConsulting, careerTrack, getResourceHref, resourceBreadcrumb, resourcesFamily, salarySurvey, type SalaryGuideContent } from "@/lib/resources";
import { getLiveSalaryBands } from "@/lib/salaryBandsServer";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import shared from "@/app/(pt)/recursos/recursos.module.css";
import styles from "@/app/(pt)/recursos/salario.module.css";

const ARTICLE_SLUG = "salario-em-design-como-funciona";

/**
 * Salário. The goal: a designer finds out whether they earn what they should and what to do about
 * it. One question on the first screen; the answer puts them next to one of three designers on a
 * ruler, and the rest of the page is the step that answer calls for. The long explanation lives in
 * an article; the survey is how the numbers get better.
 */
export default async function SalaryGuidePage({ page: s }: { page: SalaryGuideContent }) {
  const contact = await getServiceContact({ emailSubject: "Salário em design", whatsappMessage: "Oi, Gutto! Vi a régua de salários e queria conversar." });
  const surveyHref = getResourceHref(salarySurvey.slug);
  const dev = process.env.NODE_ENV !== "production";
  const liveBands = await getLiveSalaryBands();
  // Unreviewed bands are a draft: shown on this machine to be checked, never on the live site.
  const bands = liveBands.reviewed || dev;
  const heroKicker = liveBands.hasLiveData
    ? `Salário em design · base + ${liveBands.totalApproved} respostas da pesquisa ${liveBands.edition}`
    : s.hero.kicker;
  const article = (await getArticles({ drafts: dev })).find(a => a.slug === ARTICLE_SLUG);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: s.serviceName,
      description: s.seoDescription,
      url: absoluteUrl(getResourceHref(s.slug)),
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      inLanguage: "pt-BR",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: 0, priceCurrency: "BRL" },
      author: { "@id": `${absoluteUrl("/")}#person`, name: SITE_NAME },
    },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: s.faq.items.map(q => ({ "@type": "Question", name: q.question, acceptedAnswer: { "@type": "Answer", text: q.answer } })) },
    resourceBreadcrumb(s.serviceName, s.slug),
  ];
  const links = bands ? s.nav : s.nav.filter(l => l.href !== "#faixas");

  return (
    <ServiceShell slug={s.slug} family={resourcesFamily} name={s.navName} links={links} navCta={{ label: s.navCta, href: surveyHref }}
      accent={s.accent} contact={contact} jsonLd={jsonLd} className={shared.page}>
      <SalaryStage
        copy={s}
        bands={bands}
        bandsData={liveBands}
        heading={<>
          <p className={shellStyles.heroKicker}>{heroKicker}</p>
          {bands
            ? <SplitHeading as="h1" size="display" id="salary-title" title={s.hero.title} continuation={s.hero.continuation} className={styles.title} />
            : <h1 id="salary-title" className={styles.title}>{s.hero.fallbackTitle}</h1>}
        </>}
        intro={s.hero.fallbackIntro}
        draft={bands && !liveBands.reviewed ? s.check.draft : undefined}
        hrefs={{ track: getResourceHref(careerTrack.slug), consulting: getResourceHref(careerConsulting.slug) }}
      />

      <section id="fonte" className={styles.section} aria-labelledby="fonte-title">
        <p className={styles.kicker}>{s.source.kicker}</p>
        <h2 id="fonte-title" className={styles.h2}>{s.source.title}</h2>
        <ol className={styles.source}>
          {s.source.items.map((x, i) => <li key={x.title}><span>{String(i + 1).padStart(2, "0")}</span><h3>{x.title}</h3><p>{x.body}</p></li>)}
        </ol>
        {liveBands.totalApproved > 0 ? (
          <p className={styles.tableNote}>
            {liveBands.hasLiveData
              ? `Hoje, ${liveBands.totalApproved} respostas aprovadas da pesquisa ${liveBands.edition} já calibram as faixas que atingiram ${liveBands.minGroup} participantes.`
              : `Já temos ${liveBands.totalApproved} ${liveBands.totalApproved === 1 ? "resposta aprovada" : "respostas aprovadas"} na pesquisa ${liveBands.edition}. Cada papel começa a atualizar a régua ao atingir ${liveBands.minGroup} respostas.`}
          </p>
        ) : null}
        <p className={styles.legalNote}>
          Os valores são estimativas informativas e não substituem aconselhamento trabalhista, contábil ou financeiro.{" "}
          <Link href="/termos-de-uso">Leia os termos de uso →</Link>
        </p>
        <Link href={surveyHref} className={styles.survey} data-cta="faixas-pesquisa">
          <span>{s.source.ctaBody}</span>
          <strong>{s.source.cta} →</strong>
        </Link>
      </section>

      <ServiceFaq kicker={s.faq.kicker} title={s.faq.title} items={s.faq.items} />

      {article ? (
        <section className={`${styles.section} ${styles.read}`} aria-label={s.article.kicker}>
          <Link href={getArticleHref(article.slug)} data-cta="faixas-artigo">
            <span>{s.article.kicker}</span>
            <strong>{article.title}</strong>
            <em>{s.article.cta} →</em>
          </Link>
        </section>
      ) : null}
    </ServiceShell>
  );
}

import Link from "next/link";
import { AdSlot } from "@/components/artigos/AdSlot";
import { accentVars, ArticleCard } from "@/components/artigos/ArticleParts";
import { ArticleFilter } from "@/components/artigos/ArticleFilter";
import CtaTracker from "@/components/servicos/CtaTracker";
import ServiceFooter from "@/components/servicos/ServiceFooter";
import ServiceNav from "@/components/servicos/ServiceNav";
import { getServiceContact } from "@/components/servicos/ServiceShell";
import { articleThemes, themeOffer, getArticleBody, getArticleHref, getArticles, readingMinutes, type ArticleTheme } from "@/lib/articles";
import { serializeJsonLd } from "@/lib/jsonLd";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";
import { contactHref } from "@/lib/leadOptions";
import { localAdminRequest } from "@/lib/translations/localAdmin";
import { readingSerif } from "@/app/(pt)/artigos/fonts";
import styles from "@/app/(pt)/artigos/artigos.module.css";
import shell from "@/app/(pt)/servicos/service-shell.module.css";

export const articlesHubCopy = {
  title: "Artigos sobre design, produto e liderança | Gutto Rocha",
  description: "Ensaios de Gutto Rocha sobre design de produto, design systems, liderança de design e IA no processo, com o que funciona na prática.",
};

/**
 * The articles' home: the newest one in front, the rest in a grid you can filter by theme,
 * and the themes as doors to the services. On this machine drafts show too, marked.
 */
export default async function ArticlesHubPage() {
  const localAdmin = await localAdminRequest();
  const list = await getArticles({ drafts: localAdmin });
  const minutes = new Map(await Promise.all(list.map(async a => [a.slug, readingMinutes(await getArticleBody(a.slug))] as const)));
  const [featured, ...rest] = list;
  const contact = await getServiceContact({ emailSubject: "Artigos", whatsappMessage: "Oi, Gutto! Li seus artigos e queria conversar." });
  const themes = (Object.keys(articleThemes) as ArticleTheme[])
    .map(key => ({ key, label: articleThemes[key].label, count: rest.filter(a => a.theme === key).length }))
    .filter(t => t.count > 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${absoluteUrl("/artigos")}#blog`,
    name: `Artigos | ${SITE_NAME}`,
    description: articlesHubCopy.description,
    url: absoluteUrl("/artigos"),
    inLanguage: "pt-BR",
    author: { "@id": `${SITE_URL}/#person` },
    blogPost: list.filter(a => !a.draft).map(a => ({ "@type": "BlogPosting", headline: a.title, url: absoluteUrl(getArticleHref(a.slug)), datePublished: a.publishedAt })),
  };

  return (
    <div className={`${shell.shell} ${styles.page} ${readingSerif.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <CtaTracker page="artigos" />
      <ServiceNav name="Artigos" links={[{ label: "Serviços", href: "/servicos" }, { label: "Recursos", href: "/recursos" }, { label: "Cases", href: "/cases" }]} cta={{ label: "Contato", href: contactHref("artigos") }} />

      <main id="topo">
        <header className={styles.hubHead}>
          <p className={styles.label}>Artigos</p>
          <h1>Design com opinião, para quem faz produto.</h1>
          <p>Ensaios sobre design de produto, design systems, liderança e IA no processo. O que aprendi em 18 anos, escrito para ser usado na próxima reunião.</p>
        </header>

        {featured ? (
          <section className={styles.hubFeatured} aria-label="Mais recente">
            <ArticleCard article={featured} minutes={minutes.get(featured.slug)} featured />
          </section>
        ) : null}

        {rest.length ? <section className={styles.hubList} aria-labelledby="todos-title">
          <div className={styles.moreHead}><h2 id="todos-title">Todos os artigos</h2></div>
          <ArticleFilter themes={themes} ad={<AdSlot format="inline" enabled />}>
            {rest.map(a => <div key={a.slug} data-theme={a.theme}><ArticleCard article={a} minutes={minutes.get(a.slug)} /></div>)}
          </ArticleFilter>
        </section> : null}

        <section id="contato" className={styles.themes} aria-labelledby="temas-title">
          <div className={styles.moreHead}>
            <h2 id="temas-title">Cada tema vira um serviço</h2>
            <p>Quando o texto encontra o problema do seu time.</p>
          </div>
          <div className={styles.themeCards}>
            {(Object.keys(articleThemes) as ArticleTheme[]).map(key => {
              const service = themeOffer(key);
              return (
                <Link key={key} href={service.href} className={styles.themeCard} style={accentVars(service)} data-cta={`tema-${key}`}>
                  <span className={styles.label}>{articleThemes[key].label}</span>
                  <strong>{service.name}</strong>
                  <span>{service.card.summary}</span>
                  <span className={styles.asideCta}>Conhecer o serviço <span aria-hidden="true">→</span></span>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <div className={styles.footerWrap}>
        <ServiceFooter whatsapp={contact.whatsapp} />
      </div>
    </div>
  );
}

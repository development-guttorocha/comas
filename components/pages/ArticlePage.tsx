import Link from "next/link";
import { notFound } from "next/navigation";
import NotionPageDocument from "@/components/case/NotionPageDocument";
import { AdSlot } from "@/components/artigos/AdSlot";
import { accentVars, ArticleCard, ArticleCover, ServiceAsideCard, ServiceInline } from "@/components/artigos/ArticleParts";
import { ArticleToc, ReadingProgress, ShareButtons } from "@/components/artigos/ArticleRail";
import CtaTracker from "@/components/servicos/CtaTracker";
import ServiceFooter from "@/components/servicos/ServiceFooter";
import ServiceNav from "@/components/servicos/ServiceNav";
import { getServiceContact, ServiceButton } from "@/components/servicos/ServiceShell";
import {
  articleJsonLd, articleSeries, articleService, articleThemes, articleToc, blockAtShare, formatArticleDate,
  getArticleBody, getArticleHref, getArticles, readingMinutes, relatedArticles, seriesNeighbors,
} from "@/lib/articles";
import { contactHref } from "@/lib/leadOptions";
import { serializeJsonLd } from "@/lib/jsonLd";
import { absoluteUrl } from "@/lib/seo";
import { serviceList } from "@/lib/services";
import { localAdminRequest } from "@/lib/translations/localAdmin";
import { readingSerif } from "@/app/(pt)/artigos/fonts";
import styles from "@/app/(pt)/artigos/artigos.module.css";
import shell from "@/app/(pt)/servicos/service-shell.module.css";

/**
 * An article, built for reading: a light page, a serif column of about 70 characters, the
 * index in the left margin and one ad in the right. The service of its theme shows once in
 * the text and once more as the page's last word, after the trail to more (series, articles).
 */
export default async function ArticlePage({ slug }: { slug: string }) {
  // On this machine a draft can be read; the site never lists or serves one.
  const localAdmin = await localAdminRequest();
  const list = await getArticles({ drafts: localAdmin });
  const a = list.find(item => item.slug === slug);
  if (!a) notFound();

  const blocks = await getArticleBody(slug);
  const minutes = readingMinutes(blocks);
  const toc = articleToc(blocks);
  const service = articleService(a);
  const theme = articleThemes[a.theme];
  const url = absoluteUrl(getArticleHref(a.slug));
  const contact = await getServiceContact({ emailSubject: `Sobre o artigo: ${a.title}`, whatsappMessage: `Oi, Gutto! Li o artigo "${a.title}" e queria conversar.` });
  const published = list.filter(o => !o.draft);
  const related = relatedArticles(published, a);
  const relatedMinutes = await Promise.all(related.map(async r => readingMinutes(await getArticleBody(r.slug))));
  const { prev, next } = seriesNeighbors(list, a);
  // The margin's ad promotes another service while AdSense is off.
  const otherService = serviceList.find(s => s.slug !== service.slug)!;
  const ads = a.ads !== false;

  const atText = blockAtShare(blocks, 0.35);
  const atLater = blockAtShare(blocks, 0.7);
  const afterBlocks = {
    ...(atText ? { [atText]: <ServiceInline service={service} /> } : {}),
    // Where the margin is gone, its ad comes into the text, once.
    ...(atLater && atLater !== atText ? { [atLater]: <div className={styles.inlineAd}><AdSlot format="inline" enabled={ads} /></div> } : {}),
  };

  return (
    <div className={`${shell.shell} ${styles.page} ${readingSerif.variable}`} style={accentVars(service)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd(a, minutes)) }} />
      <CtaTracker page={`artigo-${a.slug}`} />
      <ReadingProgress target="texto" />
      <ServiceNav name={theme.label} links={[{ label: "Todos os artigos", href: "/artigos" }, { label: "Serviços", href: "/servicos" }]} parent={{ label: "Artigos", href: "/artigos" }} cta={{ label: "Contato", href: contactHref("artigos") }} />

      <main id="topo">
        <article className={styles.article}>
          <header className={styles.head}>
            <p className={styles.meta}>
              <Link href={`/artigos?tema=${a.theme}`} className={styles.theme}>{theme.label}</Link>
              {a.series ? <span>Série {articleSeries[a.series].label}</span> : null}
            </p>
            <h1>{a.title}</h1>
            <p className={styles.dek}>{a.dek}</p>
            <div className={styles.byline}>
              <Link href="/sobre" className={styles.author}>
                <img src="/curriculo/gutto.webp" alt="" width={44} height={44} />
                <span>
                  <strong>Gutto Rocha</strong>
                  <span><time dateTime={a.publishedAt}>{formatArticleDate(a.publishedAt)}</time> · {minutes} min de leitura</span>
                </span>
              </Link>
              <ShareButtons title={a.title} url={url} place="topo" />
            </div>
          </header>

          {a.cover ? <div className={styles.coverArea}><ArticleCover article={a} /></div> : null}

          <div className={styles.rail}><div className={styles.sticky}><ArticleToc items={toc.items} /></div></div>

          <div id="texto" className={styles.body}>
            <NotionPageDocument anchorId="texto-doc" blocks={blocks} headingAnchors={toc.anchors} afterBlocks={afterBlocks} />
            <div className={styles.endShare}>
              <p>Se este texto ajudou, mande para quem vai gostar.</p>
              <ShareButtons title={a.title} url={url} place="fim" />
            </div>
          </div>

          <div className={styles.aside}>
            <div className={styles.sticky}><AdSlot format="rail" enabled={ads} fallback={<ServiceAsideCard service={otherService} />} /></div>
          </div>

          <section className={styles.authorBox} aria-label="Sobre o autor">
            <img src="/curriculo/gutto.webp" alt="Gutto Rocha" width={96} height={96} loading="lazy" />
            <div>
              <p className={styles.label}>Quem escreve</p>
              <p className={styles.authorName}>Gutto Rocha</p>
              <p>Designer há 18 anos e Design Manager. Escrevo sobre o que aprendi construindo produto e liderando times em empresas como PicPay, Loft e Webmotors.</p>
              <p className={styles.authorLinks}><Link href="/sobre">Minha história →</Link><Link href="/cases">Cases →</Link></p>
            </div>
          </section>

          {/* Without a photo, the key words close the text as a recap instead of opening it. */}
          {a.cover ? null : <div className={styles.recapArea}><ArticleCover article={a} /></div>}
        </article>

        {prev || next ? (
          <nav className={styles.series} aria-label={a.series ? `Série ${articleSeries[a.series].label}` : "Série"}>
            {prev ? <Link href={getArticleHref(prev.slug)} rel="prev"><span>← Anterior na série</span>{prev.title}</Link> : <span />}
            {next ? <Link href={getArticleHref(next.slug)} rel="next" data-align="end"><span>Próximo na série →</span>{next.title}</Link> : null}
          </nav>
        ) : null}

        <section className={styles.more} aria-labelledby="leia-title">
          <div className={styles.moreHead}>
            <h2 id="leia-title">Leia também</h2>
            <Link href="/artigos" className={styles.moreLink}>Todos os artigos →</Link>
          </div>
          {related.length ? (
            <div className={styles.grid}>{related.map((r, i) => <ArticleCard key={r.slug} article={r} minutes={relatedMinutes[i]} />)}</div>
          ) : <p className={styles.empty}>Os próximos textos aparecem aqui.</p>}
        </section>

        <section id="contato" className={styles.closing} aria-labelledby="contato-title">
          <div>
            <p className={styles.closingKicker}>Isso vira serviço</p>
            <h2 id="contato-title">{service.name}</h2>
            <p>{service.card.summary}</p>
            <ul>{service.card.points.map(p => <li key={p}>{p}</li>)}</ul>
          </div>
          <div className={shell.ctaRow}>
            <ServiceButton href={service.href} cta="fechamento-servico">Conhecer o serviço</ServiceButton>
            {contact.whatsapp ? <ServiceButton href={contact.whatsapp} variant="ghost" arrow="↗" cta="fechamento-whatsapp">Conversar no WhatsApp</ServiceButton> : null}
          </div>
        </section>
      </main>

      <div className={styles.footerWrap}>
        <ServiceFooter whatsapp={contact.whatsapp} />
      </div>
    </div>
  );
}

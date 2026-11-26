import type { CSSProperties } from "react";
import Link from "next/link";
import { articleService, articleThemes, formatArticleDate, getArticleHref, type Article } from "@/lib/articles";
import styles from "@/app/(pt)/artigos/artigos.module.css";

type ServiceLink = ReturnType<typeof articleService>;

/** The service accent, as the variables the article styles read. */
export const accentVars = (service: ServiceLink) => ({ "--svc-accent": service.accent.color, "--svc-on-accent": service.accent.on }) as CSSProperties;

/**
 * An article's picture: its photo, or, without one, its key words set as a numbered grid
 * (an editorial cover with no image rights to clear). `size` picks the cover or a card thumb.
 */
export function ArticleCover({ article: a, size = "cover" }: { article: Article; size?: "cover" | "thumb" }) {
  if (a.cover) {
    return size === "cover" ? (
      <figure className={styles.cover}>
        <img src={a.cover.src} alt={a.cover.alt} fetchPriority="high" />
        {a.cover.credit ? <figcaption>{a.cover.credit}</figcaption> : null}
      </figure>
    ) : <img className={styles.thumbImg} src={a.cover.src} alt="" loading="lazy" decoding="async" />;
  }
  const words = a.coverWords?.length ? a.coverWords : [a.title];
  return (
    <div className={size === "cover" ? styles.coverWords : styles.thumbWords} aria-hidden="true" style={accentVars(articleService(a))}>
      {words.map((w, i) => <span key={w}><small>{String(i + 1).padStart(2, "0")}</small>{w}</span>)}
    </div>
  );
}

/** A card in a list of articles: picture, theme, title, the thesis and when. */
export function ArticleCard({ article: a, minutes, featured = false }: { article: Article; minutes?: number; featured?: boolean }) {
  return (
    <Link href={getArticleHref(a.slug)} className={styles.card} data-featured={featured || undefined} data-theme={a.theme}>
      <div className={styles.cardMedia}><ArticleCover article={a} size="thumb" /></div>
      <div className={styles.cardBody}>
        <p className={styles.cardTheme} style={accentVars(articleService(a))}>
          {articleThemes[a.theme].label}
          {a.draft ? <span className={styles.draft}>Rascunho</span> : null}
        </p>
        {featured ? <h2>{a.title}</h2> : <h3>{a.title}</h3>}
        <p className={styles.cardDek}>{a.dek}</p>
        <p className={styles.cardMeta}>
          <time dateTime={a.publishedAt}>{formatArticleDate(a.publishedAt)}</time>
          {minutes ? <span>{minutes} min de leitura</span> : null}
        </p>
        {featured ? <span className={styles.cardCta}>Ler artigo <span aria-hidden="true">→</span></span> : null}
      </div>
    </Link>
  );
}

/** Slot A: the article's service, inside the text, quiet enough not to break the reading. */
export function ServiceInline({ service }: { service: ServiceLink }) {
  return (
    <aside className={styles.inline} aria-label="Serviço relacionado">
      <p className={styles.label}>Serviço relacionado</p>
      <p className={styles.inlineTitle}>{service.name}</p>
      <p className={styles.inlineText}>{service.card.summary}</p>
      <Link href={service.href} data-cta="slot-texto">Ver como funciona <span aria-hidden="true">→</span></Link>
    </aside>
  );
}

/** Slot B while AdSense is off: another service, so the margin sells the whole offer. */
export function ServiceAsideCard({ service }: { service: ServiceLink }) {
  return (
    <Link href={service.href} className={styles.asideCard} data-cta="slot-lateral" style={accentVars(service)}>
      <span className={styles.label}>Também faço</span>
      <strong>{service.name}</strong>
      <span className={styles.asideText}>{service.card.summary}</span>
      <span className={styles.asideCta}>Conhecer <span aria-hidden="true">→</span></span>
    </Link>
  );
}

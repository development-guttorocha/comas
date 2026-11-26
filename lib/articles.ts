import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { getRichTextArray, type NotionBlockNode } from "@/lib/notionBlockTree";
import type { NotionHeadingAnchorMeta } from "@/lib/notionCaseNavFromHeadings";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";
import { careerConsulting, resourcesHub } from "@/lib/resources";
import { serviceList } from "@/lib/services";

/**
 * Articles (PT only for now): `content/articles/<slug>/article.json` (data) and `body.json`
 * (the body, in the same blocks the cases use). Media lives in `public/articles/<slug>/`.
 * Each article belongs to one theme, and each theme leads to one service.
 */
export const ARTICLE_CONTENT_DIR = path.join(process.cwd(), "content", "articles");

export { articleSeries, articleThemes, type Article, type ArticleSeries, type ArticleTheme } from "@/lib/articleTaxonomy";
import { articleThemes, type Article, type ArticleTheme } from "@/lib/articleTaxonomy";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function readArticles(): Promise<Article[]> {
  const entries = await readdir(ARTICLE_CONTENT_DIR, { withFileTypes: true }).catch(() => []);
  const slugs = entries.filter(e => e.isDirectory() && SLUG.test(e.name)).map(e => e.name);
  const articles = await Promise.all(slugs.map(slug => readJson<Article>(path.join(ARTICLE_CONTENT_DIR, slug, "article.json"))));
  return articles.filter((a): a is Article => a !== null).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

// A deployment's files never change; in development every read sees the latest edit.
let memo: Promise<Article[]> | null = null;
const readAll = () => process.env.NODE_ENV === "development" ? readArticles() : (memo ??= readArticles());

/** The articles the site shows, newest first. `drafts` adds the unpublished ones (local admin). */
export async function getArticles({ drafts = false } = {}): Promise<Article[]> {
  const all = await readAll();
  return drafts ? all : all.filter(a => !a.draft);
}

export async function getArticleBody(slug: string): Promise<NotionBlockNode[]> {
  if (!SLUG.test(slug)) return [];
  return (await readJson<NotionBlockNode[]>(path.join(ARTICLE_CONTENT_DIR, slug, "body.json"))) ?? [];
}

export const getArticleHref = (slug: string) => `/artigos/${slug}`;

/** What each theme leads to: the services, and the career consulting for the designers' themes. */
const articleOffers = [
  ...serviceList,
  { slug: careerConsulting.slug, name: careerConsulting.serviceName, navName: careerConsulting.navName, accent: resourcesHub.accent, card: careerConsulting.card, href: `/recursos/${careerConsulting.slug}` },
];
export const themeOffer = (theme: ArticleTheme) => articleOffers.find(s => s.slug === articleThemes[theme].service)!;
export const articleService = (a: Article) => themeOffer(a.theme);

const plain = (b: NotionBlockNode) => getRichTextArray(b).map(p => (p as { plain_text?: string }).plain_text ?? "").join("");
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

function countWords(blocks: NotionBlockNode[]): number {
  return blocks.reduce((n, b) => n + words(plain(b)) + countWords(b.children ?? []), 0);
}

/** Minutes, at 220 words a minute (a reading pace for Portuguese prose). */
export const readingMinutes = (blocks: NotionBlockNode[]) => Math.max(1, Math.round(countWords(blocks) / 220));

/** The article's index: every `heading_1` (rendered as h2) becomes an anchor. */
export function articleToc(blocks: NotionBlockNode[]) {
  const items: Array<{ id: string; label: string }> = [];
  const anchors: Record<string, NotionHeadingAnchorMeta> = {};
  for (const b of blocks) {
    if (b.type !== "heading_1") continue;
    const label = plain(b).trim();
    const base = label.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `secao-${items.length + 1}`;
    const id = items.some(i => i.id === base) ? `${base}-${items.length + 1}` : base;
    items.push({ id, label });
    anchors[b.id] = { anchorId: id, displayLabel: label };
  }
  return { items, anchors };
}

/**
 * Where a share of the text has been read: the first top-level paragraph past `share` of the
 * words. The slots in the body hang after it, so they never split a list or sit on a heading.
 */
export function blockAtShare(blocks: NotionBlockNode[], share: number): string | undefined {
  const total = countWords(blocks);
  let seen = 0;
  for (const [i, b] of blocks.entries()) {
    seen += words(plain(b)) + countWords(b.children ?? []);
    if (seen >= total * share && b.type === "paragraph" && i < blocks.length - 1) return b.id;
  }
}

/** Same theme first, then the rest; never the article itself. */
export function relatedArticles(list: Article[], a: Article, count = 3): Article[] {
  const others = list.filter(o => o.slug !== a.slug);
  return [...others.filter(o => o.theme === a.theme), ...others.filter(o => o.theme !== a.theme)].slice(0, count);
}

/** The article before and after this one in its series, in publishing order. */
export function seriesNeighbors(list: Article[], a: Article) {
  if (!a.series) return {};
  const run = list.filter(o => o.series === a.series).sort((x, y) => x.publishedAt.localeCompare(y.publishedAt));
  const i = run.findIndex(o => o.slug === a.slug);
  return { prev: run[i - 1], next: run[i + 1] };
}

export const formatArticleDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" }).replace(/\./g, "");

export function articleMetadata(a: Article): Metadata {
  const url = getArticleHref(a.slug);
  const title = a.seoTitle ?? `${a.title} | ${SITE_NAME}`;
  const description = a.seoDescription ?? a.dek;
  const images = [{ url: a.cover?.src ?? "/opengraph-image", width: 1200, height: 630, alt: a.title }];
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article", siteName: SITE_NAME, title, description, url, locale: "pt_BR", images,
      publishedTime: a.publishedAt, modifiedTime: a.updatedAt ?? a.publishedAt, authors: [SITE_URL],
    },
    twitter: { card: "summary_large_image", title, description, images: images.map(i => i.url) },
  };
}

export function articleJsonLd(a: Article, minutes: number) {
  const url = absoluteUrl(getArticleHref(a.slug));
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${url}#article`,
      headline: a.title,
      description: a.seoDescription ?? a.dek,
      url,
      mainEntityOfPage: url,
      inLanguage: "pt-BR",
      datePublished: a.publishedAt,
      dateModified: a.updatedAt ?? a.publishedAt,
      image: absoluteUrl(a.cover?.src ?? "/opengraph-image"),
      author: { "@id": `${SITE_URL}/#person` },
      publisher: { "@id": `${SITE_URL}/#person` },
      isPartOf: { "@id": `${SITE_URL}/#website` },
      articleSection: articleThemes[a.theme].label,
      timeRequired: `PT${minutes}M`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Artigos", item: absoluteUrl("/artigos") },
        { "@type": "ListItem", position: 3, name: a.title, item: url },
      ],
    },
  ];
}

import type { MetadataRoute } from "next";
import { translatedCaseListings } from "@/lib/translations/listing";
import { getCaseHref } from "@/lib/cases";
import { getCaseDataSource } from "@/lib/caseContent";
import { SITE_URL } from "@/lib/seo";
import { getServiceHref, serviceSlugs } from "@/lib/services";
import { getArticleHref, getArticles } from "@/lib/articles";
import { getResourceHref, resourceSlugs } from "@/lib/resources";

const PAGES = ["", "sobre", "curriculo", "contato", "cases"];

/**
 * Every public page, in both languages where it exists. `lastModified` only where it is known
 * (a case saved in the admin): a date that changes on every request teaches crawlers to ignore it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = (path: string) => `${SITE_URL}${path}`;

  const staticRoutes: MetadataRoute.Sitemap = PAGES.flatMap(page => {
    const pt = url(`/${page}`), en = url(`/en${page ? `/${page}` : ""}`);
    const common = { changeFrequency: page === "cases" ? "weekly" as const : "monthly" as const, priority: page ? 0.8 : 1, alternates: { languages: { "pt-BR": pt, en, "x-default": pt } } };
    return [{ ...common, url: pt }, { ...common, url: en }];
  });

  const data = await getCaseDataSource();
  const cases = data.cases.filter(c => c.slug !== "modelo");
  const translated = new Set((await translatedCaseListings(cases)).map(c => c.slug));

  const caseRoutes: MetadataRoute.Sitemap = cases.flatMap(c => {
    const pt = url(getCaseHref(c.slug)), en = url(getCaseHref(c.slug, "en"));
    const common = {
      ...(c.updatedAt ? { lastModified: c.updatedAt } : {}),
      changeFrequency: "monthly" as const,
      priority: 0.85,
      ...(c.heroImage && !/\.(mp4|webm|mov)(\?|$)/i.test(c.heroImage) ? { images: [url(c.heroImage)] } : {}),
    };
    if (!translated.has(c.slug)) return [{ ...common, url: pt }];
    const alternates = { languages: { "pt-BR": pt, en, "x-default": pt } };
    return [{ ...common, url: pt, alternates }, { ...common, url: en, alternates }];
  });

  // Service pages exist in Portuguese only.
  const serviceRoutes: MetadataRoute.Sitemap = ["", ...serviceSlugs].map(slug => ({ url: url(getServiceHref(slug)), changeFrequency: "monthly", priority: 0.9 }));

  // Articles exist in Portuguese only; drafts never reach the sitemap.
  const articles = await getArticles();
  const articleRoutes: MetadataRoute.Sitemap = [
    ...(articles.length ? [{ url: url("/artigos"), changeFrequency: "weekly" as const, priority: 0.8 }] : []),
    ...articles.map(a => ({ url: url(getArticleHref(a.slug)), lastModified: a.updatedAt ?? a.publishedAt, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];

  // Design Resources, Portuguese only. The materials themselves stay out (noindex).
  const resourceRoutes: MetadataRoute.Sitemap = ["", ...resourceSlugs].map(slug => ({ url: url(getResourceHref(slug)), changeFrequency: "monthly", priority: 0.8 }));

  // The contact form the three fronts share and the legal notice, Portuguese only.
  const contactRoute: MetadataRoute.Sitemap = [
    { url: url("/fale-comigo"), changeFrequency: "yearly", priority: 0.5 },
    { url: url("/termos-de-uso"), changeFrequency: "yearly", priority: 0.3 },
  ];

  return [...staticRoutes, ...serviceRoutes, ...resourceRoutes, ...caseRoutes, ...articleRoutes, ...contactRoute];
}

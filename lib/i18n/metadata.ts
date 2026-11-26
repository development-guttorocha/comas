import type { Metadata } from "next";
import type { SiteLocale } from "@/lib/siteLocale";
import { getPageContent } from "@/lib/pages/store";
import type { SiteContent, SitePage } from "@/lib/pages/schemas";

/** A page's title and description, from `content/pages/site.json` (admin → SEO). */
export async function pageCopy(page: SitePage, locale: SiteLocale) {
  const site = await getPageContent<SiteContent>("site", locale);
  return { title: site[`${page}Title`], description: site[`${page}Description`] };
}

export async function sitePageMetadata(page: SitePage, locale: SiteLocale): Promise<Metadata> {
  const { title, description } = await pageCopy(page, locale);
  const pt = page === "home" ? "/" : `/${page}`;
  const en = page === "home" ? "/en" : `/en/${page}`;
  const url = locale === "en" ? en : pt;
  // A page's own openGraph replaces the root's, so it names its share image (app/og) itself.
  const images = [{ url: `/og/${locale === "en" ? "en-" : ""}${page}`, width: 1200, height: 630, alt: title }];
  return { title, description, alternates: { canonical: url, languages: { "pt-BR": pt, en, "x-default": pt }, types: { "text/markdown": url === "/" ? "/index.md" : `${url}.md` } }, openGraph: { type: "website", siteName: "Gutto Rocha", title, description, url, locale: locale === "en" ? "en_US" : "pt_BR", alternateLocale: [locale === "en" ? "pt_BR" : "en_US"], images }, twitter: { card: "summary_large_image", title, description, images: images.map(i => i.url) } };
}

import type { Metadata } from "next";
import resourcesHub from "@/content/recursos/hub.json";
import careerConsulting from "@/content/recursos/consultoria-de-carreira.json";
import careerTrack from "@/content/recursos/trilha-de-carreira.json";
import salaryGuide from "@/content/recursos/salario-em-design.json";
import salarySurvey from "@/content/recursos/pesquisa-salarial.json";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

/**
 * Design Resources (`/recursos`): the site's door for designers, apart from the services that sell
 * to companies. Free materials ask only for an e-mail; the career consulting is the paid offer. PT only for now,
 * copy in `content/recursos/<slug>.json`.
 */
export type ResourcesHubContent = typeof resourcesHub;
export type CareerConsultingContent = typeof careerConsulting;
export type CareerTrackContent = typeof careerTrack;
export type SalaryGuideContent = typeof salaryGuide;
export type SalarySurveyContent = typeof salarySurvey;

export const RESOURCES_ACCENT = resourcesHub.accent;
export const getResourceHref = (slug: string) => (slug ? `/recursos/${slug}` : "/recursos");

/** In the order the hub offers them; `free` is a material, the rest are paid. */
export const resourceList = [
  { ...careerTrack, free: true },
  { ...salaryGuide, free: true },
  { ...salarySurvey, free: true },
  { ...careerConsulting, free: false },
].map(r => ({ slug: r.slug, name: r.serviceName, navName: r.navName, card: r.card, accent: r.accent, free: r.free, href: getResourceHref(r.slug) }));

export const resourceSlugs = resourceList.map(r => r.slug);

/** Nav parent for `ServiceShell`. */
export const resourcesFamily = {
  parent: { label: resourcesHub.navName, href: "/recursos" },
};

export function resourceMetadata({ slug, seoTitle: title, seoDescription: description }: { slug: string; seoTitle: string; seoDescription: string }): Metadata {
  const url = getResourceHref(slug);
  const images = [{ url: `${url}/opengraph-image`, width: 1200, height: 630, alt: title }];
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url, locale: "pt_BR", images },
    twitter: { card: "summary_large_image", title, description, images: images.map(i => i.url) },
  };
}

export const resourceBreadcrumb = (name: string, slug: string) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
    { "@type": "ListItem", position: 2, name: resourcesHub.navName, item: absoluteUrl("/recursos") },
    ...(slug ? [{ "@type": "ListItem", position: 3, name, item: absoluteUrl(getResourceHref(slug)) }] : []),
  ],
});

export { resourcesHub, careerConsulting, careerTrack, salaryGuide, salarySurvey };

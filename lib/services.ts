import type { Metadata } from "next";
import headDeDesign from "@/content/services/head-de-design.json";
import designSystem from "@/content/services/design-system-figma.json";
import aiPrototyping from "@/content/services/prototipagem-com-ia.json";
import servicesHub from "@/content/services/hub.json";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

/**
 * Service landing pages (PT only for now). Copy lives in `content/services/<slug>.json`;
 * each service has its own route and page template, sharing the metadata and schema below.
 */
export type ServiceContent = typeof headDeDesign;
export type DesignSystemContent = typeof designSystem;
export type AiPrototypingContent = typeof aiPrototyping;
export type ServicesHubContent = typeof servicesHub;

/** What the service nav, footer and hub need from each service, in the order they are offered. */
export const serviceList = [aiPrototyping, designSystem, headDeDesign].map(s => ({
  slug: s.slug, name: s.serviceName, navName: s.navName, accent: s.accent, card: s.card, href: `/servicos/${s.slug}`,
}));

/** What every service JSON carries, whatever its template. */
type ServiceBase = {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  serviceName: string;
  serviceType: string;
  offers: Array<{ title: string; description: string }>;
  faq: { items: Array<{ question: string; answer: string }> };
};

export const serviceSlugs = [headDeDesign.slug, designSystem.slug, aiPrototyping.slug];
export const getServiceHref = (slug: string) => (slug ? `/servicos/${slug}` : "/servicos");

export function serviceMetadata({ slug, seoTitle: title, seoDescription: description }: Pick<ServiceBase, "slug" | "seoTitle" | "seoDescription">): Metadata {
  const url = getServiceHref(slug);
  // A page's own openGraph replaces the root's, so it names the share image itself.
  const images = [{ url: `${url}/opengraph-image`, width: 1200, height: 630, alt: title }];
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url, locale: "pt_BR", images },
    twitter: { card: "summary_large_image", title, description, images: images.map(i => i.url) },
  };
}

/** The offer as a Service by the site's author, its FAQ, and the trail back to the Home. */
export function serviceJsonLd(s: ServiceBase) {
  const url = absoluteUrl(getServiceHref(s.slug));
  return [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${url}#service`,
      name: s.serviceName,
      serviceType: s.serviceType,
      description: s.seoDescription,
      url,
      inLanguage: "pt-BR",
      provider: { "@id": `${absoluteUrl("/")}#person` },
      areaServed: { "@type": "Country", name: "Brasil" },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: s.serviceName,
        itemListElement: s.offers.map(o => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: o.title, description: o.description } })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: s.faq.items.map(q => ({ "@type": "Question", name: q.question, acceptedAnswer: { "@type": "Answer", text: q.answer } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: s.serviceName, item: url },
      ],
    },
  ];
}

export { headDeDesign, designSystem, aiPrototyping, servicesHub };

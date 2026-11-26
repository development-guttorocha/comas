import type { Case } from "@/lib/cases";
import { experience, skills } from "@/lib/curriculum";
import { LINKEDIN_URL, INSTAGRAM_URL, DRIBBBLE_URL } from "@/lib/social";
import type { SiteLocale } from "@/lib/siteLocale";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.guttorocha.com.br").replace(/\/$/, "");
export const SITE_NAME = "Gutto Rocha";

/** An address on the site, absolute: what search engines and AI crawlers keep. */
export const absoluteUrl = (path = "/") => (/^https?:\/\//i.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`);

const PERSON_ID = `${SITE_URL}/#person`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const current = experience[0]?.title.split("@")[1]?.trim();

/** Who the site is about, once: the other entities point to it by `@id`. */
export const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": PERSON_ID,
  name: "Gutto Rocha",
  alternateName: "Gustavo Rocha",
  url: SITE_URL,
  image: `${SITE_URL}/opengraph-image`,
  jobTitle: "Design Manager",
  description:
    "Designer com mais de 18 anos de experiência. Resolvo problemas. Com design e com quem faz acontecer.",
  ...(current ? { worksFor: { "@type": "Organization", name: current } } : {}),
  address: { "@type": "PostalAddress", addressLocality: "Guarulhos", addressRegion: "SP", addressCountry: "BR" },
  knowsAbout: ["Product Design", "Design Leadership", "UX Research", "Design Systems", "UX Design", "UI Design", ...skills],
  sameAs: [LINKEDIN_URL, INSTAGRAM_URL, DRIBBBLE_URL],
} as const;

export function websiteJsonLd(locale: SiteLocale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: locale === "en" ? "en" : "pt-BR",
    author: { "@id": PERSON_ID },
    publisher: { "@id": PERSON_ID },
  };
}

/** A case as a creative work by the site's author, with the trail back to the case list. */
export function caseJsonLd(c: Case, locale: SiteLocale, { title, summary, image, url }: { title: string; summary?: string; image?: string; url: string }) {
  const en = locale === "en";
  const list = en ? "/en/cases" : "/cases";
  return [
    {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      "@id": `${absoluteUrl(url)}#case`,
      name: title,
      headline: title,
      ...(summary ? { description: summary } : {}),
      url: absoluteUrl(url),
      ...(image ? { image: absoluteUrl(image) } : {}),
      inLanguage: en ? "en" : "pt-BR",
      ...(c.year ? { dateCreated: c.year } : {}),
      author: { "@id": PERSON_ID },
      creator: { "@id": PERSON_ID },
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@type": "Organization", name: c.company },
      ...(c.tags?.length ? { keywords: c.tags.join(", ") } : {}),
      genre: "Product design case study",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl(en ? "/en" : "/") },
        { "@type": "ListItem", position: 2, name: "Cases", item: absoluteUrl(list) },
        { "@type": "ListItem", position: 3, name: title, item: absoluteUrl(url) },
      ],
    },
  ];
}

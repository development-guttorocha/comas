/** What an article is and how articles are grouped; no server code, so the admin can use it too. */
export const articleThemes = {
  "lideranca-de-design": { label: "Liderança de design", service: "head-de-design" },
  "design-systems": { label: "Design systems", service: "design-system-figma" },
  "ia-no-processo": { label: "IA no processo", service: "prototipagem-com-ia" },
  // Careers lead to the designers' offer (Design Resources), not to a company service.
  "carreira-em-design": { label: "Carreira em design", service: "consultoria-de-carreira" },
} as const;

export const articleSeries = {
  "mestres-do-design": { label: "Mestres do design" },
} as const;

export type ArticleTheme = keyof typeof articleThemes;
export type ArticleSeries = keyof typeof articleSeries;

export type Article = {
  slug: string;
  title: string;
  /** The thesis in one sentence, under the title. */
  dek: string;
  theme: ArticleTheme;
  series?: ArticleSeries;
  /** Case slugs that back the argument. */
  relatedCases?: string[];
  /** A photo, or, without one, a typographic grid of these words. */
  cover?: { src: string; alt: string; credit?: string };
  coverWords?: string[];
  publishedAt: string;
  updatedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  /** Third-party ads stay off when false; the service slots always show. */
  ads?: boolean;
  draft?: boolean;
};

import type { Case } from "@/lib/cases";
import type { SiteLocale } from "@/lib/siteLocale";

export function resolveCaseTitle(c: Case, locale: SiteLocale): string {
  if (locale === "en") {
    const t = c.titleEn?.trim();
    if (t) return t;
  }
  return c.title;
}

export function resolveCaseSummary(c: Case, locale: SiteLocale): string {
  if (locale === "en") {
    const s = c.summaryEn?.trim();
    if (s) return s;
  }
  return c.summary;
}

/**
 * Corpo Notion por idioma: em EN usa a página duplicada quando `notionContentPageIdEn`
 * está preenchido; caso contrário mantém o mesmo ID que PT (fallback gradual).
 */
export function resolveNotionBodyPageId(c: Case, locale: SiteLocale): string {
  const pt = c.notionContentPageId?.trim() || c.notionSourcePageId?.trim() || "";
  if (locale === "en") {
    const en = c.notionContentPageIdEn?.trim();
    if (en) return en;
  }
  return pt;
}

export function hasDedicatedEnglishBody(c: Case): boolean {
  return Boolean(c.notionContentPageIdEn?.trim());
}

export function caseDetailUi(locale: SiteLocale) {
  if (locale === "en") {
    return {
      docNavFallbackLabel: "Content",
      metadataSectionAria: "Case metadata",
      overviewEyebrow: "Overview",
      coverImageAlt: (title: string) => `Cover image: ${title}`,
      nextCaseEyebrow: "Next case",
      nextCaseAria: (title: string, company: string) =>
        `Next case: ${title} — ${company}`,
    };
  }
  return {
    docNavFallbackLabel: "Conteúdo",
    metadataSectionAria: "Metadados do case",
    overviewEyebrow: "Visão geral",
    coverImageAlt: (title: string) => `Imagem de capa: ${title}`,
    nextCaseEyebrow: "Próximo case",
    nextCaseAria: (title: string, company: string) =>
      `Próximo case: ${title} — ${company}`,
  };
}

import { DEFAULT_SITE_LOCALE, type SiteLocale } from "@/lib/siteLocale";

export const LOCALE_PREFERENCE_COOKIE = "portfolio-locale";
export const LOCALE_PREFERENCE_MAX_AGE = 60 * 60 * 24 * 365;

export function isSiteLocale(value: unknown): value is SiteLocale {
  return value === "pt" || value === "en";
}

/** Pick a supported browser language by priority, including regional variants. */
export function preferredSiteLocale(acceptLanguage: string | null, savedPreference?: string): SiteLocale {
  if (isSiteLocale(savedPreference)) return savedPreference;
  const languages = (acceptLanguage ?? "").split(",").map((entry, index) => {
    const [tag, ...parameters] = entry.trim().toLowerCase().split(";");
    const weight = parameters.find(parameter => parameter.trim().startsWith("q="));
    const quality = weight === undefined ? 1 : Number(weight.trim().slice(2));
    const language = tag.split("-")[0];
    return { language, quality, index };
  }).filter(({ language, quality }) => isSiteLocale(language) && Number.isFinite(quality) && quality > 0 && quality <= 1)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  const language = languages[0]?.language;
  return isSiteLocale(language) ? language : DEFAULT_SITE_LOCALE;
}

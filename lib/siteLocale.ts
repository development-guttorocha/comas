export type SiteLocale = "pt" | "en";

export const DEFAULT_SITE_LOCALE: SiteLocale = "pt";

export const SITE_LOCALES = ["pt", "en"] as const satisfies readonly SiteLocale[];

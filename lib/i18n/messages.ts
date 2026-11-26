import english from "./en.json";
import type { SiteLocale } from "@/lib/siteLocale";
export type Translator = (source: string) => string;
export const messagesEn: Record<string, string> = english;
export function getTranslator(locale: SiteLocale): Translator {
  return source => locale === "en" ? messagesEn[source] ?? source : source;
}
const preservedKeys = new Set(["name", "href", "src", "url", "institution", "year", "date", "company"]);
export function localizeData<T>(value: T, t: Translator, key = ""): T {
  if (typeof value === "string") return (preservedKeys.has(key) || /^https?:|^mailto:|^tel:/.test(value) ? value : t(value)) as T;
  if (Array.isArray(value)) return value.map(v => localizeData(v, t, key)) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, localizeData(v, t, k)])) as T;
  return value;
}

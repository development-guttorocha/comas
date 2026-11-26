"use client";
import { createContext, useContext } from "react";
import type { SiteLocale } from "@/lib/siteLocale";
import type { SiteContent } from "@/lib/pages/schemas";
import { useLocale } from "./LocaleProvider";

/**
 * The shared texts (menu, 404) in both languages, from `content/pages/site.json`: the root layout reads them,
 * so client components such as the menu stay right when a navigation switches language.
 */
const Context = createContext<Record<SiteLocale, SiteContent> | null>(null);
export default function SiteContentProvider({ content, children }: { content: Record<SiteLocale, SiteContent>; children: React.ReactNode }) {
  return <Context.Provider value={content}>{children}</Context.Provider>;
}
export function useSiteContent(): SiteContent {
  const content = useContext(Context);
  const { locale } = useLocale();
  if (!content) throw new Error("useSiteContent precisa do SiteContentProvider.");
  return content[locale];
}

"use client";
import { createContext, useContext, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import type { SiteLocale } from "@/lib/siteLocale";
const Context = createContext<{ locale: SiteLocale; messages: Record<string, string> }>({ locale: "pt", messages: {} });
export default function LocaleProvider({ locale, messages, children }: { locale: SiteLocale; messages: Record<string, string>; children: React.ReactNode }) {
  const pathname = usePathname();
  const current = pathname ? (pathname === "/en" || pathname.startsWith("/en/") ? "en" : "pt") : locale;
  const value = useMemo(() => ({ locale: current, messages }), [current, messages]);
  useEffect(() => { document.documentElement.lang = current === "en" ? "en" : "pt-BR"; }, [current]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLocale() {
  const { locale, messages } = useContext(Context);
  return { locale, t: (source: string) => locale === "en" ? messages[source] ?? source : source };
}

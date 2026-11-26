/**
 * URLs alternadas PT ↔ EN no header (mesmo slug em `/cases/…` e `/en/cases/…`).
 */
export function localePathPtFrom(pathname: string): string {
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const rest = pathname.slice(3) || "/";
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return pathname;
}

/** `null` quando não há versão inglesa para esta rota. */
export function localePathEnFrom(pathname: string): string | null {
  if (pathname === "/en" || pathname.startsWith("/en/")) return pathname;
  if (pathname === "/") return "/en";
  if (["/sobre", "/curriculo", "/contato"].includes(pathname)) return `/en${pathname}`;
  if (pathname === "/cases") return "/en/cases";
  if (pathname.startsWith("/cases/")) {
    const slug = pathname.slice("/cases/".length).split("/")[0];
    if (!slug || slug === "modelo") return null;
    return `/en/cases/${slug}`;
  }
  return null;
}
export function localizedHref(href: string, locale: "pt" | "en") {
  return locale === "en" ? localePathEnFrom(href) ?? href : localePathPtFrom(href);
}

import { NextResponse, type NextRequest } from "next/server";
import { adminNotFound, translationAdminPath, translationAdminRequestAvailable } from "@/lib/translations/access";
import { LOCALE_PREFERENCE_COOKIE, preferredSiteLocale } from "@/lib/localePreference";
export function proxy(request: NextRequest) {
  const draftPreview = request.nextUrl.pathname.startsWith("/en/cases/") && request.nextUrl.searchParams.get("translation") === "draft";
  if ((translationAdminPath(request.nextUrl.pathname) || draftPreview) && !translationAdminRequestAvailable(request)) return adminNotFound();
  // The Home is the language-neutral entry point. Explicit links retain their language.
  // POSTs include Server Actions and must reach their original route.
  if (request.nextUrl.pathname === "/" && ["GET", "HEAD"].includes(request.method)) {
    const locale = preferredSiteLocale(request.headers.get("accept-language"), request.cookies.get(LOCALE_PREFERENCE_COOKIE)?.value);
    if (locale === "en") {
      const destination = request.nextUrl.clone();
      destination.pathname = "/en";
      const response = NextResponse.redirect(destination);
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("Vary", "Accept-Language, Cookie");
      return response;
    }
  }
  const headers = new Headers(request.headers);
  headers.set("x-portfolio-locale", request.nextUrl.pathname === "/en" || request.nextUrl.pathname.startsWith("/en/") ? "en" : "pt");
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ["/((?!api|_next|.*\\..*).*)", "/admin/:path*", "/api/admin/:path*", "/api/translations/:path*"] };

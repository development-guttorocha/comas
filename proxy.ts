import { NextResponse, type NextRequest } from "next/server";
import { isRequestSocialAuthenticated, sanitizeNextPath } from "@/lib/social/auth";
import { adminNotFound, translationAdminRequestAvailable } from "@/lib/translations/access";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isComasAdminApi = pathname === "/api/admin/keys" || pathname.startsWith("/api/admin/keys/");
  const legacyLocalOnly =
    !isComasAdminApi &&
    (pathname.startsWith("/api/admin/") ||
      pathname === "/api/admin" ||
      pathname.startsWith("/api/translations/") ||
      pathname === "/api/translations");

  if (legacyLocalOnly && !translationAdminRequestAvailable(request)) {
    return adminNotFound();
  }

  if (pathname === "/admin/login") {
    if (isRequestSocialAuthenticated(request)) {
      const destination = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!isRequestSocialAuthenticated(request)) {
      const loginUrl = new URL("/admin/login", request.url);
      const target = `${pathname}${request.nextUrl.search}`;
      if (target !== "/admin" && target !== "/admin/carrosseis") {
        loginUrl.searchParams.set("next", target);
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)", "/api/admin/:path*", "/api/translations/:path*"],
};

import { NextResponse, type NextRequest } from "next/server";
import { adminNotFound, translationAdminRequestAvailable } from "@/lib/translations/access";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const legacyLocalOnly =
    pathname.startsWith("/api/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/translations/") ||
    pathname === "/api/translations";

  if (legacyLocalOnly && !translationAdminRequestAvailable(request)) {
    return adminNotFound();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)", "/api/admin/:path*", "/api/translations/:path*"],
};

/** Server-only policy: the private flag can disable local access, never enable production. */
export function translationAdminAvailable(
  host: string | null,
  environment: Record<string, string | undefined> = process.env,
) {
  const flag = environment.TRANSLATION_ADMIN_ENABLED;
  return environment.NODE_ENV === "development"
    && !environment.VERCEL
    && (flag === undefined || flag === "true")
    && !!host
    && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i.test(host);
}

export function translationAdminRequestAvailable(request: Request) {
  return translationAdminAvailable(request.headers.get("host") ?? new URL(request.url).host);
}

export function translationAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/")
    || pathname === "/api/admin" || pathname.startsWith("/api/admin/")
    || pathname === "/api/translations" || pathname.startsWith("/api/translations/");
}

export function adminNotFound() {
  return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}

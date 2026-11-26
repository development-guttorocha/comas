import { adminNotFound, translationAdminRequestAvailable } from "@/lib/translations/access";
import { isAuthorized, sameOrigin } from "@/lib/translations/auth";

export const adminJson = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });

/** The admin API answers only on this machine in development; writes must come from the admin page itself. */
export function adminGuard(request: Request, { write = false } = {}): Response | null {
  if (!translationAdminRequestAvailable(request)) return adminNotFound();
  if (!isAuthorized(request)) return adminJson({ error: "Acesso necessário." }, 401);
  if (write && !sameOrigin(request)) return adminJson({ error: "Origem inválida." }, 403);
  return null;
}

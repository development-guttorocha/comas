import { adminGuard, adminJson } from "@/lib/admin/guard";
import { loadNotices, startFix } from "@/lib/admin/notices";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The admin's pending items and the fixes running, read fresh on each screen. */
export async function GET(request: Request) {
  const denied = adminGuard(request);
  if (denied) return denied;
  try { return adminJson(await loadNotices()); }
  catch (error) { return adminJson({ notices: [], jobs: {}, error: error instanceof Error ? error.message : "Falha ao ler as pendências." }); }
}

/** Starts the fix of one item; the client follows it through GET. */
export async function POST(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const { id } = await request.json();
    startFix(String(id ?? ""));
    return adminJson(await loadNotices());
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível resolver." }, 422);
  }
}

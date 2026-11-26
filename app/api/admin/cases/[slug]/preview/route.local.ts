import { adminGuard, adminJson } from "@/lib/admin/guard";
import { SLUG } from "@/lib/admin/caseStore";
import { setCasePreview } from "@/lib/admin/casePreview";
import type { Case } from "@/lib/cases";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What the case editor has on screen, for its live preview (`/admin/cases/<slug>/previa`). Saves nothing. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  const { slug } = await params;
  if (!SLUG.test(slug)) return adminJson({ error: "Case inválido." }, 400);
  const body = (await request.json().catch(() => null)) as { case?: Case; body?: NotionBlockNode[] } | null;
  if (!body?.case || typeof body.case !== "object" || !Array.isArray(body.body)) return adminJson({ error: "Prévia sem conteúdo." }, 400);
  setCasePreview(slug, { case: { ...body.case, slug }, body: body.body });
  return adminJson({ ok: true });
}

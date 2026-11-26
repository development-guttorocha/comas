import { CaseConflict } from "@/lib/admin/caseStore";
import { saveArticleFiles } from "@/lib/admin/articleStore";
import { adminGuard, adminJson } from "@/lib/admin/guard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Saves the article data and/or body read at `revision`. */
export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const { slug } = await params;
    const body = await request.json();
    if (typeof body.revision !== "string") return adminJson({ error: "Versão inválida." }, 400);
    return adminJson(await saveArticleFiles(slug, body.revision, { article: body.article, body: body.body }));
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível salvar." }, error instanceof CaseConflict ? 409 : 422);
  }
}

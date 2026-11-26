import { CaseConflict, SLUG } from "@/lib/admin/caseStore";
import { createArticle } from "@/lib/admin/articleStore";
import { adminGuard, adminJson } from "@/lib/admin/guard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Creates an empty article; it starts as a draft. */
export async function POST(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const { slug, title, theme } = await request.json();
    if (typeof slug !== "string" || !SLUG.test(slug)) return adminJson({ error: "Use só letras minúsculas, números e hífens no endereço." }, 400);
    if (typeof title !== "string" || !title.trim()) return adminJson({ error: "Informe o título." }, 400);
    return adminJson({ article: await createArticle({ slug, title, theme: String(theme) }) });
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível criar o artigo." }, error instanceof CaseConflict ? 409 : 422);
  }
}

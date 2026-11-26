import { getAllCases } from "@/lib/caseContent";
import { CaseConflict, createCase, duplicateCase, SLUG } from "@/lib/admin/caseStore";
import { adminGuard, adminJson } from "@/lib/admin/guard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Creates an empty case, or a copy of `duplicateFrom`; either starts as a draft. */
export async function POST(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const { slug, title, company, duplicateFrom } = await request.json();
    if (typeof slug !== "string" || !SLUG.test(slug)) return adminJson({ error: "Use só letras minúsculas, números e hífens no endereço." }, 400);
    if (typeof duplicateFrom === "string") {
      if (typeof title !== "string") return adminJson({ error: "Informe o título." }, 400);
      const { cases } = await getAllCases();
      return adminJson({ case: await duplicateCase(duplicateFrom, { slug, title, order: cases.length + 1 }) });
    }
    if (typeof title !== "string" || typeof company !== "string") return adminJson({ error: "Informe título e empresa." }, 400);
    const { cases } = await getAllCases();
    const created = await createCase({ slug, title, company, order: cases.length + 1 });
    return adminJson({ case: created });
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível criar o case." }, error instanceof CaseConflict ? 409 : 422);
  }
}

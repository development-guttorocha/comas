import { CaseConflict } from "@/lib/admin/caseStore";
import { readCaseMaterial, saveCaseMaterial } from "@/lib/admin/materialStore";
import { adminGuard, adminJson } from "@/lib/admin/guard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The case's raw material and its revision. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = adminGuard(request);
  if (denied) return denied;
  try {
    const { slug } = await params;
    const read = await readCaseMaterial(slug);
    return read ? adminJson(read) : adminJson({ error: "Case não encontrado." }, 404);
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível ler o material." }, 422);
  }
}

/** Saves the material read at `revision`. */
export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const { slug } = await params;
    const body = await request.json();
    if (typeof body.revision !== "string") return adminJson({ error: "Versão inválida." }, 400);
    return adminJson(await saveCaseMaterial(slug, body.revision, body.material));
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível salvar o material." }, error instanceof CaseConflict ? 409 : 422);
  }
}

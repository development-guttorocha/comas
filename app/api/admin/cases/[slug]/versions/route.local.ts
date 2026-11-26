import { CaseConflict } from "@/lib/admin/caseStore";
import { listVersions, restoreVersion } from "@/lib/admin/caseVersions";
import { adminGuard, adminJson } from "@/lib/admin/guard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The versions of the case, newest first (audit R6, "Versões"). */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = adminGuard(request);
  if (denied) return denied;
  try {
    const { slug } = await params;
    return adminJson({ versions: await listVersions(slug) });
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível ler as versões." }, 422);
  }
}

/** Goes back to a version: `{ id, revision }`. The case of now becomes a version too. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const { slug } = await params;
    const { id, revision } = await request.json();
    if (typeof id !== "string" || typeof revision !== "string") return adminJson({ error: "Versão inválida." }, 400);
    return adminJson(await restoreVersion(slug, id, revision));
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível voltar a essa versão." }, error instanceof CaseConflict ? 409 : 422);
  }
}

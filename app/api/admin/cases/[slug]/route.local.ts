import { CaseConflict, deleteCase, saveCaseFiles, setCaseFlags } from "@/lib/admin/caseStore";
import { adminGuard, adminJson } from "@/lib/admin/guard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Saves the case data, body and/or video read at `revision`. */
export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const { slug } = await params;
    const body = await request.json();
    if (typeof body.revision !== "string") return adminJson({ error: "Versão inválida." }, 400);
    // the editor's saving session: the saves of one session become one version in the history
    const session = typeof body.session === "string" && /^[\w-]{1,64}$/.test(body.session) ? body.session : undefined;
    const saved = await saveCaseFiles(slug, body.revision, { case: body.case, body: body.body, reel: body.reel }, { session });
    return adminJson(saved);
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível salvar." }, error instanceof CaseConflict ? 409 : 422);
  }
}

/** Archive or highlight on the Home, from the list. */
export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const { slug } = await params;
    const { archived, featuredOnSite } = await request.json();
    const flag = (value: unknown) => (typeof value === "boolean" ? value : undefined);
    const saved = await setCaseFlags(slug, { archived: flag(archived), featuredOnSite: flag(featuredOnSite) });
    return adminJson({ case: saved.case });
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível alterar o case." }, 422);
  }
}

/** Moves the case to the local trash (`.content-history/deleted/`). */
export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const { slug } = await params;
    return adminJson(await deleteCase(slug));
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível excluir o case." }, 422);
  }
}

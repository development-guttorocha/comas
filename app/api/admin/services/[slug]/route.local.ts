import { adminGuard, adminJson } from "@/lib/admin/guard";
import { saveService, ServiceConflict } from "@/lib/admin/serviceStore";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Saves a Design Services file; refuses a changed shape, or a file that changed since `revision`. */
export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const { slug } = await params;
    const { revision, values } = await request.json();
    return adminJson(await saveService(slug, String(revision ?? ""), values));
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível salvar o serviço." }, error instanceof ServiceConflict ? 409 : 422);
  }
}

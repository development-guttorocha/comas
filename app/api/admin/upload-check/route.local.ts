import { adminGuard, adminJson } from "@/lib/admin/guard";
import { readForm, UploadError } from "@/lib/admin/form";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Used only by the automatic checks (scripts/check-admin.mjs): reads an upload the same way the
// real routes do and says what arrived, without saving anything.
export async function POST(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const form = await readForm(request);
    const files = [...form.values()].filter((v): v is File => v instanceof File).map((f) => ({ name: f.name, size: f.size }));
    return adminJson({ files });
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Envio inválido." }, error instanceof UploadError ? error.status : 422);
  }
}

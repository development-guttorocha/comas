import { listMedia, mediaFolder, saveMedia } from "@/lib/admin/caseStore";
import { queueCaptions } from "@/lib/media/captions";
import { adminGuard, adminJson } from "@/lib/admin/guard";
import { readForm, UploadError } from "@/lib/admin/form";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = adminGuard(request);
  if (denied) return denied;
  try {
    const params = new URL(request.url).searchParams;
    return adminJson({ files: await listMedia(params.get("slug") ?? "", mediaFolder(params.get("folder"))) });
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível listar a mídia." }, 422);
  }
}

/** Uploads one file into `public/<folder>/<slug>/` (cases by default, or articles). */
export async function POST(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const form = await readForm(request);
    const slug = form.get("slug"), file = form.get("file");
    if (typeof slug !== "string" || !(file instanceof File)) return adminJson({ error: "Escolha um arquivo." }, 400);
    const saved = await saveMedia(slug, file, mediaFolder(form.get("folder")));
    void queueCaptions([saved.url]);
    return adminJson({ file: saved });
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível enviar o arquivo." }, error instanceof UploadError ? error.status : 422);
  }
}

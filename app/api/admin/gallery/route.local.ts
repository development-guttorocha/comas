import { adminGuard, adminJson } from "@/lib/admin/guard";
import { captionProgress } from "@/lib/media/captions";
import { listGallery, trashMedia } from "@/lib/admin/gallery";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Every image and video of the cases and articles, with where each one is used. */
export async function GET(request: Request) {
  const denied = adminGuard(request);
  if (denied) return denied;
  const items = await listGallery();
  // reading never starts the AI: captions are written when the image arrives (figma-import, upload)
  return adminJson({ items, captions: captionProgress() });
}

/** Moves the chosen files out of the site, into .content-history/deleted-media/. */
export async function DELETE(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  const { urls } = await request.json().catch(() => ({}));
  if (!Array.isArray(urls) || !urls.length || urls.some((u) => typeof u !== "string")) return adminJson({ error: "Escolha os arquivos." }, 400);
  try {
    return adminJson({ moved: await trashMedia(urls) });
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível excluir." }, 422);
  }
}

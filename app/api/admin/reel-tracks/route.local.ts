import { adminGuard, adminJson } from "@/lib/admin/guard";
import { addReelTrack, getReelTracks } from "@/lib/reel/trackStore";
import { readForm, UploadError } from "@/lib/admin/form";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** The music library. */
export async function GET(request: Request) {
  const denied = adminGuard(request);
  if (denied) return denied;
  return adminJson({ tracks: await getReelTracks() });
}

/** Adds a song: it is measured and trimmed automatically. */
export async function POST(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const form = await readForm(request);
    const file = form.get("file");
    if (!(file instanceof File)) return adminJson({ error: "Escolha um arquivo de música." }, 400);
    const track = await addReelTrack(file, { title: String(form.get("title") ?? ""), artist: String(form.get("artist") ?? "") });
    return adminJson({ track });
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível adicionar a música." }, error instanceof UploadError ? error.status : 422);
  }
}

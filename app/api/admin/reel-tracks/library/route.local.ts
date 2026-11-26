import { adminGuard, adminJson } from "@/lib/admin/guard";
import { addFromLibrary, previewUrl, searchLibrary } from "@/lib/reel/audioLibrary";
import { addFromFreeToUse, freeCategories, searchFree } from "@/lib/reel/freeToUse";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Searches a music library, a page at a time: Free To Use (words, genre or mood) or, as the
 * fallback, the YouTube Audio Library (by name). Every song comes with an address to hear it.
 */
export async function GET(request: Request) {
  const denied = adminGuard(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 80);
  const offset = Math.min(100_000, Math.max(0, Number(url.searchParams.get("offset")) || 0));
  try {
    if (url.searchParams.get("source") === "youtube") {
      const { songs, total, next } = await searchLibrary(q, offset);
      return adminJson({ total, next, songs: songs.map((s) => ({ ...s, artist: "", meta: "", preview: previewUrl(s.id) })) });
    }
    const category = url.searchParams.get("category") ?? "";
    if (category && !/^[\w-]{10,60}$/.test(category)) return adminJson({ error: "Categoria inválida." }, 400);
    const [found, categories] = await Promise.all([searchFree({ query: q, category, offset }), offset ? Promise.resolve(undefined) : freeCategories()]);
    return adminJson({ ...found, categories });
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível buscar." }, 502);
  }
}

/** Adds a song from a library: downloaded once, measured and trimmed like an upload. */
export async function POST(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const { id, source } = await request.json().catch(() => ({}));
    if (typeof id !== "string" || !/^[\w-]{10,80}$/.test(id)) return adminJson({ error: "Música inválida." }, 400);
    return adminJson({ track: source === "youtube" ? await addFromLibrary(id) : await addFromFreeToUse(id) });
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível adicionar a música." }, 422);
  }
}

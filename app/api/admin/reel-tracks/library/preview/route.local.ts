import { adminGuard, adminJson } from "@/lib/admin/guard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Plays a library song for the preview. Google Drive answers with a download (redirect and
 * attachment headers) that a browser <audio> will not play, so the admin relays the bytes.
 */
export async function GET(request: Request) {
  const denied = adminGuard(request);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[\w-]{10,80}$/.test(id)) return adminJson({ error: "Música inválida." }, 400);
  const upstream = await fetch(`https://docs.google.com/uc?export=download&id=${encodeURIComponent(id)}`, { redirect: "follow", signal: AbortSignal.timeout(60_000) }).catch(() => null);
  if (!upstream?.ok || !upstream.body) return adminJson({ error: "Não consegui tocar essa música agora." }, 502);
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=3600",
      ...(upstream.headers.get("content-length") ? { "Content-Length": upstream.headers.get("content-length")! } : {}),
    },
  });
}

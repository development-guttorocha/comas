import { readFile } from "node:fs/promises";
import path from "node:path";
import { adminGuard } from "@/lib/admin/guard";
import { materialMediaUrl, parseMaterialMediaUrl } from "@/lib/admin/materialMedia";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".avif": "image/avif", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".webm": "video/webm",
};

/** A private Material picture, for the admin and the preview only (dev, this Mac). */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string; name: string }> }) {
  const denied = adminGuard(request);
  if (denied) return denied;
  const { slug, name } = await params;
  const at = parseMaterialMediaUrl(materialMediaUrl(slug, name));
  if (!at) return new Response(null, { status: 404 });
  try {
    const data = await readFile(at.file);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[path.extname(name)] ?? "application/octet-stream",
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "default-src 'none'; sandbox;",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}

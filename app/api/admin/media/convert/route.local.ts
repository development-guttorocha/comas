import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import { SLUG } from "@/lib/admin/caseStore";
import { adminGuard, adminJson } from "@/lib/admin/guard";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Makes an H.264 MP4 next to a case video with the local ffmpeg (silent, web-ready). */
export async function POST(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  const { slug, url } = await request.json().catch(() => ({}));
  if (typeof slug !== "string" || !SLUG.test(slug) || typeof url !== "string" || !url.startsWith(`/cases/${slug}/`) || url.includes("..")) {
    return adminJson({ error: "Vídeo inválido." }, 400);
  }
  const input = path.join(process.cwd(), "public", url);
  const output = input.replace(/\.[a-z0-9]+$/i, ".mp4");
  try { await stat(input); } catch { return adminJson({ error: "Vídeo não encontrado." }, 404); }
  const code = await new Promise<number>(resolve => {
    const child = spawn("ffmpeg", ["-y", "-i", input, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", output]);
    child.on("close", c => resolve(c ?? 1));
    child.on("error", () => resolve(-1));
  });
  if (code === -1) return adminJson({ error: "O ffmpeg não está instalado neste Mac. No Terminal: brew install ffmpeg. Ou envie o MP4 no campo acima." }, 422);
  if (code !== 0) return adminJson({ error: "O ffmpeg não conseguiu converter este vídeo." }, 422);
  return adminJson({ url: url.replace(/\.[a-z0-9]+$/i, ".mp4") });
}

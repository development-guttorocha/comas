import { adminGuard, adminJson } from "@/lib/admin/guard";
import { generateReel } from "@/lib/reel/generate";
import { parseParams } from "@/lib/reel/params";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Drafts the case video with AI. Nothing is saved: the editor shows it, and Salvar keeps it. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const { slug } = await params;
    const body = await request.json().catch(() => ({}));
    return adminJson(await generateReel(slug, parseParams(body)));
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível gerar o vídeo." }, 422);
  }
}

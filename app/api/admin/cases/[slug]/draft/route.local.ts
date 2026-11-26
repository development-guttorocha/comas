import { adminGuard, adminJson } from "@/lib/admin/guard";
import { parseMaterial } from "@/lib/caseMaterial";
import { loadDraftContext, planWarnings, proposePlan, writeDraft } from "@/lib/caseDraft/generate";
import { parsePlan } from "@/lib/caseDraft/plan";
import { clearPending, savePending } from "@/lib/caseDraft/pending";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * The case draft with AI, in three steps the editor calls in turn:
 * - "plan": the AI proposes the skeleton (cheap);
 * - "check": the automatic checks of a plan Gutto is editing (no AI);
 * - "write": the approved plan written, filtered, checked and reviewed;
 * - "discard": forget the kept draft (lib/caseDraft/pending.ts).
 * Nothing is saved: the editor shows the result, and Salvar keeps it. The material comes from the
 * editor, so unsaved edits in the Material tab count.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const { slug } = await params;
    const body = (await request.json().catch(() => ({}))) as { step?: string; material?: unknown; plan?: unknown; notes?: unknown };
    if (body.step === "discard") {
      await clearPending(slug);
      return adminJson({ ok: true });
    }
    const ctx = await loadDraftContext(slug, body.material !== undefined ? parseMaterial(body.material) : undefined);
    const images = ctx.images.map(i => ({ src: i.src, kind: i.kind ?? null, width: i.width, height: i.height }));
    if (body.step === "plan") {
      const result = await proposePlan(ctx, typeof body.notes === "string" ? body.notes.slice(0, 2000) : "");
      return adminJson({ ...result, images, from: ctx.from });
    }
    const plan = parsePlan(body.plan, ctx.allowed);
    if (body.step === "check") return adminJson({ plan, warnings: planWarnings(plan, ctx.kinds) });
    if (body.step === "write") {
      const result = await writeDraft(ctx, plan);
      // kept until the case is saved, so a page reload during the wait does not lose it
      await savePending(slug, result.body, result.data);
      return adminJson(result);
    }
    return adminJson({ error: "Passo desconhecido." }, 400);
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível gerar o rascunho." }, 422);
  }
}

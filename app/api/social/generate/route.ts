import { NextResponse, type NextRequest } from "next/server";
import { generateSocialDraft, generateSocialReelDraft } from "@/lib/social/ai";
import { hasValidWebhookToken, isSocialAuthenticated } from "@/lib/social/auth";
import { saveSocialPost } from "@/lib/social/store";
import type { TemplatePreset } from "@/lib/social/types";

export async function POST(request: NextRequest) {
  const authorized = hasValidWebhookToken(request) || (await isSocialAuthenticated());
  if (!authorized) {
    return NextResponse.json(
      { error: "Não autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    kind?: "reel" | "carousel";
    idea?: string;
    notes?: string;
    track?: string;
    accent?: string;
    preset?: TemplatePreset;
    slideCount?: number;
    save?: boolean;
  } | null;

  try {
    // Support ReelStudio's "Gerar com IA" payload (`track`, `notes`, etc.)
    if (body?.kind === "reel" || typeof body?.track === "string") {
      const idea = (body?.notes ?? body?.idea ?? "").trim();
      const result = await generateSocialReelDraft({
        idea,
        trackId: body?.track || "chillax-jay-someday",
        accent: body?.accent,
      });
      return NextResponse.json(result);
    }

    const idea = body?.idea?.trim() ?? "";
    if (idea.length < 8) {
      return NextResponse.json(
        { error: "Descreva a ideia com pelo menos 8 caracteres para gerar o carrossel." },
        { status: 400 },
      );
    }

    const preset: TemplatePreset =
      body?.preset === "before_after" || body?.preset === "quick_tip" ? body.preset : "cycle_steps";
    const post = await generateSocialDraft({
      idea,
      preset,
      slideCount: body?.slideCount,
    });

    if (body?.save) {
      await saveSocialPost(post);
    }

    return NextResponse.json({
      post,
      editUrl: `/admin/carrosseis/${encodeURIComponent(post.id)}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar conteúdo com IA.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

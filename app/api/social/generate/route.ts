import { NextResponse, type NextRequest } from "next/server";
import { generateSocialDraft } from "@/lib/social/ai";
import { isSocialAuthenticated, verifyPin } from "@/lib/social/auth";
import { saveSocialPost } from "@/lib/social/store";
import type { TemplatePreset } from "@/lib/social/types";

function hasValidWebhookToken(request: NextRequest): boolean {
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!bearer) return false;
  const webhookSecret = (process.env.SOCIAL_WEBHOOK_SECRET ?? "").trim();
  if (webhookSecret && bearer === webhookSecret) return true;
  return verifyPin(bearer);
}

export async function POST(request: NextRequest) {
  const authorized = hasValidWebhookToken(request) || (await isSocialAuthenticated());
  if (!authorized) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    idea?: string;
    preset?: TemplatePreset;
    slideCount?: number;
    save?: boolean;
  } | null;

  const idea = body?.idea?.trim() ?? "";
  if (idea.length < 8) {
    return NextResponse.json(
      { error: "Descreva a ideia com pelo menos 8 caracteres para gerar o carrossel." },
      { status: 400 },
    );
  }

  try {
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
      editUrl: `/social?id=${encodeURIComponent(post.id)}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar conteúdo com IA.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

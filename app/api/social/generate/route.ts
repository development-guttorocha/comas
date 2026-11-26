import { NextResponse, type NextRequest } from "next/server";
import {
  generateSocialDraft,
  generateSocialReelDraft,
  generateStudioDocument,
  transcribeAudio,
} from "@/lib/social/ai";
import { hasValidWebhookToken, isSocialAuthenticated } from "@/lib/social/auth";
import { saveSocialPost } from "@/lib/social/store";
import type { ArtDirection } from "@/lib/social/studioTypes";
import { isValidTemplatePreset, type TemplatePreset } from "@/lib/social/types";

export async function POST(request: NextRequest) {
  const authorized = hasValidWebhookToken(request) || (await isSocialAuthenticated());
  if (!authorized) {
    return NextResponse.json(
      { error: "Não autorizado." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  // Voice capture: multipart/form-data with audio file -> Whisper transcription (+ optional Studio generation)
  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await request.formData();
      const audio = form.get("audio");
      if (!(audio instanceof File)) {
        return NextResponse.json({ error: "Envie um arquivo de áudio no campo 'audio'." }, { status: 400 });
      }
      const transcript = await transcribeAudio(audio);
      const autoGenerate = form.get("generate") === "1";
      if (!autoGenerate) {
        return NextResponse.json({ transcript });
      }
      const post = await generateStudioDocument({ idea: transcript });
      await saveSocialPost(post);
      return NextResponse.json({
        transcript,
        post,
        editUrl: `/admin/estudio/${encodeURIComponent(post.id)}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao transcrever áudio.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const body = (await request.json().catch(() => null)) as {
    kind?: "reel" | "carousel" | "studio_doc";
    idea?: string;
    notes?: string;
    track?: string;
    accent?: string;
    artDirection?: ArtDirection;
    preset?: TemplatePreset;
    slideCount?: number;
    save?: boolean;
  } | null;

  try {
    if (body?.kind === "studio_doc") {
      const idea = (body.idea ?? "").trim();
      if (idea.length < 8) {
        return NextResponse.json(
          { error: "Descreva a ideia com pelo menos 8 caracteres para gerar o documento." },
          { status: 400 },
        );
      }
      const post = await generateStudioDocument({ idea, artDirection: body.artDirection });
      if (body.save) await saveSocialPost(post);
      return NextResponse.json({
        post,
        editUrl: `/admin/estudio/${encodeURIComponent(post.id)}`,
      });
    }

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

    const preset: TemplatePreset = isValidTemplatePreset(body?.preset) ? body.preset : "repertorio_banca";
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

import { NextResponse, type NextRequest } from "next/server";
import { readForm, UploadError } from "@/lib/admin/form";
import {
  extractSeedFromImage,
  extractSeedFromUrl,
  generateSocialDraft,
  generateSocialReelDraft,
  generateStudioDocument,
  generateStudioVariations,
  rewriteSlideContent,
  transcribeAudio,
  type StudioOutputKind,
} from "@/lib/social/ai";
import { hasValidWebhookToken, isSocialAuthenticated } from "@/lib/social/auth";
import type { SlideContent } from "@/lib/social/canvas";
import { uploadSocialMedia } from "@/lib/social/media";
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

  // Multipart: Voice capture (audio -> Whisper) OR Essay/page photo (image -> Vision seed + media library)
  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await readForm(request, { maxMb: 35 });
      const image = form.get("image");
      if (image instanceof File) {
        const [seed, savedMedia] = await Promise.all([
          extractSeedFromImage(image),
          uploadSocialMedia(image, "redacoes").catch(() => null),
        ]);
        return NextResponse.json({ seed, mediaUrl: savedMedia?.url ?? null });
      }

      const audio = form.get("audio");
      if (!(audio instanceof File)) {
        return NextResponse.json({ error: "Envie um arquivo de áudio ou imagem." }, { status: 400 });
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
      const status = err instanceof UploadError ? err.status : 500;
      const message = err instanceof Error ? err.message : "Erro ao processar o envio.";
      return NextResponse.json({ error: message }, { status });
    }
  }

  const body = (await request.json().catch(() => null)) as {
    kind?: "reel" | "carousel" | "studio_doc" | "studio_variations" | "slide_rewrite" | "seed_url";
    idea?: string;
    url?: string;
    notes?: string;
    track?: string;
    accent?: string;
    artDirection?: ArtDirection;
    preset?: TemplatePreset;
    output?: StudioOutputKind;
    outputs?: StudioOutputKind[];
    paletteId?: string;
    content?: SlideContent;
    instruction?: string;
    slideCount?: number;
    save?: boolean;
  } | null;

  try {
    if (body?.kind === "seed_url") {
      const seed = await extractSeedFromUrl(body.url ?? "");
      return NextResponse.json({ seed });
    }

    if (body?.kind === "slide_rewrite") {
      if (!body.content || typeof body.content.kind !== "string") {
        return NextResponse.json({ error: "Conteúdo do slide ausente." }, { status: 400 });
      }
      const instruction = (body.instruction ?? "").trim();
      if (instruction.length < 3) {
        return NextResponse.json({ error: "Informe o que deseja ajustar no slide." }, { status: 400 });
      }
      const preset: TemplatePreset = isValidTemplatePreset(body.preset) ? body.preset : "repertorio_banca";
      const content = await rewriteSlideContent({ content: body.content, instruction, preset });
      return NextResponse.json({ content });
    }

    if (body?.kind === "studio_variations") {
      const idea = (body.idea ?? "").trim();
      if (idea.length < 8) {
        return NextResponse.json(
          { error: "Descreva a pauta com pelo menos 8 caracteres para gerar variações." },
          { status: 400 },
        );
      }
      const preset: TemplatePreset = isValidTemplatePreset(body.preset) ? body.preset : "repertorio_banca";
      const validOutputs = Array.isArray(body.outputs)
        ? body.outputs.filter((o): o is StudioOutputKind => o === "carousel" || o === "single" || o === "story")
        : undefined;
      const posts = await generateStudioVariations({ idea, preset, outputs: validOutputs });
      return NextResponse.json({ posts });
    }

    if (body?.kind === "studio_doc") {
      const idea = (body.idea ?? "").trim();
      if (idea.length < 8) {
        return NextResponse.json(
          { error: "Descreva a ideia com pelo menos 8 caracteres para gerar o documento." },
          { status: 400 },
        );
      }
      const preset: TemplatePreset = isValidTemplatePreset(body.preset) ? body.preset : "repertorio_banca";
      const post = await generateStudioDocument({
        idea,
        artDirection: body.artDirection,
        preset,
        output: body.output,
        paletteId: body.paletteId,
      });
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

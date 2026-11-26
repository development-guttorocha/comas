import { NextResponse, type NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { isSocialAuthenticated, verifyPin } from "@/lib/social/auth";
import {
  getMuapiBalance,
  getMuapiJobResult,
  isMuapiConfigured,
  MUAPI_PRESETS,
  submitMuapiJob,
} from "@/lib/social/muapi";

function hasValidWebhookToken(request: NextRequest): boolean {
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!bearer) return false;
  const webhookSecret = (process.env.SOCIAL_WEBHOOK_SECRET ?? "").trim();
  if (webhookSecret && bearer === webhookSecret) return true;
  return verifyPin(bearer);
}

async function authorize(request: NextRequest): Promise<boolean> {
  if (hasValidWebhookToken(request)) return true;
  return isSocialAuthenticated();
}

/**
 * Optionally mirrors a completed MuAPI asset URL into Vercel Blob when BLOB_READ_WRITE_TOKEN is set,
 * or returns a data URL for small images when requested (`inlineDataUrl=true` for client PNG export without CORS issues).
 */
async function persistAsset(url: string, inlineDataUrl: boolean): Promise<string> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN && !inlineDataUrl) {
      return url;
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return url;
    const contentType = res.headers.get("content-type") || "image/png";
    const buf = Buffer.from(await res.arrayBuffer());

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const ext = contentType.includes("mp4") || url.endsWith(".mp4")
        ? "mp4"
        : contentType.includes("jpeg") || contentType.includes("jpg")
          ? "jpg"
          : contentType.includes("webp")
            ? "webp"
            : "png";
      const uploaded = await put(`muapi/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`, buf, {
        access: "public",
        contentType,
      });
      return uploaded.url;
    }

    if (inlineDataUrl && contentType.startsWith("image/") && buf.byteLength <= 4 * 1024 * 1024) {
      return `data:${contentType};base64,${buf.toString("base64")}`;
    }

    return url;
  } catch {
    return url;
  }
}

export async function GET(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const requestId = request.nextUrl.searchParams.get("id")?.trim();
  const inlineDataUrl = request.nextUrl.searchParams.get("inline") === "1";

  try {
    if (requestId) {
      const result = await getMuapiJobResult(requestId);
      if (result.status === "completed" && result.outputs.length > 0) {
        const persisted = await persistAsset(result.outputs[0]!, inlineDataUrl);
        return NextResponse.json({ ...result, outputs: [persisted, ...result.outputs.slice(1)] });
      }
      return NextResponse.json(result);
    }

    if (!isMuapiConfigured()) {
      return NextResponse.json({ configured: false, presets: MUAPI_PRESETS });
    }

    const balance = await getMuapiBalance().catch(() => ({ configured: true, balance: null }));
    return NextResponse.json({
      ...balance,
      presets: MUAPI_PRESETS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro na MuAPI.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    model?: string;
    prompt?: string;
    params?: Record<string, unknown>;
    inline?: boolean;
  } | null;

  const model = body?.model?.trim() || "z-image-turbo";
  const prompt = body?.prompt?.trim() || "";
  if (prompt.length < 3) {
    return NextResponse.json({ error: "Descreva a imagem ou vídeo que deseja gerar." }, { status: 400 });
  }

  try {
    const job = await submitMuapiJob({
      model,
      prompt,
      params: body?.params,
    });

    // Sandbox keys return status="completed" immediately on submit
    if (job.status === "completed" && job.outputs.length > 0) {
      const persisted = await persistAsset(job.outputs[0]!, Boolean(body?.inline));
      return NextResponse.json({ ...job, outputs: [persisted, ...job.outputs.slice(1)] });
    }

    return NextResponse.json(job);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao enviar geração para a MuAPI.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

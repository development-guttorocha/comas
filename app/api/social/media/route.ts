import { NextResponse, type NextRequest } from "next/server";
import { readForm, UploadError } from "@/lib/admin/form";
import { hasValidWebhookToken, isSocialAuthenticated } from "@/lib/social/auth";
import { deleteSocialMedia, listSocialMedia, uploadSocialMedia } from "@/lib/social/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

async function authorized(request: NextRequest): Promise<boolean> {
  return hasValidWebhookToken(request) || (await isSocialAuthenticated());
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401, headers: NO_STORE });
  }
  try {
    const items = await listSocialMedia();
    return NextResponse.json({ items, files: items }, { headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Não foi possível listar a mídia.";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401, headers: NO_STORE });
  }
  try {
    const form = await readForm(request, { maxMb: 50 });
    const file = form.get("file");
    const folder = typeof form.get("folder") === "string" ? String(form.get("folder")) : "estudio";
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Escolha uma imagem ou vídeo para enviar." }, { status: 400, headers: NO_STORE });
    }
    const saved = await uploadSocialMedia(file, folder);
    return NextResponse.json({ file: saved, item: saved }, { headers: NO_STORE });
  } catch (err) {
    const status = err instanceof UploadError ? err.status : 422;
    const message = err instanceof Error ? err.message : "Não foi possível enviar o arquivo.";
    return NextResponse.json({ error: message }, { status, headers: NO_STORE });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401, headers: NO_STORE });
  }
  const body = (await request.json().catch(() => null)) as { urls?: unknown } | null;
  if (!Array.isArray(body?.urls) || !body.urls.length || body.urls.some(u => typeof u !== "string")) {
    return NextResponse.json({ error: "Escolha os arquivos para excluir." }, { status: 400, headers: NO_STORE });
  }
  try {
    const removed = await deleteSocialMedia(body.urls as string[]);
    return NextResponse.json({ removed }, { headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Não foi possível excluir.";
    return NextResponse.json({ error: message }, { status: 422, headers: NO_STORE });
  }
}

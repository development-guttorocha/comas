import { NextResponse, type NextRequest } from "next/server";
import { getConfiguredAiProvider } from "@/lib/social/ai";
import {
  isSocialAuthRequired,
  isSocialAuthenticated,
  makeSessionToken,
  SOCIAL_COOKIE_NAME,
  verifyPin,
} from "@/lib/social/auth";
import { deleteSocialPost, listSocialState, saveSocialPost, saveSocialTheme } from "@/lib/social/store";
import type { SocialPost, SocialTheme } from "@/lib/social/types";

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

export async function GET(request: NextRequest) {
  const authRequired = isSocialAuthRequired();
  const authenticated = await authorize(request);
  if (!authenticated) {
    return NextResponse.json({ authRequired, authenticated: false }, { status: 401 });
  }

  const state = await listSocialState();
  return NextResponse.json({
    ...state,
    aiProvider: getConfiguredAiProvider(),
    authRequired,
    authenticated: true,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400 });
  }

  if (body.action === "auth") {
    const pin = typeof body.pin === "string" ? body.pin : "";
    if (!verifyPin(pin)) {
      return NextResponse.json({ error: "PIN incorreto." }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    if (isSocialAuthRequired()) {
      res.cookies.set(SOCIAL_COOKIE_NAME, makeSessionToken(), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return res;
  }

  if (body.action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(SOCIAL_COOKIE_NAME);
    return res;
  }

  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    if (body.action === "save_theme" && body.theme) {
      const theme = await saveSocialTheme(body.theme as SocialTheme);
      return NextResponse.json({ theme });
    }

    const post = (body.post ?? body) as SocialPost;
    if (!post?.id || !Array.isArray(post.slides)) {
      return NextResponse.json({ error: "Post inválido: informe id e slides." }, { status: 400 });
    }

    const saved = await saveSocialPost(post);
    return NextResponse.json(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao salvar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Informe ?id=..." }, { status: 400 });
  }

  try {
    await deleteSocialPost(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao excluir.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

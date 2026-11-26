import { NextResponse, type NextRequest } from "next/server";
import { hydrateRuntimeKeys } from "@/lib/admin/apiKeys";
import { getConfiguredAiProvider } from "@/lib/social/ai";
import {
  clearSessionCookie,
  getSocialSession,
  hasValidWebhookToken,
  sendLoginCode,
  setSessionCookie,
  verifyLoginCode,
} from "@/lib/social/auth";
import { deleteSocialPost, listSocialState, saveSocialPost, saveSocialTheme } from "@/lib/social/store";
import type { SocialPost, SocialTheme } from "@/lib/social/types";

const NO_STORE = { "Cache-Control": "no-store" };

async function authorize(request: NextRequest): Promise<boolean> {
  if (hasValidWebhookToken(request)) return true;
  const session = await getSocialSession();
  return session.authenticated;
}

export async function GET(request: NextRequest) {
  const session = await getSocialSession();
  const webhookAuthorized = hasValidWebhookToken(request);

  if (!session.authenticated && !webhookAuthorized) {
    return NextResponse.json(
      {
        error: "Não autorizado.",
        authMode: session.authMode,
        authRequired: session.authRequired,
        configured: session.configured,
        missingEnv: session.missingEnv,
        authenticated: false,
      },
      { status: 401, headers: NO_STORE },
    );
  }

  await hydrateRuntimeKeys();

  if (request.nextUrl.searchParams.get("session") === "1") {
    return NextResponse.json(
      {
        authMode: session.authMode,
        authRequired: session.authRequired,
        configured: session.configured,
        missingEnv: session.missingEnv,
        authenticated: true,
        email: session.email,
        aiProvider: getConfiguredAiProvider(),
      },
      { headers: NO_STORE },
    );
  }

  const state = await listSocialState();
  return NextResponse.json(
    {
      ...state,
      aiProvider: getConfiguredAiProvider(),
      authMode: session.authMode,
      authRequired: session.authRequired,
      configured: session.configured,
      missingEnv: session.missingEnv,
      authenticated: true,
      email: session.email,
    },
    { headers: NO_STORE },
  );
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400, headers: NO_STORE });
  }

  if (body.action === "request_code") {
    const email = typeof body.email === "string" ? body.email : "";
    try {
      const { challengeToken } = await sendLoginCode(email);
      return NextResponse.json({ challengeToken }, { headers: NO_STORE });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao enviar código.";
      return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE });
    }
  }

  if (body.action === "verify_code") {
    const challengeToken = typeof body.challengeToken === "string" ? body.challengeToken : "";
    const code = typeof body.code === "string" ? body.code : "";
    try {
      const { email } = verifyLoginCode(challengeToken, code);
      const res = NextResponse.json({ ok: true, email }, { headers: NO_STORE });
      setSessionCookie(res, email);
      return res;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Código inválido.";
      return NextResponse.json({ error: message }, { status: 401, headers: NO_STORE });
    }
  }

  if (body.action === "logout") {
    const res = NextResponse.json({ ok: true }, { headers: NO_STORE });
    clearSessionCookie(res);
    return res;
  }

  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401, headers: NO_STORE });
  }

  try {
    if (body.action === "save_theme" && body.theme) {
      const theme = await saveSocialTheme(body.theme as SocialTheme);
      return NextResponse.json({ theme }, { headers: NO_STORE });
    }

    const post = (body.post ?? body) as SocialPost;
    if (!post?.id || !Array.isArray(post.slides)) {
      return NextResponse.json(
        { error: "Post inválido: informe id e slides." },
        { status: 400, headers: NO_STORE },
      );
    }

    const saved = await saveSocialPost(post);
    return NextResponse.json(saved, { headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao salvar.";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401, headers: NO_STORE });
  }

  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Informe ?id=..." }, { status: 400, headers: NO_STORE });
  }

  try {
    await deleteSocialPost(id);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao excluir.";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE });
  }
}

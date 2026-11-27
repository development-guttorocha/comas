import { NextResponse, type NextRequest } from "next/server";
import {
  clearSessionCookie,
  getSocialSession,
  sendLoginCode,
  setSessionCookie,
  verifyLoginCode,
} from "@/lib/social/auth";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const session = await getSocialSession();
  return NextResponse.json(session, {
    status: session.authenticated ? 200 : 401,
    headers: NO_STORE,
  });
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
      const { hydrateExtraAdminEmails } = await import("@/lib/admin/apiKeys");
      await hydrateExtraAdminEmails(false);
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

  return NextResponse.json({ error: "Ação inválida." }, { status: 400, headers: NO_STORE });
}

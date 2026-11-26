import { NextResponse } from "next/server";
import { createSession, sameOrigin, validPassword, SESSION_COOKIE } from "@/lib/translations/auth";
import { adminNotFound, translationAdminRequestAvailable } from "@/lib/translations/access";
export async function POST(request: Request) {
  if (!translationAdminRequestAvailable(request)) return adminNotFound();
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  const { password } = await request.json();
  if (typeof password !== "string" || !validPassword(password)) return NextResponse.json({ error: "Acesso inválido." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSession(process.env.TRANSLATION_ADMIN_TOKEN!), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 28800, path: "/" });
  return response;
}
export async function DELETE(request: Request) {
  if (!translationAdminRequestAvailable(request)) return adminNotFound();
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  const response = NextResponse.json({ ok: true }); response.cookies.delete(SESSION_COOKIE); return response;
}

import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SOCIAL_COOKIE_NAME = "texto_em_ciclo_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const CODE_TTL_MS = 1000 * 60 * 10; // 10 minutes

function getSigningSecret(): string {
  return (
    process.env.AUTH_SECRET ??
    process.env.RESEND_API_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SOCIAL_ACCESS_PIN ??
    "texto-em-ciclo-dev-secret"
  ).trim();
}

export function getAllowedEmails(): string[] {
  return (process.env.ALLOWED_ADMIN_EMAILS ?? "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

export function getSocialPin(): string {
  return (process.env.SOCIAL_ACCESS_PIN ?? "").trim();
}

export type AuthMode = "email" | "pin" | "none";

export function getAuthMode(): AuthMode {
  if (getAllowedEmails().length > 0) return "email";
  if (getSocialPin().length > 0) return "pin";
  return "none";
}

export function isSocialAuthRequired(): boolean {
  return getAuthMode() !== "none";
}

export function isAllowedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return getAllowedEmails().includes(normalized);
}

function sign(payloadB64: string): string {
  return createHmac("sha256", getSigningSecret()).update(payloadB64).digest("base64url");
}

function safeEqual(aStr: string, bStr: string): boolean {
  const a = Buffer.from(aStr);
  const b = Buffer.from(bStr);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function hashCode(email: string, code: string): string {
  return createHash("sha256")
    .update(`${email.trim().toLowerCase()}::${code.trim()}::${getSigningSecret()}`)
    .digest("hex");
}

export function verifyPin(inputPin: string): boolean {
  const expected = getSocialPin();
  if (!expected) return false;
  return safeEqual(inputPin.trim(), expected);
}

export function makeSessionToken(email = "pin"): string {
  const payload = Buffer.from(
    JSON.stringify({ email: email.trim().toLowerCase(), exp: Date.now() + SESSION_TTL_MS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): { valid: boolean; email?: string } {
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false };
  const [payloadB64, sig] = parts as [string, string];
  if (!safeEqual(sig, sign(payloadB64))) return { valid: false };
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
      email?: string;
      exp?: number;
    };
    if (!parsed.exp || Date.now() > parsed.exp) return { valid: false };
    return { valid: true, email: parsed.email };
  } catch {
    return { valid: false };
  }
}

export async function getSocialSession(): Promise<{
  authMode: AuthMode;
  authRequired: boolean;
  authenticated: boolean;
  email?: string;
}> {
  const authMode = getAuthMode();
  if (authMode === "none") {
    return { authMode, authRequired: false, authenticated: true };
  }
  const store = await cookies();
  const token = store.get(SOCIAL_COOKIE_NAME)?.value ?? "";
  if (!token) {
    return { authMode, authRequired: true, authenticated: false };
  }
  const verified = verifySessionToken(token);
  return {
    authMode,
    authRequired: true,
    authenticated: verified.valid,
    email: verified.email,
  };
}

export async function isSocialAuthenticated(): Promise<boolean> {
  const session = await getSocialSession();
  return session.authenticated;
}

export async function sendLoginCode(rawEmail: string): Promise<{ challengeToken: string }> {
  const email = rawEmail.trim().toLowerCase();
  if (!isAllowedEmail(email)) {
    throw new Error("E-mail não autorizado para este estúdio.");
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    throw new Error("RESEND_API_KEY não configurada no servidor.");
  }

  const code = String(randomInt(100000, 999999));
  const exp = Date.now() + CODE_TTL_MS;
  const payloadB64 = Buffer.from(
    JSON.stringify({ email, exp, codeHash: hashCode(email, code) }),
  ).toString("base64url");
  const challengeToken = `${payloadB64}.${sign(payloadB64)}`;

  const from =
    process.env.AUTH_FROM?.trim() ||
    process.env.LEADS_FROM?.trim() ||
    "Texto em Ciclo <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `Seu código de acesso: ${code} · Texto em Ciclo`,
      html: `
        <div style="font-family:sans-serif;max-width:460px;margin:0 auto;padding:24px;color:#1e2a2f">
          <h2 style="margin:0 0 12px">Texto em Ciclo · Social Studio</h2>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.5">
            Use o código abaixo para entrar no estúdio. Ele expira em 10 minutos.
          </p>
          <div style="font-size:32px;font-weight:700;letter-spacing:6px;padding:16px 20px;background:#f7f3eb;border-radius:12px;text-align:center;color:#c85a32">
            ${code}
          </div>
        </div>
      `,
      text: `Texto em Ciclo · Social Studio\n\nSeu código de acesso (válido por 10 minutos): ${code}`,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Resend recusou o envio (${res.status}): ${errText.slice(0, 180)}`);
  }

  return { challengeToken };
}

export function verifyLoginCode(challengeToken: string, inputCode: string): { email: string } {
  const parts = challengeToken.split(".");
  if (parts.length !== 2) {
    throw new Error("Desafio inválido. Peça um novo código.");
  }
  const [payloadB64, sig] = parts as [string, string];
  if (!safeEqual(sig, sign(payloadB64))) {
    throw new Error("Assinatura do código inválida.");
  }
  const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
    email?: string;
    exp?: number;
    codeHash?: string;
  };
  if (!parsed.email || !parsed.exp || !parsed.codeHash) {
    throw new Error("Desafio incompleto. Peça um novo código.");
  }
  if (Date.now() > parsed.exp) {
    throw new Error("Código expirado. Peça um novo código.");
  }
  const expectedHash = hashCode(parsed.email, inputCode);
  if (!safeEqual(expectedHash, parsed.codeHash)) {
    throw new Error("Código incorreto.");
  }
  return { email: parsed.email };
}

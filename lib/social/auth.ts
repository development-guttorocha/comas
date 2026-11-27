import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";

export const SOCIAL_COOKIE_NAME = "texto_em_ciclo_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const CODE_TTL_MS = 1000 * 60 * 10; // 10 minutes
const DEFAULT_AUTH_FROM = "Texto em Ciclo <oi@guttorocha.com.br>";
const FALLBACK_RESEND_FROM = "Texto em Ciclo <onboarding@resend.dev>";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type AuthMode = "email" | "unconfigured";

export type SocialSession = {
  authMode: AuthMode;
  authRequired: true;
  configured: boolean;
  missingEnv: string[];
  authenticated: boolean;
  email?: string;
};

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function getSigningSecret(): string {
  return firstNonEmpty(
    process.env.AUTH_SECRET,
    process.env.RESEND_API_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function normalizeAuthEmail(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 200);
}

export function normalizeOtpCode(raw: string): string {
  const digits = raw.replace(/\D+/g, "");
  return digits.length === 6 ? digits : "";
}

export function getEnvAllowedEmails(): string[] {
  return (process.env.ALLOWED_ADMIN_EMAILS ?? "")
    .split(/[,;\n]+/)
    .map(e => normalizeAuthEmail(e))
    .filter(e => EMAIL_RE.test(e));
}

export function getExtraAllowedEmails(): string[] {
  return (process.env.EXTRA_ADMIN_EMAILS ?? "")
    .split(/[,;\n]+/)
    .map(e => normalizeAuthEmail(e))
    .filter(e => EMAIL_RE.test(e));
}

export function getAllowedEmails(): string[] {
  return [...new Set([...getEnvAllowedEmails(), ...getExtraAllowedEmails()])];
}

export function isEnvAllowedEmail(email: string): boolean {
  const normalized = normalizeAuthEmail(email);
  if (!EMAIL_RE.test(normalized)) return false;
  return getEnvAllowedEmails().includes(normalized);
}

export function getMissingAuthEnv(): string[] {
  const missing: string[] = [];
  if (getAllowedEmails().length === 0) missing.push("ALLOWED_ADMIN_EMAILS");
  if (!firstNonEmpty(process.env.RESEND_API_KEY)) missing.push("RESEND_API_KEY");
  return missing;
}

export function getAuthMode(): AuthMode {
  return getMissingAuthEnv().length === 0 ? "email" : "unconfigured";
}

/** Authentication is always required (fail-closed, even when env vars are missing). */
export function isSocialAuthRequired(): true {
  return true;
}

export function isAllowedEmail(email: string): boolean {
  const normalized = normalizeAuthEmail(email);
  if (!EMAIL_RE.test(normalized)) return false;
  return getAllowedEmails().includes(normalized);
}

function safeEqual(aStr: string, bStr: string): boolean {
  if (!aStr || !bStr) return false;
  const a = Buffer.from(aStr, "utf8");
  const b = Buffer.from(bStr, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function signPayload(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

function hashOtpCode(email: string, code: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`texto-em-ciclo-otp:${normalizeAuthEmail(email)}:${code}`)
    .digest("hex");
}

export function hasValidWebhookToken(request: Request): boolean {
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const webhookSecret = firstNonEmpty(process.env.SOCIAL_WEBHOOK_SECRET);
  if (!bearer || !webhookSecret) return false;
  return safeEqual(bearer, webhookSecret);
}

export function makeSessionToken(rawEmail: string): string {
  const email = normalizeAuthEmail(rawEmail);
  const secret = getSigningSecret();
  if (!secret) {
    throw new Error("Segredo de sessão não configurado (defina AUTH_SECRET ou RESEND_API_KEY).");
  }
  if (!isAllowedEmail(email)) {
    throw new Error("E-mail não autorizado para iniciar sessão.");
  }
  const invited = !isEnvAllowedEmail(email);
  const payloadB64 = Buffer.from(
    JSON.stringify({
      purpose: "session",
      email,
      exp: Date.now() + SESSION_TTL_MS,
      ...(invited ? { invited: true } : {}),
    }),
  ).toString("base64url");
  return `${payloadB64}.${signPayload(payloadB64, secret)}`;
}

export function verifySessionToken(
  token: string | undefined | null,
  opts?: { allowColdInvited?: boolean },
): { valid: boolean; email?: string } {
  if (!token) return { valid: false };
  const secret = getSigningSecret();
  if (!secret) return { valid: false };

  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false };
  const [payloadB64, sig] = parts as [string, string];
  if (!safeEqual(sig, signPayload(payloadB64, secret))) return { valid: false };

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
      purpose?: string;
      email?: string;
      exp?: number;
      invited?: boolean;
    };
    if (parsed.purpose !== "session") return { valid: false };
    if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp) || Date.now() > parsed.exp) {
      return { valid: false };
    }
    if (typeof parsed.email !== "string" || !EMAIL_RE.test(normalizeAuthEmail(parsed.email))) {
      return { valid: false };
    }
    if (isAllowedEmail(parsed.email)) {
      return { valid: true, email: normalizeAuthEmail(parsed.email) };
    }
    if (opts?.allowColdInvited && parsed.invited === true && process.env.EXTRA_ADMIN_EMAILS === undefined) {
      return { valid: true, email: normalizeAuthEmail(parsed.email) };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

function peekTokenInvited(token: string): boolean {
  const payloadB64 = token.split(".")[0];
  if (!payloadB64) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as { invited?: boolean };
    return parsed?.invited === true;
  } catch {
    return false;
  }
}

function readCookieFromHeader(cookieHeader: string | null, name: string): string {
  if (!cookieHeader) return "";
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return part.slice(idx + 1).trim();
      }
    }
  }
  return "";
}

export function buildSocialSessionFromToken(
  token: string | undefined | null,
  opts?: { allowColdInvited?: boolean },
): SocialSession {
  const missingEnv = getMissingAuthEnv();
  const configured = missingEnv.length === 0;
  const authMode: AuthMode = configured ? "email" : "unconfigured";

  if (!configured) {
    return {
      authMode,
      authRequired: true,
      configured: false,
      missingEnv,
      authenticated: false,
    };
  }

  const verified = verifySessionToken(token, opts);
  return {
    authMode,
    authRequired: true,
    configured: true,
    missingEnv: [],
    authenticated: verified.valid,
    email: verified.valid ? verified.email : undefined,
  };
}

export function getRequestSocialSession(request: Request): SocialSession {
  const token = readCookieFromHeader(request.headers.get("cookie"), SOCIAL_COOKIE_NAME);
  return buildSocialSessionFromToken(token, { allowColdInvited: true });
}

export function isRequestSocialAuthenticated(request: Request): boolean {
  return getRequestSocialSession(request).authenticated;
}

export async function getSocialSession(): Promise<SocialSession> {
  const store = await cookies();
  const token = store.get(SOCIAL_COOKIE_NAME)?.value ?? "";
  if (token && peekTokenInvited(token)) {
    const { hydrateExtraAdminEmails } = await import("@/lib/admin/apiKeys");
    await hydrateExtraAdminEmails(false);
  }
  return buildSocialSessionFromToken(token);
}

export async function isSocialAuthenticated(): Promise<boolean> {
  const session = await getSocialSession();
  return session.authenticated;
}

export function sanitizeNextPath(raw: string | null | undefined): string {
  const candidate = (raw ?? "").trim();
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.startsWith("/\\") ||
    candidate === "/admin" ||
    candidate === "/admin/login" ||
    candidate.startsWith("/admin/login?")
  ) {
    return "/admin/estudio";
  }
  return candidate;
}

export async function requireSocialSession(currentPath = "/admin/estudio"): Promise<SocialSession> {
  const store = await cookies();
  const hadCookie = Boolean(store.get(SOCIAL_COOKIE_NAME)?.value);
  const session = await getSocialSession();
  if (!session.authenticated) {
    const safeNext = sanitizeNextPath(currentPath);
    const params = new URLSearchParams();
    if (safeNext !== "/admin/estudio") params.set("next", safeNext);
    if (hadCookie) params.set("revoked", "1");
    const qs = params.toString();
    redirect(qs ? `/admin/login?${qs}` : "/admin/login");
  }
  return session;
}

export function setSessionCookie(res: NextResponse, email: string): void {
  res.cookies.set(SOCIAL_COOKIE_NAME, makeSessionToken(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SOCIAL_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

async function postResendOtpEmail({
  apiKey,
  from,
  to,
  code,
}: {
  apiKey: string;
  from: string;
  to: string;
  code: string;
}): Promise<Response> {
  const formatted = `${code.slice(0, 3)} ${code.slice(3)}`;
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Seu código de acesso: ${code} · Texto em Ciclo`,
      html: `
        <div style="font-family:sans-serif;max-width:460px;margin:0 auto;padding:24px;color:#1e2a2f">
          <h2 style="margin:0 0 12px">Texto em Ciclo · Admin</h2>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.5">
            Use o código abaixo para entrar no painel. Ele expira em 10 minutos.
          </p>
          <div style="font-size:32px;font-weight:700;letter-spacing:6px;padding:16px 20px;background:#f7f3eb;border-radius:12px;text-align:center;color:#c85a32">
            ${formatted}
          </div>
        </div>
      `,
      text: `Texto em Ciclo · Admin\n\nSeu código de acesso (válido por 10 minutos): ${code}`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

export async function sendLoginCode(rawEmail: string): Promise<{ challengeToken: string }> {
  const email = normalizeAuthEmail(rawEmail);
  if (!EMAIL_RE.test(email)) {
    throw new Error("Informe um endereço de e-mail válido.");
  }

  if (!isAllowedEmail(email)) {
    const { hydrateExtraAdminEmails } = await import("@/lib/admin/apiKeys");
    await hydrateExtraAdminEmails(true);
  }

  const missingEnv = getMissingAuthEnv();
  if (missingEnv.length > 0) {
    throw new Error(
      `Autenticação bloqueada: configure ${missingEnv.join(" e ")} nas variáveis de ambiente.`,
    );
  }

  if (!isAllowedEmail(email)) {
    throw new Error("E-mail não autorizado para este painel.");
  }

  const resendKey = firstNonEmpty(process.env.RESEND_API_KEY);
  const secret = getSigningSecret();
  if (!resendKey || !secret) {
    throw new Error("RESEND_API_KEY não configurada no servidor.");
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const exp = Date.now() + CODE_TTL_MS;
  const payloadB64 = Buffer.from(
    JSON.stringify({
      purpose: "challenge",
      email,
      exp,
      codeHash: hashOtpCode(email, code, secret),
    }),
  ).toString("base64url");
  const challengeToken = `${payloadB64}.${signPayload(payloadB64, secret)}`;

  const explicitFrom = firstNonEmpty(process.env.AUTH_FROM, process.env.LEADS_FROM);
  const primaryFrom = explicitFrom || DEFAULT_AUTH_FROM;

  let res = await postResendOtpEmail({ apiKey: resendKey, from: primaryFrom, to: email, code });
  let errText = res.ok ? "" : await res.text().catch(() => "");

  // If no custom sender was configured and the Resend account hasn't verified guttorocha.com.br,
  // retry once with Resend's sandbox sender so fresh accounts still deliver to their owner.
  if (!res.ok && !explicitFrom && res.status === 403 && /domain is not verified/i.test(errText)) {
    res = await postResendOtpEmail({ apiKey: resendKey, from: FALLBACK_RESEND_FROM, to: email, code });
    errText = res.ok ? "" : await res.text().catch(() => "");
  }

  if (!res.ok) {
    if (res.status === 403 && /only send testing emails/i.test(errText)) {
      throw new Error(
        "O Resend está em modo de teste e só envia para o dono da conta. Configure AUTH_FROM com um domínio verificado no Resend.",
      );
    }
    throw new Error(`Resend recusou o envio (${res.status}): ${errText.slice(0, 180)}`);
  }

  return { challengeToken };
}

export function verifyLoginCode(challengeToken: string, inputCode: string): { email: string } {
  const missingEnv = getMissingAuthEnv();
  if (missingEnv.length > 0) {
    throw new Error(
      `Autenticação bloqueada: configure ${missingEnv.join(" e ")} nas variáveis de ambiente.`,
    );
  }

  const cleanCode = normalizeOtpCode(inputCode);
  if (!cleanCode) {
    throw new Error("Digite os 6 dígitos do código.");
  }

  const secret = getSigningSecret();
  if (!secret) {
    throw new Error("Segredo de autenticação ausente no servidor.");
  }

  const parts = challengeToken.split(".");
  if (parts.length !== 2) {
    throw new Error("Desafio inválido. Peça um novo código.");
  }
  const [payloadB64, sig] = parts as [string, string];
  if (!safeEqual(sig, signPayload(payloadB64, secret))) {
    throw new Error("Assinatura do código inválida. Peça um novo código.");
  }

  let parsed: {
    purpose?: string;
    email?: string;
    exp?: number;
    codeHash?: string;
  };
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    throw new Error("Desafio inválido. Peça um novo código.");
  }

  if (parsed.purpose !== "challenge" || !parsed.email || typeof parsed.exp !== "number" || !parsed.codeHash) {
    throw new Error("Desafio incompleto. Peça um novo código.");
  }
  if (Date.now() > parsed.exp) {
    throw new Error("Código expirado. Peça um novo código.");
  }
  if (!isAllowedEmail(parsed.email)) {
    throw new Error("E-mail não autorizado para este painel.");
  }

  const expectedHash = hashOtpCode(parsed.email, cleanCode, secret);
  if (!safeEqual(expectedHash, parsed.codeHash)) {
    throw new Error("Código incorreto.");
  }
  return { email: normalizeAuthEmail(parsed.email) };
}

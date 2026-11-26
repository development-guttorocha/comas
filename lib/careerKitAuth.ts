import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createEmptyWorkbook, sanitizeWorkbook, type CareerKitWorkbook } from "@/lib/careerKitWorkbook";
import { getSupabaseConfig, supabaseHeaders, type SupabaseConfig } from "@/lib/supabase";

/**
 * Passwordless Email OTP (6-digit token) authentication and cloud workbook persistence
 * backed by Supabase (`career_kit_users`, `career_kit_tokens`, `career_kit_sessions`, `career_kit_workbooks`).
 */

export const CAREER_SESSION_COOKIE = "gr_career_session";
export const OTP_TTL_MS = 15 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const OTP_COOLDOWN_MS = 45 * 1000;
export const OTP_MAX_PER_HOUR = 5;
export const OTP_MAX_ATTEMPTS = 5;

const TIMEOUT_MS = 8_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type CareerKitUser = {
  id: string;
  email: string;
  name: string;
  optIn: boolean;
};

export type CareerKitSession = {
  sessionId: string;
  user: CareerKitUser;
};

export const normalizeEmail = (raw: string) => raw.trim().toLowerCase().slice(0, 200);
export const isValidEmail = (email: string) => EMAIL_RE.test(normalizeEmail(email));

export function normalizeOtpCode(raw: string): string {
  const digits = raw.replace(/\D+/g, "");
  return digits.length === 6 ? digits : "";
}

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function resolveSigningSecret(override?: string): string {
  const secret = (
    override ??
    process.env.CAREER_KIT_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.TRANSLATION_ADMIN_TOKEN ??
    ""
  ).trim();
  if (!secret) throw new Error("Segredo do servidor não configurado para autenticação.");
  return secret;
}

export function hashOtpCode(email: string, code: string, secret?: string): string {
  const key = resolveSigningSecret(secret);
  return createHmac("sha256", key).update(`${normalizeEmail(email)}:${code}`).digest("hex");
}

export function verifyOtpHash(
  email: string,
  code: string,
  expectedHash: string,
  secret?: string,
): boolean {
  const cleanCode = normalizeOtpCode(code);
  if (!cleanCode || !expectedHash) return false;
  const actualHex = hashOtpCode(email, cleanCode, secret);
  const left = Buffer.from(actualHex, "utf8");
  const right = Buffer.from(expectedHash, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

async function sbFetch(
  config: SupabaseConfig,
  path: string,
  init: RequestInit & { extraHeaders?: Record<string, string> } = {},
): Promise<Response> {
  const { extraHeaders, ...rest } = init;
  return fetch(`${config.url}${path}`, {
    ...rest,
    headers: supabaseHeaders(config.key, extraHeaders),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

type TokenRow = {
  id: string;
  email: string;
  name: string;
  opt_in: boolean;
  code_hash: string;
  attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  opt_in: boolean;
  verified_at: string | null;
};

export type RequestOtpResult =
  | { ok: true; code: string; expiresAt: string }
  | { ok: false; reason: "config" | "cooldown" | "rate_limit" | "error"; message: string; retryAfterSeconds?: number };

export async function requestOtpForEmail({
  email,
  name,
  optIn,
}: {
  email: string;
  name?: string;
  optIn?: boolean;
}): Promise<RequestOtpResult> {
  const config = getSupabaseConfig();
  if (!config) {
    return { ok: false, reason: "config", message: "Banco de dados indisponível no momento." };
  }

  const cleanEmail = normalizeEmail(email);
  const cleanName = (name ?? "").trim().slice(0, 120);
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();

  try {
    const recentRes = await sbFetch(
      config,
      `/rest/v1/career_kit_tokens?select=id,created_at&email=eq.${encodeURIComponent(cleanEmail)}&created_at=gte.${encodeURIComponent(oneHourAgo)}&order=created_at.desc&limit=10`,
      { method: "GET" },
    );
    if (!recentRes.ok) {
      return { ok: false, reason: "error", message: "Não consegui preparar seu código agora." };
    }
    const recent = (await recentRes.json()) as Array<{ id: string; created_at: string }>;
    const latest = recent[0];
    if (latest) {
      const elapsed = now - Date.parse(latest.created_at);
      if (Number.isFinite(elapsed) && elapsed < OTP_COOLDOWN_MS) {
        const waitSec = Math.max(1, Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000));
        return {
          ok: false,
          reason: "cooldown",
          retryAfterSeconds: waitSec,
          message: `Aguarde ${waitSec}s antes de pedir outro código.`,
        };
      }
    }
    if (recent.length >= OTP_MAX_PER_HOUR) {
      return {
        ok: false,
        reason: "rate_limit",
        message: "Muitos códigos pedidos em seguida. Aguarde alguns minutos e tente novamente.",
      };
    }

    const nowIso = new Date(now).toISOString();
    // Invalidate earlier unconsumed codes for this e-mail before issuing a new one.
    await sbFetch(
      config,
      `/rest/v1/career_kit_tokens?email=eq.${encodeURIComponent(cleanEmail)}&consumed_at=is.null`,
      {
        method: "PATCH",
        extraHeaders: { Prefer: "return=minimal" },
        body: JSON.stringify({ consumed_at: nowIso }),
      },
    );

    const code = generateOtpCode();
    const codeHash = hashOtpCode(cleanEmail, code);
    const expiresAt = new Date(now + OTP_TTL_MS).toISOString();

    const insertRes = await sbFetch(config, "/rest/v1/career_kit_tokens", {
      method: "POST",
      extraHeaders: { Prefer: "return=minimal" },
      body: JSON.stringify({
        email: cleanEmail,
        name: cleanName,
        opt_in: Boolean(optIn),
        code_hash: codeHash,
        attempts: 0,
        expires_at: expiresAt,
      }),
    });

    if (!insertRes.ok) {
      return { ok: false, reason: "error", message: "Não consegui gerar seu código agora." };
    }

    return { ok: true, code, expiresAt };
  } catch {
    return { ok: false, reason: "error", message: "Falha de conexão ao gerar código." };
  }
}

export type VerifyOtpResult =
  | { ok: true; user: CareerKitUser; rawSessionToken: string; isFirstVerification: boolean }
  | { ok: false; error: string };

export async function verifyOtpAndCreateSession({
  email,
  code,
}: {
  email: string;
  code: string;
}): Promise<VerifyOtpResult> {
  const config = getSupabaseConfig();
  if (!config) return { ok: false, error: "Serviço indisponível no momento." };

  const cleanEmail = normalizeEmail(email);
  const cleanCode = normalizeOtpCode(code);
  if (!isValidEmail(cleanEmail)) return { ok: false, error: "E-mail inválido." };
  if (!cleanCode) return { ok: false, error: "Informe os 6 dígitos do código enviado por e-mail." };

  try {
    const tokenRes = await sbFetch(
      config,
      `/rest/v1/career_kit_tokens?select=id,email,name,opt_in,code_hash,attempts,expires_at,consumed_at,created_at&email=eq.${encodeURIComponent(cleanEmail)}&consumed_at=is.null&order=created_at.desc&limit=1`,
      { method: "GET" },
    );
    if (!tokenRes.ok) return { ok: false, error: "Não consegui conferir seu código agora." };

    const tokens = (await tokenRes.json()) as TokenRow[];
    const token = tokens[0];
    if (!token) {
      return { ok: false, error: "Código expirado ou já usado. Peça um novo código." };
    }

    const nowIso = new Date().toISOString();
    if (Date.parse(token.expires_at) <= Date.now()) {
      await sbFetch(config, `/rest/v1/career_kit_tokens?id=eq.${token.id}`, {
        method: "PATCH",
        extraHeaders: { Prefer: "return=minimal" },
        body: JSON.stringify({ consumed_at: nowIso }),
      });
      return { ok: false, error: "Esse código expirou. Clique em Reenviar código." };
    }

    if (token.attempts >= OTP_MAX_ATTEMPTS) {
      await sbFetch(config, `/rest/v1/career_kit_tokens?id=eq.${token.id}`, {
        method: "PATCH",
        extraHeaders: { Prefer: "return=minimal" },
        body: JSON.stringify({ consumed_at: nowIso }),
      });
      return { ok: false, error: "Muitas tentativas incorretas. Peça um novo código." };
    }

    if (!verifyOtpHash(cleanEmail, cleanCode, token.code_hash)) {
      const nextAttempts = token.attempts + 1;
      await sbFetch(config, `/rest/v1/career_kit_tokens?id=eq.${token.id}`, {
        method: "PATCH",
        extraHeaders: { Prefer: "return=minimal" },
        body: JSON.stringify({
          attempts: nextAttempts,
          ...(nextAttempts >= OTP_MAX_ATTEMPTS ? { consumed_at: nowIso } : {}),
        }),
      });
      return {
        ok: false,
        error:
          nextAttempts >= OTP_MAX_ATTEMPTS
            ? "Muitas tentativas incorretas. Peça um novo código."
            : "Código incorreto. Confira os 6 dígitos no seu e-mail.",
      };
    }

    // Consume atomically (`consumed_at=is.null`) to block parallel reuse of the same code.
    const consumeRes = await sbFetch(
      config,
      `/rest/v1/career_kit_tokens?id=eq.${token.id}&consumed_at=is.null`,
      {
        method: "PATCH",
        extraHeaders: { Prefer: "return=representation" },
        body: JSON.stringify({ consumed_at: nowIso }),
      },
    );
    if (!consumeRes.ok) return { ok: false, error: "Erro ao validar código." };
    const consumed = (await consumeRes.json()) as Array<{ id: string }>;
    if (!consumed.length) {
      return { ok: false, error: "Esse código já foi utilizado. Peça um novo código." };
    }

    const existingRes = await sbFetch(
      config,
      `/rest/v1/career_kit_users?select=id,email,name,opt_in,verified_at&email=eq.${encodeURIComponent(cleanEmail)}&limit=1`,
      { method: "GET" },
    );
    const existingRows = existingRes.ok ? ((await existingRes.json()) as UserRow[]) : [];
    const existing = existingRows[0];
    const isFirstVerification = !existing || !existing.verified_at;

    const mergedName = token.name.trim() || existing?.name?.trim() || "";
    const mergedOptIn = Boolean(existing?.opt_in || token.opt_in);

    const userRes = await sbFetch(config, "/rest/v1/career_kit_users?on_conflict=email", {
      method: "POST",
      extraHeaders: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        email: cleanEmail,
        name: mergedName,
        opt_in: mergedOptIn,
        verified_at: existing?.verified_at ?? nowIso,
        last_login_at: nowIso,
        updated_at: nowIso,
      }),
    });
    if (!userRes.ok) return { ok: false, error: "Erro ao abrir sua sessão." };
    const users = (await userRes.json()) as UserRow[];
    const userRow = users[0];
    if (!userRow) return { ok: false, error: "Erro ao localizar conta." };

    const rawSessionToken = generateSessionToken();
    const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    const sessRes = await sbFetch(config, "/rest/v1/career_kit_sessions", {
      method: "POST",
      extraHeaders: { Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: userRow.id,
        token_hash: hashSessionToken(rawSessionToken),
        expires_at: sessionExpiresAt,
        last_seen_at: nowIso,
      }),
    });
    if (!sessRes.ok) return { ok: false, error: "Erro ao salvar sessão de acesso." };

    return {
      ok: true,
      user: {
        id: userRow.id,
        email: userRow.email,
        name: userRow.name,
        optIn: userRow.opt_in,
      },
      rawSessionToken,
      isFirstVerification,
    };
  } catch {
    return { ok: false, error: "Falha de conexão ao validar seu código." };
  }
}

type SessionSelectRow = {
  id: string;
  user_id: string;
  expires_at: string;
  revoked_at: string | null;
  career_kit_users: UserRow | UserRow[] | null;
};

export async function getCurrentCareerKitSession(): Promise<CareerKitSession | null> {
  const config = getSupabaseConfig();
  if (!config) return null;

  const cookieStore = await cookies();
  const raw = cookieStore.get(CAREER_SESSION_COOKIE)?.value;
  if (!raw || raw.length < 16) return null;

  try {
    const hash = hashSessionToken(raw);
    const res = await sbFetch(
      config,
      `/rest/v1/career_kit_sessions?select=id,user_id,expires_at,revoked_at,career_kit_users(id,email,name,opt_in,verified_at)&token_hash=eq.${encodeURIComponent(hash)}&revoked_at=is.null&limit=1`,
      { method: "GET" },
    );
    if (!res.ok) return null;

    const rows = (await res.json()) as SessionSelectRow[];
    const row = rows[0];
    if (!row || row.revoked_at || Date.parse(row.expires_at) <= Date.now()) return null;

    const u = Array.isArray(row.career_kit_users) ? row.career_kit_users[0] : row.career_kit_users;
    if (!u) return null;

    return {
      sessionId: row.id,
      user: {
        id: u.id,
        email: u.email,
        name: u.name,
        optIn: u.opt_in,
      },
    };
  } catch {
    return null;
  }
}

export async function revokeCurrentCareerKitSession(): Promise<void> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CAREER_SESSION_COOKIE)?.value;
  cookieStore.delete(CAREER_SESSION_COOKIE);
  if (!raw) return;

  const config = getSupabaseConfig();
  if (!config) return;
  try {
    const hash = hashSessionToken(raw);
    await sbFetch(
      config,
      `/rest/v1/career_kit_sessions?token_hash=eq.${encodeURIComponent(hash)}&revoked_at=is.null`,
      {
        method: "PATCH",
        extraHeaders: { Prefer: "return=minimal" },
        body: JSON.stringify({ revoked_at: new Date().toISOString() }),
      },
    );
  } catch {
    // Session cookie is already cleared locally.
  }
}

export async function loadCareerWorkbook(userId: string): Promise<CareerKitWorkbook> {
  const config = getSupabaseConfig();
  if (!config) return createEmptyWorkbook();

  try {
    const res = await sbFetch(
      config,
      `/rest/v1/career_kit_workbooks?select=data&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
      { method: "GET" },
    );
    if (!res.ok) return createEmptyWorkbook();
    const rows = (await res.json()) as Array<{ data: unknown }>;
    if (!rows[0]) return createEmptyWorkbook();
    return sanitizeWorkbook(rows[0].data);
  } catch {
    return createEmptyWorkbook();
  }
}

export async function saveCareerWorkbook(userId: string, workbook: CareerKitWorkbook): Promise<string> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase não configurado.");

  const nowIso = new Date().toISOString();
  const res = await sbFetch(config, "/rest/v1/career_kit_workbooks?on_conflict=user_id", {
    method: "POST",
    extraHeaders: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      data: sanitizeWorkbook(workbook),
      updated_at: nowIso,
    }),
  });

  if (!res.ok) {
    throw new Error("Não consegui salvar seu preenchimento agora.");
  }
  return nowIso;
}

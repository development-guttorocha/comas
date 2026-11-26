"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  CAREER_SESSION_COOKIE,
  getCurrentCareerKitSession,
  isValidEmail,
  normalizeEmail,
  normalizeOtpCode,
  requestOtpForEmail,
  revokeCurrentCareerKitSession,
  saveCareerWorkbook,
  SESSION_TTL_MS,
  verifyOtpAndCreateSession,
} from "@/lib/careerKitAuth";
import { sendCareerKitOtpEmail, sendCareerKitWelcomeEmail } from "@/lib/careerKitEmails";
import { sanitizeWorkbook, type CareerKitWorkbook } from "@/lib/careerKitWorkbook";
import { emailLead, toSiteLeadInsert, type Lead } from "@/lib/leads";
import type { ContactContent } from "@/lib/pages/schemas";
import { getPageContent } from "@/lib/pages/store";
import { insertSiteLead } from "@/lib/supabase";

export type CareerAuthActionState = {
  status: "idle" | "error" | "code_sent" | "authenticated";
  mode?: "signup" | "login";
  email?: string;
  name?: string;
  optIn?: boolean;
  message?: string;
  errors?: Partial<Record<"name" | "email" | "code", string>>;
  cooldownSeconds?: number;
  cooldownUntil?: number;
  redirectTo?: string;
};

const KIT_PATH = "/recursos/trilha-de-carreira/completa";

const cleanStr = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * Step 1 of Career Kit access: validates e-mail (and name in signup mode), creates a hashed
 * 6-digit OTP token in Supabase, and sends it to the designer's inbox via Resend.
 */
export async function requestCareerKitTokenAction(
  _prev: CareerAuthActionState,
  form: FormData,
): Promise<CareerAuthActionState> {
  const mode = form.get("mode") === "login" ? "login" : "signup";
  const email = normalizeEmail(cleanStr(form.get("email"), 200));
  const name = cleanStr(form.get("name"), 120);
  const optIn = form.get("optIn") === "on";

  if (cleanStr(form.get("website"), 200)) {
    return {
      status: "code_sent",
      mode,
      email,
      name,
      optIn,
      cooldownSeconds: 45,
      cooldownUntil: Date.now() + 45_000,
    };
  }

  const errors: CareerAuthActionState["errors"] = {};
  if (mode === "signup" && name.length < 2) errors.name = "Diga como posso te chamar.";
  if (!isValidEmail(email)) errors.email = "Esse e-mail não parece certo.";
  if (Object.keys(errors).length) {
    return { status: "error", mode, email, name, optIn, errors };
  }

  const otp = await requestOtpForEmail({ email, name, optIn });
  if (!otp.ok) {
    const waitSec = otp.retryAfterSeconds ?? 0;
    return {
      status: otp.reason === "cooldown" ? "code_sent" : "error",
      mode,
      email,
      name,
      optIn,
      message: otp.message,
      cooldownSeconds: waitSec,
      cooldownUntil: waitSec > 0 ? Date.now() + waitSec * 1000 : undefined,
    };
  }

  const contact = await getPageContent<ContactContent>("contato", "pt");
  const emailed = await sendCareerKitOtpEmail({
    to: email,
    name,
    code: otp.code,
    replyTo: contact.email,
  });

  if (!emailed.ok) {
    return {
      status: "error",
      mode,
      email,
      name,
      optIn,
      message: emailed.error ?? `Não consegui enviar agora. Me escreva em ${contact.email}.`,
    };
  }

  return {
    status: "code_sent",
    mode,
    email,
    name,
    optIn,
    cooldownSeconds: 45,
    cooldownUntil: Date.now() + 45_000,
  };
}

/**
 * Step 2: verifies the 6-digit token, issues an HttpOnly session cookie, records the designer as
 * a site lead on first verification, and dispatches the permanent welcome e-mail.
 */
export async function verifyCareerKitTokenAction(
  _prev: CareerAuthActionState,
  form: FormData,
): Promise<CareerAuthActionState> {
  const mode = form.get("mode") === "login" ? "login" : "signup";
  const email = normalizeEmail(cleanStr(form.get("email"), 200));
  const name = cleanStr(form.get("name"), 120);
  const optIn = form.get("optIn") === "on";
  const rawCode = cleanStr(form.get("code"), 24);
  const code = normalizeOtpCode(rawCode);

  if (cleanStr(form.get("website"), 200)) {
    return { status: "authenticated", email, name, redirectTo: KIT_PATH };
  }

  if (!isValidEmail(email)) {
    return { status: "code_sent", mode, email, name, optIn, errors: { code: "E-mail inválido. Volte e tente novamente." } };
  }
  if (!code) {
    return { status: "code_sent", mode, email, name, optIn, errors: { code: "Digite os 6 dígitos enviados no e-mail." } };
  }

  const verified = await verifyOtpAndCreateSession({ email, code });
  if (!verified.ok) {
    return {
      status: "code_sent",
      mode,
      email,
      name,
      optIn,
      errors: { code: verified.error },
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(CAREER_SESSION_COOKIE, verified.rawSessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });

  if (verified.isFirstVerification) {
    const contact = await getPageContent<ContactContent>("contato", "pt");
    const displayName = verified.user.name || verified.user.email.split("@")[0] || "Designer";
    const lead: Lead = {
      name: displayName,
      email: verified.user.email,
      company: "",
      teamSize: "",
      message: "Acesso verificado por token na Trilha de carreira em design",
      service: "Material: Trilha de carreira em design",
      format: "",
      page: "/recursos/trilha-de-carreira",
      audience: "designer",
      optIn: verified.user.optIn,
      createdAt: new Date().toISOString(),
    };

    await Promise.allSettled([
      insertSiteLead(
        toSiteLeadInsert(lead, {
          status: "new",
          source: "web",
          externalId: `career-kit:${verified.user.email}`,
        }),
      ),
      emailLead(lead, contact.email),
      sendCareerKitWelcomeEmail({
        to: verified.user.email,
        name: displayName,
        replyTo: contact.email,
      }),
    ]);
  }

  revalidatePath(KIT_PATH);
  return {
    status: "authenticated",
    mode,
    email: verified.user.email,
    name: verified.user.name,
    redirectTo: KIT_PATH,
  };
}

/** Saves the logged-in designer's workbook state to Supabase. */
export async function saveCareerKitWorkbookAction(
  raw: CareerKitWorkbook,
): Promise<{ ok: boolean; savedAt?: string; error?: string }> {
  const session = await getCurrentCareerKitSession();
  if (!session) {
    return { ok: false, error: "Sua sessão expirou. Entre novamente com seu e-mail." };
  }

  try {
    const clean = sanitizeWorkbook(raw);
    const savedAt = await saveCareerWorkbook(session.user.id, clean);
    return { ok: true, savedAt };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao salvar agora.",
    };
  }
}

/** Signs out from the Career Clarity Kit and revokes the current session token. */
export async function signOutCareerKitAction(): Promise<{ ok: true }> {
  await revokeCurrentCareerKitSession();
  revalidatePath(KIT_PATH);
  return { ok: true };
}

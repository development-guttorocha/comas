import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SOCIAL_COOKIE_NAME = "texto_em_ciclo_session";

export function getSocialPin(): string {
  return (process.env.SOCIAL_ACCESS_PIN ?? "").trim();
}

export function isSocialAuthRequired(): boolean {
  return getSocialPin().length > 0;
}

function deriveToken(pin: string): string {
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.OPENAI_API_KEY ?? "texto-em-ciclo-salt";
  return createHash("sha256").update(`${pin}::${salt}`).digest("hex");
}

export function verifyPin(inputPin: string): boolean {
  const expected = getSocialPin();
  if (!expected) return true;
  const a = Buffer.from(inputPin.trim());
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function makeSessionToken(): string {
  return deriveToken(getSocialPin());
}

export async function isSocialAuthenticated(): Promise<boolean> {
  const pin = getSocialPin();
  if (!pin) return true;
  const store = await cookies();
  const token = store.get(SOCIAL_COOKIE_NAME)?.value ?? "";
  if (!token) return false;
  const expected = deriveToken(pin);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

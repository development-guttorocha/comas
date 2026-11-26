import { createHmac, timingSafeEqual } from "node:crypto";
import { translationAdminRequestAvailable } from "./access";
export const SESSION_COOKIE = "portfolio_translation_session";
function equal(a: string, b: string) {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const host = request.headers.get("host") || new URL(request.url).host;
    return ["http:", "https:"].includes(parsed.protocol) && parsed.host === host;
  } catch { return false; }
}
export function localAdmin(request: Request) {
  return translationAdminRequestAvailable(request);
}
export function createSession(secret: string) {
  const expires = String(Date.now() + 8 * 60 * 60 * 1000);
  return `${expires}.${createHmac("sha256", secret).update(expires).digest("hex")}`;
}
export function validSession(value?: string) {
  const secret = process.env.TRANSLATION_ADMIN_TOKEN;
  if (!secret || !value) return false;
  const [expires, signature] = value.split(".");
  if (!expires || !signature || !/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;
  return equal(signature, createHmac("sha256", secret).update(expires).digest("hex"));
}
export function validPassword(value: string) { return !!process.env.TRANSLATION_ADMIN_TOKEN && equal(value, process.env.TRANSLATION_ADMIN_TOKEN); }
export function isAuthorized(request: Request) {
  if (!translationAdminRequestAvailable(request)) return false;
  if (localAdmin(request)) return true;
  const cookie = request.headers.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  return validSession(cookie);
}
export function validSyncToken(request: Request) {
  const secret = process.env.CRON_SECRET;
  return !!secret && equal(request.headers.get("authorization") ?? "", `Bearer ${secret}`);
}

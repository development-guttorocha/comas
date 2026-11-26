/**
 * When the OpenAI key behind Sol's translations stops working. OpenAI does not report it to
 * the key itself, so it is written here when the key is renewed; the admin warns as it nears.
 */
export const OPENAI_KEY_EXPIRES = "2027-01-30";

/** The admin starts warning this many days before. */
export const KEY_WARNING_DAYS = 21;

export function keyExpiry(now = new Date()) {
  // Counted in calendar days: 0 on the last valid day, negative once it has passed.
  const expires = new Date(`${OPENAI_KEY_EXPIRES}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((expires.getTime() - today.getTime()) / 86_400_000);
  const date = expires.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  return { days, date, state: days < 0 ? "expired" as const : days <= KEY_WARNING_DAYS ? "soon" as const : "ok" as const };
}

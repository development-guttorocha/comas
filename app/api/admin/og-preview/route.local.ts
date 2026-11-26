import { adminGuard } from "@/lib/admin/guard";
import { shareCard } from "@/lib/og";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The share card for texts still being edited, so the admin shows it before saving. */
export async function GET(request: Request) {
  const denied = adminGuard(request);
  if (denied) return denied;
  const q = new URL(request.url).searchParams;
  const get = (key: string, max = 300) => (q.get(key) ?? "").slice(0, max);
  const color = get("accent", 9), on = get("on", 9);
  return shareCard({
    kicker: get("kicker", 80),
    title: get("title", 140) || "Sem título",
    line: get("line"),
    footer: get("footer", 60) || undefined,
    accent: /^#[0-9a-f]{6}$/i.test(color) && /^#[0-9a-f]{6}$/i.test(on) ? { color, on } : undefined,
  });
}

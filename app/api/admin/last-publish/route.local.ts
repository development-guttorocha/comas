import { adminGuard, adminJson } from "@/lib/admin/guard";
import { SITE_URL } from "@/lib/seo";
import { liveDeploy } from "@/lib/admin/publish/live";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LastPublish = { at: number | null; siteUrl: string };

// The Vercel CLI takes a second or two: answer from memory for a minute, unless the admin just published.
const TTL_MS = 60_000;
let cached: { value: LastPublish; until: number } | null = null;

/** When production last went live: the newest ready production deploy on Vercel. */
export async function GET(request: Request) {
  const denied = adminGuard(request);
  if (denied) return denied;
  const fresh = new URL(request.url).searchParams.has("fresh");
  if (!fresh && cached && cached.until > Date.now()) return adminJson(cached.value);
  try {
    const value = { at: (await liveDeploy()).at, siteUrl: SITE_URL };
    cached = { value, until: Date.now() + TTL_MS };
    return adminJson(value);
  } catch (error) {
    return adminJson({ error: (error as Error).message, siteUrl: SITE_URL }, 502);
  }
}

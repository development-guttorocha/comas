import { caseMarkdown, MARKDOWN_PAGES, pageMarkdown } from "@/lib/siteMarkdown";
import { absoluteUrl } from "@/lib/seo";
import type { SiteLocale } from "@/lib/siteLocale";

/**
 * The Markdown version of a page, reached as `<page>.md` (see the rewrites in next.config.ts):
 * `/index.md`, `/sobre.md`, `/cases/<slug>.md`, and the same under `/en`.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const parts = [...((await params).path ?? [])];
  const locale: SiteLocale = parts[0] === "en" ? "en" : "pt";
  if (locale === "en") parts.shift();
  const prefix = locale === "en" ? "/en" : "";
  let text: string | null = null, page = "";
  if (parts.length === 0) { text = await pageMarkdown("index", locale); page = prefix || "/"; }
  else if (parts.length === 1 && (MARKDOWN_PAGES as readonly string[]).includes(parts[0]!)) {
    const name = parts[0] as (typeof MARKDOWN_PAGES)[number];
    text = await pageMarkdown(name, locale);
    page = name === "index" ? prefix || "/" : `${prefix}/${name}`;
  } else if (parts.length === 2 && parts[0] === "cases" && /^[a-z0-9-]+$/.test(parts[1]!)) {
    text = await caseMarkdown(parts[1]!, locale);
    page = `${prefix}/cases/${parts[1]}`;
  }
  if (!text) return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(text, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // The HTML page is the one to index; this is the same content as text.
      Link: `<${absoluteUrl(page)}>; rel="canonical"`,
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

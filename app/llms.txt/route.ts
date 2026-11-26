import { llmsTxt } from "@/lib/siteMarkdown";

/** `/llms.txt`: the site summarised for AI assistants, with links to each page in Markdown. */
export async function GET() {
  return new Response(await llmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
  });
}

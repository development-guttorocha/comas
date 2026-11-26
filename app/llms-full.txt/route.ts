import { llmsFullTxt } from "@/lib/siteMarkdown";

/** `/llms-full.txt`: the résumé and every case in one file, for assistants that read it whole. */
export async function GET() {
  return new Response(await llmsFullTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
  });
}

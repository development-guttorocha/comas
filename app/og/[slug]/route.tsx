import { notFound } from "next/navigation";
import { pageCopy } from "@/lib/i18n/metadata";
import { shareCard, splitTitle } from "@/lib/og";
import type { SitePage } from "@/lib/pages/schemas";
import type { SiteLocale } from "@/lib/siteLocale";

/**
 * `/og/<page>` and `/og/en-<page>`: each page's share image, rendered at build from its title
 * and description (admin → SEO). A route of its own, so the cases keep their covers.
 */
const PAGES: SitePage[] = ["home", "sobre", "cases", "curriculo", "contato"];

export const dynamicParams = false;
export const generateStaticParams = () => PAGES.flatMap(page => [{ slug: page }, { slug: `en-${page}` }]);

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale: SiteLocale = slug.startsWith("en-") ? "en" : "pt";
  const page = slug.replace(/^en-/, "") as SitePage;
  if (!PAGES.includes(page)) notFound();
  const { title, description } = await pageCopy(page, locale);
  return shareCard({ ...splitTitle(title), line: description });
}

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import AdminArticles from "@/components/admin/AdminArticles";
import { getArticleBody, getArticles, readingMinutes } from "@/lib/articles";
import { translationAdminAvailable } from "@/lib/translations/access";

export const metadata: Metadata = { title: "Artigos · Admin · Gutto Rocha", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  if (!translationAdminAvailable((await headers()).get("host"))) notFound();
  const articles = await getArticles({ drafts: true });
  const rows = await Promise.all(articles.map(async a => ({ ...a, minutes: readingMinutes(await getArticleBody(a.slug)) })));
  return <AdminArticles rows={rows} />;
}

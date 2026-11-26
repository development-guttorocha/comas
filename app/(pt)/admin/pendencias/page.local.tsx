import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import AdminPending from "@/components/admin/AdminPending";
import { loadOverview } from "@/lib/admin/overview";
import { getArticles } from "@/lib/articles";
import { translationAdminAvailable } from "@/lib/translations/access";

export const metadata: Metadata = { title: "Pendências · Admin · Gutto Rocha", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** The admin's first screen: the English to review, the drafts of cases and articles, and what is broken. */
export default async function AdminPendingPage() {
  if (!translationAdminAvailable((await headers()).get("host"))) notFound();
  const [{ rows }, articles] = await Promise.all([loadOverview(), getArticles({ drafts: true })]);
  const drafts = [
    ...rows.filter(row => row.draft && !row.archived).map(row => ({ href: `/admin/cases/${row.slug}`, label: row.title || row.company, meta: `Case · ${row.company} · fora do site`, image: row.cover || undefined })),
    ...articles.filter(article => article.draft).map(article => ({ href: `/admin/artigos/${article.slug}`, label: article.title, meta: "Artigo · fora do site" })),
  ];
  return <AdminPending drafts={drafts} />;
}

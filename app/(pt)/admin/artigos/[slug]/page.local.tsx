import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ArticleEditor from "@/components/admin/ArticleEditor";
import { readArticleFiles } from "@/lib/admin/articleStore";
import { getCaseDataSource } from "@/lib/caseContent";
import { translationAdminAvailable } from "@/lib/translations/access";

export const metadata: Metadata = { title: "Editar artigo · Gutto Rocha", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ArticleEditorPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ aba?: string }> }) {
  if (!translationAdminAvailable((await headers()).get("host"))) notFound();
  const { slug } = await params;
  const files = await readArticleFiles(slug).catch(() => null);
  if (!files) notFound();
  const { aba } = await searchParams;
  const cases = (await getCaseDataSource()).cases.map(c => ({ value: c.slug, label: c.company }));
  return <ArticleEditor initial={files} cases={cases} initialTab={aba === "dados" ? "dados" : "conteudo"} />;
}

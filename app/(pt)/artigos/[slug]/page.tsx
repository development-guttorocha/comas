import ArticlePage from "@/components/pages/ArticlePage";
import { articleMetadata, getArticles } from "@/lib/articles";

export async function generateStaticParams() {
  return (await getArticles()).map(a => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Drafts only open on this machine (the page decides); they are never indexed.
  const a = (await getArticles({ drafts: true })).find(item => item.slug === slug);
  if (!a) return {};
  return { ...articleMetadata(a), ...(a.draft ? { robots: { index: false, follow: false } } : {}) };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ArticlePage slug={slug} />;
}

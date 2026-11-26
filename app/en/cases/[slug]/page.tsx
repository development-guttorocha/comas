import { readTranslation } from "@/lib/translations/store";
import { getTranslationSource } from "@/lib/translations/service";
import { notFound } from "next/navigation";
import { buildCaseMetadata, CaseDetailPage } from "@/lib/caseDetailPage";
import { getCaseDataSource, getGenericTemplateCaseParamsFromList } from "@/lib/caseContent";

/** `?translation=draft` previews a translation on this machine; elsewhere the query is never read, so the page stays static. */
async function draftPreview(searchParams: Promise<{ translation?: string }>) {
  return process.env.NODE_ENV === "development" && (await searchParams).translation === "draft";
}

export async function generateStaticParams() {
  const data = await getCaseDataSource();
  return getGenericTemplateCaseParamsFromList(data.cases);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ translation?: string }>;
}) {
  const { slug } = await params;
  if (await draftPreview(searchParams)) return { title: "Translation preview · Gutto Rocha", robots: { index: false, follow: false } };
  const data = await getCaseDataSource();
  const c = data.cases.find((item) => item.slug === slug);
  if (!c) return {};
  const record = await readTranslation(slug);
  if (!record?.published) return { title: "English version in preparation · Gutto Rocha", robots: { index: false, follow: true } };
  const source = await getTranslationSource(slug);
  const snapshot = record?.published;
  if (!snapshot || snapshot.sourceHash !== source.sourceHash) return { title: "English version in preparation · Gutto Rocha", robots: { index: false, follow: true } };
  const title = snapshot.units.find(u => u.key === "case.title")?.target;
  const summary = snapshot.units.find(u => u.key === "case.summary")?.target;
  return buildCaseMetadata({ ...c, titleEn: title, summaryEn: summary }, "en", { translated: true });
}

export default async function CasePageEn({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ translation?: string }>;
}) {
  const { slug } = await params;
  const data = await getCaseDataSource();
  if (!data.cases.some((item) => item.slug === slug)) notFound();
  return CaseDetailPage({ slug, locale: "en", previewDraft: await draftPreview(searchParams) });
}

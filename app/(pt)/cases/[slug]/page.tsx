import { translatedCaseListings } from "@/lib/translations/listing";
import { buildCaseMetadata, CaseDetailPage } from "@/lib/caseDetailPage";
import { getCaseDataSource, getGenericTemplateCaseParamsFromList } from "@/lib/caseContent";
import { DEFAULT_SITE_LOCALE } from "@/lib/siteLocale";

export async function generateStaticParams() {
  const data = await getCaseDataSource();
  return getGenericTemplateCaseParamsFromList(data.cases);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getCaseDataSource();
  const c = data.cases.find((item) => item.slug === slug);
  if (!c) return {};
  const translated = (await translatedCaseListings([c])).length > 0;
  return buildCaseMetadata(c, DEFAULT_SITE_LOCALE, { translated });
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // The detail page decides: a published case, or a draft previewed on this machine.
  return CaseDetailPage({ slug, locale: DEFAULT_SITE_LOCALE });
}

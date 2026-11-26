import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import PreviewRefresh from "@/components/admin/PreviewRefresh";
import { getCasePreview } from "@/lib/admin/casePreview";
import { CaseDetailPage } from "@/lib/caseDetailPage";
import { translationAdminAvailable } from "@/lib/translations/access";

export const metadata: Metadata = { title: "Prévia do case · Gutto Rocha", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * The case page as the site renders it, with what the editor has on screen (saved or not). The
 * editor shows it in an iframe and asks it to refresh after each change (PreviewRefresh).
 */
export default async function CasePreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!translationAdminAvailable((await headers()).get("host"))) notFound();
  const { slug } = await params;
  const preview = getCasePreview(slug);
  return <>
    {await CaseDetailPage({ slug, locale: "pt", previewDraft: true, override: preview ? { case: preview.case, body: preview.body } : undefined })}
    <PreviewRefresh />
  </>;
}

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import CaseEditor, { type EditorTab } from "@/components/admin/CaseEditor";
import { readCaseFiles } from "@/lib/admin/caseStore";
import { readCaseMaterial } from "@/lib/admin/materialStore";
import { getReelTracks } from "@/lib/reel/trackStore";
import { translationAdminAvailable } from "@/lib/translations/access";
import { readPending } from "@/lib/caseDraft/pending";

export const metadata: Metadata = { title: "Editar case · Gutto Rocha", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const TABS = new Set<EditorTab>(["conteudo", "dados", "material", "video", "traducao"]);
/** ?aba= in the address: the Inglês tab is "ingles"; the older "traducao" (links in notices, the belt) still works. */
const ALIASES: Record<string, EditorTab> = { ingles: "traducao" };

export default async function CaseEditorPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ aba?: string }> }) {
  if (!translationAdminAvailable((await headers()).get("host"))) notFound();
  const { slug } = await params;
  const files = await readCaseFiles(slug).catch(() => null);
  if (!files) notFound();
  const { aba: asked } = await searchParams;
  const aba = asked && ALIASES[asked] ? ALIASES[asked] : asked;
  return <CaseEditor initial={files} material={(await readCaseMaterial(slug).catch(() => null)) ?? { material: {}, revision: "" }} tracks={await getReelTracks()} initialTab={TABS.has(aba as EditorTab) ? aba as EditorTab : "conteudo"} pendingDraft={await readPending(slug)} />;
}

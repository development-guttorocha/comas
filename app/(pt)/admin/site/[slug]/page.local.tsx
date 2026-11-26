import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import PageEditor from "@/components/admin/PageEditor";
import { screenFiles, SITE_SCREEN_BY_ID } from "@/lib/pages/screens";
import { readPage } from "@/lib/pages/store";
import { translationAdminAvailable } from "@/lib/translations/access";

export const metadata: Metadata = { title: "Editar página · Admin · Gutto Rocha", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** A page of the site (or Em todas as páginas): its texts and, last, its Google and sharing line. */
export default async function AdminSitePage({ params }: { params: Promise<{ slug: string }> }) {
  if (!translationAdminAvailable((await headers()).get("host"))) notFound();
  const { slug } = await params;
  if (slug === "home") redirect("/admin/site/home");
  const screen = SITE_SCREEN_BY_ID.get(slug);
  if (!screen) notFound();
  const files = Object.fromEntries(await Promise.all(screenFiles(screen).map(async file => [file, await readPage(file)] as const)));
  return <PageEditor screen={screen.id} files={files} apiReady={!!process.env.OPENAI_API_KEY} />;
}

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import PageEditor from "@/components/admin/PageEditor";
import { screenFiles, SITE_SCREEN_BY_ID } from "@/lib/pages/screens";
import { readPage } from "@/lib/pages/store";
import { translationAdminAvailable } from "@/lib/translations/access";

export const metadata: Metadata = { title: "Home · Admin · Gutto Rocha", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** The Home's texts; its other tab is the cases belt (`/admin/site/home/esteira`). */
export default async function AdminHomeTexts() {
  if (!translationAdminAvailable((await headers()).get("host"))) notFound();
  const screen = SITE_SCREEN_BY_ID.get("home")!;
  const files = Object.fromEntries(await Promise.all(screenFiles(screen).map(async file => [file, await readPage(file)] as const)));
  return <PageEditor screen="home" files={files} apiReady={!!process.env.OPENAI_API_KEY} />;
}

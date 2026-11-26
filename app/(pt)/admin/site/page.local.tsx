import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AreaIndex } from "@/components/admin/AdminShell";
import { SERVICE_FILES } from "@/lib/admin/serviceStore";
import { EVERY_PAGE, SITE_PAGES, SITE_SCREEN_BY_ID } from "@/lib/pages/screens";
import { translationAdminAvailable } from "@/lib/translations/access";

export const metadata: Metadata = { title: "Site · Admin · Gutto Rocha", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Every page of the site that is not an item of a collection, the services, and what all pages share. */
export default async function AdminSiteIndex() {
  if (!translationAdminAvailable((await headers()).get("host"))) notFound();
  return (
    <AreaIndex
      title="Site"
      subtitle="Os textos de cada página, em português e inglês. O Google e o compartilhamento de cada uma ficam no fim dela."
      sections={[
        { title: "Páginas", items: SITE_PAGES.map(id => {
          const screen = SITE_SCREEN_BY_ID.get(id)!;
          return { href: screen.href, label: screen.label, description: screen.description, meta: screen.paths?.pt };
        }) },
        { title: "Serviços", id: "servicos", items: SERVICE_FILES.map(entry => ({ href: `/admin/site/servicos/${entry.slug}`, label: entry.label, description: entry.description, meta: entry.path })) },
        { title: "Em todas as páginas", items: [{ href: EVERY_PAGE.href, label: EVERY_PAGE.label, description: EVERY_PAGE.description }] },
      ]}
    />
  );
}

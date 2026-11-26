import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import AdminHomeBelt from "@/components/admin/AdminHomeBelt";
import { getCaseDataSource } from "@/lib/caseContent";
import { getCaseCoverSrc } from "@/lib/caseCover";
import { getHomeCaseGroups } from "@/lib/cases";
import { getHomeSettings, orderBySlugs } from "@/lib/homeSettings";
import { translationAdminAvailable } from "@/lib/translations/access";

export const metadata: Metadata = { title: "Esteira da Home · Admin · Gutto Rocha", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  if (!translationAdminAvailable((await headers()).get("host"))) notFound();
  const [data, settings] = await Promise.all([getCaseDataSource(), getHomeSettings()]);
  // The same order the Home uses: the highlighted cases first, each group in the admin's order.
  const { featured, remaining } = getHomeCaseGroups(data.cases);
  const cases = [...orderBySlugs(featured, settings.order), ...orderBySlugs(remaining, settings.order)].map(c => ({
    slug: c.slug, title: c.title, company: c.company, featured: !!c.featuredOnSite,
    image: c.homeImage?.trim() || getCaseCoverSrc(c) || "", ownImage: !!c.homeImage?.trim(),
  }));
  return <AdminHomeBelt cases={cases} belt={settings.belt} />;
}

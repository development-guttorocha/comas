import { translatedCaseListings } from "@/lib/translations/listing";
import type { SiteLocale } from "@/lib/siteLocale";
import HomeCasesSection, { HomeWordScope } from "@/components/home/HomeCasesSection";
import { HomeCount, HomeImpact, HomeModel, HomeStatement, HomeVoices } from "@/components/home/HomeChapters";
import HomeHero from "@/components/HomeHero";
import SiteNav from "@/components/SiteNav";
import { getHomeCaseGroups } from "@/lib/cases";
import { homeFeaturedCase } from "@/lib/homeCaseHighlights";
import { getCaseDataSource } from "@/lib/caseContent";
import { getHomeSettings, orderBySlugs } from "@/lib/homeSettings";
import { getPageContent } from "@/lib/pages/store";
import type { HomeContent } from "@/lib/pages/schemas";

/** The new Home composition, isolated from the other portfolio pages. */
export default async function HomePage({ locale = "pt" }: { locale?: SiteLocale }) {
  // Texts come from content/pages/home.json (Páginas → Home); the belt from content/home.json.
  const [data, settings, home] = await Promise.all([getCaseDataSource(), getHomeSettings(), getPageContent<HomeContent>("home", locale)]);
  const list = locale === "en" ? await translatedCaseListings(data.cases) : data.cases;
  // The highlighted cases ride the belt, in the admin's order; the column lists them first, then the rest,
  // so the belt's flat tiles hand over to the same panels.
  const { featured, remaining } = getHomeCaseGroups(list);
  const originals = new Map(data.cases.map(c => [c.slug, c]));
  const ordered = [...orderBySlugs(featured, settings.order), ...orderBySlugs(remaining, settings.order)];
  const homeCases = await Promise.all(ordered.map(c => homeFeaturedCase(originals.get(c.slug) ?? c, c, locale)));
  const beltCount = featured.length || homeCases.length;

  return (
    <>
      <SiteNav />
      <main>
      <HomeHero content={home} />
      <HomeModel content={home} />
      <HomeStatement content={home} locale={locale} />
      <HomeImpact content={home} />
      <HomeCount content={home} locale={locale} />
      <HomeWordScope locale={locale}
        cases={<HomeCasesSection featured={homeCases} beltCount={beltCount} locale={locale} belt={settings.belt} />}
        voices={<HomeVoices content={home} locale={locale} />} />
      </main>
    </>
  );
}

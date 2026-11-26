import type { Case } from "@/lib/cases";
import type { SiteLocale } from "@/lib/siteLocale";
import { getCaseBody } from "@/lib/caseContent";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { caseHighlight, homeCardHighlight, type CaseHighlight } from "@/lib/homeHighlight";
import { mapDocument } from "@/lib/translations/document";
import { readTranslation } from "@/lib/translations/store";
import { getCaseCoverSrc } from "@/lib/caseCover";

export { extractHomeHighlight } from "@/lib/homeHighlight";

export type HomeCaseListing = Pick<Case, "slug" | "company" | "title" | "year" | "role" | "tags" | "accentTags">;
export type HomeFeaturedCase = HomeCaseListing & Pick<Case, "heroImage" | "heroImageMobile" | "heroImageFocus" | "brandColor"> & {
  highlight: CaseHighlight;
};

export function homeCaseListing(c: Case): HomeCaseListing {
  const { slug, company, title, year, role, tags, accentTags } = c;
  return { slug, company, title, year, role, tags, accentTags };
}

/** The body in the locale's language; null when it is missing or its translation is not reviewed. */
async function localizedBody(original: Case, locale: SiteLocale): Promise<NotionBlockNode[] | null> {
  try {
    const blocks = await getCaseBody(original.slug);
    if (locale !== "en") return blocks;
    const snapshot = (await readTranslation(original.slug))?.published;
    if (!snapshot) return null;
    const units = new Map(snapshot.units.map(unit => [unit.key, unit]));
    // Home metrics are root-level embeds: nested blocks stay out, and so do their translations.
    return mapDocument(original, blocks.map(({ children, ...block }) => { void children; return block; }), (key, source) => {
      if (!source.trim() || /^https?:\/\//i.test(source.trim())) return source;
      const unit = units.get(key);
      if (!unit?.target.trim() || unit.source !== source) throw new Error("Stale translation");
      return unit.target;
    }).blocks;
  } catch {
    // A missing body or translation must not remove a published case from the Home.
    return null;
  }
}

/** The case's own highlight (the /cases page): no Home-only texts. */
export async function caseListingHighlight(original: Case, localized: Case, locale: SiteLocale): Promise<CaseHighlight> {
  return caseHighlight(localized, await localizedBody(original, locale), locale);
}

export async function homeFeaturedCase(original: Case, localized: Case, locale: SiteLocale): Promise<HomeFeaturedCase> {
  const highlight = homeCardHighlight(localized, await caseListingHighlight(original, localized, locale));
  // The Home's own image comes with its own phone version and focus; otherwise the cover's.
  const home = localized.homeImage?.trim();
  const image = home
    ? { heroImage: home, heroImageMobile: localized.homeImageMobile, heroImageFocus: localized.homeImageFocus }
    : { heroImage: getCaseCoverSrc(localized), heroImageMobile: localized.heroImageMobile, heroImageFocus: localized.heroImageFocus };
  return {
    ...homeCaseListing(localized),
    company: localized.homeCompany?.trim() || localized.company,
    year: localized.homeYear?.trim() || localized.year,
    title: localized.homeTitle?.trim() || localized.title,
    ...image, brandColor: localized.homeColor?.trim() || localized.brandColor, highlight,
  };
}

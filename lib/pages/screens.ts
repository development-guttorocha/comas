import type { PageGroup, PageSchema } from "./model";
import { PAGE_SCHEMA_BY_SLUG } from "./schemas";

/**
 * The admin's Site screens. A screen shows groups from one or more page files: each page with its own
 * texts and, last, its line in the SEO groups of `site.json` ("Google e compartilhamento"); the menu,
 * the footer, the 404 and the search-engine data share "Em todas as páginas". Parts keep their order.
 */
export type SitePart = { slug: string; keep: (group: PageGroup) => boolean };
export type SiteScreen = { id: string; label: string; description: string; href: string; paths?: PageSchema["paths"]; parts: SitePart[] };

const schema = (slug: string) => PAGE_SCHEMA_BY_SLUG.get(slug)!;
const all = () => true;

const page = (slug: string): SiteScreen => ({
  id: slug, label: schema(slug).label, description: schema(slug).description, href: `/admin/site/${slug}`, paths: schema(slug).paths,
  parts: [{ slug, keep: all }, { slug: "site", keep: group => group.preview === slug }],
});

export const SITE_PAGES = ["home", "cases", "sobre", "curriculo", "contato"] as const;

export const EVERY_PAGE: SiteScreen = {
  id: "todas-as-paginas", label: "Em todas as páginas", href: "/admin/site/todas-as-paginas",
  description: "O menu, o rodapé, a página 404 e quem é você para os buscadores.",
  parts: [
    { slug: "site", keep: group => group.label === "Menu" },
    { slug: "rodape", keep: all },
    { slug: "site", keep: group => !group.preview && group.label !== "Menu" },
  ],
};

export const SITE_SCREENS: SiteScreen[] = [...SITE_PAGES.map(page), EVERY_PAGE];
export const SITE_SCREEN_BY_ID = new Map(SITE_SCREENS.map(screen => [screen.id, screen]));

/** The files a screen reads and saves, each once. */
export const screenFiles = (screen: SiteScreen) => [...new Set(screen.parts.map(part => part.slug))];

/** The groups of one file a screen shows. */
export const screenGroups = (screen: SiteScreen, slug: string) =>
  schema(slug).groups.filter(group => screen.parts.some(part => part.slug === slug && part.keep(group)));

/** Where a text of a page file is edited: the screen, and the `?campo=` that points at it (`file.key`). */
export function siteFieldHref(slug: string, key: string) {
  const first = key.split(".")[0];
  const group = schema(slug).groups.find(g => g.fields.some(f => f.key === first));
  const screen = SITE_SCREENS.find(s => s.parts.some(part => part.slug === slug && (!group || part.keep(group)))) ?? EVERY_PAGE;
  return `${screen.href}?campo=${encodeURIComponent(`${slug}.${key}`)}`;
}

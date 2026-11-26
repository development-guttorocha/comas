import path from "node:path";

/**
 * Pictures pulled out of a case's Material (deck slides, document images, loose screenshots) are
 * private until Gutto puts one in the case: they live in `.admin/material/<slug>/images/` (out of
 * git, out of `vercel deploy`, never served by the site) and the admin shows them through a local
 * route. Saving a case copies each one its blocks use into `public/cases/<slug>/` and rewrites the
 * link (lib/admin/caseStore.ts, `promoteMaterialMedia`). Nothing else ever reaches `public/`.
 */
export const MATERIAL_MEDIA_PREFIX = "/api/admin/material-media/";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NAME = /^[a-z0-9][a-z0-9-]*\.(png|jpe?g|webp|gif|avif|svg|mp4|webm)$/;

export const materialMediaUrl = (slug: string, name: string) => `${MATERIAL_MEDIA_PREFIX}${slug}/${name}`;

/** The folder of one case's private pictures. */
export function materialMediaDir(slug: string) {
  if (!SLUG.test(slug)) throw new Error("Case inválido.");
  return path.join(process.cwd(), ".admin", "material", slug, "images");
}

/** `{slug, name, file}` for a private picture's link, or null for anything else. */
export function parseMaterialMediaUrl(url: string): { slug: string; name: string; file: string } | null {
  if (!url.startsWith(MATERIAL_MEDIA_PREFIX)) return null;
  const [slug, name, ...rest] = url.slice(MATERIAL_MEDIA_PREFIX.length).split(/[?#]/)[0].split("/");
  if (rest.length || !slug || !name || !SLUG.test(slug) || !NAME.test(name)) return null;
  return { slug, name, file: path.join(materialMediaDir(slug), name) };
}

/** Every private picture of `slug` a text (a case's JSON) points at, each once. */
export function materialMediaIn(text: string, slug: string): string[] {
  const escaped = `${MATERIAL_MEDIA_PREFIX}${slug}/`.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  return [...new Set([...text.matchAll(new RegExp(`${escaped}[a-z0-9][a-z0-9-]*\\.[a-z0-9]+`, "g"))].map(m => m[0]))];
}

/** Where an image link lives on this Mac: `public/` for the site's files, `.admin/` for the private ones. */
export function mediaFilePath(url: string): string | null {
  const material = parseMaterialMediaUrl(url);
  if (material) return material.file;
  if (!url.startsWith("/") || url.includes("..") || url.startsWith("/api/")) return null;
  return path.join(process.cwd(), "public", url.split(/[?#]/)[0]);
}

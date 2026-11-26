import { createHash, randomUUID } from "node:crypto";
import { readFile, rename, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { SiteLocale } from "@/lib/siteLocale";
import { normalizeFields, resolveFields, schemaFields, type PageSchema, type PageValues } from "./model";
import { PAGE_DEFAULTS } from "./defaults";
import { PAGE_SCHEMA_BY_SLUG } from "./schemas";

/** Each editable page's content: `content/pages/<slug>.json`, shipped with the deploy like the cases. */
export const PAGES_DIR = path.join(process.cwd(), "content", "pages");

export class PageConflict extends Error {}

export function pageSchema(slug: string): PageSchema {
  const schema = PAGE_SCHEMA_BY_SLUG.get(slug);
  if (!schema) throw new Error("Página não encontrada.");
  return schema;
}

const file = (slug: string) => path.join(PAGES_DIR, `${pageSchema(slug).slug}.json`);
const revisionOf = (text: string | null) => createHash("sha256").update(text ?? "").digest("hex").slice(0, 16);

async function readText(slug: string) {
  try { return await readFile(file(slug), "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}

/** The page's values in both languages, with `revision` to refuse a save over a newer file. */
export async function readPage(slug: string) {
  const schema = pageSchema(slug);
  const text = await readText(slug);
  let raw: unknown = null;
  try { raw = text ? JSON.parse(text) : null; } catch { console.warn(`content/pages/${slug}.json: JSON inválido, usando o conteúdo padrão.`); }
  return { values: normalizeFields(schemaFields(schema), raw, PAGE_DEFAULTS[schema.slug] ?? {}), revision: revisionOf(text) };
}

// A deployment's files never change, so the site reads each page once; in development every read sees the latest edit.
const memo = new Map<string, ReturnType<typeof readPage>>();
function readForSite(slug: string) {
  if (process.env.NODE_ENV !== "production") return readPage(slug);
  let page = memo.get(slug);
  if (!page) { page = readPage(slug); memo.set(slug, page); }
  return page;
}

/** The page in one language, ready for its component. */
export async function getPageContent<T>(slug: string, locale: SiteLocale): Promise<T> {
  const schema = pageSchema(slug);
  return resolveFields<T>(schemaFields(schema), (await readForSite(slug)).values, locale) as T;
}

export async function savePage(slug: string, revision: string, values: unknown) {
  if (process.env.NODE_ENV === "production") throw new Error("As páginas são editadas no admin local e publicadas com o deploy.");
  const schema = pageSchema(slug);
  if (revisionOf(await readText(slug)) !== revision) throw new PageConflict("O arquivo desta página mudou fora desta tela. Recarregue para ver a versão atual.");
  const next: PageValues = normalizeFields(schemaFields(schema), values, PAGE_DEFAULTS[schema.slug] ?? {});
  const text = `${JSON.stringify(next, null, 2)}\n`;
  await mkdir(PAGES_DIR, { recursive: true });
  const temp = `${file(slug)}.${randomUUID()}.tmp`;
  await writeFile(temp, text);
  await rename(temp, file(slug));
  return { values: next, revision: revisionOf(text) };
}

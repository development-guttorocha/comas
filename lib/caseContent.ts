import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Case } from "@/lib/cases";
import { CUSTOM_CASE_LANDING_SLUGS } from "@/lib/cases";
import type { NotionBlockNode } from "@/lib/notionBlockTree";

/**
 * Os cases vivem no repositório: `content/cases/<slug>/case.json` (dados do case) e
 * `body.json` (o corpo, em blocos no formato que `NotionPageDocument` renderiza).
 * A mídia fica em `public/cases/<slug>/`.
 */
export const CASE_CONTENT_DIR = path.join(process.cwd(), "content", "cases");

export type CaseDataSource = {
  cases: Case[];
  /** `content` — arquivos lidos (a lista pode estar vazia); `error` — falha ao ler. */
  source: "content" | "error";
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function readCases(): Promise<CaseDataSource> {
  try {
    const entries = await readdir(CASE_CONTENT_DIR, { withFileTypes: true });
    const slugs = entries.filter(entry => entry.isDirectory() && SLUG.test(entry.name)).map(entry => entry.name);
    const cases = (await Promise.all(slugs.map(slug => readJson<Case>(path.join(CASE_CONTENT_DIR, slug, "case.json")))))
      .filter((c): c is Case => c !== null)
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.slug.localeCompare(b.slug));
    return { cases, source: "content" };
  } catch {
    return { cases: [], source: "error" };
  }
}

// A deployment's files never change; in development every read sees the latest edit.
let memo: Promise<CaseDataSource> | null = null;

function readAll(): Promise<CaseDataSource> {
  if (process.env.NODE_ENV === "development") return readCases();
  return (memo ??= readCases());
}

/** The cases the site shows: drafts and archived cases stay in the admin. */
export async function getCaseDataSource(): Promise<CaseDataSource> {
  const data = await readAll();
  return { ...data, cases: data.cases.filter(c => !c.draft && !c.archived) };
}

/** Every case, drafts included (admin and translations). */
export function getAllCases(): Promise<CaseDataSource> {
  return readAll();
}

/** The case body, in blocks; an empty list when the case has none yet. */
export async function getCaseBody(slug: string): Promise<NotionBlockNode[]> {
  if (!SLUG.test(slug)) return [];
  return (await readJson<NotionBlockNode[]>(path.join(CASE_CONTENT_DIR, slug, "body.json"))) ?? [];
}

export function getNextCaseFromList(list: Case[], slug: string): Case {
  if (list.length === 0) {
    throw new Error("getNextCaseFromList: nenhum case em content/cases.");
  }
  const idx = list.findIndex((x) => x.slug === slug);
  if (idx < 0) return list[0]!;
  return list[(idx + 1) % list.length] ?? list[0]!;
}

export function getGenericTemplateCaseParamsFromList(list: Case[]): { slug: string }[] {
  const custom = new Set<string>(CUSTOM_CASE_LANDING_SLUGS);
  return list.filter((c) => !custom.has(c.slug)).map((c) => ({ slug: c.slug }));
}

/** Lista de índice: só remove `modelo` e ordena por `order`. */
export function orderCasesForListing(list: Case[]): Case[] {
  return list
    .filter((c) => c.slug !== "modelo")
    .sort(
      (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
    );
}

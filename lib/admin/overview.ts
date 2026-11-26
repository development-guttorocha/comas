import { stat } from "node:fs/promises";
import path from "node:path";
import { CASE_CONTENT_DIR, getAllCases, getCaseBody } from "@/lib/caseContent";
import { getCaseCoverSrc } from "@/lib/caseCover";
import type { Case } from "@/lib/cases";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { extractSource } from "@/lib/translations/document";
import { readTranslation } from "@/lib/translations/store";
import { readBlock } from "./caseBlocks";
import { listMedia } from "./caseStore";

export type TranslationState = "published" | "outdated" | "draft" | "none";
export type CellKind = "section" | "component" | "media" | "other";

export type CaseRow = {
  slug: string;
  title: string;
  company: string;
  year: string;
  cover?: string;
  featured: boolean;
  draft: boolean;
  archived: boolean;
  cells: CellKind[];
  translation: TranslationState;
  editedAt: number;
};

export function blockCells(body: NotionBlockNode[]): CellKind[] {
  return body.flatMap(block => {
    const kind = readBlock(block).kind;
    if (kind === "spacer") return [];
    return [kind === "section" ? "section" : kind === "component" ? "component" : kind === "image" || kind === "images" || kind === "embed" ? "media" : "other"];
  });
}

export async function translationState(c: Case, body: NotionBlockNode[]): Promise<TranslationState> {
  const record = await readTranslation(c.slug).catch(() => null);
  const hash = extractSource(c, body).sourceHash;
  if (record?.published?.sourceHash === hash) return "published";
  if (record?.published) return "outdated";
  return record?.draft ? "draft" : "none";
}

// Literal file names: a computed one makes the build trace (and ship) the whole project.
async function editedAt(slug: string) {
  const time = (file: Promise<{ mtimeMs: number }>) => file.then(s => s.mtimeMs, () => 0);
  return Math.max(await time(stat(path.join(CASE_CONTENT_DIR, slug, "case.json"))), await time(stat(path.join(CASE_CONTENT_DIR, slug, "body.json"))));
}

export async function loadOverview() {
  const { cases } = await getAllCases();
  const rows: CaseRow[] = await Promise.all(cases.filter(c => c.slug !== "modelo").map(async c => {
    const body = await getCaseBody(c.slug);
    return {
      slug: c.slug, title: c.title, company: c.company, year: c.year, cover: getCaseCoverSrc(c), featured: !!c.featuredOnSite, draft: !!c.draft, archived: !!c.archived,
      cells: blockCells(body), translation: await translationState(c, body), editedAt: await editedAt(c.slug),
    };
  }));
  const media = (await Promise.all(rows.map(row => listMedia(row.slug)))).flat();
  return { rows, mediaBytes: media.reduce((sum, file) => sum + file.size, 0), mediaFiles: media.length };
}

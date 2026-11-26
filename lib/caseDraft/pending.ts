import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { SLUG } from "@/lib/admin/caseStore";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import type { DraftCaseData } from "./caseData";

// The last AI draft of a case, kept on this Mac until Gutto saves the case. A draft takes a minute or
// more; if the page reloads meanwhile (a dev reload, another tab), the answer reaches no page and would
// be lost. The editor reads it back when it opens. A draft older than the last save is stale.

const DIR = path.join(process.cwd(), ".admin", "drafts");
const fileOf = (slug: string) => {
  if (!SLUG.test(slug)) throw new Error("Case inválido.");
  return path.join(DIR, `${slug}.json`);
};

/** `data`: the case data (Dados tab) written with the body, for the fields that were empty. */
export type PendingDraft = { at: string; body: NotionBlockNode[]; data?: DraftCaseData };

export async function savePending(slug: string, body: NotionBlockNode[], data?: DraftCaseData) {
  await mkdir(DIR, { recursive: true });
  await writeFile(fileOf(slug), JSON.stringify({ at: new Date().toISOString(), body, ...(data && Object.keys(data).length ? { data } : {}) } satisfies PendingDraft));
}

export async function clearPending(slug: string) {
  await rm(fileOf(slug), { force: true });
}

/** The draft not yet saved into the case, or null (none, or the case was saved after it). */
export async function readPending(slug: string): Promise<PendingDraft | null> {
  try {
    const draft = JSON.parse(await readFile(fileOf(slug), "utf8")) as PendingDraft;
    if (!Array.isArray(draft.body) || !draft.body.length) return null;
    const saved = await stat(path.join(process.cwd(), "content", "cases", slug, "body.json")).then(s => s.mtimeMs, () => 0);
    return saved > Date.parse(draft.at) ? null : draft;
  } catch {
    return null;
  }
}

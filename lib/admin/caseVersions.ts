import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Case } from "@/lib/cases";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { readBlock } from "./caseBlocks";
import { SLUG, saveCaseFiles } from "./caseStore";

// Versões (audit R6): the case as it was before each editing session, from the copies that
// saveCaseFiles keeps in `.content-history/<slug>/` (out of git). Going back to a version saves it
// like any edit, so the version of now is kept too and going back can itself be undone.

const HISTORY_DIR = path.join(process.cwd(), ".content-history");
const STAMP = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/;
const FILE = /^(.+)-(case|body|reel)\.json$/;

export type CaseVersion = { id: string; at: string; title: string; blocks: number; sections: number; video: boolean };

/** The stamp of a history file back to a date ("2026-11-12T10-37-05-123Z" → ISO). */
export function versionDate(id: string): string | null {
  const m = STAMP.exec(id);
  return m ? `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z` : null;
}

/** Counts what a version holds, for the list: its blocks and sections. */
export function describeBody(body: NotionBlockNode[]) {
  return { blocks: body.length, sections: body.filter(block => readBlock(block).kind === "section").length };
}

const historyDir = (slug: string) => {
  if (!SLUG.test(slug)) throw new Error("Case inválido.");
  return path.join(HISTORY_DIR, slug);
};
const readJson = async <T,>(file: string): Promise<T | null> => {
  try { return JSON.parse(await readFile(file, "utf8")) as T; } catch { return null; }
};

/** The versions of a case, newest first. */
export async function listVersions(slug: string): Promise<CaseVersion[]> {
  const dir = historyDir(slug);
  const names = await readdir(dir).catch(() => [] as string[]);
  const stamps = new Map<string, Set<string>>();
  for (const name of names) {
    const m = FILE.exec(name);
    if (!m || !versionDate(m[1]!)) continue;
    stamps.set(m[1]!, (stamps.get(m[1]!) ?? new Set()).add(m[2]!));
  }
  const versions = await Promise.all([...stamps].map(async ([id, files]): Promise<CaseVersion | null> => {
    if (!files.has("case")) return null;
    const data = await readJson<Case>(path.join(dir, `${id}-case.json`));
    if (!data) return null;
    const body = files.has("body") ? (await readJson<NotionBlockNode[]>(path.join(dir, `${id}-body.json`))) ?? [] : [];
    return { id, at: versionDate(id)!, title: data.title ?? "", ...describeBody(Array.isArray(body) ? body : []), video: files.has("reel") };
  }));
  return versions.filter((v): v is CaseVersion => !!v).sort((a, b) => b.id.localeCompare(a.id));
}

/** Puts a version back as the case: data, body and video (a version without video removes it). */
export async function restoreVersion(slug: string, id: string, revision: string) {
  if (!versionDate(id)) throw new Error("Versão inválida.");
  const dir = historyDir(slug);
  const data = await readJson<Case>(path.join(dir, `${id}-case.json`));
  if (!data) throw new Error("Essa versão não existe mais.");
  const body = (await readJson<NotionBlockNode[]>(path.join(dir, `${id}-body.json`))) ?? [];
  const reel = await readJson<unknown>(path.join(dir, `${id}-reel.json`));
  // a session of its own: the case of now is kept as a version before it changes. The editor goes on
  // in this session, so its next saves do not keep the version just restored a second time.
  const session = `volta-${randomUUID()}`;
  return { ...(await saveCaseFiles(slug, revision, { case: data, body, reel }, { session })), session };
}

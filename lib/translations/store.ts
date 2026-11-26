import { randomUUID } from "node:crypto";
import { readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TranslationRecord } from "./document";

export class TranslationConflict extends Error {}
export function safeSlug(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 180) throw new Error("Case inválido.");
  return slug;
}
/** The English lives beside the case it translates, in the repository: it ships with each deploy, with no storage to call. */
function translationPath(slug: string) { return path.join(process.cwd(), "content", "cases", safeSlug(slug), "en.json"); }
/** Translations are written by the local admin only; the deployed site just reads the files. */
export function storageReady() { return process.env.NODE_ENV !== "production"; }
export async function readTranslation(slug: string): Promise<TranslationRecord | null> {
  try { return JSON.parse(await readFile(translationPath(slug), "utf8")) as TranslationRecord; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
// Serialize writes so two saves from the admin never interleave.
let writes: Promise<unknown> = Promise.resolve();
export async function saveTranslation(record: TranslationRecord, expectedRevision: string | null) {
  const save = async () => {
    if (!storageReady()) throw new Error("As traduções são editadas no admin local e publicadas com o deploy.");
    const file = translationPath(record.slug);
    if (!(await stat(path.dirname(file)).then(s => s.isDirectory(), () => false))) throw new Error("Case não encontrado.");
    const previous = await readTranslation(record.slug);
    if ((previous?.revision ?? null) !== expectedRevision) throw new TranslationConflict("A tradução mudou em outra operação. Atualize a página.");
    const next = { ...record, revision: randomUUID() };
    const temp = `${file}.${randomUUID()}.tmp`;
    await writeFile(temp, `${JSON.stringify(next, null, 2)}\n`);
    await rename(temp, file);
    return next;
  };
  const pending = writes.then(save, save);
  writes = pending.catch(() => undefined);
  return pending;
}

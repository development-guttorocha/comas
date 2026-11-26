import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { CASE_CONTENT_DIR } from "@/lib/caseContent";
import { CaseConflict, SLUG } from "@/lib/admin/caseStore";
import { parseMaterial, type CaseMaterial } from "@/lib/caseMaterial";

/**
 * A matéria-prima do case (`content/cases/<slug>/material.json`), gravada pelo admin (só local), com
 * a mesma proteção dos outros arquivos do case: versão para não sobrescrever e cópia de segurança a
 * cada salvamento, em `.content-history/material/<slug>/` (fora da pasta de histórico do case, que
 * guarda um número fixo de cópias). O site nunca lê este arquivo, e ele não vai para a Vercel
 * (`outputFileTracingExcludes` em next.config.ts).
 */
const FILE = "material.json";
const HISTORY_DIR = path.join(process.cwd(), ".content-history", "material");
const HISTORY_KEEP = 30;

const sha1 = (value: string) => createHash("sha1").update(value).digest("hex");
const serialize = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const caseDir = (slug: string) => {
  if (!SLUG.test(slug)) throw new Error("Case inválido.");
  return path.join(CASE_CONTENT_DIR, slug);
};

async function readText(file: string) {
  try { return await readFile(file, "utf8"); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** The case's material and the version read; an empty material when the case has none yet; null when the case does not exist. */
export async function readCaseMaterial(slug: string): Promise<{ material: CaseMaterial; revision: string } | null> {
  const dir = caseDir(slug);
  if ((await readText(path.join(dir, "case.json"))) === null) return null;
  const raw = await readText(path.join(dir, FILE));
  let material: CaseMaterial = {};
  if (raw) {
    try { material = parseMaterial(JSON.parse(raw)); } catch { throw new Error("O material.json deste case não é um JSON válido. Corrija o arquivo ou recupere uma cópia em .content-history/material."); }
  }
  return { material, revision: sha1(raw ?? "") };
}

/** For the case generator: the material, or null when the case has none filled. */
export async function getCaseMaterial(slug: string): Promise<CaseMaterial | null> {
  const read = await readCaseMaterial(slug);
  return read && Object.keys(read.material).length ? read.material : null;
}

/** Saves the material; refuses when the file changed since `revision` was read. An empty material removes the file. */
export async function saveCaseMaterial(slug: string, revision: string, value: unknown) {
  const dir = caseDir(slug);
  const file = path.join(dir, FILE);
  const current = await readText(file);
  if ((await readText(path.join(dir, "case.json"))) === null) throw new Error("Case não encontrado.");
  if (sha1(current ?? "") !== revision) throw new CaseConflict("O material deste case mudou fora desta tela. Recarregue a página para ver a versão atual.");
  const material = parseMaterial(value);
  if (current !== null) {
    const history = path.join(HISTORY_DIR, slug);
    await mkdir(history, { recursive: true });
    await writeFile(path.join(history, `${new Date().toISOString().replace(/[:.]/g, "-")}-${FILE}`), current);
    const entries = (await readdir(history)).sort();
    await Promise.all(entries.slice(0, Math.max(0, entries.length - HISTORY_KEEP)).map(name => rm(path.join(history, name))));
  }
  if (Object.keys(material).length) await writeFile(file, serialize(material));
  else await rm(file, { force: true });
  return (await readCaseMaterial(slug))!;
}

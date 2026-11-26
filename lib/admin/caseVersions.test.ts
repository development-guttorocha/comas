import { before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// The store reads its folders from the working directory when it loads: run it in a temporary one,
// so no real case or history is touched.
type Store = typeof import("./caseStore");
type Versions = typeof import("./caseVersions");
let root = "", history = "";
let readCaseFiles: Store["readCaseFiles"], saveCaseFiles: Store["saveCaseFiles"];
let listVersions: Versions["listVersions"], restoreVersion: Versions["restoreVersion"], versionDate: Versions["versionDate"];
const SLUG = "teste-versoes";

before(async () => {
  root = await mkdtemp(path.join(tmpdir(), "versoes-"));
  process.chdir(root);
  ({ readCaseFiles, saveCaseFiles } = await import("./caseStore"));
  ({ listVersions, restoreVersion, versionDate } = await import("./caseVersions"));
  history = path.join(root, ".content-history", SLUG);
});
const block = (id: string, text: string) => ({ id, type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: text }, plain_text: text }] } });
const stamps = async () => [...new Set((await readdir(history)).map(n => /^(.+)-(case|body|reel)\.json$/.exec(n)?.[1]).filter(Boolean))];

async function start(title = "Primeiro") {
  const dir = path.join(root, "content", "cases", SLUG);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "case.json"), JSON.stringify({ slug: SLUG, title, company: "Teste" }));
  await writeFile(path.join(dir, "body.json"), JSON.stringify([block("a", "um")]));
}
async function save(title: string, session?: string) {
  const current = (await readCaseFiles(SLUG))!;
  return saveCaseFiles(SLUG, current.revision, { case: { ...current.case, title }, body: [...current.body, block(title, title)] }, { session });
}

test("the saves of one editing session become one version; a new session makes another", async () => {
  await start();
  await save("A", "s1");
  await save("B", "s1");
  await save("C", "s1");
  assert.equal((await stamps()).length, 1);
  assert.equal((await listVersions(SLUG))[0]!.title, "Primeiro"); // the case as it was before the session
  await save("D", "s2");
  const versions = await listVersions(SLUG);
  assert.equal(versions.length, 2);
  assert.equal(versions[0]!.title, "C"); // newest first: before session s2
  assert.equal(versions[0]!.blocks, 4);
  assert.ok(versions[0]!.at.startsWith(new Date().toISOString().slice(0, 4)));
});

test("going back to a version keeps the case of now as a version, and the editor's next saves in that session keep nothing", async () => {
  const before = await listVersions(SLUG);
  const oldest = before.at(-1)!;
  const current = (await readCaseFiles(SLUG))!;
  const restored = await restoreVersion(SLUG, oldest.id, current.revision);
  assert.equal(restored.case.title, "Primeiro");
  const after = await listVersions(SLUG);
  assert.equal(after.length, before.length + 1);
  assert.equal(after[0]!.title, "D"); // the case of now, kept before going back
  const next = (await readCaseFiles(SLUG))!;
  await saveCaseFiles(SLUG, next.revision, { case: { ...next.case, title: "E" } }, { session: restored.session });
  assert.equal((await listVersions(SLUG)).length, after.length);
  await assert.rejects(restoreVersion(SLUG, "../../etc", next.revision), /inválida/);
  await assert.rejects(restoreVersion(SLUG, oldest.id, "revisao-velha"), /mudaram fora/);
});

test("a save without a session (other tools) keeps a copy each time, but never the same files twice", async () => {
  const count = (await stamps()).length;
  await save("F");
  await save("G");
  assert.equal((await stamps()).length, count + 2);
});

test("the history keeps the latest 30 versions, counting versions, not files", async () => {
  // 32 old versions with two files each: 64 files, more than the old cut of 60
  for (let i = 0; i < 32; i++) {
    const id = `2020-01-01T00-00-${String(i).padStart(2, "0")}-000Z`;
    await writeFile(path.join(history, `${id}-case.json`), JSON.stringify({ slug: SLUG, title: `old ${i}`, company: "Teste" }));
    await writeFile(path.join(history, `${id}-body.json`), "[]");
  }
  await save("H", "s3");
  const kept = (await stamps()).sort();
  assert.equal(kept.length, 30);
  assert.ok(!kept.includes("2020-01-01T00-00-00-000Z"));
  assert.equal(versionDate("2020-01-01T00-00-05-000Z"), "2020-01-01T00:00:05.000Z");
  assert.equal(versionDate("nada"), null);
});

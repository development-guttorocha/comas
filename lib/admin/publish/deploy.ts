import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { underPaths } from "./diff";
import { CODE_PATHS, CONTENT_PATHS, PRIVATE_CONTENT, git, type PublishPlan } from "./plan";

/**
 * The publish's own steps on disk:
 * - `commitContent`: commits the content paths (never the raw material);
 * - `checkCode` + `commitCode`: the site's code (CODE_PATHS) is committed too, only after the type check
 *   and the unit tests pass, in its own commit;
 * - `assembleDeploy`: a temporary worktree at HEAD, linked to the Vercel project, without what the plan
 *   leaves out. `vercel deploy` runs there, so production gets exactly one commit, minus drafts.
 */

const ROOT = process.cwd();

/** Commits the plan's content files; returns the new commit, or null when there was nothing to commit. */
export async function commitContent(plan: PublishPlan, write: (line: string) => void): Promise<string | null> {
  const list = plan.commit.filter(p => !PRIVATE_CONTENT.test(p) && CONTENT_PATHS.some(c => p === c || p.startsWith(`${c}/`)));
  if (!list.length) { write("Nada novo no conteúdo desde o último commit."); return null; }
  const add = await git(["add", "-A", "--", ...list]);
  if (add.code !== 0) throw new Error(`git add falhou: ${add.err.trim()}`);
  // only these paths: anything another session staged stays staged and out of this commit
  const commit = await git(["commit", "-m", `Conteúdo do site (${new Date().toLocaleString("pt-BR")})`, "--", ...list]);
  if (commit.code !== 0) throw new Error(`git commit falhou: ${(commit.err || commit.out).trim()}`);
  const sha = (await git(["rev-parse", "HEAD"])).out.trim();
  write(`Conteúdo registrado no commit ${sha.slice(0, 7)} (${list.length} ${list.length === 1 ? "arquivo" : "arquivos"}).`);
  return sha;
}

/**
 * The gate before code is committed: the type check and the unit tests. Quiet when they pass; on a failure
 * the last lines of the output are written. Nothing is committed or deployed when it returns false.
 */
export async function checkCode(write: (line: string) => void): Promise<boolean> {
  const steps: [string, string[]][] = [["os tipos", ["run", "--silent", "check:types"]], ["os testes", ["test", "--silent"]]];
  for (const [label, args] of steps) {
    write(`Conferindo ${label} do código…`);
    const result = await new Promise<{ code: number; out: string }>(resolve => {
      execFile("npm", args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024, encoding: "utf8", env: { ...process.env, FORCE_COLOR: "0" } }, (error, stdout, stderr) => {
        resolve({ code: error ? (typeof error.code === "number" ? error.code : 1) : 0, out: `${stdout}\n${stderr}` });
      });
    });
    if (result.code !== 0) {
      write(`Falhou: ${label} do código. Nada foi registrado nem publicado; o site fica como está.`);
      result.out.split("\n").map(l => l.trimEnd()).filter(Boolean).slice(-20).forEach(write);
      return false;
    }
  }
  return true;
}

/** Commits the plan's code files (own commit, after `checkCode`); returns the commit, or null when there was nothing. */
export async function commitCode(plan: PublishPlan, write: (line: string) => void): Promise<string | null> {
  const list = plan.code.filter(p => underPaths(p, CODE_PATHS));
  if (!list.length) return null;
  const add = await git(["add", "-A", "--", ...list]);
  if (add.code !== 0) throw new Error(`git add falhou: ${add.err.trim()}`);
  const commit = await git(["commit", "-m", `Código do site (${new Date().toLocaleString("pt-BR")})`, "--", ...list]);
  if (commit.code !== 0) throw new Error(`git commit falhou: ${(commit.err || commit.out).trim()}`);
  const sha = (await git(["rev-parse", "HEAD"])).out.trim();
  write(`Código registrado no commit ${sha.slice(0, 7)} (${list.length} ${list.length === 1 ? "arquivo" : "arquivos"}).`);
  return sha;
}

const exists = (p: string) => stat(p).then(() => true, () => false);

export type Assembled = { dir: string; sha: string; removed: string[]; cleanup: () => Promise<void> };

/** A copy of HEAD ready for `vercel deploy`: project link, .vercelignore, and the plan's leftovers removed. */
export async function assembleDeploy(plan: PublishPlan): Promise<Assembled> {
  if (!(await exists(path.join(ROOT, ".vercel", "project.json")))) throw new Error("Este Mac não está ligado ao projeto da Vercel (.vercel/project.json).");
  const dir = await mkdtemp(path.join(os.tmpdir(), "portfolio-publish-"));
  const cleanup = async () => {
    // only this copy: other worktrees (other sessions, other tools) are left as they are
    await git(["worktree", "remove", "--force", dir]);
    await rm(dir, { recursive: true, force: true });
  };
  const add = await git(["worktree", "add", "--detach", dir, "HEAD"]);
  if (add.code !== 0) { await rm(dir, { recursive: true, force: true }); throw new Error(`Não foi possível montar a cópia do commit: ${add.err.trim()}`); }
  try {
    const sha = (await git(["rev-parse", "HEAD"], dir)).out.trim();
    await mkdir(path.join(dir, ".vercel"), { recursive: true });
    await copyFile(path.join(ROOT, ".vercel", "project.json"), path.join(dir, ".vercel", "project.json"));
    // the CLI does not read .gitignore: this file keeps the admin's private folders out of the upload
    if (await exists(path.join(ROOT, ".vercelignore"))) await copyFile(path.join(ROOT, ".vercelignore"), path.join(dir, ".vercelignore"));

    const removed: string[] = [];
    for (const rel of plan.prune) {
      if (!/^(content|public)\//.test(rel) || rel.includes("..")) continue;
      const target = path.join(dir, rel);
      if (!(await exists(target))) continue;
      await rm(target, { recursive: true, force: true });
      removed.push(rel);
    }
    // the video's automatic English goes back to what is live
    for (const slug of plan.reelEnglishLive) {
      const file = path.join(dir, "content", "cases", slug, "en.json");
      const now = JSON.parse(await readFile(file, "utf8").catch(() => "null")) as Record<string, unknown> | null;
      if (!now) continue;
      const liveText = plan.live.known ? (await git(["show", `${plan.live.sha}:content/cases/${slug}/en.json`])).out : "";
      const liveReel = liveText ? (JSON.parse(liveText) as { reel?: unknown }).reel : undefined;
      if (liveReel === undefined) delete now.reel; else now.reel = liveReel;
      await writeFile(file, `${JSON.stringify(now, null, 2)}\n`);
      removed.push(`content/cases/${slug}/en.json (inglês do vídeo)`);
    }
    return { dir, sha, removed, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

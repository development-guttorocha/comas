import { execFile } from "node:child_process";

/** One production deploy, as the Vercel CLI lists it. `meta.gitCommitSha` is the commit the CLI deployed from. */
export type Deployment = { state?: string; target?: string; ready?: number; createdAt?: number; url?: string; meta?: Record<string, string | undefined> };

/** The production deploys on Vercel, newest first (the CLI of this Mac, already logged in). */
export function listProduction(cwd = process.cwd()) {
  return new Promise<Deployment[]>((resolve, reject) => {
    execFile("npx", ["--no-install", "vercel", "ls", "--prod", "--format", "json"], { cwd, timeout: 30_000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout) => {
      if (error) return reject(new Error("Não foi possível consultar a Vercel."));
      try { resolve((JSON.parse(stdout) as { deployments?: Deployment[] }).deployments ?? []); }
      catch { reject(new Error("A Vercel respondeu num formato inesperado.")); }
    });
  });
}

/** What is live now: the newest ready production deploy, its time and the commit it came from. */
export async function liveDeploy(cwd = process.cwd()): Promise<{ at: number | null; sha: string | null }> {
  const live = (await listProduction(cwd)).find(d => d.state === "READY" && d.target === "production");
  if (!live) return { at: null, sha: null };
  const sha = live.meta?.gitCommitSha;
  return { at: live.ready ?? live.createdAt ?? null, sha: sha && /^[0-9a-f]{40}$/.test(sha) ? sha : null };
}

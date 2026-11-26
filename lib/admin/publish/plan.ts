import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { liveDeploy } from "./live";
import {
  blockChanges, caseDataChanged, embedNames, isReferenced, jsonChanged, missingEmbeds, pageLabel, plural, sameStem, underPaths, type BlockChanges,
} from "./diff";

/**
 * What "Publicar" would put on the site, read before anything is done (no AI, no commit, no deploy).
 *
 * - The deploy comes from a copy of the last commit (lib/admin/publish/deploy.ts).
 * - The content (content/, public/cases, public/articles, public/reel) is committed first, so it goes.
 * - The site's code (app, components, lib, scripts, supabase and the config files: CODE_PATHS) goes too:
 *   it is committed in its own commit, but only after the type check and the unit tests pass
 *   (`checkCode`), so code half-way done stops the publish instead of reaching production.
 *   Tools and notes (.mcp.json, .superdesign, docs…) are not the site: they stay out (`left`).
 * - Left out of the copy: draft cases and articles (their files and pictures), media nothing on the site
 *   uses, the raw material, and English not reviewed (the video's automatic English keeps what is live).
 * - Blocked: content that needs code no commit has yet (a case component only in uncommitted files).
 */

const ROOT = process.cwd();
/** What the publish commits; everything else in the working tree is somebody's work in progress. */
export const CONTENT_PATHS = ["content", "public/cases", "public/articles", "public/reel"];
/** The site's code: committed by the publish after the checks pass. (`.env*` never: .gitignore keeps the keys out.) */
export const CODE_PATHS = ["app", "components", "lib", "scripts", "supabase", "proxy.ts", "next.config.ts", "package.json", "package-lock.json", "tsconfig.json", "eslint.config.mjs", ".env.example"];
/** Raw material: never committed, never deployed (also in .vercelignore). */
export const PRIVATE_CONTENT = /^content\/cases\/[^/]+\/material\.json$/;
const WORK_FILE = /^content\/(media-captions\/|[^/]+\.md$)/;
const MEDIA = /\.(png|jpe?g|webp|gif|avif|svg|mp4|webm)$/i;
const TEXT = /\.(tsx?|jsx?|mjs|json|css|md|html)$/;

export type LineState = "pronto" | "rascunho" | "sem-uso" | "sem-revisao" | "trabalho";
export type PlanLine = { label: string; detail?: string; state: LineState };
export type PlanTask = { id: "prepare-reels"; label: string; detail: string; slugs: string[] };
export type PublishPlan = {
  /** The commit live now (from Vercel) and the one the changes are compared with. */
  live: { sha: string | null; at: number | null; known: boolean; note?: string };
  head: string;
  goes: PlanLine[];
  out: PlanLine[];
  /** Cases on the site that this publish does not change. */
  unchanged: string[];
  /** Steps to run before publishing (never AI); the publish works without them. */
  tasks: PlanTask[];
  /** Code files with changes: the publish commits them (after the checks) and they go with the deploy. */
  code: string[];
  /** Other files with changes (tools, notes, screenshots): not the site, they stay out. */
  left: string[];
  /** Reasons the publish cannot go now. */
  blocked: string[];
  /** Content files the publish will commit. */
  commit: string[];
  /** Paths (files or folders) removed from the deploy copy. */
  prune: string[];
  /** Cases whose video English goes back to what is live (en.json `reel`). */
  reelEnglishLive: string[];
};

/** Runs git; `code` is its exit status (no throw), `out` its stdout. */
export function git(args: string[], cwd = ROOT): Promise<{ code: number; out: string; err: string }> {
  return new Promise(resolve => {
    execFile("git", args, { cwd, maxBuffer: 64 * 1024 * 1024, encoding: "utf8" }, (error, stdout, stderr) => {
      resolve({ code: error ? (typeof error.code === "number" ? error.code : 1) : 0, out: stdout, err: stderr });
    });
  });
}

async function atCommit(sha: string, file: string): Promise<string | null> {
  const r = await git(["show", `${sha}:${file}`]);
  return r.code === 0 ? r.out : null;
}

const readText = (file: string) => readFile(path.join(ROOT, file), "utf8").catch(() => null);
const parse = <T,>(text: string | null): T | null => { try { return text === null ? null : JSON.parse(text) as T; } catch { return null; } };
const dirs = async (dir: string) => (await readdir(path.join(ROOT, dir), { withFileTypes: true }).catch(() => [])).filter(d => d.isDirectory() && !d.name.startsWith(".")).map(d => d.name).sort();
const files = async (dir: string) => (await readdir(path.join(ROOT, dir), { withFileTypes: true }).catch(() => [])).filter(d => d.isFile() && !d.name.startsWith(".")).map(d => d.name).sort();

/** Every text file under `dir` (repo-relative), skipping the folders `skip` says. */
async function walkTexts(dir: string, skip: (rel: string) => boolean, out: string[] = []): Promise<string[]> {
  for (const entry of await readdir(path.join(ROOT, dir), { withFileTypes: true }).catch(() => [])) {
    const rel = `${dir}/${entry.name}`;
    if (entry.name.startsWith(".") || entry.name === "node_modules" || skip(rel)) continue;
    if (entry.isDirectory()) await walkTexts(rel, skip, out);
    else if (TEXT.test(entry.name)) { const t = await readText(rel); if (t !== null) out.push(t); }
  }
  return out;
}

/** Uncommitted paths (porcelain v1, untracked files listed one by one). */
async function dirtyPaths(): Promise<string[]> {
  const r = await git(["status", "--porcelain", "-uall", "--no-renames"]);
  return r.out.split("\n").filter(Boolean).map(line => line.slice(3).replace(/^"|"$/g, ""));
}

type CaseJson = { slug: string; title?: string; company?: string; draft?: boolean; archived?: boolean };
type TranslationJson = { draft?: { units?: unknown }; published?: unknown; reel?: unknown };

const caseName = (c: CaseJson | null, slug: string) => c?.company?.trim() || c?.title?.trim() || slug;

function blockDetail(c: BlockChanges): string | null {
  const parts: string[] = [];
  if (c.changed) parts.push(plural(c.changed, "bloco alterado", "blocos alterados"));
  if (c.added) parts.push(plural(c.added, "bloco novo", "blocos novos"));
  if (c.removed) parts.push(plural(c.removed, "bloco removido", "blocos removidos"));
  if (!parts.length && c.moved) parts.push("ordem dos blocos");
  return parts.length ? parts.join(", ") : null;
}

export async function buildPublishPlan(): Promise<PublishPlan> {
  const head = (await git(["rev-parse", "HEAD"])).out.trim();
  let live: PublishPlan["live"] = { sha: null, at: null, known: false };
  try {
    const d = await liveDeploy();
    const known = !!d.sha && (await git(["cat-file", "-e", `${d.sha}^{commit}`])).code === 0;
    live = { sha: d.sha, at: d.at, known, note: known ? undefined : "Não achei neste Mac o commit que está no ar: a lista compara com o último commit." };
  } catch (error) {
    live = { sha: null, at: null, known: false, note: `${(error as Error).message} A lista compara com o último commit.` };
  }
  const base = live.known ? live.sha! : head;

  // what changed since the live commit: committed after it, or not committed yet
  const since = new Set((await git(["diff", "--name-only", "--no-renames", base, "HEAD", "--", ...CONTENT_PATHS])).out.split("\n").filter(Boolean));
  const dirty = await dirtyPaths();
  const isContent = (p: string) => underPaths(p, CONTENT_PATHS);
  for (const p of dirty) if (isContent(p)) since.add(p);
  const changed = [...since].sort();
  const commit = dirty.filter(p => isContent(p) && !PRIVATE_CONTENT.test(p)).sort();
  const code = dirty.filter(p => underPaths(p, CODE_PATHS)).sort();
  const left = dirty.filter(p => !isContent(p) && !underPaths(p, CODE_PATHS)).sort();

  const goes: PlanLine[] = [], out: PlanLine[] = [], unchanged: string[] = [], blocked: string[] = [];
  const prune: string[] = [], reelEnglishLive: string[] = [];
  const draftCases = new Set<string>(), draftArticles = new Set<string>();

  // ---- cases
  const cases: { slug: string; now: CaseJson }[] = [];
  for (const slug of await dirs("content/cases")) {
    const now = parse<CaseJson>(await readText(`content/cases/${slug}/case.json`));
    if (!now) continue;
    if (now.draft) draftCases.add(slug);
    cases.push({ slug, now });
  }
  for (const article of await dirs("content/articles")) {
    if (parse<{ draft?: boolean }>(await readText(`content/articles/${article}/article.json`))?.draft) draftArticles.add(article);
  }

  // what the site's text and code point at: a picture nobody points at is left out of the deploy
  const texts = await walkTexts("content", rel =>
    /^content\/cases\/[^/]+$/.test(rel) && draftCases.has(rel.split("/")[2])
    || /^content\/articles\/[^/]+$/.test(rel) && draftArticles.has(rel.split("/")[2])
    || rel === "content/media-captions" || PRIVATE_CONTENT.test(rel) || rel.endsWith(".md"));
  for (const dir of ["app", "components", "lib"]) {
    await walkTexts(dir, rel => rel === "lib/admin" || rel === "app/api/admin" || rel === "app/(pt)/admin" || rel === "components/admin" || /\.test\.ts$/.test(rel), texts);
  }
  const corpus = texts.join("\n");

  const unusedOf = async (folder: "cases" | "articles", slug: string) => {
    const dir = `public/${folder}/${slug}`;
    const names = (await files(dir)).filter(n => MEDIA.test(n));
    const used = names.filter(n => isReferenced(`/${folder}/${slug}/${n}`, corpus));
    const unused = names.filter(n => !used.includes(n) && !used.some(u => sameStem(u, n)));
    return { dir, names, used, unused };
  };
  const baseFiles = async (dir: string) => new Set((await git(["ls-tree", "-r", "--name-only", base, "--", dir])).out.split("\n").filter(Boolean));

  // the case components the deploy will know: the code goes with the publish, so the file as it is now
  const registry = await readText("components/case/NotionCaseEmbed.tsx") ?? "";

  // two cases of one company (a copy, a test) are told apart by their title
  const companies = new Map<string, number>();
  for (const { slug, now } of cases) companies.set(caseName(now, slug), (companies.get(caseName(now, slug)) ?? 0) + 1);
  for (const { slug, now } of cases) {
    const company = caseName(now, slug);
    const name = (companies.get(company) ?? 0) > 1 && now.title?.trim() ? `${company} · ${now.title.trim()}` : company;
    const was = parse<CaseJson>(await atCommit(base, `content/cases/${slug}/case.json`));
    const wasLive = !!was && !was.draft && !was.archived;
    if (now.draft || now.archived) {
      prune.push(`content/cases/${slug}`, `public/cases/${slug}`, `public/reel/prep/${slug}`, `content/media-captions/cases/${slug}.json`);
      if (wasLive) goes.push({ label: name, detail: now.draft ? "sai do site (voltou a rascunho)" : "sai do site (arquivado)", state: "pronto" });
      if (now.draft) {
        const pics = (await files(`public/cases/${slug}`)).filter(n => MEDIA.test(n)).length;
        out.push({ label: `${name} (rascunho)`, detail: pics ? (pics === 1 ? "e a imagem dele" : `e as ${pics} imagens dele`) : undefined, state: "rascunho" });
      }
      continue;
    }
    const touched = changed.some(p => p.startsWith(`content/cases/${slug}/`) || p.startsWith(`public/cases/${slug}/`) || p.startsWith(`public/reel/prep/${slug}/`));
    const media = await unusedOf("cases", slug);
    for (const n of media.unused) prune.push(`${media.dir}/${n}`);
    if (media.unused.length) out.push({ label: `${name}: ${plural(media.unused.length, "imagem sem uso", "imagens sem uso")}`, detail: "nenhum bloco usa", state: "sem-uso" });

    const body = await readText(`content/cases/${slug}/body.json`) ?? "[]";
    const missing = missingEmbeds(embedNames(body), registry);
    if (missing.length) blocked.push(`${name} usa ${missing.join(", ")}, que ainda não está em nenhum commit. Faça o commit desse código antes de publicar.`);

    const details: string[] = [];
    if (!wasLive) details.push("entra no site");
    else if (touched) {
      if (caseDataChanged(await atCommit(base, `content/cases/${slug}/case.json`), await readText(`content/cases/${slug}/case.json`) ?? "")) details.push("dados do case");
      const blocks = blockDetail(blockChanges(parse<unknown[]>(await atCommit(base, `content/cases/${slug}/body.json`)) ?? [], parse<unknown[]>(body) ?? []));
      if (blocks) details.push(blocks);
      if (jsonChanged(await atCommit(base, `content/cases/${slug}/reel.json`), await readText(`content/cases/${slug}/reel.json`))) details.push("vídeo");
      const before = await baseFiles(media.dir);
      const fresh = media.used.filter(n => !before.has(`${media.dir}/${n}`)).length;
      if (fresh) details.push(plural(fresh, "imagem nova", "imagens novas"));
      if (changed.some(p => p.startsWith(`public/reel/prep/${slug}/`))) details.push("telas do vídeo preparadas");
    }
    if (details.length) goes.push({ label: name, detail: details.join(" · "), state: "pronto" });

    // English: only what Gutto published in the Tradução tab goes; drafts and the video's automatic English stay out
    const enNow = parse<TranslationJson>(await readText(`content/cases/${slug}/en.json`));
    const enWas = parse<TranslationJson>(await atCommit(base, `content/cases/${slug}/en.json`));
    if (enNow) {
      if (JSON.stringify(enNow.published ?? null) !== JSON.stringify(enWas?.published ?? null)) goes.push({ label: `Inglês de ${name}`, detail: "tradução revisada", state: "pronto" });
      if (enNow.draft && JSON.stringify((enNow.draft as { units?: unknown }).units ?? null) !== JSON.stringify((enNow.published as { units?: unknown } | undefined)?.units ?? null)) {
        out.push({ label: `Inglês de ${name}`, detail: "rascunho sem revisão (o site mostra a última versão revisada)", state: "sem-revisao" });
      }
      if (JSON.stringify(enNow.reel ?? null) !== JSON.stringify(enWas?.reel ?? null)) {
        reelEnglishLive.push(slug);
        out.push({ label: `Inglês do vídeo de ${name}`, detail: "tradução automática sem revisão: o vídeo em inglês fica como está no ar", state: "sem-revisao" });
      }
    }
    if (!details.length) unchanged.push(name);
  }

  // ---- articles
  for (const article of await dirs("content/articles")) {
    const now = parse<{ title?: string; draft?: boolean }>(await readText(`content/articles/${article}/article.json`));
    if (!now) continue;
    const title = now.title?.trim() || article;
    const was = parse<{ draft?: boolean }>(await atCommit(base, `content/articles/${article}/article.json`));
    const wasLive = !!was && !was.draft;
    if (now.draft) {
      prune.push(`content/articles/${article}`, `public/articles/${article}`, `content/media-captions/articles/${article}.json`);
      if (wasLive) goes.push({ label: `Artigo: ${title}`, detail: "sai do site (voltou a rascunho)", state: "pronto" });
      out.push({ label: `Artigo: ${title} (rascunho)`, state: "rascunho" });
      continue;
    }
    const media = await unusedOf("articles", article);
    for (const n of media.unused) prune.push(`${media.dir}/${n}`);
    if (media.unused.length) out.push({ label: `Artigo ${title}: ${plural(media.unused.length, "imagem sem uso", "imagens sem uso")}`, state: "sem-uso" });
    if (!wasLive) goes.push({ label: `Artigo: ${title}`, detail: "entra no site", state: "pronto" });
    else if (changed.some(p => p.startsWith(`content/articles/${article}/`) || p.startsWith(`public/articles/${article}/`))) goes.push({ label: `Artigo: ${title}`, detail: "texto ou imagens alterados", state: "pronto" });
  }

  // ---- pages, services, resources (texts the site shows)
  const pages = changed.filter(p => /^content\/(home\.json|reel-tracks\.json|(pages|services|recursos)\/[^/]+\.json)$/.test(p));
  for (const p of pages) {
    const now = await readText(p);
    if (!jsonChanged(await atCommit(base, p), now)) continue;
    goes.push({ label: pageLabel(p, parse<{ title?: unknown; serviceName?: unknown; navName?: unknown }>(now)), detail: now === null ? "removida" : "textos alterados", state: "pronto" });
  }
  const reelFiles = changed.filter(p => p.startsWith("public/reel/") && !p.startsWith("public/reel/prep/"));
  if (reelFiles.length) goes.push({ label: "Trilhas dos vídeos", detail: plural(reelFiles.length, "arquivo", "arquivos"), state: "pronto" });
  if (code.length) goes.push({ label: "Código do site", detail: `${plural(code.length, "arquivo", "arquivos")} · confere tipos e testes antes de registrar`, state: "pronto" });

  // ---- files of the admin's own work (they go in the commit, never on a page)
  const work = changed.filter(p => WORK_FILE.test(p));
  if (work.length) out.push({ label: "Arquivos de trabalho do admin", detail: `${plural(work.length, "arquivo", "arquivos")} (descrições de imagens, guias da IA): vão para o histórico, não aparecem no site`, state: "trabalho" });
  if (changed.some(p => PRIVATE_CONTENT.test(p))) out.push({ label: "Material bruto dos cases", detail: "fica só neste Mac", state: "trabalho" });
  for (const slug of await dirs("content/cases")) prune.push(`content/cases/${slug}/material.json`);

  // ---- before publishing: screens of the videos without their PhotoCraft copies (no AI)
  const tasks: PlanTask[] = [];
  try {
    const { photoCraftReady, reelPrepMissing } = await import("@/lib/reel/imagePrep");
    if (await photoCraftReady()) {
      const need: string[] = [];
      let screens = 0;
      for (const { slug, now } of cases) {
        if (now.draft || now.archived) continue;
        const { missing } = await reelPrepMissing(slug).catch(() => ({ missing: 0 }));
        if (missing) { need.push(slug); screens += missing; }
      }
      if (need.length) tasks.push({ id: "prepare-reels", label: "Preparar as telas dos vídeos no PhotoCraft", detail: `${plural(screens, "tela", "telas")} sem preparo (${need.join(", ")}). Sem isso, o vídeo usa as telas como estão.`, slugs: need });
    }
  } catch { /* PhotoCraft is optional */ }

  if (!head) blocked.push("Este repositório ainda não tem commit.");
  return { live, head, goes, out, unchanged, tasks, code, left, blocked, commit, prune: [...new Set(prune)], reelEnglishLive };
}

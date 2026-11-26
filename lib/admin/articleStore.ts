import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ARTICLE_CONTENT_DIR, articleSeries, articleThemes, type Article } from "@/lib/articles";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { CaseConflict, SLUG } from "./caseStore";

/** Writing articles from the admin (local only): same rules as the cases, a revision and a backup per save. */
const HISTORY_DIR = path.join(process.cwd(), ".content-history", "articles");
const HISTORY_KEEP = 30;

const sha1 = (value: string) => createHash("sha1").update(value).digest("hex");
const serialize = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const articleDir = (slug: string) => {
  if (!SLUG.test(slug)) throw new Error("Artigo inválido.");
  return path.join(ARTICLE_CONTENT_DIR, slug);
};

async function readText(file: string) {
  try { return await readFile(file, "utf8"); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function readArticleFiles(slug: string) {
  const dir = articleDir(slug);
  const [articleText, bodyText] = await Promise.all([readText(path.join(dir, "article.json")), readText(path.join(dir, "body.json"))]);
  if (articleText === null) return null;
  return {
    article: JSON.parse(articleText) as Article,
    body: (bodyText ? JSON.parse(bodyText) : []) as NotionBlockNode[],
    revision: sha1(`${articleText}\0${bodyText ?? ""}`),
  };
}

function checkArticle(value: unknown, slug: string): asserts value is Article {
  const a = value as Article | null;
  if (!a || typeof a !== "object" || a.slug !== slug) throw new Error("Artigo inválido.");
  if (typeof a.title !== "string" || !a.title.trim()) throw new Error("O artigo precisa de título.");
  if (!(a.theme in articleThemes)) throw new Error("Escolha o tema do artigo.");
  if (a.series && !(a.series in articleSeries)) throw new Error("Série desconhecida.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.publishedAt ?? "")) throw new Error("A data de publicação vai no formato AAAA-MM-DD.");
}

function validBody(value: unknown): value is NotionBlockNode[] {
  const block = (b: unknown): boolean => !!b && typeof b === "object" && typeof (b as NotionBlockNode).id === "string" && typeof (b as NotionBlockNode).type === "string"
    && ((b as NotionBlockNode).children === undefined || (Array.isArray((b as NotionBlockNode).children) && (b as NotionBlockNode).children!.every(block)));
  return Array.isArray(value) && value.every(block);
}

async function keepHistory(slug: string, files: Record<string, string | null>) {
  const dir = path.join(HISTORY_DIR, slug);
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  for (const [name, text] of Object.entries(files)) if (text !== null) await writeFile(path.join(dir, `${stamp}-${name}`), text);
  const entries = (await readdir(dir)).sort();
  await Promise.all(entries.slice(0, Math.max(0, entries.length - HISTORY_KEEP * 2)).map(name => rm(path.join(dir, name))));
}

/** Saves the data and/or body; refuses when the files changed since `revision` was read. */
export async function saveArticleFiles(slug: string, revision: string, next: { article?: unknown; body?: unknown }) {
  const dir = articleDir(slug);
  const current = await readArticleFiles(slug);
  if (!current) throw new Error("Artigo não encontrado.");
  if (current.revision !== revision) throw new CaseConflict("Os arquivos deste artigo mudaram fora desta tela. Recarregue a página para ver a versão atual.");
  if (next.article !== undefined) checkArticle(next.article, slug);
  if (next.body !== undefined && !validBody(next.body)) throw new Error("O conteúdo tem um bloco inválido.");
  const articleFile = path.join(dir, "article.json"), bodyFile = path.join(dir, "body.json");
  await keepHistory(slug, { "article.json": await readText(articleFile), "body.json": await readText(bodyFile) });
  const data = (next.article ?? current.article) as Article;
  // A published article is dated on each save: the sitemap and the page say when it last changed.
  await writeFile(articleFile, serialize(data.draft ? data : { ...data, updatedAt: new Date().toISOString().slice(0, 10) }));
  if (next.body !== undefined) await writeFile(bodyFile, serialize(next.body));
  return (await readArticleFiles(slug))!;
}

export async function createArticle(input: { slug: string; title: string; theme: string }) {
  const dir = articleDir(input.slug);
  if (await readText(path.join(dir, "article.json")) !== null) throw new CaseConflict("Já existe um artigo com esse endereço.");
  const data: Article = {
    slug: input.slug, title: input.title.trim(), dek: "", theme: input.theme as Article["theme"],
    publishedAt: new Date().toISOString().slice(0, 10), ads: true, draft: true,
  };
  checkArticle(data, input.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "article.json"), serialize(data));
  await writeFile(path.join(dir, "body.json"), serialize([]));
  return data;
}

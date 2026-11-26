import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

// The Figma plugin (tools/figma-plugin) sends exported frames straight into a case's media.
// It talks to the local admin with a key of its own, kept in .admin/ (never in git): the
// plugin runs inside Figma, so it can't use the admin page's session or origin.

const FILE = path.join(process.cwd(), ".admin", "figma-plugin.json");

export async function pluginKey(): Promise<string> {
  try {
    const { key } = JSON.parse(await readFile(FILE, "utf8")) as { key?: string };
    if (key) return key;
  } catch { /* first use */ }
  const key = `gfp_${randomBytes(24).toString("base64url")}`;
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify({ key, createdAt: new Date().toISOString() }, null, 2));
  return key;
}

export async function validPluginKey(request: Request) {
  const sent = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const key = await pluginKey();
  const a = Buffer.from(sent), b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Cases the plugin can send to: slug and title, in the order of the site. */
export async function caseChoices() {
  const dir = path.join(process.cwd(), "content", "cases");
  const slugs = (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory() && d.name !== "modelo").map((d) => d.name);
  const items = await Promise.all(slugs.map(async (slug) => {
    try {
      const c = JSON.parse(await readFile(path.join(dir, slug, "case.json"), "utf8")) as { title?: string; company?: string; order?: number; archived?: boolean };
      return { slug, title: c.company ? `${c.company} — ${c.title ?? slug}` : c.title ?? slug, order: c.order ?? 999, archived: !!c.archived };
    } catch {
      return null;
    }
  }));
  return items.filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => Number(a.archived) - Number(b.archived) || a.order - b.order);
}

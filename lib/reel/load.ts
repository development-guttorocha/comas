import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseReel, type ReelDoc, type ReelPrepared } from "@/lib/reel/types";

/**
 * The case's reel (content/cases/<slug>/reel.json), or null when it has none. A draft is
 * returned only with `drafts` (the admin's machine, where it shows with a draft label).
 */
export async function getCaseReel(slug: string, { drafts = false }: { drafts?: boolean } = {}): Promise<ReelDoc | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const text = await readFile(path.join(process.cwd(), "content", "cases", slug, "reel.json"), "utf8");
    const reel = parseReel(JSON.parse(text));
    if (!reel || (!drafts && reel.draft)) return null;
    const prepared = await readPrepared(slug);
    return prepared ? { ...reel, prepared } : reel;
  } catch {
    return null;
  }
}

/** The case's prepared screen images (public/reel/prep/<slug>/manifest.json), when there are any. */
async function readPrepared(slug: string): Promise<ReelPrepared | undefined> {
  try {
    const list = JSON.parse(await readFile(path.join(process.cwd(), "public", "reel", "prep", slug, "manifest.json"), "utf8")) as ReelPrepared;
    return list && typeof list === "object" ? list : undefined;
  } catch {
    return undefined;
  }
}

import { execFile } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { parseReel, type ReelPrepared } from "@/lib/reel/types";

// Screen images prepared for the case video with PhotoCraft (headless, on this machine only):
// the margin around a screen is trimmed, its size measured (the frame then hugs the screen),
// and a small, already blurred copy is made for the surround, so the browser does not blur a
// large image on every frame. The results live in public/reel/prep/<slug>/, with a manifest
// the reel loader reads; without them the video keeps its usual look.

const run = promisify(execFile);
const CLI = process.env.PHOTOCRAFT_CLI || path.join(os.homedir(), ".local", "bin", "photocraft-cli");
const FIG = process.env.FIGCRAFT_CLI || path.join(os.homedir(), ".local", "bin", "figcraft-cli");

/**
 * A raw screenshot gets a device around it (FigCraft): tall ones a phone, wide ones a browser
 * window. An image that is already a composition (devices on a dark or coloured backdrop) is
 * left as it is.
 */
async function mockupKind(file: string, w: number, h: number): Promise<"phone" | "browser" | null> {
  try {
    await stat(FIG);
  } catch {
    return null;
  }
  // a light top-left corner reads as a screenshot (an app's own background); a dark or coloured
  // one is a composed board (devices on a backdrop), which keeps its own look
  const corner = await sharp(file).removeAlpha().extract({ left: 0, top: 0, width: Math.min(24, w), height: Math.min(24, h) }).toBuffer().then((b) => sharp(b).stats());
  if (corner.channels.some((c) => c.mean < 200)) return null;
  return h / w > 1.3 ? "phone" : "browser";
}

async function makeMockup(kind: "phone" | "browser", file: string, w: number, h: number, out: string) {
  const ref = (n: string) => ({ $ref: n });
  let steps: unknown[];
  let size: [number, number];
  if (kind === "browser") {
    const sc = Math.min(2, 2400 / w);
    const sw = Math.round(w * sc), sh = Math.round(h * sc), bar = 76;
    size = [sw, sh + bar];
    steps = [
      { command: "node.create", as: "m", params: { type: "frame", name: "Mockup", x: 0, y: 0, width: sw, height: sh + bar, props: { fills: ["#1c1c1e"], cornerRadius: 28, clip: true, strokes: ["#3a3a3c"], strokeWeight: 2, strokeAlign: "inside" } } },
      ...["#ff5f57", "#febc2e", "#28c840"].map((c, i) => ({ command: "node.create", params: { type: "ellipse", parent: ref("m"), x: 28 + i * 32, y: 28, width: 20, height: 20, props: { fills: [c] } } })),
      { command: "node.create", params: { type: "rectangle", parent: ref("m"), x: Math.round(sw / 2 - 300), y: 18, width: 600, height: 40, props: { fills: ["#2c2c2e"], cornerRadius: 10 } } },
      { command: "image.place", params: { path: file, parent: ref("m"), x: 0, y: bar, width: sw, height: sh, mode: "fill", name: "Screen" } },
    ];
  } else {
    const sc = 1700 / h;
    const sw = Math.round(w * sc), sh = 1700, b = 30;
    size = [sw + b * 2, sh + b * 2];
    steps = [
      { command: "node.create", as: "m", params: { type: "frame", name: "Mockup", x: 0, y: 0, width: sw + b * 2, height: sh + b * 2, props: { fills: ["#0c0c0c"], cornerRadius: 120, clip: true, strokes: ["#2e2e30"], strokeWeight: 4, strokeAlign: "inside" } } },
      { command: "image.place", as: "s", params: { path: file, parent: ref("m"), x: b, y: b, width: sw, height: sh, mode: "fill", name: "Screen" } },
      { command: "node.set", params: { ids: [ref("s")], props: { cornerRadius: 92 } } },
      { command: "node.create", params: { type: "rectangle", parent: ref("m"), x: Math.round((sw + b * 2) / 2 - 110), y: b + 26, width: 220, height: 64, props: { fills: ["#000000"], cornerRadius: 32 } } },
    ];
  }
  const script = `${out}.json`, doc = `${out}.figcraft`;
  await writeFile(script, JSON.stringify(steps));
  await run(FIG, ["run", script, "--out", doc, "--no-system-fonts"], { timeout: 120_000 });
  await run(FIG, ["export", doc, "-o", out, "--node", "Mockup", "--no-system-fonts"], { timeout: 120_000 });
  await rm(script, { force: true });
  await rm(doc, { force: true });
  return size;
}

async function cli(args: string[]) {
  const { stdout } = await run(CLI, args, { timeout: 120_000, maxBuffer: 32 * 1024 * 1024 });
  return stdout;
}

export async function photoCraftReady() {
  try {
    await stat(CLI);
    return true;
  } catch {
    return false;
  }
}

/** The screen images a reel shows (screens boards and shots, before and after). */
function screenImages(raw: unknown): string[] {
  const doc = parseReel(raw);
  if (!doc) return [];
  const out = new Set<string>();
  for (const sc of doc.scenes) {
    if (sc.kind === "screens") {
      sc.boards?.forEach((b) => b.src && out.add(b.src));
      sc.shots?.forEach((s) => s.src && out.add(s.src));
    } else if (sc.kind === "compare") {
      if (sc.before?.src) out.add(sc.before.src);
      if (sc.after?.src) out.add(sc.after.src);
    }
  }
  return [...out].filter((s) => s.startsWith("/cases/"));
}

/** How many screen images of the case's reel still lack their PhotoCraft copies (no AI, no PhotoCraft call). */
export async function reelPrepMissing(slug: string): Promise<{ missing: number; total: number }> {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Case inválido.");
  const root = process.cwd();
  const reel = await readFile(path.join(root, "content", "cases", slug, "reel.json"), "utf8").then((t) => JSON.parse(t), () => null);
  if (!reel) return { missing: 0, total: 0 };
  const manifest: ReelPrepared = await readFile(path.join(root, "public", "reel", "prep", slug, "manifest.json"), "utf8").then((t) => JSON.parse(t), () => ({}));
  const list = screenImages(reel);
  let missing = 0;
  for (const src of list) {
    const entry = manifest[src];
    const file = await stat(path.join(root, "public", src)).catch(() => null);
    const aura = entry?.aura ? await stat(path.join(root, "public", entry.aura)).catch(() => null) : null;
    if (file && (!entry?.w || !aura || aura.mtimeMs < file.mtimeMs)) missing++;
  }
  return { missing, total: list.length };
}

/** Prepares every screen image of the case's reel; returns how many were made. */
export async function prepareReelImages(slug: string): Promise<{ prepared: number; total: number }> {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Case inválido.");
  if (!(await photoCraftReady())) throw new Error("O PhotoCraft não está instalado nesta máquina (photocraft-cli).");
  const root = process.cwd();
  const reel = JSON.parse(await readFile(path.join(root, "content", "cases", slug, "reel.json"), "utf8"));
  const dir = path.join(root, "public", "reel", "prep", slug);
  await mkdir(dir, { recursive: true });
  const manifestPath = path.join(dir, "manifest.json");
  const before: ReelPrepared = await readFile(manifestPath, "utf8").then((t) => JSON.parse(t), () => ({}));
  const manifest: ReelPrepared = {};
  const list = screenImages(reel);
  let made = 0;
  for (const src of list) {
    const file = path.join(root, "public", src);
    const base = path.basename(src).replace(/\.[^.]+$/, "");
    const board = path.join(dir, `${base}.webp`);
    const aura = path.join(dir, `${base}-aura.webp`);
    const fresh = await Promise.all([stat(file), stat(board).catch(() => null), stat(aura).catch(() => null)]);
    const old = before[src];
    if (old?.w && fresh[2] && fresh[2].mtimeMs >= fresh[0].mtimeMs) {
      manifest[src] = old;
      continue;
    }
    // trim the flat margin (the colour of the top-left corner), then measure what is left
    const trim = await cli(["run", file, "--cmd", "image.trim", "--params", '{"basedOn":"topLeft"}', "--out", board]);
    const size = /"height":(\d+),"width":(\d+)/.exec(trim);
    // nothing trimmed: the original serves as is (no copy to publish)
    const orig = JSON.parse(await cli(["info", file])) as { width?: number; height?: number };
    const same = size && Number(size[2]) === orig.width && Number(size[1]) === orig.height;
    // the surround: a quarter-size copy, blurred once here
    await cli(["run", board, "--cmd", "image.imageSize", "--params", '{"percent":25}', "--cmd", "filter.blur.gaussianBlur", "--params", '{"radius":24}', "--out", aura]);
    const url = (p: string) => `/reel/prep/${slug}/${path.basename(p)}`;
    const tw = size ? Number(size[2]) : orig.width ?? 0;
    const th = size ? Number(size[1]) : orig.height ?? 0;
    const kind = tw && th ? await mockupKind(same ? file : board, tw, th) : null;
    if (kind) {
      const mock = path.join(dir, `${base}-${kind}.webp`);
      const [mw, mh] = await makeMockup(kind, same ? file : board, tw, th, mock);
      await rm(board, { force: true });
      manifest[src] = { board: url(mock), aura: url(aura), w: mw, h: mh, mockup: kind };
      made++;
      continue;
    }
    if (same) await rm(board, { force: true });
    manifest[src] = { board: same ? undefined : url(board), aura: url(aura), w: size ? Number(size[2]) : undefined, h: size ? Number(size[1]) : undefined };
    made++;
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  return { prepared: made, total: list.length };
}

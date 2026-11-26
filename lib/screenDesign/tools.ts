import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

// The local programs this feature uses: the Mac's text recognition (a small Swift tool built on
// first use from tools/screen-ocr.swift), FigCraft and PhotoCraft (built from source, installed
// in ~/.local/bin). Nothing here runs on Vercel: the admin works on this machine only.

export const run = promisify(execFile);
const BIN = path.join(os.homedir(), ".local", "bin");
export const FIG = process.env.FIGCRAFT_CLI || path.join(BIN, "figcraft-cli");
const OCR = path.join(BIN, "screen-ocr");
const OCR_SRC = path.join(process.cwd(), "tools", "screen-ocr.swift");

const mtime = (p: string) => stat(p).then((s) => s.mtimeMs, () => 0);

export async function ensureTools() {
  if (!(await mtime(FIG))) throw new Error("O FigCraft não está instalado neste Mac (figcraft-cli em ~/.local/bin).");
  if ((await mtime(OCR)) < (await mtime(OCR_SRC))) await run("swiftc", ["-O", OCR_SRC, "-o", OCR], { timeout: 300_000 });
}

export type OcrBox = { x: number; y: number; w: number; h: number };
export type OcrLine = OcrBox & { text: string; conf: number; chars?: OcrBox[] };
export async function readTexts(image: string): Promise<{ width: number; height: number; lines: OcrLine[] }> {
  const { stdout } = await run(OCR, [image], { maxBuffer: 16 * 1024 * 1024, timeout: 120_000 });
  return JSON.parse(stdout);
}

export async function fig(args: string[]) {
  const { stdout } = await run(FIG, args, { maxBuffer: 64 * 1024 * 1024, timeout: 300_000 });
  return stdout;
}

const PHOTO = process.env.PHOTOCRAFT_CLI || path.join(BIN, "photocraft-cli");

/**
 * A small screenshot is enlarged for measuring (PhotoCraft's detail-preserving resample, or
 * Lanczos when PhotoCraft is missing): edges, borders and letters get more pixels to be read
 * from, and every measure is brought back to the original size afterwards.
 */
export async function enlarge(image: string, out: string, factor: number) {
  if (factor <= 1) return image;
  if (await mtime(PHOTO)) {
    try {
      await run(PHOTO, ["run", image, "--cmd", "image.imageSize", "--params", JSON.stringify({ percent: factor * 100, resample: "preserveDetails" }), "--out", out], { timeout: 120_000 });
      return out;
    } catch { /* falls back below */ }
  }
  const sharp = (await import("sharp")).default;
  const m = await sharp(image).metadata();
  await sharp(image).resize(Math.round((m.width ?? 0) * factor), null, { kernel: "lanczos3" }).png().toFile(out);
  return out;
}

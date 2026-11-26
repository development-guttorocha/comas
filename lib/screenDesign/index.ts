import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildFile } from "./build";
import { compare } from "./compare";
import { makeDraft } from "./draft";
import { ensureFont } from "./fonts";
import sharp from "sharp";
import { enlarge, ensureTools, readTexts } from "./tools";
import { understand } from "./understand";
import { readFile } from "node:fs/promises";
import { stat } from "node:fs/promises";
import { htmlFromScript } from "./html";
import { figmaPackage } from "./figmaPackage";
import { run } from "./tools";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** The same layout as an HTML page, rendered by Chrome without a window, for the comparison. */
async function renderHtml(dir: string, family: string, width: number, height: number) {
  const page = await htmlFromScript(JSON.parse(await readFile(path.join(dir, "script.json"), "utf8")), family);
  await writeFile(path.join(dir, "tela.html"), page);
  if (!(await stat(CHROME).catch(() => null))) return null;
  const out = path.join(dir, "html-render.png");
  await run(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", `--window-size=${width},${height}`, "--virtual-time-budget=5000", `--screenshot=${out}`, `file://${path.join(dir, "tela.html")}`], { timeout: 60_000 });
  return out;
}

// Image → editable layout: a screenshot becomes a FigCraft file (and a .fig for Figma) with
// real texts, shapes, image crops, named groups and colour/text styles. The Mac measures, one
// DeepSeek call gives the structure, FigCraft builds, and the result is compared to the image.

export const WORK = path.join(process.cwd(), ".screen-design");

export async function convertScreen(id: string, source: string, log: (line: string) => void) {
  const dir = path.join(WORK, id);
  await mkdir(dir, { recursive: true });
  const image = path.join(dir, `original${path.extname(source).toLowerCase() || ".png"}`);
  if (source !== image) await copyFile(source, image);
  await ensureTools();
  // A small screenshot is measured enlarged (up to 3×) and brought back to its size. The letters
  // are read on a sharpened copy; shapes and colours on the plain one (sharpening draws halos
  // along every edge, which would read as borders and shift colours).
  const width = (await sharp(image).metadata()).width ?? 0;
  const s = Math.max(1, Math.min(3, Math.round(1200 / Math.max(1, width))));
  const work = await enlarge(image, path.join(dir, "ampliada.png"), s);
  let reading = work;
  if (s > 1) {
    reading = path.join(dir, "ampliada-nitida.png");
    await sharp(work).sharpen({ sigma: 0.8 * s, m1: 0.5, m2: 2 }).png().toFile(reading);
  }
  log(s > 1 ? `Imagem pequena (${width} px): medindo em ${s}×, com uma cópia mais nítida para os textos.` : "Lendo os textos com o reconhecimento do Mac…");
  const ocr = await readTexts(reading);
  log(`${ocr.lines.length} linhas de texto. Medindo formas, bordas, cores e recortes…`);
  const draft = await makeDraft(work, ocr, s);
  log(`${draft.shapes.length} formas, ${draft.crops.length} recortes, ${draft.texts.length} textos. Pedindo a estrutura para a DeepSeek…`);
  const { structure, tokens } = await understand(image, draft);
  log(`Estrutura em ${structure.groups.length} grupos (${tokens} tokens). Fonte sugerida: ${structure.font ?? "nenhuma"}.`);
  const family = await ensureFont(structure.font, log);
  log(`Montando o arquivo no FigCraft com ${family}…`);
  const built = await buildFile(work, draft, structure, family, dir);
  const score = await compare(image, path.join(dir, "render.png"), path.join(dir, "comparacao.png"));
  // the package the Figma plugin (tools/figma-plugin) turns into native layers
  const script = JSON.parse(await readFile(path.join(dir, "script.json"), "utf8"));
  await writeFile(path.join(dir, "layout-figma.json"), JSON.stringify(await figmaPackage(script, family, structure.groups.find((g) => g.role === "screen")?.name ?? "Tela")));
  const htmlShot = await renderHtml(dir, family, draft.width, draft.height).catch(() => null);
  const htmlScore = htmlShot ? await compare(image, htmlShot, path.join(dir, "comparacao-html.png")) : null;
  if (htmlScore) log(`Versão HTML: diferença média ${htmlScore.mean}/255, ${htmlScore.farShare}% de pixels muito diferentes.`);
  const result = { id, family, htmlScore, tokens: built.tokens, deepseekTokens: tokens, notes: structure.notes ?? "", score, groups: structure.groups.length, styleErrors: built.failed };
  await writeFile(path.join(dir, "resultado.json"), JSON.stringify({ ...result, draft, structure }, null, 1));
  log(`Pronto: diferença média ${score.mean}/255, ${score.farShare}% de pixels muito diferentes.`);
  return result;
}

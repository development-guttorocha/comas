import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { inflateRawSync } from "node:zlib";
import sharp from "sharp";

// Turns what Gutto drops in the Material tab into text with a place ("slide 4", "página 2") and the
// pictures worth keeping, all on this Mac: .pptx and .docx are ZIP files of XML (read here, no
// library); PDFs go through macOS's PDFKit (scripts/pdf-text.swift); images are read by the vision
// model in lib/material/sources.ts. Nothing is sent anywhere from this file.

const run = promisify(execFile);

export type Segment = { where: string; text: string };
export type ExtractedImage = { name: string; data: Buffer; where: string };
export type Extracted = { kind: SourceKind; segments: Segment[]; images: ExtractedImage[]; skippedImages: number; units?: number };
export type SourceKind = "pptx" | "docx" | "pdf" | "image" | "text";

export function kindOf(name: string, mime = ""): SourceKind | null {
  const ext = path.extname(name).toLowerCase();
  if (ext === ".pptx") return "pptx";
  if (ext === ".docx") return "docx";
  if (ext === ".pdf" || mime === "application/pdf") return "pdf";
  if (/^\.(png|jpe?g|webp|gif|heic|avif)$/.test(ext) || mime.startsWith("image/")) return "image";
  if (/^\.(txt|md|markdown|csv|eml)$/.test(ext) || mime.startsWith("text/")) return "text";
  return null;
}

// ── ZIP (only what Office files use: stored and deflate) ─────────────────────

export function readZip(buf: Buffer): Map<string, () => Buffer> {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("O arquivo não é um documento do Office válido (ZIP sem índice).");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  if (p === 0xffffffff) throw new Error("O arquivo é grande demais para ler aqui (ZIP64).");
  const entries = new Map<string, () => Buffer>();
  for (let n = 0; n < count && buf.readUInt32LE(p) === 0x02014b50; n++) {
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    entries.set(name, () => {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const raw = buf.subarray(start, start + size);
      if (method === 0) return Buffer.from(raw);
      if (method === 8) return inflateRawSync(raw);
      throw new Error(`Compressão não suportada em ${name}.`);
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
export const unescapeXml = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
  e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e] ?? m);

const tidy = (s: string) => s.replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();

/** Relationships of one part: id → { type, target path inside the ZIP }. */
function rels(zip: Map<string, () => Buffer>, part: string) {
  const dir = path.posix.dirname(part);
  const file = path.posix.join(dir, "_rels", `${path.posix.basename(part)}.rels`);
  const out = new Map<string, { type: string; target: string }>();
  const xml = zip.get(file)?.().toString("utf8");
  if (!xml) return out;
  for (const m of xml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const attr = (k: string) => new RegExp(`\\b${k}="([^"]*)"`).exec(m[1])?.[1] ?? "";
    if (attr("TargetMode") === "External") continue;
    const target = attr("Target");
    out.set(attr("Id"), { type: attr("Type").split("/").pop() ?? "", target: target.startsWith("/") ? target.slice(1) : path.posix.normalize(path.posix.join(dir, target)) });
  }
  return out;
}

/** DrawingML paragraphs (PowerPoint, and Word's drawings): one line each. */
function drawingText(xml: string): string {
  return tidy(
    [...xml.matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g)]
      .map(p => p[1].replace(/<a:br\b[^>]*\/>/g, "\n").replace(/<a:fld\b[^>]*type="slidenum"[\s\S]*?<\/a:fld>/g, "")
        .match(/<a:t>[\s\S]*?<\/a:t>|\n/g)?.map(t => (t === "\n" ? "\n" : unescapeXml(t.slice(5, -6)))).join("") ?? "")
      .filter(line => line.trim())
      .join("\n"),
  );
}

// ── imagens que valem a pena ──────────────────────────────────────────────────

const IMAGE_EXT = /\.(png|jpe?g|gif|webp)$/i;
const MAX_IMAGES = 40;

/** Icons, thin strips and flat fills (slide backgrounds) are not worth keeping. */
async function worthKeeping(data: Buffer) {
  try {
    const meta = await sharp(data).metadata();
    const w = meta.width ?? 0, h = meta.height ?? 0;
    if (w < 360 || h < 240 || w * h < 200_000) return false;
    if (w / h > 6 || h / w > 6) return false;
    const stats = await sharp(data).resize(200, 200, { fit: "inside" }).stats();
    return stats.entropy >= 3;
  } catch {
    return false;
  }
}

async function pick(candidates: ExtractedImage[], seen: Set<string>) {
  const kept: ExtractedImage[] = [];
  let skipped = 0;
  for (const c of candidates) {
    const hash = createHash("sha1").update(c.data).digest("hex");
    if (seen.has(hash) || kept.length >= MAX_IMAGES || !(await worthKeeping(c.data))) { skipped++; continue; }
    seen.add(hash);
    kept.push(c);
  }
  return { kept, skipped };
}

const baseName = (file: string) => path.basename(file, path.extname(file)).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "material";

// ── PowerPoint ───────────────────────────────────────────────────────────────

export async function extractPptx(buf: Buffer, fileName: string): Promise<Extracted> {
  const zip = readZip(buf);
  const presentation = zip.get("ppt/presentation.xml")?.().toString("utf8");
  if (!presentation) throw new Error("Este .pptx não tem apresentação dentro.");
  const presRels = rels(zip, "ppt/presentation.xml");
  const order = [...presentation.matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"/g)].map(m => presRels.get(m[1])?.target).filter((t): t is string => !!t && zip.has(t));
  const segments: Segment[] = [];
  const uses = new Map<string, number[]>();
  const backgrounds = new Set<string>();
  order.forEach((slidePath, i) => {
    const n = i + 1;
    const xml = zip.get(slidePath)!().toString("utf8");
    const slideRels = rels(zip, slidePath);
    const hidden = /<p:sld\b[^>]*\bshow="0"/.test(xml);
    let text = drawingText(xml);
    const notesPath = [...slideRels.values()].find(r => r.type === "notesSlide")?.target;
    const notesXml = notesPath ? zip.get(notesPath)?.().toString("utf8") : undefined;
    if (notesXml) {
      const body = [...notesXml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/g)].map(m => m[0]).filter(sp => !/type="(sldNum|sldImg|hdr|ftr|dt)"/.test(sp)).map(drawingText).filter(Boolean).join("\n");
      if (body) text += `${text ? "\n\n" : ""}Notas do apresentador: ${body}`;
    }
    if (text) segments.push({ where: `slide ${n}${hidden ? " (oculto)" : ""}`, text });
    const bg = /<p:bg\b[\s\S]*?<\/p:bg>/.exec(xml)?.[0] ?? "";
    for (const m of bg.matchAll(/r:embed="([^"]+)"/g)) { const t = slideRels.get(m[1])?.target; if (t) backgrounds.add(t); }
    for (const m of xml.matchAll(/<a:blip\b[^>]*r:embed="([^"]+)"/g)) {
      const t = slideRels.get(m[1])?.target;
      if (t && IMAGE_EXT.test(t)) uses.set(t, [...(uses.get(t) ?? []), n].filter((v, j, a) => a.indexOf(v) === j));
    }
  });
  // A picture on many slides is a logo or a template piece.
  const common = Math.max(3, Math.ceil(order.length * 0.4));
  const candidates = [...uses.entries()]
    .filter(([t, slides]) => !backgrounds.has(t) && slides.length < common)
    .sort((a, b) => a[1][0] - b[1][0])
    .map(([t, slides]) => ({ name: `${baseName(fileName)}-slide-${slides[0]}${path.extname(t).toLowerCase()}`, data: zip.get(t)!(), where: `slide ${slides[0]}` }));
  const { kept, skipped } = await pick(candidates, new Set());
  return { kind: "pptx", segments, images: dedupeNames(kept), skippedImages: skipped + (uses.size - candidates.length), units: order.length };
}

/** Two pictures on one slide: -slide-4, -slide-4-2. */
function dedupeNames(images: ExtractedImage[]) {
  const used = new Map<string, number>();
  return images.map(img => {
    const n = (used.get(img.name) ?? 0) + 1;
    used.set(img.name, n);
    return n === 1 ? img : { ...img, name: img.name.replace(/(\.[a-z]+)$/, `-${n}$1`) };
  });
}

// ── Word ─────────────────────────────────────────────────────────────────────

export async function extractDocx(buf: Buffer, fileName: string): Promise<Extracted> {
  const zip = readZip(buf);
  const xml = zip.get("word/document.xml")?.().toString("utf8");
  if (!xml) throw new Error("Este .docx não tem documento dentro.");
  type Para = { text: string; page: number; heading?: string };
  const paras: Para[] = [];
  let page = 1, sawBreak = false, buffer = "", inText = false, heading = "", rowCells: string[] | null = null, cell = "";
  const tokens = xml.matchAll(/<(\/?)w:(p|t|tab|br|cr|tr|tc|lastRenderedPageBreak|pStyle)\b([^>]*?)(\/?)>|([^<]+)/g);
  for (const m of tokens) {
    const [, close, tag, attrs, selfClose, text] = m;
    if (text !== undefined) { if (inText) buffer += unescapeXml(text); continue; }
    if (tag === "t") { inText = !close && !selfClose; continue; }
    if (tag === "tab") { buffer += "\t"; continue; }
    if (tag === "cr") { buffer += "\n"; continue; }
    if (tag === "br") { if (/w:type="page"/.test(attrs)) { page++; sawBreak = true; } else buffer += "\n"; continue; }
    if (tag === "lastRenderedPageBreak") { if (buffer.trim() || paras.length) { page++; sawBreak = true; } continue; }
    if (tag === "pStyle") { if (/w:val="(Heading|Ttulo|Titulo|Title)/i.test(attrs)) heading = "pending"; continue; }
    if (tag === "tr") { if (!close) rowCells = []; else if (rowCells) { const t = tidy(rowCells.filter(Boolean).join(" | ")); if (t) paras.push({ text: t, page }); rowCells = null; } continue; }
    if (tag === "tc") { if (close && rowCells) { rowCells.push(tidy(cell)); cell = ""; } continue; }
    if (tag === "p" && close) {
      const t = tidy(buffer);
      buffer = "";
      if (rowCells) { cell += (cell ? " " : "") + t; heading = ""; continue; }
      if (t) paras.push({ text: t, page, ...(heading === "pending" ? { heading: t } : {}) });
      heading = "";
    }
  }
  // Pages when Word recorded them; otherwise blocks of about 1.500 characters, named by their heading.
  const segments: Segment[] = [];
  if (sawBreak) {
    for (const p of paras) {
      const last = segments[segments.length - 1];
      const where = `página ${p.page}`;
      if (last?.where === where) last.text += `\n${p.text}`; else segments.push({ where, text: p.text });
    }
  } else {
    let current: Segment | null = null, lastHeading = "", n = 0;
    for (const p of paras) {
      if (p.heading) lastHeading = p.heading;
      if (!current || current.text.length > 1500 || p.heading) {
        n++;
        current = { where: lastHeading ? `trecho ${n} (“${lastHeading.slice(0, 50)}”)` : `trecho ${n}`, text: p.text };
        segments.push(current);
      } else current.text += `\n${p.text}`;
    }
  }
  const docRels = rels(zip, "word/document.xml");
  const candidates = [...xml.matchAll(/<a:blip\b[^>]*r:embed="([^"]+)"/g)]
    .map(m => docRels.get(m[1])?.target).filter((t): t is string => !!t && IMAGE_EXT.test(t) && zip.has(t))
    .filter((t, i, a) => a.indexOf(t) === i)
    .map((t, i) => ({ name: `${baseName(fileName)}-imagem-${i + 1}${path.extname(t).toLowerCase()}`, data: zip.get(t)!(), where: `imagem ${i + 1}` }));
  const { kept, skipped } = await pick(candidates, new Set());
  return { kind: "docx", segments, images: kept, skippedImages: skipped, units: sawBreak ? page : undefined };
}

// ── PDF ──────────────────────────────────────────────────────────────────────

const PDF_TOOL_SOURCE = path.join(process.cwd(), "scripts", "pdf-text.swift");

/** The PDFKit reader, compiled once per version of its source into .admin/bin/. */
async function pdfTool() {
  const source = await readFile(PDF_TOOL_SOURCE);
  const bin = path.join(process.cwd(), ".admin", "bin", `pdf-text-${createHash("sha1").update(source).digest("hex").slice(0, 10)}`);
  try { await access(bin); return bin; } catch { /* compile */ }
  await mkdir(path.dirname(bin), { recursive: true });
  try {
    await run("swiftc", ["-O", PDF_TOOL_SOURCE, "-o", bin], { timeout: 120_000 });
  } catch {
    throw new Error("Não consegui preparar o leitor de PDF deste Mac. Instale as ferramentas de linha de comando com `xcode-select --install` e tente de novo.");
  }
  return bin;
}

/** Photos inside a PDF are often plain JPEG streams: those are copied as they are. */
function pdfJpegs(buf: Buffer): Buffer[] {
  const s = buf.toString("latin1");
  const out: Buffer[] = [];
  const re = /\/Subtype\s*\/Image\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) && out.length < 200) {
    const dictStart = s.lastIndexOf("<<", m.index);
    const streamAt = s.indexOf("stream", m.index);
    if (dictStart < 0 || streamAt < 0) continue;
    const dict = s.slice(dictStart, streamAt);
    if (!/\/DCTDecode/.test(dict)) continue;
    let start = streamAt + 6;
    if (s[start] === "\r") start++;
    if (s[start] === "\n") start++;
    const length = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dict)?.[1];
    const end = length ? start + Number(length) : s.indexOf("endstream", start);
    if (end <= start) continue;
    const data = buf.subarray(start, end);
    if (data[0] === 0xff && data[1] === 0xd8) out.push(Buffer.from(data));
    re.lastIndex = end;
  }
  return out;
}

export async function extractPdf(file: string, buf: Buffer, fileName: string): Promise<Extracted> {
  let pages: string[] = [];
  try {
    const { stdout } = await run(await pdfTool(), [file], { maxBuffer: 64 * 1024 * 1024, timeout: 120_000 });
    pages = (JSON.parse(stdout) as { pages: string[] }).pages;
  } catch (error) {
    const message = (error as { stderr?: string }).stderr?.trim();
    throw new Error(message || (error instanceof Error ? error.message : "Não foi possível ler o PDF."));
  }
  const segments = pages.map((text, i) => ({ where: `página ${i + 1}`, text: tidy(text) })).filter(p => p.text);
  const jpegs = pdfJpegs(buf);
  const candidates = await Promise.all(jpegs.map(async (data, i) => {
    // CMYK photos (print PDFs) become RGB so the browser shows them right.
    const meta = await sharp(data).metadata().catch(() => null);
    const rgb = meta?.space === "cmyk" ? await sharp(data).toColourspace("srgb").jpeg({ quality: 90 }).toBuffer() : data;
    return { name: `${baseName(fileName)}-imagem-${i + 1}.jpg`, data: rgb, where: `imagem ${i + 1}` };
  }));
  const { kept, skipped } = await pick(candidates, new Set());
  return { kind: "pdf", segments, images: kept, skippedImages: skipped, units: pages.length };
}

// ── texto colado ─────────────────────────────────────────────────────────────

/** Pasted text in blocks of about 1.500 characters, cut between paragraphs. */
export function extractText(text: string): Extracted {
  const paras = text.replace(/\r\n?/g, "\n").split(/\n\s*\n/).map(tidy).filter(Boolean);
  const segments: Segment[] = [];
  for (const p of paras) {
    const last = segments[segments.length - 1];
    if (last && last.text.length + p.length < 1500) last.text += `\n\n${p}`;
    else segments.push({ where: `trecho ${segments.length + 1}`, text: p });
  }
  return { kind: "text", segments, images: [], skippedImages: 0 };
}

export async function extractFile(file: string, fileName: string, mime: string): Promise<Extracted> {
  const kind = kindOf(fileName, mime);
  const buf = await readFile(file);
  if (kind === "pptx") return extractPptx(buf, fileName);
  if (kind === "docx") return extractDocx(buf, fileName);
  if (kind === "pdf") return extractPdf(file, buf, fileName);
  if (kind === "text") return extractText(buf.toString("utf8"));
  if (kind === "image") return { kind, segments: [], images: [], skippedImages: 0 };
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".key") throw new Error("Arquivos do Keynote não abrem aqui: no Keynote, use Arquivo › Exportar para › PDF (ou PowerPoint) e mande o arquivo exportado.");
  if (ext === ".ppt" || ext === ".doc") throw new Error(`O formato ${ext} é antigo: abra e salve como ${ext}x, ou exporte em PDF.`);
  throw new Error(`Não sei ler ${ext || "este arquivo"}. Mande PDF, .pptx, .docx, imagem ou texto.`);
}

export const _forTests = { pdfJpegs, drawingText };

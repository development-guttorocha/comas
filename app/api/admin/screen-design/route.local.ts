import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { adminGuard } from "@/lib/admin/guard";
import { WORK, convertScreen } from "@/lib/screenDesign";
import { readForm, UploadError } from "@/lib/admin/form";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const FILES: Record<string, string> = { "comparacao.png": "image/png", "render.png": "image/png", "tela.figcraft": "application/octet-stream", "tela.fig": "application/octet-stream", "layout-figma.json": "application/json" };

/** A file of a finished conversion: the comparison image, the render, or the design files. */
export async function GET(request: Request) {
  const denied = adminGuard(request);
  if (denied) return denied;
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "", f = url.searchParams.get("f") ?? "";
  if (!/^[a-f0-9-]{36}$/.test(id) || !FILES[f]) return new Response("Não encontrado.", { status: 404 });
  try {
    const bytes = await readFile(path.join(WORK, id, f));
    const download: Record<string, string> = f.startsWith("tela.") || f.endsWith(".json") ? { "Content-Disposition": `attachment; filename="layout-${id.slice(0, 8)}${f.endsWith(".json") ? "-figma" : ""}.${f.split(".").pop()}"` } : {};
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": FILES[f], "Cache-Control": "no-store", ...download } });
  } catch {
    return new Response("Não encontrado.", { status: 404 });
  }
}

/** Converts an uploaded screenshot into an editable layout; the steps stream as lines. */
export async function POST(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  let form: FormData;
  try {
    form = await readForm(request, { maxMb: 25 });
  } catch (error) {
    return new Response(`${error instanceof Error ? error.message : "Envio inválido."}\n::erro\n`, { status: error instanceof UploadError ? error.status : 400 });
  }
  const file = form.get("image");
  if (!(file instanceof File) || !/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 20 * 1024 * 1024) {
    return new Response("Envie uma imagem PNG, JPG ou WebP de até 20 MB.\n::erro\n", { status: 400 });
  }
  const id = randomUUID();
  const dir = path.join(WORK, id);
  await mkdir(dir, { recursive: true });
  const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
  const source = path.join(dir, `original${ext}`);
  await writeFile(source, Buffer.from(await file.arrayBuffer()));
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const write = (line: string) => controller.enqueue(encoder.encode(`${line}\n`));
      try {
        const result = await convertScreen(id, source, write);
        write(`::result ${JSON.stringify(result)}`);
      } catch (error) {
        write(error instanceof Error ? error.message : "Não foi possível converter a imagem.");
        write("::erro");
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

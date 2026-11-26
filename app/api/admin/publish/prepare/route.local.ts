import { adminGuard } from "@/lib/admin/guard";
import { buildPublishPlan } from "@/lib/admin/publish/plan";
import { prepareReelImages } from "@/lib/reel/imagePrep";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * A step Gutto runs before publishing, from the publish dialog: prepares the screens of the videos in
 * PhotoCraft (on this Mac, no AI). The publish itself never runs it; without it, the videos use the
 * screens as they are.
 */
export async function POST(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const write = (line: string) => controller.enqueue(encoder.encode(`${line}\n`));
      let ok = true;
      try {
        const task = (await buildPublishPlan()).tasks.find(t => t.id === "prepare-reels");
        if (!task) write("Todas as telas dos vídeos já estão preparadas.");
        for (const slug of task?.slugs ?? []) {
          write(`Preparando as telas do vídeo de ${slug}…`);
          try {
            const { prepared, total } = await prepareReelImages(slug);
            write(`Vídeo de ${slug}: ${prepared} de ${total} telas preparadas.`);
          } catch (error) {
            ok = false;
            write(`As telas do vídeo de ${slug} seguem sem preparo (${error instanceof Error ? error.message : "erro"}).`);
          }
        }
      } catch (error) {
        ok = false;
        write(error instanceof Error ? error.message : "Erro ao preparar as telas.");
      }
      write(ok ? "::ok" : "::erro");
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

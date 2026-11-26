import { spawn } from "node:child_process";
import { adminGuard, adminJson } from "@/lib/admin/guard";
import { assembleDeploy, checkCode, commitCode, commitContent } from "@/lib/admin/publish/deploy";
import { buildPublishPlan } from "@/lib/admin/publish/plan";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The publish runs on this machine (no limit there); Vercel still validates the value on deploy: hobby allows up to 300.
export const maxDuration = 300;

/** One command at a time, streamed line by line to the admin. */
function run(command: string, args: string[], write: (line: string) => void) {
  return new Promise<number>(resolve => {
    const child = spawn(command, args, { cwd: process.cwd(), env: { ...process.env, FORCE_COLOR: "0" } });
    const forward = (chunk: Buffer) => chunk.toString().split(/\r?\n/).filter(Boolean).forEach(write);
    child.stdout.on("data", forward);
    child.stderr.on("data", forward);
    child.on("close", code => resolve(code ?? 1));
    child.on("error", error => { write(error.message); resolve(1); });
  });
}

/** What "Publicar" would do now: the list the dialog shows before anything happens. Reads only. */
export async function GET(request: Request) {
  const denied = adminGuard(request);
  if (denied) return denied;
  try {
    return adminJson(await buildPublishPlan());
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível montar a lista." }, 500);
  }
}

/**
 * Publishes the site from this machine, never calling AI:
 * 1. the list again (it may have changed since the dialog opened); a block stops here;
 * 2. when the code has changes, the type check and the unit tests run; a failure stops here, nothing is committed;
 * 3. the content (content/, public/cases, public/articles, public/reel; never the raw material) and the code
 *    (CODE_PATHS) are committed, each in its own commit;
 * 4. a temporary copy of that commit, without drafts, unused media and unreviewed English;
 * 5. `vercel deploy --prod` from the copy, so production always comes from one commit.
 * `dryRun` does 1 and 3 (even when blocked) and lists what would go, without committing or deploying.
 */
export async function POST(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  const { dryRun } = await request.json().catch(() => ({})) as { dryRun?: boolean };
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const write = (line: string) => controller.enqueue(encoder.encode(`${line}\n`));
      let cleanup: (() => Promise<void>) | null = null;
      // the copy goes before the last line, so the dialog closes on a clean disk
      const finish = async (ok: boolean) => {
        if (cleanup) await cleanup().catch(() => write("Não consegui apagar a cópia temporária do deploy."));
        cleanup = null;
        write(ok ? "::ok" : "::erro");
        controller.close();
      };
      try {
        if (dryRun) write("Teste: monta a cópia do deploy sem commit e sem publicar.");
        write("Conferindo o que vai ao ar…");
        const plan = await buildPublishPlan();
        plan.blocked.forEach(line => write(`Bloqueado: ${line}`));
        // the test goes on, to show the copy; a real publish stops here
        if (plan.blocked.length && !dryRun) return await finish(false);
        plan.goes.forEach(line => write(`Vai ao ar: ${line.label}${line.detail ? ` (${line.detail})` : ""}`));
        if (!plan.goes.length) write("Nenhuma mudança de conteúdo desde o que está no ar.");
        // code first: when it does not pass, nothing is committed (the content waits too)
        if (plan.code.length && !(await checkCode(write))) return await finish(false);
        if (dryRun) {
          write(`Teste: ${plan.commit.length} ${plan.commit.length === 1 ? "arquivo de conteúdo seria registrado" : "arquivos de conteúdo seriam registrados"} e ${plan.code.length} de código (agora a cópia usa o último commit).`);
        } else {
          await commitContent(plan, write);
          await commitCode(plan, write);
        }

        const copy = await assembleDeploy(plan);
        cleanup = copy.cleanup;
        write(`Cópia do commit ${copy.sha.slice(0, 7)} montada para o deploy.`);
        if (copy.removed.length) {
          write(`Fora do deploy (${copy.removed.length}):`);
          copy.removed.forEach(rel => write(`  · ${rel}`));
        }
        if (plan.left.length) write(`Fora do deploy, por não serem do site (${plan.left.length}): ${plan.left.slice(0, 4).join(", ")}${plan.left.length > 4 ? "…" : ""}`);
        if (dryRun) {
          write(plan.blocked.length ? "Teste concluído. Publicação bloqueada (veja acima)." : "Teste concluído. Nada registrado nem publicado.");
          return await finish(true);
        }
        write("Publicando na Vercel (cerca de 1 minuto)…");
        const code = await run("npx", ["--no-install", "vercel", "deploy", "--prod", "--yes", "--cwd", copy.dir], write);
        if (code === 0) write("No ar.");
        await finish(code === 0);
      } catch (error) {
        write(error instanceof Error ? error.message : "Erro ao publicar.");
        await finish(false);
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

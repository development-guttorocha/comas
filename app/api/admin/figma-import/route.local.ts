import { SLUG, saveMedia } from "@/lib/admin/caseStore";
import { adminGuard, adminJson } from "@/lib/admin/guard";
import { caseChoices, pluginKey, validPluginKey } from "@/lib/admin/figmaImport";
import { queueCaptions } from "@/lib/media/captions";
import { translationAdminRequestAvailable } from "@/lib/translations/access";
import { readForm, UploadError } from "@/lib/admin/form";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// The Figma plugin's door into the admin. Plugin requests come from Figma's sandbox (origin
// "null"), so this route answers CORS and checks the plugin key instead of the admin session.
// It still answers only on this machine, like every admin route.

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Cache-Control": "no-store" };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: CORS });

export function OPTIONS(request: Request) {
  if (!translationAdminRequestAvailable(request)) return new Response(null, { status: 404 });
  return new Response(null, { status: 204, headers: CORS });
}

/** With the plugin key: the cases to send to. From the admin page (?key=1): the key itself. */
export async function GET(request: Request) {
  if (!translationAdminRequestAvailable(request)) return new Response(null, { status: 404 });
  if (new URL(request.url).searchParams.get("key") === "1") {
    const denied = adminGuard(request);
    if (denied) return denied;
    return adminJson({ key: await pluginKey() });
  }
  if (!(await validPluginKey(request))) return json({ error: "Chave do plugin inválida. Copie a chave em Admin → Ferramentas → Figma." }, 401);
  return json({ cases: await caseChoices() });
}

/** Frames exported in Figma, saved into the chosen case's media folder. */
export async function POST(request: Request) {
  if (!translationAdminRequestAvailable(request)) return new Response(null, { status: 404 });
  if (!(await validPluginKey(request))) return json({ error: "Chave do plugin inválida." }, 401);
  let form: FormData;
  try {
    form = await readForm(request);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Envio inválido." }, error instanceof UploadError ? error.status : 400);
  }
  const slug = form.get("slug");
  if (typeof slug !== "string" || !SLUG.test(slug)) return json({ error: "Escolha um case." }, 400);
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return json({ error: "Nenhuma imagem enviada." }, 400);
  try {
    const saved = [];
    for (const file of files) saved.push(await saveMedia(slug, file));
    // captions are written in the background; the plugin does not wait for them
    void queueCaptions(saved.filter((f) => /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(f.name)).map((f) => f.url));
    return json({ files: saved });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Não foi possível salvar." }, 422);
  }
}

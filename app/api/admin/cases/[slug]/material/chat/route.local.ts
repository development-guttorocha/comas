import { adminGuard, adminJson } from "@/lib/admin/guard";
import { CaseConflict } from "@/lib/admin/caseStore";
import { parseMaterial } from "@/lib/caseMaterial";
import { getChat, sendMessage, type TurnInput } from "@/lib/material/chat";
import { readForm, UploadError } from "@/lib/admin/form";
import { savePending } from "@/lib/caseDraft/pending";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** The case's conversation in the Material tab. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = adminGuard(request);
  if (denied) return denied;
  const { slug } = await params;
  return adminJson(await getChat(slug));
}

/**
 * One message from Gutto (multipart: `text`, `files`, `material` as JSON, `revision`, `action`). The
 * files are kept and read on this Mac; the AI answers and the facts are saved in material.json.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const { slug } = await params;
    const form = await readForm(request);
    const action = String(form.get("action") ?? "");
    const input: TurnInput = {
      text: String(form.get("text") ?? ""),
      files: form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0),
      material: parseMaterial(JSON.parse(String(form.get("material") ?? "{}"))),
      revision: String(form.get("revision") ?? ""),
      action: action === "continuar" || action === "plano" || action === "rascunho" ? action : undefined,
    };
    if (!input.text && !input.files?.length && !input.action) return adminJson({ error: "Escreva uma mensagem ou anexe um arquivo." }, 400);
    const result = await sendMessage(slug, input);
    // kept until the case is saved, so a page reload during the wait does not lose it
    if (result.draft?.length) await savePending(slug, result.draft, result.draftData);
    return adminJson(result);
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível responder." }, error instanceof CaseConflict ? 409 : error instanceof UploadError ? error.status : 422);
  }
}

import { getCaseDataSource } from "@/lib/caseContent";
import { getTranslationSource, generateTranslation } from "@/lib/translations/service";
import { readTranslation, storageReady } from "@/lib/translations/store";
import { validSyncToken } from "@/lib/translations/auth";
import { adminNotFound, translationAdminRequestAvailable } from "@/lib/translations/access";
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });

/** Scheduler-ready: generates at most one changed case per run, never publishes. */
export async function GET(request: Request) {
  if (!translationAdminRequestAvailable(request)) return adminNotFound();
  if (!validSyncToken(request)) return json({ error: "Acesso necessário." }, 401);
  if (!process.env.OPENAI_API_KEY || !storageReady()) return json({ error: "Configure a API da OpenAI antes de sincronizar." }, 503);
  try {
    const data = await getCaseDataSource();
    if (data.source !== "content") throw new Error("Não foi possível ler os cases.");
    for (const c of data.cases.filter(c => c.slug !== "modelo")) {
      const source = await getTranslationSource(c.slug);
      const record = await readTranslation(c.slug);
      if ((record?.draft ?? record?.published)?.sourceHash === source.sourceHash) continue;
      await generateTranslation(c.slug);
      return json({ status: "draft_generated", slug: c.slug });
    }
    return json({ status: "up_to_date" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Falha na sincronização." }, 422);
  }
}

import { getCaseDataSource } from "@/lib/caseContent";
import { isAuthorized, sameOrigin } from "@/lib/translations/auth";
import { readTranslation, storageReady, TranslationConflict } from "@/lib/translations/store";
import { getTranslationSource, generateTranslation, editTranslation, publishTranslation } from "@/lib/translations/service";
import { TRANSLATION_MODEL } from "@/lib/translations/openai";
import { adminNotFound, translationAdminRequestAvailable } from "@/lib/translations/access";
import { revalidatePath } from "next/cache";
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";
const response = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request) {
  if (!translationAdminRequestAvailable(request)) return adminNotFound();
  if (!isAuthorized(request)) return response({ error: "Entre para administrar as traduções." }, 401);
  try {
    const slug = new URL(request.url).searchParams.get("slug");
    if (slug) {
      const source = await getTranslationSource(slug);
      const record = await readTranslation(slug);
      return response({ source: { slug, title: source.title, sourceHash: source.sourceHash, units: source.units }, record });
    }
    const data = await getCaseDataSource();
    if (data.source !== "content") throw new Error("Não foi possível ler os cases.");
    const cases = await Promise.all(data.cases.filter(c => c.slug !== "modelo").map(async c => {
      const record = await readTranslation(c.slug);
      return { slug: c.slug, title: c.title, draft: !!record?.draft, published: !!record?.published };
    }));
    return response({ cases, configuration: { apiReady: !!process.env.OPENAI_API_KEY, storageReady: storageReady(), storage: "Arquivos do projeto (content/cases/<slug>/en.json)", model: TRANSLATION_MODEL } });
  } catch (error) { return response({ error: error instanceof Error ? error.message : "Falha ao carregar traduções." }, 503); }
}
export async function POST(request: Request) {
  if (!translationAdminRequestAvailable(request)) return adminNotFound();
  if (!isAuthorized(request)) return response({ error: "Acesso necessário." }, 401);
  if (!sameOrigin(request)) return response({ error: "Origem inválida." }, 403);
  try {
    const body = await request.json();
    if (typeof body.slug !== "string") return response({ error: "Informe o case." }, 400);
    let record;
    switch (body.action) {
      case "generate": record = await generateTranslation(body.slug); break;
      case "save":
        if (typeof body.revision !== "string" || !Array.isArray(body.units) || body.units.some((u: unknown) => !u || typeof u !== "object" || typeof (u as { key?: unknown }).key !== "string" || typeof (u as { target?: unknown }).target !== "string")) return response({ error: "Revisão inválida." }, 400);
        record = await editTranslation(body.slug, body.revision, body.units); break;
      case "publish":
        if (typeof body.revision !== "string") return response({ error: "Revisão inválida." }, 400);
        if (body.units !== undefined && (!Array.isArray(body.units) || body.units.some((u: unknown) => !u || typeof u !== "object" || typeof (u as { key?: unknown }).key !== "string" || typeof (u as { target?: unknown }).target !== "string"))) return response({ error: "Revisão inválida." }, 400);
        record = await publishTranslation(body.slug, body.revision, body.units);
        revalidatePath("/en/cases");
        revalidatePath("/en/cases/[slug]", "page");
        revalidatePath("/en");
        revalidatePath("/sitemap.xml");
        break;
      default: return response({ error: "Ação inválida." }, 400);
    }
    return response({ record });
  } catch (error) { return response({ error: error instanceof Error ? error.message : "Falha ao salvar tradução." }, error instanceof TranslationConflict ? 409 : 422); }
}

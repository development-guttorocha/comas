import { adminGuard, adminJson } from "@/lib/admin/guard";
import { applyUnits, normalizeFields, pendingUnits, schemaFields } from "@/lib/pages/model";
import { PAGE_DEFAULTS } from "@/lib/pages/defaults";
import { PageConflict, pageSchema, savePage } from "@/lib/pages/store";
import { translateUnits } from "@/lib/translations/openai";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Saves the page's file; refuses when it changed since `revision` was read. */
export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const { slug } = await params;
    const { revision, values } = await request.json();
    return adminJson(await savePage(slug, String(revision ?? ""), values));
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível salvar a página." }, error instanceof PageConflict ? 409 : 422);
  }
}

/**
 * Translates the texts on screen whose English is missing or out of date, and answers with the new values.
 * Nothing is written: the English goes back to the editor to be reviewed and saved.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const schema = pageSchema((await params).slug);
    const body = await request.json();
    const fields = schemaFields(schema);
    const values = normalizeFields(fields, body.values, PAGE_DEFAULTS[schema.slug] ?? {});
    // Only the texts of the screen asking: a Site screen shows some groups of a file (site.json is split
    // between Em todas as páginas and each page's "Google e compartilhamento").
    const asked = Array.isArray(body.groups) ? new Set(body.groups.map(String)) : null;
    const section = body.section === "seo" ? "seo" : undefined;
    const groups = asked ? schema.groups.filter(group => asked.has(group.label)) : schema.groups.filter(group => group.section === section);
    const units = pendingUnits(groups.flatMap(group => group.fields), values);
    if (!units.length) return adminJson({ values, translated: 0 });
    const context = `Page "${schema.label}" of a design leader's portfolio site: ${schema.description}`;
    const translated = await translateUnits(units, context);
    return adminJson({ values: applyUnits(fields, values, translated), translated: translated.length });
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível traduzir." }, 422);
  }
}

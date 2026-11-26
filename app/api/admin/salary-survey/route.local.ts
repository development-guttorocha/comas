import { revalidatePath, revalidateTag } from "next/cache";
import { adminGuard, adminJson } from "@/lib/admin/guard";
import { buildAdminSurveyPayload } from "@/lib/admin/salarySurveyAdmin";
import { isLikelyOutlier } from "@/lib/salaryBands";
import { SALARY_BANDS_TAG } from "@/lib/salaryBandsServer";
import { toSurveyResponseInsert } from "@/lib/salarySurvey";
import { parseImportedAnswers } from "@/lib/salarySurveyImport";
import {
  deleteSurveyResponse,
  insertSurveyResponsesBatch,
  updateSurveyResponseStatus,
  type SurveyResponseStatus,
} from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set<SurveyResponseStatus>(["pending", "approved", "rejected"]);
const asStatusFilter = (raw: string | null): SurveyResponseStatus | "all" =>
  raw === "all" || raw === "pending" || raw === "approved" || raw === "rejected" ? raw : "pending";

function revalidateSalaryPages() {
  revalidateTag(SALARY_BANDS_TAG, { expire: 0 });
  revalidatePath("/recursos/salario-em-design");
  revalidatePath("/recursos/pesquisa-salarial");
}

const fail = (error: unknown) => adminJson({ error: error instanceof Error ? error.message : "Falha." }, 400);

/** Loads Supabase connection status, counts, responses for the chosen tab, and blended live bands. */
export async function GET(request: Request) {
  const denied = adminGuard(request);
  if (denied) return denied;
  const status = asStatusFilter(new URL(request.url).searchParams.get("status"));
  return adminJson(await buildAdminSurveyPayload(status));
}

/** Updates moderation status (approve / reject / revert to pending) for one or more responses. */
export async function PATCH(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const body = (await request.json()) as { ids?: unknown; status?: unknown; filter?: string };
    const status = String(body.status ?? "") as SurveyResponseStatus;
    if (!VALID_STATUSES.has(status)) return adminJson({ error: "Status inválido." }, 400);
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    await updateSurveyResponseStatus(ids, status);
    revalidateSalaryPages();
    return adminJson(await buildAdminSurveyPayload(asStatusFilter(body.filter ?? null)));
  } catch (error) {
    return fail(error);
  }
}

/** Previews or imports historical answers (JSON, Resend e-mails, CSV/TSV). */
export async function POST(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const body = (await request.json()) as {
      raw?: unknown;
      approveImmediately?: boolean;
      dryRun?: boolean;
      filter?: string;
    };
    const { valid, invalid } = parseImportedAnswers(String(body.raw ?? ""));

    if (body.dryRun) {
      return adminJson({
        preview: true,
        validCount: valid.length,
        invalid,
        outliers: valid.filter(a => isLikelyOutlier(a.role, a.salary, a.companySize, a.regime)).length,
        sample: valid.slice(0, 10),
      });
    }

    if (!valid.length) {
      return adminJson({ error: invalid[0]?.reason ?? "Nenhuma resposta válida encontrada.", invalid }, 400);
    }

    const approveImmediately = Boolean(body.approveImmediately);
    const rows = valid.map(a =>
      toSurveyResponseInsert(a, {
        status: approveImmediately ? "approved" : "pending",
        source: "import",
      }),
    );
    const { inserted } = await insertSurveyResponsesBatch(rows);
    if (approveImmediately) revalidateSalaryPages();

    return adminJson({
      inserted,
      invalid,
      payload: await buildAdminSurveyPayload(asStatusFilter(body.filter ?? null)),
    });
  } catch (error) {
    return fail(error);
  }
}

/** Permanently deletes one response from Supabase. */
export async function DELETE(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const params = new URL(request.url).searchParams;
    const id = params.get("id") ?? "";
    await deleteSurveyResponse(id);
    revalidateSalaryPages();
    return adminJson(await buildAdminSurveyPayload(asStatusFilter(params.get("status"))));
  } catch (error) {
    return fail(error);
  }
}

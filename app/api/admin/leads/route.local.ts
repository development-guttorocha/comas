import { adminGuard, adminJson } from "@/lib/admin/guard";
import { buildAdminLeadsPayload } from "@/lib/admin/leadsAdmin";
import {
  deleteSiteLead,
  updateSiteLead,
  updateSiteLeadsStatus,
  type LeadKind,
  type LeadStatus,
} from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set<LeadStatus>(["new", "replied", "archived"]);
const asStatusFilter = (raw: string | null | undefined): LeadStatus | "all" =>
  raw === "new" || raw === "replied" || raw === "archived" || raw === "all" ? raw : "new";
const asKindFilter = (raw: string | null | undefined): LeadKind | "all" =>
  raw === "service" || raw === "material" || raw === "contact" || raw === "all" ? raw : "all";

const fail = (error: unknown) => adminJson({ error: error instanceof Error ? error.message : "Falha." }, 400);

/** Lists leads by status and kind alongside totals. */
export async function GET(request: Request) {
  const denied = adminGuard(request);
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  return adminJson(
    await buildAdminLeadsPayload({
      status: asStatusFilter(params.get("status")),
      kind: asKindFilter(params.get("kind")),
    }),
  );
}

/** Updates one lead's status/notes or bulk-updates multiple leads' status. */
export async function PATCH(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const body = (await request.json()) as {
      id?: string;
      ids?: unknown;
      status?: unknown;
      notes?: unknown;
      filterStatus?: string;
      filterKind?: string;
    };

    const nextStatus = body.status !== undefined ? (String(body.status) as LeadStatus) : undefined;
    if (nextStatus !== undefined && !VALID_STATUSES.has(nextStatus)) {
      return adminJson({ error: "Status inválido." }, 400);
    }

    if (Array.isArray(body.ids)) {
      if (!nextStatus) return adminJson({ error: "Status obrigatório." }, 400);
      await updateSiteLeadsStatus(body.ids.map(String), nextStatus);
    } else if (body.id) {
      await updateSiteLead(String(body.id), {
        ...(nextStatus !== undefined ? { status: nextStatus } : {}),
        ...(body.notes !== undefined ? { notes: String(body.notes) } : {}),
      });
    } else {
      return adminJson({ error: "Informe id ou ids." }, 400);
    }

    return adminJson(
      await buildAdminLeadsPayload({
        status: asStatusFilter(body.filterStatus),
        kind: asKindFilter(body.filterKind),
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

/** Permanently deletes one lead (e.g. spam or LGPD deletion request). */
export async function DELETE(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const params = new URL(request.url).searchParams;
    await deleteSiteLead(params.get("id") ?? "");
    return adminJson(
      await buildAdminLeadsPayload({
        status: asStatusFilter(params.get("status")),
        kind: asKindFilter(params.get("kind")),
      }),
    );
  } catch (error) {
    return fail(error);
  }
}

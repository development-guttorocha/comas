import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  getLeadCounts,
  listSiteLeads,
  probeLeadsSchema,
  type LeadCounts,
  type LeadKind,
  type LeadStatus,
  type SiteLeadRow,
  type SupabaseProbeResult,
} from "@/lib/supabase";

export type AdminLeadsPayload = {
  probe: SupabaseProbeResult;
  sql: string;
  counts: LeadCounts | null;
  leads: SiteLeadRow[];
};

const SQL_PATH = path.join(process.cwd(), "supabase", "site_leads.sql");

export async function buildAdminLeadsPayload({
  status = "new",
  kind = "all",
}: {
  status?: LeadStatus | "all";
  kind?: LeadKind | "all";
} = {}): Promise<AdminLeadsPayload> {
  const [sql, probe] = await Promise.all([
    readFile(SQL_PATH, "utf8").catch(() => ""),
    probeLeadsSchema(),
  ]);

  if (!probe.schemaReady) {
    return { probe, sql, counts: null, leads: [] };
  }

  try {
    const [counts, leads] = await Promise.all([
      getLeadCounts(),
      listSiteLeads({ status, kind }),
    ]);
    return { probe, sql, counts, leads };
  } catch (error) {
    return {
      probe: {
        ...probe,
        schemaReady: false,
        status: "network_error",
        message: error instanceof Error ? error.message : "Erro ao carregar contatos do Supabase.",
      },
      sql,
      counts: null,
      leads: [],
    };
  }
}

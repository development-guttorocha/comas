import { readFile } from "node:fs/promises";
import path from "node:path";
import survey from "@/content/recursos/pesquisa-salarial.json";
import { defaultSalaryBands, type SalaryBandsData } from "@/lib/salaryBands";
import { getLiveSalaryBands } from "@/lib/salaryBandsServer";
import {
  getSurveyCounts,
  listSurveyResponses,
  probeSupabaseSchema,
  type SupabaseProbeResult,
  type SurveyCounts,
  type SurveyResponseRow,
  type SurveyResponseStatus,
} from "@/lib/supabase";

export type AdminSurveyPayload = {
  edition: string;
  probe: SupabaseProbeResult;
  sql: string;
  counts: SurveyCounts | null;
  responses: SurveyResponseRow[];
  bands: SalaryBandsData;
};

const SQL_PATH = path.join(process.cwd(), "supabase", "salary_survey.sql");

export async function buildAdminSurveyPayload(
  statusFilter: SurveyResponseStatus | "all" = "pending",
): Promise<AdminSurveyPayload> {
  const [sql, probe] = await Promise.all([
    readFile(SQL_PATH, "utf8").catch(() => ""),
    probeSupabaseSchema(),
  ]);

  const fallbackBands: SalaryBandsData = { ...defaultSalaryBands, edition: survey.edition };
  if (!probe.schemaReady) {
    return {
      edition: survey.edition,
      probe,
      sql,
      counts: null,
      responses: [],
      bands: fallbackBands,
    };
  }

  try {
    const [counts, responses, bands] = await Promise.all([
      getSurveyCounts(survey.edition),
      listSurveyResponses({ edition: survey.edition, status: statusFilter }),
      getLiveSalaryBands({ fresh: true }),
    ]);
    return { edition: survey.edition, probe, sql, counts, responses, bands };
  } catch (error) {
    return {
      edition: survey.edition,
      probe: {
        ...probe,
        schemaReady: false,
        status: "network_error",
        message: error instanceof Error ? error.message : "Erro ao carregar dados do Supabase.",
      },
      sql,
      counts: null,
      responses: [],
      bands: fallbackBands,
    };
  }
}

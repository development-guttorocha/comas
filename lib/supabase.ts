import type { SalaryBandStat } from "@/lib/salaryBands";

/**
 * Lightweight PostgREST client for Supabase over native `fetch` (zero SDK dependency, zero extra
 * Vercel Serverless Functions). Supports both legacy JWT `service_role` keys (`eyJ...`) and
 * newer opaque Secret keys (`sb_secret_...`). Server-only.
 */

export type SupabaseConfig = { url: string; key: string };

export type SurveyResponseStatus = "pending" | "approved" | "rejected";
export type SurveyResponseSource = "web" | "import";

export type SurveyResponseInsert = {
  edition: string;
  role: string;
  role_band_id: string | null;
  specialty: string;
  experience: string;
  regime: string;
  salary: number;
  bonus: string;
  company_size: string;
  sector: string;
  state: string;
  work_model: string;
  gender: string;
  submitted_date: string;
  status: SurveyResponseStatus;
  outlier_flag: boolean;
  source: SurveyResponseSource;
  reviewed_date?: string | null;
};

export type SurveyResponseRow = SurveyResponseInsert & { id: string };

export type SurveyCounts = {
  pending: number;
  approved: number;
  rejected: number;
  emails: number;
};

export type SupabaseProbeStatus =
  | "unconfigured"
  | "auth_error"
  | "schema_missing"
  | "network_error"
  | "ready";

export type SupabaseProbeResult = {
  configured: boolean;
  connected: boolean;
  schemaReady: boolean;
  status: SupabaseProbeStatus;
  message: string;
};

const TIMEOUT_MS = 8_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getSupabaseConfig(override?: Partial<SupabaseConfig>): SupabaseConfig | null {
  const rawUrl = (
    override?.url?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    ""
  ).replace(/\/+$/, "");
  const rawKey = (
    override?.key?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    ""
  );
  if (!/^https?:\/\/[^/\s]+/i.test(rawUrl) || !rawKey) return null;
  return { url: rawUrl, key: rawKey };
}

export const isSupabaseConfigured = () => getSupabaseConfig() !== null;

export function supabaseHeaders(key: string, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
    ...extra,
  };
  // Opaque `sb_secret_...` keys must not be sent as JWT Bearer tokens.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

type PostgrestErrorBody = { code?: string; message?: string; hint?: string; details?: string };

async function readErrorBody(res: Response): Promise<{ code: string; message: string }> {
  const text = await res.text().catch(() => "");
  if (!text) return { code: "", message: `HTTP ${res.status}` };
  try {
    const data = JSON.parse(text) as PostgrestErrorBody;
    return {
      code: data.code ?? "",
      message: [data.message, data.hint, data.details].filter(Boolean).join(" — ") || `HTTP ${res.status}`,
    };
  } catch {
    return { code: "", message: text.slice(0, 200) };
  }
}

const isAuthFailure = (status: number, code: string) =>
  status === 401 || status === 403 || code === "42501" || code === "PGRST301";

const isSchemaMissing = (status: number, code: string, message: string) =>
  status === 404 ||
  code === "PGRST205" ||
  code === "PGRST202" ||
  code === "42P01" ||
  code === "42883" ||
  /could not find the (table|function)|does not exist/i.test(message);

export async function probeSupabaseSchema(override?: Partial<SupabaseConfig>): Promise<SupabaseProbeResult> {
  const config = getSupabaseConfig(override);
  if (!config) {
    return {
      configured: false,
      connected: false,
      schemaReady: false,
      status: "unconfigured",
      message: "Falta configurar SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  try {
    const postsRes = await fetch(`${config.url}/rest/v1/social_posts?select=id&limit=1`, {
      method: "GET",
      headers: supabaseHeaders(config.key),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!postsRes.ok) {
      const err = await readErrorBody(postsRes);
      if (isAuthFailure(postsRes.status, err.code)) {
        return {
          configured: true,
          connected: false,
          schemaReady: false,
          status: "auth_error",
          message: "Chave do Supabase recusada. Use a Secret Key / service_role key (não a anon/publishable).",
        };
      }
      if (isSchemaMissing(postsRes.status, err.code, err.message)) {
        return {
          configured: true,
          connected: true,
          schemaReady: false,
          status: "schema_missing",
          message: "Conexão OK, mas faltam as tabelas social_posts / social_settings. Rode supabase/social_studio.sql no SQL Editor do Supabase.",
        };
      }
      return {
        configured: true,
        connected: false,
        schemaReady: false,
        status: "network_error",
        message: `Supabase respondeu ${postsRes.status}: ${err.message}`,
      };
    }

    const settingsRes = await fetch(`${config.url}/rest/v1/social_settings?select=id&limit=1`, {
      method: "GET",
      headers: supabaseHeaders(config.key),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!settingsRes.ok) {
      const err = await readErrorBody(settingsRes);
      if (isAuthFailure(settingsRes.status, err.code)) {
        return {
          configured: true,
          connected: false,
          schemaReady: false,
          status: "auth_error",
          message: "Sem permissão na tabela social_settings. Rode supabase/social_studio.sql completo (incluindo grant all ... to service_role).",
        };
      }
      if (isSchemaMissing(settingsRes.status, err.code, err.message)) {
        return {
          configured: true,
          connected: true,
          schemaReady: false,
          status: "schema_missing",
          message: "Falta a tabela social_settings no Supabase. Rode supabase/social_studio.sql no SQL Editor.",
        };
      }
      return {
        configured: true,
        connected: true,
        schemaReady: false,
        status: "network_error",
        message: `social_settings falhou (${settingsRes.status}): ${err.message}`,
      };
    }

    return {
      configured: true,
      connected: true,
      schemaReady: true,
      status: "ready",
      message: "Supabase conectado e tabelas social_posts + social_settings prontas.",
    };
  } catch {
    return {
      configured: true,
      connected: false,
      schemaReady: false,
      status: "network_error",
      message: "Não foi possível conectar ao Supabase. Confira SUPABASE_URL.",
    };
  }
}

export async function insertSurveyResponse(row: SurveyResponseInsert): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config) return false;
  try {
    const res = await fetch(`${config.url}/rest/v1/salary_survey_responses`, {
      method: "POST",
      headers: supabaseHeaders(config.key, { Prefer: "return=minimal" }),
      body: JSON.stringify(row),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const err = await readErrorBody(res);
      console.error("[supabase] Insert survey response failed:", res.status, err.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[supabase] Insert survey response error:", error);
    return false;
  }
}

export async function insertSurveyResponsesBatch(rows: SurveyResponseInsert[]): Promise<{ inserted: number }> {
  if (!rows.length) return { inserted: 0 };
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase não configurado.");

  const CHUNK_SIZE = 200;
  let inserted = 0;
  for (let offset = 0; offset < rows.length; offset += CHUNK_SIZE) {
    const chunk = rows.slice(offset, offset + CHUNK_SIZE);
    const res = await fetch(`${config.url}/rest/v1/salary_survey_responses`, {
      method: "POST",
      headers: supabaseHeaders(config.key, { Prefer: "return=minimal" }),
      body: JSON.stringify(chunk),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const err = await readErrorBody(res);
      throw new Error(`Falha ao gravar no Supabase (${res.status}): ${err.message}`);
    }
    inserted += chunk.length;
  }
  return { inserted };
}

export async function insertSurveyEmail(email: string, edition: string, submittedDate: string): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config) return false;
  try {
    const res = await fetch(`${config.url}/rest/v1/salary_survey_emails?on_conflict=edition,email`, {
      method: "POST",
      headers: supabaseHeaders(config.key, { Prefer: "resolution=ignore-duplicates,return=minimal" }),
      body: JSON.stringify({ edition, email, submitted_date: submittedDate }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const err = await readErrorBody(res);
      console.error("[supabase] Insert survey email failed:", res.status, err.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[supabase] Insert survey email error:", error);
    return false;
  }
}

type RawBandStatRow = {
  role_band_id: string;
  sample_count: number;
  p25: number | string | null;
  p50: number | string | null;
  p75: number | string | null;
};

export async function fetchSalaryBandStats(
  edition: string,
  options?: { fresh?: boolean },
): Promise<SalaryBandStat[] | null> {
  const config = getSupabaseConfig();
  if (!config) return null;

  const noCache = Boolean(options?.fresh) || process.env.NODE_ENV !== "production";
  const cacheInit: RequestInit = noCache
    ? { cache: "no-store" }
    : { cache: "force-cache", next: { revalidate: 300, tags: ["salary-bands"] } };

  const res = await fetch(`${config.url}/rest/v1/rpc/get_salary_band_stats`, {
    method: "POST",
    headers: supabaseHeaders(config.key),
    body: JSON.stringify({ p_edition: edition }),
    ...cacheInit,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const err = await readErrorBody(res);
    throw new Error(`get_salary_band_stats (${res.status}): ${err.message}`);
  }

  const rows = (await res.json()) as RawBandStatRow[];
  return rows.map(r => ({
    roleBandId: r.role_band_id,
    sampleCount: Number(r.sample_count) || 0,
    p25: r.p25 === null ? null : Number(r.p25),
    p50: r.p50 === null ? null : Number(r.p50),
    p75: r.p75 === null ? null : Number(r.p75),
  }));
}

export type SurveyResultRow = {
  cut: string;
  groupKey: string;
  sampleCount: number;
  p25: number | null;
  p50: number | null;
  p75: number | null;
};

type RawSurveyResultRow = {
  cut: string;
  group_key: string;
  sample_count: number;
  p25: number | string | null;
  p50: number | string | null;
  p75: number | string | null;
};

export async function fetchSalarySurveyResults(
  edition: string,
  minGroup = 5,
  options?: { fresh?: boolean },
): Promise<SurveyResultRow[] | null> {
  const config = getSupabaseConfig();
  if (!config) return null;

  const noCache = Boolean(options?.fresh) || process.env.NODE_ENV !== "production";
  const cacheInit: RequestInit = noCache
    ? { cache: "no-store" }
    : { cache: "force-cache", next: { revalidate: 300, tags: ["salary-bands"] } };

  const res = await fetch(`${config.url}/rest/v1/rpc/get_salary_survey_results`, {
    method: "POST",
    headers: supabaseHeaders(config.key),
    body: JSON.stringify({ p_edition: edition, p_min_group: minGroup }),
    ...cacheInit,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const err = await readErrorBody(res);
    throw new Error(`get_salary_survey_results (${res.status}): ${err.message}`);
  }

  const rows = (await res.json()) as RawSurveyResultRow[];
  return rows.map(r => ({
    cut: r.cut,
    groupKey: r.group_key,
    sampleCount: Number(r.sample_count) || 0,
    p25: r.p25 === null ? null : Number(r.p25),
    p50: r.p50 === null ? null : Number(r.p50),
    p75: r.p75 === null ? null : Number(r.p75),
  }));
}

export async function listSurveyResponses({
  edition,
  status,
  limit = 200,
}: {
  edition: string;
  status?: SurveyResponseStatus | "all";
  limit?: number;
}): Promise<SurveyResponseRow[]> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase não configurado.");

  const params = new URLSearchParams({
    select: "*",
    edition: `eq.${edition}`,
    order: "submitted_date.desc,id.desc",
    limit: String(limit),
  });
  if (status && status !== "all") params.set("status", `eq.${status}`);

  const res = await fetch(`${config.url}/rest/v1/salary_survey_responses?${params.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(config.key),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = await readErrorBody(res);
    throw new Error(`Erro ao listar respostas (${res.status}): ${err.message}`);
  }
  return (await res.json()) as SurveyResponseRow[];
}

async function headCount(config: SupabaseConfig, pathWithQuery: string): Promise<number> {
  const res = await fetch(`${config.url}${pathWithQuery}`, {
    method: "HEAD",
    headers: supabaseHeaders(config.key, { Prefer: "count=exact" }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = await readErrorBody(res);
    throw new Error(`Erro ao contar registros (${res.status}): ${err.message}`);
  }
  const total = res.headers.get("content-range")?.split("/")[1];
  const parsed = Number(total);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getSurveyCounts(edition: string): Promise<SurveyCounts> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase não configurado.");
  const ed = encodeURIComponent(edition);
  const [pending, approved, rejected, emails] = await Promise.all([
    headCount(config, `/rest/v1/salary_survey_responses?select=id&edition=eq.${ed}&status=eq.pending`),
    headCount(config, `/rest/v1/salary_survey_responses?select=id&edition=eq.${ed}&status=eq.approved`),
    headCount(config, `/rest/v1/salary_survey_responses?select=id&edition=eq.${ed}&status=eq.rejected`),
    headCount(config, `/rest/v1/salary_survey_emails?select=id&edition=eq.${ed}`),
  ]);
  return { pending, approved, rejected, emails };
}

export async function updateSurveyResponseStatus(ids: string[], status: SurveyResponseStatus): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase não configurado.");
  const validIds = ids.filter(id => UUID_RE.test(id));
  if (!validIds.length) throw new Error("Nenhuma resposta válida selecionada.");

  const reviewedDate = status === "pending" ? null : new Date().toISOString().slice(0, 10);
  const res = await fetch(`${config.url}/rest/v1/salary_survey_responses?id=in.(${validIds.join(",")})`, {
    method: "PATCH",
    headers: supabaseHeaders(config.key, { Prefer: "return=minimal" }),
    body: JSON.stringify({ status, reviewed_date: reviewedDate }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = await readErrorBody(res);
    throw new Error(`Erro ao atualizar status (${res.status}): ${err.message}`);
  }
}

export async function deleteSurveyResponse(id: string): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase não configurado.");
  if (!UUID_RE.test(id)) throw new Error("ID inválido.");

  const res = await fetch(`${config.url}/rest/v1/salary_survey_responses?id=eq.${id}`, {
    method: "DELETE",
    headers: supabaseHeaders(config.key, { Prefer: "return=minimal" }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = await readErrorBody(res);
    throw new Error(`Erro ao apagar resposta (${res.status}): ${err.message}`);
  }
}

// ── Site Leads (services, materials, open contact) ───────────────────────────────────────────

export type LeadKind = "service" | "material" | "contact";
export type LeadStatus = "new" | "replied" | "archived";
export type LeadSource = "web" | "import";

export type SiteLeadInsert = {
  kind: LeadKind;
  name: string;
  email: string;
  company: string;
  team_size: string;
  message: string;
  service: string;
  format: string;
  page: string;
  audience: string;
  opt_in: boolean;
  status: LeadStatus;
  notes?: string;
  source: LeadSource;
  external_id?: string | null;
  created_at?: string;
};

export type SiteLeadRow = {
  id: string;
  kind: LeadKind;
  name: string;
  email: string;
  company: string;
  team_size: string;
  message: string;
  service: string;
  format: string;
  page: string;
  audience: string;
  opt_in: boolean;
  status: LeadStatus;
  notes: string;
  source: LeadSource;
  external_id: string | null;
  created_at: string;
};

export type LeadCounts = {
  new: number;
  replied: number;
  archived: number;
  total: number;
  optIn: number;
  byKind: Record<LeadKind, number>;
};

export async function probeLeadsSchema(override?: Partial<SupabaseConfig>): Promise<SupabaseProbeResult> {
  const config = getSupabaseConfig(override);
  if (!config) {
    return {
      configured: false,
      connected: false,
      schemaReady: false,
      status: "unconfigured",
      message: "Falta configurar SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    };
  }
  try {
    const res = await fetch(`${config.url}/rest/v1/site_leads?select=id&limit=1`, {
      method: "GET",
      headers: supabaseHeaders(config.key),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const err = await readErrorBody(res);
      if (isAuthFailure(res.status, err.code)) {
        return {
          configured: true,
          connected: false,
          schemaReady: false,
          status: "auth_error",
          message: "Chave do Supabase recusada. Confira a Secret Key / service_role key.",
        };
      }
      if (isSchemaMissing(res.status, err.code, err.message)) {
        return {
          configured: true,
          connected: true,
          schemaReady: false,
          status: "schema_missing",
          message: "Conexão OK, mas a tabela site_leads ainda não existe. Rode o SQL no Supabase.",
        };
      }
      return {
        configured: true,
        connected: false,
        schemaReady: false,
        status: "network_error",
        message: `Supabase respondeu ${res.status}: ${err.message}`,
      };
    }
    return {
      configured: true,
      connected: true,
      schemaReady: true,
      status: "ready",
      message: "Tabela de contatos pronta no Supabase.",
    };
  } catch {
    return {
      configured: true,
      connected: false,
      schemaReady: false,
      status: "network_error",
      message: "Não foi possível conectar ao Supabase. Confira SUPABASE_URL.",
    };
  }
}

export async function insertSiteLead(row: SiteLeadInsert): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config) return false;
  try {
    const endpoint = row.external_id
      ? `${config.url}/rest/v1/site_leads?on_conflict=external_id`
      : `${config.url}/rest/v1/site_leads`;
    const prefer = row.external_id ? "resolution=ignore-duplicates,return=minimal" : "return=minimal";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: supabaseHeaders(config.key, { Prefer: prefer }),
      body: JSON.stringify(row),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const err = await readErrorBody(res);
      console.error("[supabase] Insert site lead failed:", res.status, err.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[supabase] Insert site lead error:", error);
    return false;
  }
}

export async function upsertImportedLeadsBatch(rows: SiteLeadInsert[]): Promise<{ inserted: number }> {
  if (!rows.length) return { inserted: 0 };
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase não configurado.");

  const res = await fetch(`${config.url}/rest/v1/site_leads?on_conflict=external_id`, {
    method: "POST",
    headers: supabaseHeaders(config.key, { Prefer: "resolution=ignore-duplicates,return=representation" }),
    body: JSON.stringify(rows),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = await readErrorBody(res);
    throw new Error(`Falha ao importar contatos no Supabase (${res.status}): ${err.message}`);
  }
  const created = (await res.json()) as Array<{ id: string }>;
  return { inserted: created.length };
}

export async function listSiteLeads({
  status,
  kind,
  limit = 200,
}: {
  status?: LeadStatus | "all";
  kind?: LeadKind | "all";
  limit?: number;
} = {}): Promise<SiteLeadRow[]> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase não configurado.");

  const params = new URLSearchParams({
    select: "*",
    order: "created_at.desc,id.desc",
    limit: String(limit),
  });
  if (status && status !== "all") params.set("status", `eq.${status}`);
  if (kind && kind !== "all") params.set("kind", `eq.${kind}`);

  const res = await fetch(`${config.url}/rest/v1/site_leads?${params.toString()}`, {
    method: "GET",
    headers: supabaseHeaders(config.key),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = await readErrorBody(res);
    throw new Error(`Erro ao listar contatos (${res.status}): ${err.message}`);
  }
  return (await res.json()) as SiteLeadRow[];
}

export async function getLeadCounts(): Promise<LeadCounts> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase não configurado.");
  const [nNew, replied, archived, optIn, service, material, contact] = await Promise.all([
    headCount(config, "/rest/v1/site_leads?select=id&status=eq.new"),
    headCount(config, "/rest/v1/site_leads?select=id&status=eq.replied"),
    headCount(config, "/rest/v1/site_leads?select=id&status=eq.archived"),
    headCount(config, "/rest/v1/site_leads?select=id&opt_in=is.true"),
    headCount(config, "/rest/v1/site_leads?select=id&kind=eq.service"),
    headCount(config, "/rest/v1/site_leads?select=id&kind=eq.material"),
    headCount(config, "/rest/v1/site_leads?select=id&kind=eq.contact"),
  ]);
  return {
    new: nNew,
    replied,
    archived,
    total: nNew + replied + archived,
    optIn,
    byKind: { service, material, contact },
  };
}

export async function updateSiteLead(id: string, patch: { status?: LeadStatus; notes?: string }): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase não configurado.");
  if (!UUID_RE.test(id)) throw new Error("ID inválido.");
  const payload: Record<string, unknown> = {};
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.notes !== undefined) payload.notes = patch.notes;
  if (!Object.keys(payload).length) return;

  const res = await fetch(`${config.url}/rest/v1/site_leads?id=eq.${id}`, {
    method: "PATCH",
    headers: supabaseHeaders(config.key, { Prefer: "return=minimal" }),
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = await readErrorBody(res);
    throw new Error(`Erro ao atualizar contato (${res.status}): ${err.message}`);
  }
}

export async function updateSiteLeadsStatus(ids: string[], status: LeadStatus): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase não configurado.");
  const validIds = ids.filter(id => UUID_RE.test(id));
  if (!validIds.length) throw new Error("Nenhum contato válido selecionado.");

  const res = await fetch(`${config.url}/rest/v1/site_leads?id=in.(${validIds.join(",")})`, {
    method: "PATCH",
    headers: supabaseHeaders(config.key, { Prefer: "return=minimal" }),
    body: JSON.stringify({ status }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = await readErrorBody(res);
    throw new Error(`Erro ao atualizar contatos (${res.status}): ${err.message}`);
  }
}

export async function deleteSiteLead(id: string): Promise<void> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase não configurado.");
  if (!UUID_RE.test(id)) throw new Error("ID inválido.");

  const res = await fetch(`${config.url}/rest/v1/site_leads?id=eq.${id}`, {
    method: "DELETE",
    headers: supabaseHeaders(config.key, { Prefer: "return=minimal" }),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const err = await readErrorBody(res);
    throw new Error(`Erro ao apagar contato (${res.status}): ${err.message}`);
  }
}

import type { SurveyResultRow } from "@/lib/supabase";

/**
 * Pure shaping helpers for `/recursos/pesquisa-salarial` (#resultados).
 * Transforms SQL percentile aggregates into ordered cuts while strictly enforcing `minGroup >= 5`.
 */

export type SurveyCutItem = {
  key: string;
  label: string;
  sampleCount: number;
  p25: number;
  p50: number;
  p75: number;
};

export type SameLevelGenderCut = {
  role: string;
  items: SurveyCutItem[];
};

export type SurveyResultsData = {
  edition: string;
  minGroup: number;
  totalApproved: number;
  overall: SurveyCutItem | null;
  byRole: SurveyCutItem[];
  waitingRoles: string[];
  byRegime: SurveyCutItem[];
  pjVsCltPct: number | null;
  byRegion: SurveyCutItem[];
  byState: SurveyCutItem[];
  byCompanySize: SurveyCutItem[];
  bySector: SurveyCutItem[];
  byGender: SurveyCutItem[];
  byGenderSameRole: SameLevelGenderCut[];
  cutsReadyCount: number;
  hasAnyCut: boolean;
};

const ROLE_ORDER = [
  "Júnior",
  "Pleno",
  "Sênior",
  "Staff / Principal",
  "Design Lead",
  "Design Manager",
  "Head de Design ou acima",
  "Freelancer ou consultor",
  "Outro",
] as const;

const CORE_CAREER_ROLES = [
  "Júnior",
  "Pleno",
  "Sênior",
  "Staff / Principal",
  "Design Lead",
  "Design Manager",
  "Head de Design ou acima",
] as const;

const REGIME_ORDER = [
  "CLT",
  "PJ",
  "Cooperado ou outro",
  "Contratado por empresa de fora do Brasil",
] as const;

const REGIME_LABELS: Record<string, string> = {
  "Contratado por empresa de fora do Brasil": "Exterior",
};

const COMPANY_SIZE_ORDER = [
  "Até 50 pessoas",
  "51 a 500",
  "501 a 5.000",
  "Mais de 5.000",
] as const;

const GENDER_ORDER = ["Mulher", "Homem", "Não binário"] as const;

export function emptySurveyResults(edition: string, minGroup = 5): SurveyResultsData {
  const safeMin = Math.max(5, Math.round(minGroup));
  return {
    edition,
    minGroup: safeMin,
    totalApproved: 0,
    overall: null,
    byRole: [],
    waitingRoles: [...CORE_CAREER_ROLES],
    byRegime: [],
    pjVsCltPct: null,
    byRegion: [],
    byState: [],
    byCompanySize: [],
    bySector: [],
    byGender: [],
    byGenderSameRole: [],
    cutsReadyCount: 0,
    hasAnyCut: false,
  };
}

function toCutItem(
  row: SurveyResultRow,
  minGroup: number,
  labelOverride?: string,
): SurveyCutItem | null {
  if (!Number.isFinite(row.sampleCount) || row.sampleCount < minGroup) return null;
  if (
    row.p25 === null ||
    row.p50 === null ||
    row.p75 === null ||
    !Number.isFinite(row.p25) ||
    !Number.isFinite(row.p50) ||
    !Number.isFinite(row.p75)
  ) {
    return null;
  }
  return {
    key: row.groupKey,
    label: labelOverride ?? row.groupKey,
    sampleCount: Math.round(row.sampleCount),
    p25: Math.round(row.p25),
    p50: Math.round(row.p50),
    p75: Math.round(row.p75),
  };
}

function orderByCanonical(items: SurveyCutItem[], order: readonly string[]): SurveyCutItem[] {
  return [...items].sort((a, b) => {
    const ia = order.indexOf(a.key);
    const ib = order.indexOf(b.key);
    const ra = ia === -1 ? order.length : ia;
    const rb = ib === -1 ? order.length : ib;
    if (ra !== rb) return ra - rb;
    return b.sampleCount - a.sampleCount || b.p50 - a.p50;
  });
}

function sortByCountThenMedian(items: SurveyCutItem[]): SurveyCutItem[] {
  return [...items].sort((a, b) => b.sampleCount - a.sampleCount || b.p50 - a.p50 || a.label.localeCompare(b.label, "pt-BR"));
}

function sortByMedianThenCount(items: SurveyCutItem[]): SurveyCutItem[] {
  return [...items].sort((a, b) => b.p50 - a.p50 || b.sampleCount - a.sampleCount || a.label.localeCompare(b.label, "pt-BR"));
}

function buildCut(
  rows: SurveyResultRow[],
  cut: string,
  minGroup: number,
  labels?: Record<string, string>,
): SurveyCutItem[] {
  return rows
    .filter(r => r.cut === cut)
    .map(r => toCutItem(r, minGroup, labels?.[r.groupKey]))
    .filter((x): x is SurveyCutItem => x !== null);
}

export function buildSurveyResults(
  rows: SurveyResultRow[],
  options: { edition: string; minGroup?: number },
): SurveyResultsData {
  const minGroup = Math.max(5, Math.round(options.minGroup ?? 5));
  const summaryRow = rows.find(r => r.cut === "summary" && r.groupKey === "__all__");
  const totalApproved = summaryRow ? Math.max(0, Math.round(summaryRow.sampleCount)) : 0;
  const overall = summaryRow ? toCutItem(summaryRow, minGroup, "Geral") : null;

  const byRole = orderByCanonical(buildCut(rows, "role", minGroup), ROLE_ORDER);
  const roleKeys = new Set(byRole.map(r => r.key));
  const waitingRoles = CORE_CAREER_ROLES.filter(role => !roleKeys.has(role));

  const byRegime = orderByCanonical(buildCut(rows, "regime", minGroup, REGIME_LABELS), REGIME_ORDER);
  const clt = byRegime.find(r => r.key === "CLT");
  const pj = byRegime.find(r => r.key === "PJ");
  const pjVsCltPct = clt && pj && clt.p50 > 0 && pj.p50 > 0
    ? Math.round(((pj.p50 - clt.p50) / clt.p50) * 100)
    : null;

  const byRegion = sortByCountThenMedian(buildCut(rows, "region", minGroup));
  const byState = sortByCountThenMedian(buildCut(rows, "state", minGroup));
  const byCompanySize = orderByCanonical(buildCut(rows, "company_size", minGroup), COMPANY_SIZE_ORDER);
  const bySector = sortByMedianThenCount(buildCut(rows, "sector", minGroup));
  const byGender = orderByCanonical(buildCut(rows, "gender", minGroup), GENDER_ORDER);

  const sameRoleMap = new Map<string, SurveyCutItem[]>();
  for (const row of rows) {
    if (row.cut !== "gender_role") continue;
    const sep = row.groupKey.indexOf("::");
    if (sep <= 0) continue;
    const role = row.groupKey.slice(0, sep);
    const gender = row.groupKey.slice(sep + 2);
    const item = toCutItem({ ...row, groupKey: gender }, minGroup, gender);
    if (!item) continue;
    const list = sameRoleMap.get(role) ?? [];
    list.push(item);
    sameRoleMap.set(role, list);
  }

  const byGenderSameRole: SameLevelGenderCut[] = [...sameRoleMap.entries()]
    .filter(([, items]) => items.length >= 2)
    .sort(([roleA], [roleB]) => {
      const ia = ROLE_ORDER.indexOf(roleA as (typeof ROLE_ORDER)[number]);
      const ib = ROLE_ORDER.indexOf(roleB as (typeof ROLE_ORDER)[number]);
      return (ia === -1 ? ROLE_ORDER.length : ia) - (ib === -1 ? ROLE_ORDER.length : ib);
    })
    .map(([role, items]) => ({ role, items: orderByCanonical(items, GENDER_ORDER) }));

  const cutsReadyCount = [
    byRole.length > 0,
    byRegime.length > 0,
    byRegion.length > 0,
    byCompanySize.length > 0 || bySector.length > 0,
    byGender.length > 0 || byGenderSameRole.length > 0,
  ].filter(Boolean).length;

  return {
    edition: options.edition,
    minGroup,
    totalApproved,
    overall,
    byRole,
    waitingRoles,
    byRegime,
    pjVsCltPct,
    byRegion,
    byState,
    byCompanySize,
    bySector,
    byGender,
    byGenderSameRole,
    cutsReadyCount,
    hasAnyCut: cutsReadyCount > 0,
  };
}

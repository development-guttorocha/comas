import bands from "@/content/recursos/faixas-salariais.json";

/**
 * The reference salary bands (`content/recursos/faixas-salariais.json`), optionally blended with
 * approved anonymous survey responses from Supabase, adjusted by company size and regime.
 * Shared by the salary page, the survey's ending, and the local admin.
 */
export type Band = { p25: number; p50: number; p75: number };
export type Verdict = "below" | "low" | "mid" | "above";

export type RoleBand = Band & {
  id: string;
  label: string;
  baseP25: number;
  baseP50: number;
  baseP75: number;
  sampleCount: number;
  surveyWeight: number;
};

export type SalaryBandStat = {
  roleBandId: string;
  sampleCount: number;
  p25: number | null;
  p50: number | null;
  p75: number | null;
};

export type SalaryBandsData = {
  reviewed: boolean;
  updatedAt: string;
  edition: string;
  minGroup: number;
  roles: RoleBand[];
  sizes: typeof bands.sizes;
  pjFactor: number;
  totalApproved: number;
  mappedApproved: number;
  hasLiveData: boolean;
};

export const salaryBands = bands;

/** Minimum approved responses in a role before it starts moving the reference band. */
export const MIN_GROUP = 5;
/** Prior strength for Bayesian/progressive blending: w = n / (n + PRIOR_WEIGHT_K). */
export const PRIOR_WEIGHT_K = 15;
/** Sample size at which a role transitions 100% to the live survey percentiles. */
export const FULL_SURVEY_AT = 60;

export const defaultSalaryBands: SalaryBandsData = {
  reviewed: bands.reviewed,
  updatedAt: bands.updatedAt,
  edition: "2027",
  minGroup: MIN_GROUP,
  roles: bands.roles.map(r => ({
    id: r.id,
    label: r.label,
    p25: r.p25,
    p50: r.p50,
    p75: r.p75,
    baseP25: r.p25,
    baseP50: r.p50,
    baseP75: r.p75,
    sampleCount: 0,
    surveyWeight: 0,
  })),
  sizes: bands.sizes,
  pjFactor: bands.pjFactor,
  totalApproved: 0,
  mappedApproved: 0,
  hasLiveData: false,
};

const round = (n: number) => Math.round(n / 100) * 100;

/** Progressive weight of the survey data for a role with `sampleCount` approved answers. */
export function surveyWeightFor(sampleCount: number): number {
  if (!Number.isFinite(sampleCount) || sampleCount < MIN_GROUP) return 0;
  if (sampleCount >= FULL_SURVEY_AT) return 1;
  return sampleCount / (sampleCount + PRIOR_WEIGHT_K);
}

/** Merges Postgres aggregate stats into the baseline bands without losing the starting values. */
export function mergeSalaryBands(stats: SalaryBandStat[], base: SalaryBandsData = defaultSalaryBands): SalaryBandsData {
  const byId = new Map(stats.map(s => [s.roleBandId, s]));
  const allStat = byId.get("__all__");

  const roles: RoleBand[] = base.roles.map(r => {
    const stat = byId.get(r.id);
    const sampleCount = Math.max(0, Math.round(stat?.sampleCount ?? 0));
    const validStats =
      stat != null &&
      stat.p25 != null &&
      stat.p50 != null &&
      stat.p75 != null &&
      Number.isFinite(stat.p25) &&
      Number.isFinite(stat.p50) &&
      Number.isFinite(stat.p75);
    const surveyWeight = validStats ? surveyWeightFor(sampleCount) : 0;

    if (surveyWeight === 0 || !stat) {
      return { ...r, sampleCount, surveyWeight: 0 };
    }

    const p25 = round((1 - surveyWeight) * r.baseP25 + surveyWeight * stat.p25!);
    const p50 = Math.max(p25, round((1 - surveyWeight) * r.baseP50 + surveyWeight * stat.p50!));
    const p75 = Math.max(p50, round((1 - surveyWeight) * r.baseP75 + surveyWeight * stat.p75!));
    return { ...r, p25, p50, p75, sampleCount, surveyWeight };
  });

  const mappedApproved = roles.reduce((acc, r) => acc + r.sampleCount, 0);
  const totalApproved = allStat ? Math.max(Math.round(allStat.sampleCount), mappedApproved) : mappedApproved;
  const hasLiveData = roles.some(r => r.surveyWeight > 0);

  return { ...base, roles, totalApproved, mappedApproved, hasLiveData };
}

export function bandFor(
  roleId: string,
  size = 2,
  regime: "CLT" | "PJ" = "CLT",
  data: Pick<SalaryBandsData, "roles" | "sizes" | "pjFactor"> = defaultSalaryBands,
): Band | null {
  const r = data.roles.find(x => x.id === roleId);
  if (!r) return null;
  const k = (data.sizes[size]?.factor ?? 1) * (regime === "PJ" ? data.pjFactor : 1);
  return { p25: round(r.p25 * k), p50: round(r.p50 * k), p75: round(r.p75 * k) };
}

export const verdictOf = (salary: number, b: Band): Verdict =>
  salary < b.p25 ? "below" : salary < b.p50 ? "low" : salary <= b.p75 ? "mid" : "above";

/** Percent above (+) or below (−) the median. */
export const vsMedian = (salary: number, b: Band) => Math.round(((salary - b.p50) / b.p50) * 100);

/** The survey's role labels, as band ids; freelancers and "Outro" have no band. */
export const SURVEY_ROLE_TO_BAND: Record<string, string> = {
  "Júnior": "junior", "Pleno": "pleno", "Sênior": "senior", "Staff / Principal": "staff",
  "Design Lead": "lead", "Design Manager": "manager", "Head de Design ou acima": "head",
};

/** Flags extreme CLT/PJ values for manual attention in the admin without rejecting the user. */
export function isLikelyOutlier(role: string, salary: number, companySize: string, regime: string): boolean {
  const roleId = SURVEY_ROLE_TO_BAND[role];
  if (!roleId || (regime !== "CLT" && regime !== "PJ")) return false;
  const sizeIndex = bands.sizes.findIndex(s => s.label === companySize);
  const baseBand = bandFor(roleId, sizeIndex >= 0 ? sizeIndex : 2, regime, defaultSalaryBands);
  if (!baseBand) return false;
  return salary < baseBand.p25 * 0.35 || salary > baseBand.p75 * 3.0;
}

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

import survey from "@/content/recursos/pesquisa-salarial.json";
import { isLikelyOutlier, SURVEY_ROLE_TO_BAND } from "@/lib/salaryBands";
import { UFS } from "@/lib/salarySurveyOptions";
import {
  insertSurveyEmail,
  insertSurveyResponse,
  type SurveyResponseInsert,
  type SurveyResponseSource,
  type SurveyResponseStatus,
} from "@/lib/supabase";

/**
 * The anonymous salary survey. Answers are saved to Supabase (`salary_survey_responses`) with no
 * name, company or time of day, and e-mails go separately to `salary_survey_emails` with no link
 * between them. Without Supabase, the answer falls back to Gutto's e-mail via Resend, still
 * without the address.
 */

export type SurveyAnswer = {
  edition: string;
  role: string;
  specialty: string;
  experience: string;
  regime: string;
  salary: number;
  bonus: string;
  companySize: string;
  sector: string;
  state: string;
  workModel: string;
  gender: string;
  createdAt: string;
};

export type SurveyField = Exclude<keyof SurveyAnswer, "edition" | "createdAt">;
export type SurveyErrors = Partial<Record<SurveyField | "email", string>>;

const f = survey.form;
export const SURVEY_CHOICES: Record<Exclude<SurveyField, "salary">, readonly string[]> = {
  role: f.roles, specialty: f.specialties, experience: f.experiences, regime: f.regimes, bonus: f.bonuses,
  companySize: f.companySizes, sector: f.sectors, state: UFS, workModel: f.workModels, gender: f.genders,
};
const OPTIONAL = new Set<SurveyField>(["gender"]);

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim().slice(0, 120);

/** "12.500", "12500,00" and "R$ 12.500" all read as 12500. */
export function parseSalary(raw: string) {
  const digits = raw.replace(/[^\d,.]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  return Math.round(Number(digits));
}

export function parseSurvey(form: FormData): { answer: SurveyAnswer; email: string; errors: SurveyErrors } {
  const errors: SurveyErrors = {};
  const pick = (name: Exclude<SurveyField, "salary">) => {
    const value = clean(form.get(name));
    if (!SURVEY_CHOICES[name].includes(value)) {
      if (!(OPTIONAL.has(name) && !value)) errors[name] = "Escolha uma opção.";
      return "";
    }
    return value;
  };
  const answer: SurveyAnswer = {
    edition: survey.edition,
    role: pick("role"), specialty: pick("specialty"), experience: pick("experience"), regime: pick("regime"),
    salary: parseSalary(clean(form.get("salary"))),
    bonus: pick("bonus"), companySize: pick("companySize"), sector: pick("sector"), state: pick("state"),
    workModel: pick("workModel"), gender: pick("gender"),
    // The day only: an exact time would help match an answer to a person.
    createdAt: new Date().toISOString().slice(0, 10),
  };
  if (!Number.isFinite(answer.salary) || answer.salary < 500 || answer.salary > 500_000) errors.salary = "Informe o valor mensal em reais, como 8.500.";
  const email = clean(form.get("email")).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Esse e-mail não parece certo.";
  return { answer, email, errors };
}

export function toSurveyResponseInsert(
  answer: SurveyAnswer,
  options?: { status?: SurveyResponseStatus; source?: SurveyResponseSource },
): SurveyResponseInsert {
  const status = options?.status ?? "pending";
  return {
    edition: answer.edition || survey.edition,
    role: answer.role,
    role_band_id: SURVEY_ROLE_TO_BAND[answer.role] ?? null,
    specialty: answer.specialty,
    experience: answer.experience,
    regime: answer.regime,
    salary: answer.salary,
    bonus: answer.bonus,
    company_size: answer.companySize,
    sector: answer.sector,
    state: answer.state,
    work_model: answer.workModel,
    gender: answer.gender || "",
    submitted_date: answer.createdAt.slice(0, 10),
    status,
    outlier_flag: isLikelyOutlier(answer.role, answer.salary, answer.companySize, answer.regime),
    source: options?.source ?? "web",
    reviewed_date: status === "pending" ? null : new Date().toISOString().slice(0, 10),
  };
}

export const storeAnswer = (answer: SurveyAnswer) =>
  insertSurveyResponse(toSurveyResponseInsert(answer, { status: "pending", source: "web" }));

export const storeEmail = (email: string) =>
  insertSurveyEmail(email, survey.edition, new Date().toISOString().slice(0, 10));

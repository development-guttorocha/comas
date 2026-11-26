import survey from "@/content/recursos/pesquisa-salarial.json";
import { parseSalary, SURVEY_CHOICES, type SurveyAnswer, type SurveyField } from "@/lib/salarySurvey";

/**
 * Parses historical salary survey answers for import into Supabase. Supports:
 * 1. JSON array or single JSON object
 * 2. Resend e-mail dumps containing embedded JSON (`JSON: {...}`) or `Rótulo: valor` blocks
 * 3. CSV or TSV spreadsheets with Portuguese or English headers
 */

export type ImportFailure = { index: number; reason: string; raw?: string };
export type ImportParseResult = { valid: SurveyAnswer[]; invalid: ImportFailure[] };

const normKey = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const KEY_ALIASES: Record<string, keyof SurveyAnswer> = {
  edition: "edition", edicao: "edition",
  role: "role", papel: "role", "seu papel hoje": "role", cargo: "role",
  specialty: "specialty", area: "specialty", "area principal": "specialty", especialidade: "specialty",
  experience: "experience", experiencia: "experience", "anos de experiencia em design": "experience", "anos de experiencia": "experience",
  regime: "regime", "regime de contratacao": "regime", contratacao: "regime",
  salary: "salary", salario: "salary", "salario bruto": "salary", "salario bruto mensal r": "salary", "salario bruto mensal": "salary",
  bonus: "bonus", "bonus ou plr": "bonus", "bonus ou plr no ultimo ano": "bonus", plr: "bonus",
  companysize: "companySize", "company size": "companySize", "porte da empresa": "companySize", "tamanho da empresa": "companySize", porte: "companySize",
  sector: "sector", setor: "sector",
  state: "state", estado: "state", uf: "state", "onde voce mora": "state",
  workmodel: "workModel", "work model": "workModel", modelo: "workModel", "modelo de trabalho": "workModel",
  gender: "gender", genero: "gender",
  createdat: "createdAt", "created at": "createdAt", submitteddate: "createdAt", "submitted date": "createdAt", data: "createdAt",
};

const ROLE_SYNONYMS: Record<string, string> = {
  "head de design": "Head de Design ou acima",
  head: "Head de Design ou acima",
  freelancer: "Freelancer ou consultor",
  consultor: "Freelancer ou consultor",
  staff: "Staff / Principal",
  principal: "Staff / Principal",
};

function matchChoice(field: Exclude<SurveyField, "salary">, rawValue: unknown): string | null {
  const s = String(rawValue ?? "").trim();
  if (!s || s === "—") return field === "gender" ? "" : null;

  const list = SURVEY_CHOICES[field];
  if (list.includes(s)) return s;

  const normalized = normKey(field === "experience" ? s.replace(/\s*anos?$/i, "") : s);
  const direct = list.find(c => normKey(c) === normalized);
  if (direct) return direct;

  if (field === "role" && ROLE_SYNONYMS[normalized]) return ROLE_SYNONYMS[normalized]!;
  return null;
}

function parseDateOnly(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return new Date().toISOString().slice(0, 10);
}

function validateRecord(obj: Record<string, unknown>, index: number): { answer?: SurveyAnswer; error?: ImportFailure } {
  const mapped: Partial<Record<keyof SurveyAnswer, unknown>> = {};
  for (const [k, v] of Object.entries(obj)) {
    const field = KEY_ALIASES[normKey(k)] ?? KEY_ALIASES[k.toLowerCase()];
    if (field && mapped[field] === undefined) mapped[field] = v;
  }

  const missing: string[] = [];
  const pick = (field: Exclude<SurveyField, "salary">, optional = false) => {
    const matched = matchChoice(field, mapped[field]);
    if (matched === null) {
      if (optional && !String(mapped[field] ?? "").trim()) return "";
      missing.push(field);
      return "";
    }
    return matched;
  };

  const role = pick("role");
  const specialty = pick("specialty");
  const experience = pick("experience");
  const regime = pick("regime");
  const bonus = pick("bonus");
  const companySize = pick("companySize");
  const sector = pick("sector");
  const state = pick("state");
  const workModel = pick("workModel");
  const gender = pick("gender", true);

  const rawSalary = mapped.salary;
  const salary = typeof rawSalary === "number" ? Math.round(rawSalary) : parseSalary(String(rawSalary ?? ""));
  if (!Number.isFinite(salary) || salary < 500 || salary > 500_000) missing.push("salary");

  if (missing.length) {
    return {
      error: {
        index,
        reason: `Campos inválidos ou ausentes: ${missing.join(", ")}.`,
        raw: JSON.stringify(obj).slice(0, 160),
      },
    };
  }

  return {
    answer: {
      edition: String(mapped.edition ?? survey.edition).trim() || survey.edition,
      role,
      specialty,
      experience,
      regime,
      salary,
      bonus,
      companySize,
      sector,
      state,
      workModel,
      gender,
      createdAt: parseDateOnly(mapped.createdAt),
    },
  };
}

/** Extracts top-level JSON objects embedded in arbitrary text (such as Resend e-mail bodies). */
function extractEmbeddedJsonObjects(text: string): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  let depth = 0, start = -1, inString = false, escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        const slice = text.slice(start, i + 1);
        try {
          const parsed = JSON.parse(slice);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && ("role" in parsed || "salary" in parsed)) {
            found.push(parsed as Record<string, unknown>);
          }
        } catch { /* ignore non-JSON braces */ }
        start = -1;
      } else if (depth < 0) {
        depth = 0;
        start = -1;
      }
    }
  }
  return found;
}

function splitCsvLine(line: string, sep: string): string[] {
  const cells: string[] = [];
  let cur = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function parseDelimitedTable(text: string): Record<string, unknown>[] | null {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const head = lines[0]!;
  const sep = head.includes("\t") ? "\t" : head.includes(";") ? ";" : head.includes(",") ? "," : null;
  if (!sep) return null;

  const headers = splitCsvLine(head, sep);
  if (headers.length < 3 || !headers.some(h => KEY_ALIASES[normKey(h)])) return null;

  return lines.slice(1).map(line => {
    const values = splitCsvLine(line, sep);
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });
    return row;
  });
}

function parseKeyValueBlocks(text: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];
  let current: Record<string, unknown> = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /^-{3,}$/.test(line)) {
      if (Object.keys(current).length > 0 && current.role) {
        blocks.push(current);
        current = {};
      }
      continue;
    }
    const m = line.match(/^([^:]{2,60}):\s*(.+)$/);
    if (!m) continue;
    const field = KEY_ALIASES[normKey(m[1]!)];
    if (!field) continue;
    if (field === "role" && Object.keys(current).length > 0 && current.role) {
      blocks.push(current);
      current = {};
    }
    current[field] = m[2]!.trim();
  }
  if (Object.keys(current).length > 0 && current.role) blocks.push(current);
  return blocks;
}

export function parseImportedAnswers(raw: string): ImportParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { valid: [], invalid: [{ index: 1, reason: "Cole ao menos uma resposta em JSON, texto do e-mail ou CSV." }] };

  let records: Record<string, unknown>[] = [];
  let jsonTried = false;

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      jsonTried = true;
      if (Array.isArray(parsed)) records = parsed.filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
      else if (parsed && typeof parsed === "object") records = [parsed as Record<string, unknown>];
    } catch { /* fall through to embedded JSON extraction */ }
  }

  if (!jsonTried || !records.length) {
    const embedded = extractEmbeddedJsonObjects(trimmed);
    if (embedded.length) records = embedded;
  }

  if (!records.length) records = parseDelimitedTable(trimmed) ?? [];
  if (!records.length) records = parseKeyValueBlocks(trimmed);

  if (!records.length) {
    return {
      valid: [],
      invalid: [{ index: 1, reason: "Não reconheci o formato. Aceito JSON, corpo de e-mail do Resend ou CSV/TSV com cabeçalho." }],
    };
  }

  const valid: SurveyAnswer[] = [];
  const invalid: ImportFailure[] = [];
  records.forEach((rec, i) => {
    const res = validateRecord(rec, i + 1);
    if (res.answer) valid.push(res.answer);
    else if (res.error) invalid.push(res.error);
  });
  return { valid, invalid };
}

import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import path from "node:path";
import survey from "@/content/recursos/pesquisa-salarial.json";
import { isLikelyOutlier } from "@/lib/salaryBands";
import { toSurveyResponseInsert, type SurveyAnswer } from "@/lib/salarySurvey";
import { parseImportedAnswers } from "@/lib/salarySurveyImport";
import {
  getSurveyCounts,
  insertSurveyEmail,
  insertSurveyResponsesBatch,
  isSupabaseConfigured,
} from "@/lib/supabase";

/**
 * CLI helper for importing historical salary survey answers into Supabase.
 * Supports:
 *   1. Direct JSON, Resend e-mail dumps, or CSV/TSV with survey columns
 *   2. Resend "Emails Sent" CSV exports (`id,created_at,subject,...`), fetching each e-mail body
 *      from the Resend API (`RESEND_API_KEY`) and separating survey answers from result e-mails.
 *
 * Usage:
 *   npx tsx scripts/import-salary-survey.ts <file> [--dry-run] [--approve] [--force]
 */

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function splitCsvLine(line: string, sep = ","): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
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

function stripHtml(html: string): string {
  return html
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>\s*<td[^>]*>/gi, ": ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ");
}

type ResendEmailPayload = {
  id: string;
  subject?: string;
  created_at?: string;
  text?: string | null;
  html?: string | null;
};

async function fetchResendEmail(id: string, apiKey: string): Promise<ResendEmailPayload> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return (await res.json()) as ResendEmailPayload;
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Resend recusou RESEND_API_KEY (HTTP ${res.status}).`);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 + 200 : 1500 * (attempt + 1);
      await sleep(delay);
      continue;
    }
    throw new Error(`Resend HTTP ${res.status} ao buscar e-mail ${id}.`);
  }
  throw new Error(`Falha após múltiplas tentativas no Resend para ${id}.`);
}

function answerFingerprint(a: SurveyAnswer): string {
  return [
    a.role, a.specialty, a.experience, a.regime, a.salary, a.bonus,
    a.companySize, a.sector, a.state, a.workModel, a.gender, a.createdAt,
  ].join("|");
}

function printSummary(valid: SurveyAnswer[]) {
  const byRole = new Map<string, number>();
  let outliers = 0;
  const seen = new Map<string, number>();
  const duplicates: Array<{ answer: SurveyAnswer; count: number }> = [];

  for (const a of valid) {
    byRole.set(a.role, (byRole.get(a.role) ?? 0) + 1);
    if (isLikelyOutlier(a.role, a.salary, a.companySize, a.regime)) outliers++;
    const fp = answerFingerprint(a);
    const prev = seen.get(fp) ?? 0;
    seen.set(fp, prev + 1);
  }
  for (const [fp, count] of seen) {
    if (count > 1) {
      const sample = valid.find(a => answerFingerprint(a) === fp)!;
      duplicates.push({ answer: sample, count });
    }
  }

  console.log("Por papel:");
  for (const [role, count] of [...byRole.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${role}: ${count}`);
  }
  console.log(`Sinalizadas como fora da faixa esperada (outlier_flag): ${outliers}`);
  if (duplicates.length) {
    console.log(`Possíveis envios idênticos encontrados (${duplicates.length} grupos):`);
    for (const d of duplicates) {
      console.log(`  - ${d.count}x ${d.answer.role} · R$ ${d.answer.salary} · ${d.answer.regime} · ${d.answer.state} · ${d.answer.createdAt}`);
    }
  }
}

async function importResendCsv(raw: string, { dryRun, approve, force }: { dryRun: boolean; approve: boolean; force: boolean }) {
  const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("RESEND_API_KEY não configurada no .env.local.");

  if (!dryRun) {
    if (!isSupabaseConfigured()) {
      throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não estão configuradas no .env.local.");
    }
    if (!force) {
      const counts = await getSurveyCounts(survey.edition);
      const existing = counts.pending + counts.approved + counts.rejected;
      if (existing > 0) {
        throw new Error(`Já existem ${existing} respostas no Supabase. Use --force para importar mesmo assim.`);
      }
    }
  }

  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
  const header = splitCsvLine(lines[0]!);
  const idxId = header.indexOf("id");
  const idxCreatedAt = header.indexOf("created_at");
  const idxSubject = header.indexOf("subject");
  if (idxId < 0 || idxCreatedAt < 0 || idxSubject < 0) {
    throw new Error("Cabeçalho de CSV do Resend inválido.");
  }

  const answerRows: Array<{ id: string; createdAt: string; subject: string }> = [];
  const emailRows: Array<{ id: string; createdAt: string }> = [];
  let ignoredLeads = 0;

  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const id = cols[idxId] ?? "";
    const createdAt = (cols[idxCreatedAt] ?? "").slice(0, 10);
    const subject = cols[idxSubject] ?? "";
    if (!id) continue;
    if (!subject.startsWith("Pesquisa salarial ·")) {
      ignoredLeads++;
      continue;
    }
    if (subject === "Pesquisa salarial · e-mail para resultados") {
      emailRows.push({ id, createdAt });
    } else {
      answerRows.push({ id, createdAt, subject });
    }
  }

  console.log(
    `CSV do Resend: ${answerRows.length} respostas da pesquisa · ${emailRows.length} e-mails para resultados · ${ignoredLeads} leads ignorados.`,
  );

  const validAnswers: SurveyAnswer[] = [];
  const answerFailures: Array<{ id: string; subject: string; reason: string }> = [];
  const emailEntries = new Map<string, string>();
  const emailFailures: Array<{ id: string; reason: string }> = [];

  for (let i = 0; i < answerRows.length; i++) {
    const row = answerRows[i]!;
    if (i > 0) await sleep(600);
    try {
      const emailObj = await fetchResendEmail(row.id, apiKey);
      const body = emailObj.text?.trim() || stripHtml(emailObj.html ?? "");
      const parsed = parseImportedAnswers(body);
      if (!parsed.valid.length) {
        answerFailures.push({
          id: row.id,
          subject: row.subject,
          reason: parsed.invalid[0]?.reason ?? "Resposta não reconhecida.",
        });
        continue;
      }
      for (const ans of parsed.valid) {
        validAnswers.push({
          ...ans,
          createdAt: ans.createdAt || row.createdAt || new Date().toISOString().slice(0, 10),
        });
      }
    } catch (err) {
      answerFailures.push({
        id: row.id,
        subject: row.subject,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  for (let i = 0; i < emailRows.length; i++) {
    const row = emailRows[i]!;
    await sleep(600);
    try {
      const emailObj = await fetchResendEmail(row.id, apiKey);
      const body = emailObj.text?.trim() || stripHtml(emailObj.html ?? "");
      const m =
        body.match(/^E-mail:\s*([^\s@]+@[^\s@]+\.[^\s@]{2,})/im) ??
        body.match(/([^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,})/);
      if (!m) {
        emailFailures.push({ id: row.id, reason: "Endereço de e-mail não encontrado no corpo." });
        continue;
      }
      const address = m[1]!.trim().toLowerCase();
      if (!emailEntries.has(address)) {
        emailEntries.set(address, row.createdAt || new Date().toISOString().slice(0, 10));
      }
    } catch (err) {
      emailFailures.push({
        id: row.id,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  console.log(`\nRespostas válidas extraídas: ${validAnswers.length}/${answerRows.length}`);
  if (answerFailures.length) {
    console.log(`Falhas em respostas (${answerFailures.length}):`);
    for (const f of answerFailures) console.log(`  - ${f.id} (${f.subject}): ${f.reason}`);
  }
  printSummary(validAnswers);
  console.log(
    `E-mails para resultados: ${emailRows.length} lidos · ${emailEntries.size} únicos (endereços omitidos por privacidade)${
      emailFailures.length ? ` · ${emailFailures.length} falhas` : ""
    }.`,
  );

  if (dryRun) {
    console.log("\nDry run: nada foi gravado no Supabase.");
    return;
  }

  let insertedAnswers = 0;
  if (validAnswers.length) {
    const rows = validAnswers.map(a =>
      toSurveyResponseInsert(a, { status: approve ? "approved" : "pending", source: "import" }),
    );
    insertedAnswers = (await insertSurveyResponsesBatch(rows)).inserted;
  }

  let savedEmails = 0;
  for (const [address, submittedDate] of emailEntries) {
    if (await insertSurveyEmail(address, survey.edition, submittedDate)) savedEmails++;
  }

  console.log(
    `\nImportação concluída: ${insertedAnswers} resposta(s) gravada(s) como ${
      approve ? "aprovada(s)" : "pendente(s)"
    } · ${savedEmails}/${emailEntries.size} e-mail(s) gravado(s).`,
  );
}

async function main() {
  loadEnvConfig(process.cwd());
  const args = process.argv.slice(2);
  const file = args.find(a => !a.startsWith("--"));
  const dryRun = args.includes("--dry-run");
  const approve = args.includes("--approve");
  const force = args.includes("--force");

  if (!file) {
    console.error("Uso: npx tsx scripts/import-salary-survey.ts <arquivo> [--dry-run] [--approve] [--force]");
    process.exitCode = 1;
    return;
  }

  const raw = await readFile(path.resolve(process.cwd(), file), "utf8");
  const firstLine = raw.split(/\r?\n/).find(l => l.trim().length > 0) ?? "";
  if (firstLine.startsWith("id,created_at,subject,")) {
    await importResendCsv(raw, { dryRun, approve, force });
    return;
  }

  const { valid, invalid } = parseImportedAnswers(raw);
  console.log(`Válidas: ${valid.length} · Inválidas: ${invalid.length}`);
  if (invalid.length) {
    for (const item of invalid.slice(0, 10)) {
      console.log(`  - Linha/item ${item.index}: ${item.reason}`);
    }
    if (invalid.length > 10) console.log(`  ... e mais ${invalid.length - 10} inválidas.`);
  }
  if (valid.length) printSummary(valid);

  if (dryRun || !valid.length) {
    if (dryRun) console.log("Dry run: nada foi gravado no Supabase.");
    return;
  }

  if (!isSupabaseConfigured()) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não estão configuradas no .env.local.");
  }

  const rows = valid.map(a =>
    toSurveyResponseInsert(a, { status: approve ? "approved" : "pending", source: "import" }),
  );
  const { inserted } = await insertSurveyResponsesBatch(rows);
  console.log(`${inserted} resposta(s) importada(s) como ${approve ? "aprovada(s)" : "pendente(s)"}.`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

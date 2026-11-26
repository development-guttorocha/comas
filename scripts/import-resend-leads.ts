import { loadEnvConfig } from "@next/env";
import { parseResendLeadText } from "@/lib/leadImport";
import { toSiteLeadInsert } from "@/lib/leads";
import { isSupabaseConfigured, upsertImportedLeadsBatch, type SiteLeadInsert } from "@/lib/supabase";

/**
 * Backfills historical contact/service/material leads sent through Resend into Supabase
 * (`public.site_leads`), keyed idempotently by Resend email `id` (`external_id`).
 *
 * Usage:
 *   npx tsx scripts/import-resend-leads.ts [--dry-run]
 */

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type ResendListItem = { id: string; subject?: string; created_at?: string };
type ResendListResponse = { data?: ResendListItem[]; has_more?: boolean };
type ResendEmailResponse = { id: string; subject?: string; created_at?: string; text?: string | null; html?: string | null };

async function resendGet<T>(url: string, apiKey: string): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return (await res.json()) as T;
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Resend recusou RESEND_API_KEY (HTTP ${res.status}).`);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 + 200 : 1500 * (attempt + 1);
      await sleep(delay);
      continue;
    }
    throw new Error(`Resend HTTP ${res.status} em ${url}`);
  }
  throw new Error(`Falha após múltiplas tentativas no Resend: ${url}`);
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

async function main() {
  loadEnvConfig(process.cwd());
  const dryRun = process.argv.includes("--dry-run");
  const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("RESEND_API_KEY não configurada no .env.local.");
  if (!dryRun && !isSupabaseConfigured()) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não estão configuradas no .env.local.");
  }

  const matched: ResendListItem[] = [];
  let after: string | undefined;
  let scanned = 0;

  for (let page = 0; page < 20; page++) {
    if (page > 0) await sleep(600);
    const url: string = `https://api.resend.com/emails?limit=100${after ? `&after=${encodeURIComponent(after)}` : ""}`;
    const list: ResendListResponse = await resendGet<ResendListResponse>(url, apiKey);
    const items: ResendListItem[] = list.data ?? [];
    scanned += items.length;
    for (const item of items) {
      if ((item.subject ?? "").startsWith("Novo lead")) matched.push(item);
    }
    if (!list.has_more || !items.length) break;
    after = items[items.length - 1]!.id;
  }

  console.log(`E-mails no Resend: ${scanned} varridos · ${matched.length} leads encontrados.`);

  const rows: SiteLeadInsert[] = [];
  const failures: Array<{ id: string; reason: string }> = [];

  for (let i = 0; i < matched.length; i++) {
    const item = matched[i]!;
    await sleep(600);
    try {
      const email = await resendGet<ResendEmailResponse>(
        `https://api.resend.com/emails/${encodeURIComponent(item.id)}`,
        apiKey,
      );
      const body = email.text?.trim() || stripHtml(email.html ?? "");
      const parsed = parseResendLeadText(body, email.subject ?? item.subject ?? "", email.created_at ?? item.created_at ?? "");
      if (!parsed) {
        failures.push({ id: item.id, reason: "Não consegui extrair Nome/E-mail do corpo." });
        continue;
      }
      rows.push(toSiteLeadInsert(parsed, { status: "new", source: "import", externalId: item.id }));
    } catch (err) {
      failures.push({ id: item.id, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  const byKind = new Map<string, number>();
  const byService = new Map<string, number>();
  let optIns = 0;
  for (const r of rows) {
    byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + 1);
    byService.set(r.service, (byService.get(r.service) ?? 0) + 1);
    if (r.opt_in) optIns++;
  }

  console.log(`Leads válidos extraídos: ${rows.length}/${matched.length} (${optIns} com opt-in de novos materiais).`);
  for (const [kind, count] of byKind) console.log(`  - Tipo ${kind}: ${count}`);
  for (const [service, count] of byService) console.log(`  - ${service}: ${count}`);
  if (failures.length) {
    console.log(`Falhas (${failures.length}):`);
    for (const f of failures) console.log(`  - ${f.id}: ${f.reason}`);
  }

  if (dryRun || !rows.length) {
    if (dryRun) console.log("Dry run: nada foi gravado no Supabase.");
    return;
  }

  const { inserted } = await upsertImportedLeadsBatch(rows);
  console.log(`Importação concluída: ${inserted} novo(s) registro(s) gravado(s) em site_leads (duplicados ignorados).`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

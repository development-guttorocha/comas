import { CAREER_STAGES, TEAM_SIZES } from "@/lib/leadOptions";
import { insertSiteLead, type LeadKind, type LeadSource, type LeadStatus, type SiteLeadInsert } from "@/lib/supabase";

/**
 * Leads from every contact/service/material form on the site. Each one is e-mailed to Gutto
 * through Resend and stored in Supabase (`site_leads`). Either channel is enough for the lead
 * to count as received.
 *
 * Env: RESEND_API_KEY (for e-mail), LEADS_TO (defaults to the Contato e-mail),
 * LEADS_FROM (defaults to Resend's test sender), SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */


export type Lead = {
  name: string;
  email: string;
  company: string;
  teamSize: string;
  message: string;
  service: string;
  format: string;
  page: string;
  /** "designer" for the career consulting and materials, "geral" for the open contact page; empty for companies. */
  audience: string;
  /** Materials only: whether the designer asked for new materials by e-mail. */
  optIn: boolean;
  createdAt: string;
};

export type LeadErrors = Partial<Record<"name" | "email" | "company" | "teamSize" | "message", string>>;

const clean = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

export function parseLead(form: FormData): { lead: Lead; errors: LeadErrors } {
  const lead: Lead = {
    name: clean(form.get("name"), 120),
    email: clean(form.get("email"), 200).toLowerCase(),
    company: clean(form.get("company"), 160),
    teamSize: clean(form.get("teamSize"), 60),
    message: clean(form.get("message"), 2000),
    service: clean(form.get("service"), 120),
    format: clean(form.get("format"), 120),
    page: clean(form.get("page"), 200),
    audience: (["designer", "geral"] as const).find(a => a === clean(form.get("audience"), 20)) ?? "",
    optIn: form.get("optIn") === "on",
    createdAt: new Date().toISOString(),
  };
  const errors: LeadErrors = {};
  if (lead.name.length < 2) errors.name = "Diga como posso te chamar.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) errors.email = "Esse e-mail não parece certo.";
  // The open contact page asks only for the message; it is all there is to go on.
  if (lead.audience === "geral") {
    if (lead.message.length < 10) errors.message = "Me conta em poucas linhas o que você precisa.";
    return { lead, errors };
  }
  // A designer may be between jobs, so only companies must say where they are.
  const designer = lead.audience === "designer";
  if (!designer && lead.company.length < 2) errors.company = "Qual é a empresa?";
  // Materials ask only for name and e-mail; the consulting and companies say where they are.
  const material = lead.service.startsWith("Material:");
  if (!(material && !lead.teamSize) && !((designer ? CAREER_STAGES : TEAM_SIZES) as readonly string[]).includes(lead.teamSize)) errors.teamSize = "Escolha uma opção.";
  return { lead, errors };
}

/** Bots fill the hidden field or submit faster than a person can type. */
export function looksLikeBot(form: FormData) {
  const startedAt = Number(form.get("startedAt"));
  return Boolean(clean(form.get("website"), 200)) || !Number.isFinite(startedAt) || Date.now() - startedAt < 3000;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function emailLead(lead: Lead, to: string): Promise<boolean> {
  const rows: Array<[string, string]> = [
    ["Nome", lead.name], ["E-mail", lead.email], ["Empresa", lead.company || "—"], [lead.audience === "designer" ? "Momento" : "Time de design", lead.teamSize || "—"],
    ["Serviço", lead.service], ["Interesse", lead.format || "Ainda não sei"], ["Mensagem", lead.message || "—"], ["Página", lead.page],
    ...(lead.service.startsWith("Material:") ? [["Novos materiais", lead.optIn ? "Sim, aceitou receber" : "Não"] as [string, string]] : []),
  ];
  return emailTable({ to, title: `Novo lead: ${lead.service}`, subject: `Novo lead · ${lead.service} · ${lead.company || lead.name}`, rows, replyTo: lead.email });
}

/** A table of label/value rows e-mailed to Gutto through Resend; leads and the salary survey use it. */
export async function emailTable({ to, title, subject, rows, replyTo }: { to: string; title: string; subject: string; rows: Array<[string, string]>; replyTo?: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn("[leads] RESEND_API_KEY is not set; e-mail skipped"); return false; }
  const html = `<h2 style="font-family:sans-serif">${escapeHtml(title)}</h2><table style="font-family:sans-serif;font-size:15px;border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#666;vertical-align:top">${escapeHtml(k)}</td><td style="padding:6px 0;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`)
    .join("")}</table>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.LEADS_FROM || "Leads do site <onboarding@resend.dev>",
        to: [process.env.LEADS_TO || to],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) console.error("[leads] Resend refused the e-mail:", res.status, await res.text());
    return res.ok;
  } catch (error) {
    console.error("[leads] Resend request failed:", error);
    return false;
  }
}

export function leadKindOf(lead: Pick<Lead, "service" | "audience" | "page">): LeadKind {
  if (lead.service.startsWith("Material:")) return "material";
  if (lead.audience === "geral" || lead.page === "/fale-comigo") return "contact";
  return "service";
}

export function toSiteLeadInsert(
  lead: Lead,
  options?: { status?: LeadStatus; source?: LeadSource; externalId?: string | null },
): SiteLeadInsert {
  return {
    kind: leadKindOf(lead),
    name: lead.name,
    email: lead.email,
    company: lead.company,
    team_size: lead.teamSize,
    message: lead.message,
    service: lead.service,
    format: lead.format,
    page: lead.page,
    audience: lead.audience,
    opt_in: lead.optIn,
    status: options?.status ?? "new",
    source: options?.source ?? "web",
    external_id: options?.externalId ?? null,
    created_at: lead.createdAt,
  };
}

/** Stored in Supabase (`site_leads`) behind RLS (server-only). */
export async function storeLead(lead: Lead): Promise<boolean> {
  return insertSiteLead(toSiteLeadInsert(lead, { status: "new", source: "web" }));
}

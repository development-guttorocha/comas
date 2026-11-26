"use server";

import { getPageContent } from "@/lib/pages/store";
import type { ContactContent } from "@/lib/pages/schemas";
import { emailLead, looksLikeBot, parseLead, storeLead, type LeadErrors } from "@/lib/leads";

export type LeadState = { status: "idle" | "error" | "sent"; errors?: LeadErrors; message?: string; values?: Record<string, string> };

/** The service pages' contact form. A public form, so it validates everything it receives. */
export async function submitLead(_prev: LeadState, form: FormData): Promise<LeadState> {
  // Bots get a quiet success, so they have nothing to retry against.
  if (looksLikeBot(form)) return { status: "sent" };

  const { lead, errors } = parseLead(form);
  const values = { name: lead.name, email: lead.email, company: lead.company, teamSize: lead.teamSize, message: lead.message, format: lead.format, optIn: lead.optIn ? "on" : "" };
  if (Object.keys(errors).length) return { status: "error", errors, values };

  const contact = await getPageContent<ContactContent>("contato", "pt");
  const [emailed, stored] = await Promise.all([emailLead(lead, contact.email), storeLead(lead)]);
  if (!emailed && !stored) {
    return { status: "error", values, message: `Não consegui enviar agora. Me escreve direto em ${contact.email}, por favor.` };
  }
  return { status: "sent" };
}

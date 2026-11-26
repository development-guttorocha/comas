"use server";

import { getPageContent } from "@/lib/pages/store";
import type { ContactContent } from "@/lib/pages/schemas";
import { emailTable, looksLikeBot } from "@/lib/leads";
import { parseSurvey, storeAnswer, storeEmail, type SurveyErrors } from "@/lib/salarySurvey";
import survey from "@/content/recursos/pesquisa-salarial.json";

export type SurveyState = { status: "idle" | "error" | "sent"; errors?: SurveyErrors; message?: string; values?: Record<string, string> };

/** A public form: everything is validated, and the e-mail never travels with the answer. */
export async function submitSurvey(_prev: SurveyState, form: FormData): Promise<SurveyState> {
  if (looksLikeBot(form)) return { status: "sent" };

  const { answer, email, errors } = parseSurvey(form);
  const values = Object.fromEntries([...form.entries()].filter(([k]) => !["website", "startedAt"].includes(k)).map(([k, v]) => [k, String(v)]));
  if (Object.keys(errors).length) return { status: "error", errors, values };

  const contact = await getPageContent<ContactContent>("contato", "pt");
  const f = survey.form;
  let saved = await storeAnswer(answer);
  // Without Supabase, the answer falls back to Resend and still reaches Gutto, anonymous as it is stored.
  if (!saved) {
    saved = await emailTable({
      to: contact.email,
      title: `Pesquisa salarial ${answer.edition}: resposta (fallback — não gravada no Supabase)`,
      subject: `Pesquisa salarial · ${answer.role} · ${answer.regime}`,
      rows: [
        [f.role, answer.role], [f.specialty, answer.specialty], [f.experience, answer.experience], [f.regime, answer.regime],
        [f.salary, `R$ ${answer.salary.toLocaleString("pt-BR")}`], [f.bonus, answer.bonus], [f.companySize, answer.companySize],
        [f.sector, answer.sector], [f.state, answer.state], [f.workModel, answer.workModel], [f.gender, answer.gender || "—"],
        ["JSON", JSON.stringify(answer)],
      ],
    });
  }
  if (!saved) return { status: "error", values, message: "Não consegui gravar agora. Tente de novo em alguns minutos, por favor." };

  if (email && !(await storeEmail(email))) {
    await emailTable({ to: contact.email, title: "Pesquisa salarial: e-mail para os resultados", subject: "Pesquisa salarial · e-mail para resultados", rows: [["E-mail", email]] });
  }
  return { status: "sent" };
}

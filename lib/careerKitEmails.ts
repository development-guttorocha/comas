import { absoluteUrl } from "@/lib/seo";

/**
 * Outgoing e-mails for the Career Track workspace (OTP login token + welcome guide).
 * Uses Resend directly over HTTPS with the verified `guttorocha.com.br` domain.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_CAREER_KIT_FROM = "Gutto Rocha <oi@guttorocha.com.br>";

export const careerKitFromAddress = () =>
  (process.env.CAREER_KIT_FROM || process.env.LEADS_FROM || DEFAULT_CAREER_KIT_FROM).trim();

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

const firstNameOf = (name: string) => {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first.length >= 2 ? first : "";
};

async function sendResendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[careerKit] RESEND_API_KEY is not set; e-mail skipped");
    return { ok: false, error: "Serviço de e-mail não configurado no servidor." };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: careerKitFromAddress(),
        to: [to],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject,
        html,
        text,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[careerKit] Resend refused the e-mail:", res.status, body.slice(0, 300));
      return {
        ok: false,
        error: "Não consegui enviar o código para esse e-mail agora. Tente novamente em instantes.",
      };
    }
    return { ok: true };
  } catch (error) {
    console.error("[careerKit] Resend request failed:", error);
    return {
      ok: false,
      error: "Falha de conexão ao enviar o e-mail. Tente novamente em instantes.",
    };
  }
}

export async function sendCareerKitOtpEmail({
  to,
  name,
  code,
  replyTo,
}: {
  to: string;
  name?: string;
  code: string;
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const greetingName = firstNameOf(name ?? "");
  const formattedCode = `${code.slice(0, 3)} ${code.slice(3)}`;
  const trackUrl = absoluteUrl("/recursos/trilha-de-carreira/completa");
  const greeting = greetingName ? `Oi, ${escapeHtml(greetingName)}.` : "Oi.";

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:540px;margin:0 auto;background:#0a0f11;color:#f8f8f5;border-radius:20px;overflow:hidden;border:1px solid #263238">
  <div style="padding:28px 28px 24px">
    <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#8f7bff">Trilha de carreira em design · Gutto Rocha</p>
    <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;letter-spacing:-0.03em;color:#f8f8f5">${greeting} Aqui está seu código de acesso.</h1>
    <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#b8b8b1">Digite os 6 dígitos abaixo para abrir sua trilha de carreira e manter seu preenchimento salvo na sua conta.</p>
    <div style="margin:0 0 20px;padding:20px 24px;background:#151d20;border:1px solid #334047;border-radius:14px;text-align:center">
      <span style="font-size:34px;font-weight:700;letter-spacing:0.18em;color:#f8f8f5;font-variant-numeric:tabular-nums">${escapeHtml(formattedCode)}</span>
    </div>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#a3a39c">O código vale por <strong style="color:#f8f8f5">15 minutos</strong>. Se você fechou a aba, pode voltar direto pelo link abaixo.</p>
    <p style="margin:0"><a href="${escapeHtml(trackUrl)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#8f7bff;color:#0b0b0b;font-size:14px;font-weight:700;text-decoration:none">Abrir minha trilha →</a></p>
  </div>
  <div style="padding:16px 28px;background:#050708;border-top:1px solid #263238">
    <p style="margin:0;font-size:13px;line-height:1.5;color:#92928a">Se você não pediu esse código, é só ignorar este e-mail. Nenhuma conta é aberta sem confirmação.</p>
  </div>
</div>`.trim();

  const text = [
    greetingName ? `Oi, ${greetingName}.` : "Oi.",
    "",
    `Seu código de acesso à Trilha de carreira em design: ${code}`,
    "",
    "O código vale por 15 minutos.",
    `Link para voltar quando quiser: ${trackUrl}`,
    "",
    "Se não foi você quem pediu, pode ignorar este e-mail.",
  ].join("\n");

  return sendResendEmail({
    to,
    subject: `Seu código de acesso: ${formattedCode} · Trilha de carreira`,
    html,
    text,
    replyTo,
  });
}

export async function sendCareerKitWelcomeEmail({
  to,
  name,
  replyTo,
}: {
  to: string;
  name?: string;
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const greetingName = firstNameOf(name ?? "");
  const trackUrl = absoluteUrl("/recursos/trilha-de-carreira/completa");
  const consultingUrl = absoluteUrl("/recursos/consultoria-de-carreira");
  const greeting = greetingName ? `Oi, ${escapeHtml(greetingName)}.` : "Oi.";

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;background:#f8f7f3;color:#111414;border-radius:20px;overflow:hidden;border:1px solid #dedbd2">
  <div style="padding:28px 28px 24px;background:#0a0f11;color:#f8f8f5">
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#8f7bff">Gutto Rocha · Design Resources</p>
    <h1 style="margin:0 0 10px;font-size:24px;line-height:1.2;letter-spacing:-0.03em;color:#f8f8f5">${greeting} Sua trilha de carreira está pronta.</h1>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#b8b8b1">Guarde este e-mail. Tudo o que você preencher lá dentro fica salvo para os seus próximos 1:1s, e você pode voltar quando precisar usando o mesmo e-mail.</p>
  </div>
  <div style="padding:24px 28px">
    <ul style="margin:0 0 22px;padding-left:20px;font-size:15px;line-height:1.65;color:#2b2e2f">
      <li><strong>Momento na cadeira:</strong> Chegada, Consistência, Domínio e Transição.</li>
      <li><strong>Mapa de competências em 3 eixos:</strong> Execução, Comportamento e Negócio, sem trilha em Y.</li>
      <li><strong>Autoavaliação × Liderança:</strong> notas de 1 a 5 para alinhar expectativas no 1:1.</li>
      <li><strong>Plano do trimestre e Diário de entregas:</strong> com pedido de reconhecimento pronto para imprimir em PDF.</li>
    </ul>
    <p style="margin:0 0 24px"><a href="${escapeHtml(trackUrl)}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#111414;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">Abrir minha trilha agora →</a></p>
    <div style="padding:20px;background:#111414;color:#f8f8f5;border-radius:14px">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#ff7ab6">Quer destravar mais rápido?</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#d6d6d0">Se a trilha mostrar promoção travada, dúvida entre gestão e especialista ou um 1:1 difícil, na Consultoria de Carreira desenhamos seu plano escrito em 4 conversas.</p>
      <a href="${escapeHtml(consultingUrl)}" style="color:#ff7ab6;font-size:14px;font-weight:700;text-decoration:underline">Marcar conversa de mapeamento gratuita (30 min) →</a>
    </div>
  </div>
</div>`.trim();

  const text = [
    greetingName ? `Oi, ${greetingName}.` : "Oi.",
    "",
    "Sua trilha de carreira está liberada e salva na sua conta:",
    trackUrl,
    "",
    "O que você encontra lá dentro:",
    "1. Momento na cadeira (Chegada, Consistência, Domínio e Transição)",
    "2. Mapa de competências em 3 eixos (sem trilha em Y)",
    "3. Autoavaliação x Visão da liderança (1 a 5)",
    "4. Plano do trimestre, Diário de entregas e Pedido de reconhecimento em PDF",
    "",
    "Se ao preencher você perceber que a promoção travou ou precisa decidir o próximo passo com quem já liderou mais de 100 designers, conheça a Consultoria de Carreira (mapeamento gratuito de 30 min):",
    consultingUrl,
  ].join("\n");

  return sendResendEmail({
    to,
    subject: "Sua trilha de carreira está pronta · Gutto Rocha",
    html,
    text,
    replyTo,
  });
}

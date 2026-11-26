import type { Lead } from "@/lib/leads";

const LABELS = [
  "Nome",
  "E-mail",
  "Empresa",
  "Momento",
  "Time de design",
  "Serviço",
  "Interesse",
  "Mensagem",
  "Página",
  "Novos materiais",
] as const;

const LABEL_RE = new RegExp(`^(${LABELS.join("|")}):\\s*(.*)$`);

const cleanDash = (v: string | undefined) => {
  const s = (v ?? "").trim();
  return s === "—" ? "" : s;
};

/**
 * Reconstructs a `Lead` from the plain-text e-mail produced by `emailLead` / `emailTable`.
 */
export function parseResendLeadText(text: string, fallbackSubject: string, createdAt: string): Lead | null {
  const fields: Record<string, string> = {};
  let activeKey = "";

  for (const rawLine of text.split(/\r?\n/)) {
    const m = rawLine.match(LABEL_RE);
    if (m) {
      activeKey = m[1]!;
      fields[activeKey] = m[2] ?? "";
    } else if (activeKey) {
      fields[activeKey] = `${fields[activeKey]}\n${rawLine}`;
    }
  }

  const name = cleanDash(fields["Nome"]);
  const email = cleanDash(fields["E-mail"]).toLowerCase();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;

  const subjectParts = fallbackSubject.split(" · ");
  const subjectService = subjectParts.length >= 2 ? subjectParts[1]!.trim() : "";
  const service = cleanDash(fields["Serviço"]) || subjectService || "Contato pelo site";
  const rawFormat = cleanDash(fields["Interesse"]);
  const format = rawFormat === "Ainda não sei" ? "" : rawFormat;
  const page = cleanDash(fields["Página"]);
  const moment = cleanDash(fields["Momento"]);
  const team = cleanDash(fields["Time de design"]);
  const isMaterial = service.startsWith("Material:");

  const audience = isMaterial || Boolean(moment)
    ? "designer"
    : page === "/fale-comigo" || service === "Contato pelo site"
      ? "geral"
      : "";

  return {
    name,
    email,
    company: cleanDash(fields["Empresa"]),
    teamSize: moment || team,
    message: cleanDash(fields["Mensagem"]),
    service,
    format,
    page,
    audience,
    optIn: /^sim/i.test(cleanDash(fields["Novos materiais"])),
    createdAt: createdAt || new Date().toISOString(),
  };
}

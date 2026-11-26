/** Choices the lead form offers and the server accepts; shared by both sides. */
export const TEAM_SIZES = ["Ainda não temos designers", "1 a 3 designers", "4 a 10 designers", "Mais de 10 designers"] as const;
/** For designers asking about the career consulting, in place of the team size. */
export const CAREER_STAGES = ["Começando na área", "Pleno ou sênior", "Querendo liderar", "Já lidero pessoas"] as const;
/** The open contact page (`/fale-comigo`): what the person wants to talk about. `?assunto=<key>` picks one. */
export const CONTACT_TOPICS = [
  { key: "empresa", label: "Design para a minha empresa" },
  { key: "carreira", label: "Consultoria de carreira" },
  { key: "recursos", label: "Materiais para designers" },
  { key: "artigos", label: "Um artigo que li" },
  { key: "outro", label: "Outro assunto" },
] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number]["key"];
export const contactHref = (topic?: ContactTopic) => (topic ? `/fale-comigo?assunto=${topic}` : "/fale-comigo");

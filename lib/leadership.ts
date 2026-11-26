/**
 * Leadership record used by the Home. Team sizes and results come from Gutto's
 * management deck ("Cases de Gestão") and the Sobre page; periods match
 * `lib/curriculum.ts`. Text values pass through `localizeData` for English.
 */

export interface LedTeam {
  company: string
  designers: number
}

/** Designers led directly in each company. */
export const teams = [
  { company: "PicPay", designers: 15 },
  { company: "Loft", designers: 6 },
  { company: "SulAmérica", designers: 6 },
  { company: "BrandLovrs", designers: 3 },
] as const satisfies readonly LedTeam[];

export const designersLed = teams.reduce((total, team) => total + team.designers, 0);

export interface ImpactProof {
  value: string
  label: string
  company: string
}

/** One proof each for business, product and people. */
export const impact = [
  { value: "Série A", label: "Investimento captado, com design como parte da história", company: "BrandLovrs" },
  { value: "5×", label: "Mais lojistas usando o painel em um ano", company: "PicPay" },
  { value: "4", label: "Designers do time reconhecidos financeiramente", company: "Loft" },
] as const satisfies readonly ImpactProof[];

export interface LeadershipPillar {
  title: string
  summary: string
}

/** Pessoas · Processos · Produtos — the management model from the deck. */
export const model = [
  { title: "Pessoas", summary: "As pessoas certas, nos lugares certos, crescendo sempre." },
  { title: "Processos", summary: "Alinhamento que reduz risco sem travar o time." },
  { title: "Produtos", summary: "A proposta de valor chegando de fato a quem usa." },
] as const satisfies readonly LeadershipPillar[];

export interface LeadershipVoice {
  quote: string
  /** What the person does today; the site shows the position, not the name. */
  position: string
  /** How they worked with Gutto. */
  context: string
}

/**
 * Verbatim excerpts from LinkedIn recommendations and the deck; full texts live in the curriculum.
 * People Gutto led come first (the career consulting shows the first three), then the people who led him.
 */
export const voices = [
  {
    quote: "…sua disponibilidade em ouvir as diferentes opiniões, estimulando assim um ambiente seguro de colaboração entre os designers.",
    position: "Product Designer",
    context: "Liderada por mim no PicPay e na Loft",
  },
  {
    quote: "Além de ser um líder excepcional, ele tem um conhecimento técnico impressionante e está sempre disposto a ensinar os outros.",
    position: "Senior Product Designer",
    context: "Liderado por mim na BrandLovrs",
  },
  {
    quote: "Sem dúvida, foi um período no qual aprendi muito sobre direção de arte, UI e UX.",
    position: "UX Design Specialist",
    context: "Colega na Agência VM2 e, depois, liderado por mim",
  },
  {
    quote: "Nas conversas 1:1, traz seu ponto de vista sobre os temas de forma clara, mas me dá espaço para discutir se é um bom caminho ou não.",
    position: "Product Designer",
    context: "Liderado por mim no PicPay, no time de lojistas",
  },
  {
    quote: "Seus projetos na Webmotors são desenvolvidos com uma qualidade diferenciada para poucos profissionais.",
    position: "Chief Product Officer",
    context: "Meu gestor direto na Webmotors",
  },
  {
    quote: "Gutto é um profissional que traz segurança para a gestão! É rápido, faz acontecer e tem muita proatividade!",
    position: "Senior Group Product Manager",
    context: "Minha gestora direta",
  },
] as const satisfies readonly LeadershipVoice[];

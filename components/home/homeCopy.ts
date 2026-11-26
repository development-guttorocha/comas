import type { SiteLocale } from "@/lib/siteLocale";

/**
 * The Home's fixed interface texts ("Ver case", "Escolher depoimento"…) in English. The editable texts now live
 * in content/pages/home.json; the entries for them here are the English that content started from (lib/pages/defaults.ts).
 */
const english: Record<string, string> = {
  "Descubra minha história": "Discover my story",
  "18 anos em design, 8 anos liderando.": "18 years in design, 8 years leading.",
  "Pessoas, Produtos e Negócios crescendo juntos": "People, Products and Businesses growing together",
  "Conheça minha forma de Liderar": "Discover how I lead",
  "Os meus": "My",
  "para negócios": "for business",
  "Pessoas": "People",
  "Processos": "Processes",
  "Produtos": "Products",
  "Pessoas certas, nos lugares certos, crescendo sempre": "The right people, in the right places, always growing",
  "Processos que trazem alinhamento, reduzem riscos e não travam": "Processes that create alignment, reduce risk and keep things moving",
  "Produtos que entregam proposta de valor pra quem usa": "Products that deliver value to the people who use them",
  "Contratar": "Hire", "Desenvolver": "Develop", "Diversificar": "Diversify", "Reter": "Retain",
  "Documentar": "Document", "Alinhar": "Align", "Acompanhar": "Follow through", "Preparar": "Prepare", "Automatizar": "Automate",
  "Construir": "Build", "Inovar": "Innovate", "Materializar": "Materialize",
  "Descobrir": "Discover", "Experimentar": "Experiment", "Medir": "Measure", "Priorizar": "Prioritize", "Entregar": "Deliver", "Potencializar": "Amplify",
  "Liderança é ferramenta para desenvolver pessoas em carreiras de design, alavancar produtos e gerar impacto em negócio!": "Leadership is a tool to develop people's careers in design, advance products and create business impact!",
  "Negócio, produto e pessoas": "Business, products and people",
  "Crescendo ao mesmo tempo": "Growing at the same time",
  "Design manager": "Design manager", "Head of design": "Head of design",
  "Primeira promoção de design em": "First design promotion in", "5 anos": "5 years",
  "Ajudei a alcançar a:": "Helped achieve:", "Série A": "Series A",
  "Mais lojistas usando": "More merchants using it",
  "Pessoas lideradas nessa jornada": "People led along the way",
  "Veja mais em meu": "See more in my", "currículo": "résumé",
  "A voz das pessoas que liderei": "The voices of the people I led",
  "Designer no": "Designer at", "Designer na": "Designer at",
  "Escolher depoimento": "Choose a testimonial",
  "Ver case": "View case",
};

export function homeText(locale: SiteLocale, source: string) {
  return locale === "en" ? english[source] ?? source : source;
}

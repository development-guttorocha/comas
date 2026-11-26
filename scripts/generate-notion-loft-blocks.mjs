/**
 * Gera notion/loft-case-body.blocks.json — corpo do case Loft no formato
 * PATCH https://api.notion.com/v1/blocks/{page_id}/children
 *
 * Executar: node scripts/generate-notion-loft-blocks.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "notion", "loft-case-body.blocks.json");

function chunkRichText(content) {
  const parts = [];
  const s = String(content);
  for (let i = 0; i < s.length; i += 2000) {
    parts.push({
      type: "text",
      text: { content: s.slice(i, i + 2000) },
    });
  }
  return parts;
}

function paragraph(content) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: chunkRichText(content) },
  };
}

function heading3(content) {
  return {
    object: "block",
    type: "heading_3",
    heading_3: { rich_text: chunkRichText(content) },
  };
}

function quoteBlock(content) {
  return {
    object: "block",
    type: "quote",
    quote: { rich_text: chunkRichText(content) },
  };
}

function numberedItem(content) {
  return {
    object: "block",
    type: "numbered_list_item",
    numbered_list_item: { rich_text: chunkRichText(content) },
  };
}

/** Bloco código com linguagem `json` — o site trata como embed de case se o JSON for válido. */
function caseCodeBlock(embedObject) {
  const code = JSON.stringify(embedObject);
  return {
    object: "block",
    type: "code",
    code: {
      rich_text: chunkRichText(code),
      caption: [],
      language: "json",
    },
  };
}

const children = [
  paragraph("[-nav 2] Contexto · tensão"),
  caseCodeBlock({
    component: "CaseSectionSplit",
    id: "case-contexto",
    label: "// Contexto · tensão",
    body: "A Loft crescia rápido e eu liderava designers em duas tribos de growth — onde fragilidade de time pesa direto em métrica. O produto avançava; a estrutura de design não acompanhava o mesmo ritmo.\n\nNão faltava talento. Faltava base: cerimônias sem dono, contexto errado para alguém do time e custo coletivo até isso ser endereçado com clareza.",
    borderClass: "border-t border-ink/10 dark:border-white/10",
  }),
  caseCodeBlock({
    component: "CaseMediaFullWidth",
    src: "/cases/loft/pulse-feedback.png",
    alt: "Pulse e feedback — estrutura percebida pelo time",
  }),
  paragraph(
    "A estrutura já era observada pelo time — pulse e feedback davam visibilidade ao que estava em construção.",
  ),
  heading3("O reposicionamento — a decisão mais difícil"),
  caseCodeBlock({
    component: "CaseEditorialParagraph",
    body: "Movi o designer que não estava entregando para outro time, onde o contexto era mais adequado para o que ele entregava. No lugar dele, trouxe uma designer pleno.\n\nDecisão que gerou desconforto no curto prazo e que se provou certa depois. O designer reposicionado se encontrou no novo contexto. A designer que entrou deslanchou.",
    variant: "body",
  }),
  paragraph("[-nav 3] Decisão"),
  caseCodeBlock({
    component: "CaseBeforeAfter",
    id: "case-decisao",
    sectionLabel: "",
    borderClass: "border-0",
    padClass: "py-0",
    bgClass: "bg-transparent",
    before: {
      label: "Antes",
      body: "Cerimônias sem dono. Cada líder conduzia diferente. Desenvolvimento dependia de sensibilidade, não de estrutura.",
    },
    after: {
      label: "Depois",
      body: "Touchpoint, Critique, Retrospectiva, Planning Cross. Cada ritual com dono, frequência e output definidos.",
    },
  }),
  paragraph("[-nav 4] Construção"),
  heading3("Desenvolvimento com clareza"),
  paragraph(
    "Tornei explícito o que era desenvolvimento de carreira e o que era feedback de projeto. Com PDI e ritmo definidos, as conversas de evolução ganharam contorno — menos improviso, mais direção.",
  ),
  caseCodeBlock({
    component: "CaseMediaFullWidth",
    src: "/cases/loft/touchpoints.png",
    alt: "Touchpoints e rituais do time",
  }),
  heading3("Ritmo e operação"),
  paragraph(
    "Construí o sistema que o time precisava. Não uma iniciativa isolada. Um conjunto de rituais com dono, frequência, pauta e output definidos.",
  ),
  paragraph(
    "Touchpoint quinzenal para conexão e estratégia. Critique semanal para elevar a barra das entregas. Retrospectiva mensal para ajustar o que não estava funcionando. Planning Cross trimestral para alinhar design ao roadmap de produto.",
  ),
  caseCodeBlock({
    component: "CaseMediaFullWidth",
    src: "/cases/loft/teambuilding.png",
    alt: "Team building com o time de design",
  }),
  heading3("Reconhecimento com evidência"),
  paragraph(
    "Com o sistema funcionando, comecei a construir os casos de reconhecimento com base em evidência de produto, não só percepção.",
  ),
  paragraph(
    "Cada promoção precisava ter número, não só narrativa. Conversão, produtividade, impacto em funil. Essa disciplina mudou a qualidade das conversas de carreira e a confiança do time na liderança.",
  ),
  caseCodeBlock({
    component: "CaseMediaFullWidth",
    src: "/cases/loft/recognition.png",
    alt: "Reconhecimento e crescimento no time",
  }),
  paragraph("[-nav 5] Impacto"),
  caseCodeBlock({
    component: "CaseStatBand",
    sectionLabel: "// Impacto",
    emphasizeIndices: [0, 4],
    attributionNote: "EPOD Demand · App B2C Loft · Outubro 2022",
    stats: [
      { value: "+1M", label: "usuários" },
      { value: "66,1K", label: "MAU" },
      { value: "4,8", label: "App Store" },
      { value: "4,5", label: "Play Store" },
      { value: "+452%", label: "buscas" },
      { value: "+26%", label: "conversão lead para agendamento" },
    ],
  }),
  caseCodeBlock({
    component: "CaseMediaFullWidth",
    src: "/cases/loft/hero.png",
    alt: "Dashboard — EPOD Demand, app B2C Loft",
  }),
  paragraph("EPOD Demand · App B2C Loft · Outubro 2022"),
  heading3("Do time à liderança"),
  paragraph(
    "Quatro designers do time chegaram a posições de liderança ou especialização. Nenhum era o candidato óbvio. Todos foram reconhecidos com evidência.",
  ),
  numberedItem(
    "Designer de apps — Time onde design era gargalo. Organizou, entregou os números do app, foi reconhecido com evidência. Hoje é líder.",
  ),
  numberedItem(
    "Designer de supply — 16% de conversão de leads, 328% em mobile. Reconhecida antes do ciclo formal. Hoje é especialista.",
  ),
  numberedItem(
    "Designer de páginas — Avaliada como L2 pelo sistema. Operava como L3. Reconhecida com evidência antes da avaliação formal. Hoje é líder.",
  ),
  numberedItem(
    "Designer de growth — 15,7% em conversão de pessoas logadas, 14,1% em agendamentos, 59% em produtividade operacional. Chegou à gestão.",
  ),
  heading3("Voz do time"),
  paragraph("Designer · produto"),
  quoteBlock(
    "Antes eu saía de one-on-one sem saber o que era desenvolvimento de carreira e o que era feedback de projeto. Depois que o PDI e o ritmo ficaram claros, passei a enxergar meu caminho e a pedir ajuda no lugar certo.",
  ),
  paragraph("Designer · plataforma"),
  quoteBlock(
    "A sensação era de que a tribo inteira falava a mesma língua sobre evolução e reconhecimento. Não era mais decisão escondida na cabeça de cada gestor. Tinha processo, e isso dava segurança para eu me planejar.",
  ),
  caseCodeBlock({
    component: "CasePullQuote",
    label: "// Learning",
    centered: false,
    body: "Reposicionar alguém é uma das decisões mais difíceis na liderança de design. A tentação é esperar mais um pouco, dar mais uma chance, evitar o desconforto. Mas ficar na posição errada prejudica todo mundo. O que aprendi na Loft é que cuidar do time não significa protegê-lo do incômodo. Significa criar as condições certas para cada pessoa crescer. Às vezes isso exige uma conversa difícil. Às vezes exige um sistema que não existia. Às vezes exige reconhecer alguém com evidência, não só com intenção. Quase sempre vale.",
  }),
];

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ children }, null, 2), "utf8");
console.log("Wrote", OUT, "—", children.length, "blocks");

/**
 * Gera NOTION-CASE-LOFT-CONTEUDO.md — texto para copiar/colar no Notion.
 * Cada linha [case:Nome] {json} deve ficar num ÚNICO parágrafo Notion (uma linha).
 *
 * npx tsx scripts/generate-notion-loft-plain-text.ts
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CASES_SEED } from "../lib/casesSeed";
import { formatNotionHeroDatabaseBlock } from "./notionCaseHeroDatabasePlaintext";
import { tryParseCaseEmbedParagraph } from "../lib/notionCaseEmbedFromNotion";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "NOTION-CASE-LOFT-CONTEUDO.md");

const LOFT_SLUG = "loft-lideranca-gestao-e-cultura-de-design";

function caseLine(name: string, obj: Record<string, unknown>) {
  return `[case:${name}] ${JSON.stringify(obj)}`;
}

const loft = CASES_SEED.find((c) => c.slug === LOFT_SLUG);
if (!loft) throw new Error(`Case não encontrado em casesSeed: ${LOFT_SLUG}`);

const parts: string[] = [];

parts.push(`Cola no corpo da página do case no Notion: linha em branco = novo parágrafo. Linhas [case:Nome] {json} = um parágrafo só (sem Enter no meio). Não precisas de "component" no JSON.`);

parts.push("");
parts.push(formatNotionHeroDatabaseBlock(loft));
parts.push("");
parts.push(`---`);
parts.push("");

function p(text: string) {
  parts.push(text, "");
}

p("[-nav 2] Contexto · tensão");

p(
  caseLine("CaseSectionSplit", {
    id: "case-contexto",
    label: "// Contexto · tensão",
    body:
      "A Loft crescia rápido e eu liderava designers em duas tribos de growth — onde fragilidade de time pesa direto em métrica. O produto avançava; a estrutura de design não acompanhava o mesmo ritmo.\n\nNão faltava talento. Faltava base: cerimônias sem dono, contexto errado para alguém do time e custo coletivo até isso ser endereçado com clareza.",
    borderClass: "border-t border-ink/10 dark:border-white/10",
  }),
);

p(
  caseLine("CaseMediaFullWidth", {
    src: "/cases/loft/pulse-feedback.png",
    alt: "Pulse e feedback — estrutura percebida pelo time",
  }),
);

p(
  "A estrutura já era observada pelo time — pulse e feedback davam visibilidade ao que estava em construção.",
);

p("O reposicionamento — a decisão mais difícil");

p(
  caseLine("CaseEditorialParagraph", {
    body:
      "Movi o designer que não estava entregando para outro time, onde o contexto era mais adequado para o que ele entregava. No lugar dele, trouxe uma designer pleno.\n\nDecisão que gerou desconforto no curto prazo e que se provou certa depois. O designer reposicionado se encontrou no novo contexto. A designer que entrou deslanchou.",
    variant: "body",
  }),
);

p("[-nav 3] Decisão");

p(
  caseLine("CaseBeforeAfter", {
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
);

p("[-nav 4] Construção");

p("Desenvolvimento com clareza");

p(
  "Tornei explícito o que era desenvolvimento de carreira e o que era feedback de projeto. Com PDI e ritmo definidos, as conversas de evolução ganharam contorno — menos improviso, mais direção.",
);

p(
  caseLine("CaseMediaFullWidth", {
    src: "/cases/loft/touchpoints.png",
    alt: "Touchpoints e rituais do time",
  }),
);

p("Ritmo e operação");

p(
  "Construí o sistema que o time precisava. Não uma iniciativa isolada. Um conjunto de rituais com dono, frequência, pauta e output definidos.",
);

p(
  "Touchpoint quinzenal para conexão e estratégia. Critique semanal para elevar a barra das entregas. Retrospectiva mensal para ajustar o que não estava funcionando. Planning Cross trimestral para alinhar design ao roadmap de produto.",
);

p(
  caseLine("CaseMediaFullWidth", {
    src: "/cases/loft/teambuilding.png",
    alt: "Team building com o time de design",
  }),
);

p("Reconhecimento com evidência");

p(
  "Com o sistema funcionando, comecei a construir os casos de reconhecimento com base em evidência de produto, não só percepção.",
);

p(
  "Cada promoção precisava ter número, não só narrativa. Conversão, produtividade, impacto em funil. Essa disciplina mudou a qualidade das conversas de carreira e a confiança do time na liderança.",
);

p(
  caseLine("CaseMediaFullWidth", {
    src: "/cases/loft/recognition.png",
    alt: "Reconhecimento e crescimento no time",
  }),
);

p("[-nav 5] Impacto");

p(
  caseLine("CaseStatBand", {
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
);

p(
  caseLine("CaseMediaFullWidth", {
    src: "/cases/loft/hero.png",
    alt: "Dashboard — EPOD Demand, app B2C Loft",
  }),
);

p("EPOD Demand · App B2C Loft · Outubro 2022");

p("Do time à liderança");

p(
  "Quatro designers do time chegaram a posições de liderança ou especialização. Nenhum era o candidato óbvio. Todos foram reconhecidos com evidência.",
);

p(
  "1. Designer de apps — Time onde design era gargalo. Organizou, entregou os números do app, foi reconhecido com evidência. Hoje é líder.",
);

p(
  "2. Designer de supply — 16% de conversão de leads, 328% em mobile. Reconhecida antes do ciclo formal. Hoje é especialista.",
);

p(
  "3. Designer de páginas — Avaliada como L2 pelo sistema. Operava como L3. Reconhecida com evidência antes da avaliação formal. Hoje é líder.",
);

p(
  "4. Designer de growth — 15,7% em conversão de pessoas logadas, 14,1% em agendamentos, 59% em produtividade operacional. Chegou à gestão.",
);

p("Voz do time");

p("Designer · produto");

p(
  "Antes eu saía de one-on-one sem saber o que era desenvolvimento de carreira e o que era feedback de projeto. Depois que o PDI e o ritmo ficaram claros, passei a enxergar meu caminho e a pedir ajuda no lugar certo.",
);

p("Designer · plataforma");

p(
  "A sensação era de que a tribo inteira falava a mesma língua sobre evolução e reconhecimento. Não era mais decisão escondida na cabeça de cada gestor. Tinha processo, e isso dava segurança para eu me planejar.",
);

p(
  caseLine("CasePullQuote", {
    label: "// Learning",
    centered: false,
    body:
      "Reposicionar alguém é uma das decisões mais difíceis na liderança de design. A tentação é esperar mais um pouco, dar mais uma chance, evitar o desconforto. Mas ficar na posição errada prejudica todo mundo. O que aprendi na Loft é que cuidar do time não significa protegê-lo do incômodo. Significa criar as condições certas para cada pessoa crescer. Às vezes isso exige uma conversa difícil. Às vezes exige um sistema que não existia. Às vezes exige reconhecer alguém com evidência, não só com intenção. Quase sempre vale.",
  }),
);

const outText = parts.join("\n").trimEnd() + "\n";
writeFileSync(OUT, outText, "utf8");
const embedLines = outText.split("\n").filter((l) => /^\[case:/.test(l.trim()));
let ok = 0;
for (const line of embedLines) {
  if (!tryParseCaseEmbedParagraph(line)) {
    throw new Error(`Parse falhou: ${line.slice(0, 100)}…`);
  }
  ok++;
}
console.log("Wrote", OUT, `(${ok} embed(s) [case:…] válidos)`);

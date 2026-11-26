import type { FieldDef, Values } from "./fields";

/** Os componentes de case como o admin os apresenta: nome amigável, campos e um ponto de partida. */
export type ComponentDef = {
  name: string;
  label: string;
  description: string;
  fields: FieldDef[];
  defaults: Values;
  /** One line that identifies an instance in the outline. */
  summary: (props: Values) => string;
};

const text = (props: Values, ...keys: string[]) => {
  for (const key of keys) {
    const value = props[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};
const count = (props: Values, key: string, noun: string) => {
  const list = props[key];
  return Array.isArray(list) ? `${list.length} ${noun}${list.length === 1 ? "" : "s"}` : "";
};

const anchor: FieldDef = { key: "id", label: "Âncora", type: "text", hint: "Endereço da seção (#âncora). Só mude se algum link apontar para ela.", advanced: true };
const label = (placeholder?: string, text = "Rótulo"): FieldDef => ({ key: "sectionLabel", label: "Rótulo", type: "text", toggle: placeholder ? { hidden: "", placeholder } : { hidden: null, text } });
const heading: FieldDef = { key: "heading", label: "Título", type: "text", toggle: { hidden: null, text: "Título" } };
const TONES = [
  { value: "neutral", label: "Neutro" }, { value: "soft", label: "Suave (cor do case)" }, { value: "brand", label: "Cor do case" },
  { value: "light", label: "Claro" }, { value: "gray", label: "Cinza (como no Sobre)" },
];
const tone: FieldDef = { key: "tone", label: "Fundo", type: "select", options: TONES, hint: "Padrão: sem fundo, texto solto." };
const cards = (placeholder: string): FieldDef[] => [
  label(placeholder),
  heading,
  { key: "columns", label: "Colunas", type: "select", options: [{ value: 2, label: "2 colunas" }, { value: 1, label: "1 coluna" }] },
  { key: "items", label: "Cards", type: "list", itemLabel: "Card", item: [
    { key: "title", label: "Título", type: "text" },
    tone,
    { key: "body", label: "Texto", type: "textarea" },
  ] },
  anchor,
];
const side = (label: string): FieldDef => ({ key: label === "Antes" ? "before" : "after", label, type: "group", fields: [
  { key: "label", label: "Rótulo", type: "text" },
  { key: "lead", label: "Abertura", type: "text" },
  { key: "body", label: "Texto", type: "textarea" },
  { key: "foot", label: "Rodapé", type: "text" },
  { key: "variant", label: "Tom", type: "select", options: [{ value: "muted", label: "Discreto" }, { value: "emphasis", label: "Destaque" }] },
] });

const compareSide = (key: "before" | "after", label: string): FieldDef => ({ key, label, type: "group", fields: [
  { key: "src", label: "Imagem", type: "image" },
  { key: "label", label: "Etiqueta", type: "text", toggle: { hidden: null, text: label }, hint: "Aparece sobre a imagem." },
  { key: "alt", label: "Descrição da imagem", type: "text", hint: "Lida por leitores de tela. Vazio: usa a etiqueta." },
] });

const chartWhen = (...types: string[]) => ({ key: "type", is: types, fallback: "column" });
const WHEN_STACK = chartWhen("column", "bar");
const WHEN_LINE = chartWhen("line", "area");
const WHEN_MAX = chartWhen("progress", "gauge");
const WHEN_PLOT = chartWhen("column", "line", "area");

export const COMPONENTS: ComponentDef[] = [
  {
    name: "CaseSectionSplit", label: "Texto com título lateral", description: "Um título à esquerda e o texto ao lado. A base da maioria das seções.",
    fields: [
      { key: "label", label: "Título", type: "text" },
      { key: "body", label: "Texto", type: "textarea", hint: "Separe parágrafos com uma linha em branco." },
      anchor,
    ],
    defaults: { label: "Novo título", body: "Texto da seção." },
    summary: props => text(props, "label", "body"),
  },
  {
    name: "CaseStatBand", label: "Números", description: "Uma faixa de métricas com valor, rótulo e legenda.",
    fields: [
      label("// Resultados"),
      heading,
      { key: "intro", label: "Introdução", type: "textarea" },
      { key: "stats", label: "Números", type: "list", itemLabel: "Número", item: [
        { key: "value", label: "Valor", type: "text" },
        { key: "label", label: "Rótulo", type: "text" },
        { key: "caption", label: "Legenda", type: "text" },
      ] },
      { key: "emphasizeIndices", label: "Em destaque", type: "indices", of: "stats" },
      { key: "display", label: "Valores \"antes → depois\"", type: "select", options: [{ value: "cards", label: "Cards: 13 → 23" }], hint: "Escreva o valor como \"13 → 23\". Padrão: gráfico de crescimento, quando todos os valores têm seta." },
      { key: "attributionNote", label: "Nota de atribuição", type: "textarea", advanced: true },
      { key: "editorialSourceNote", label: "Fonte", type: "textarea", advanced: true },
    ],
    defaults: { sectionLabel: "Resultados", stats: [{ value: "0", label: "Rótulo" }] },
    summary: props => [text(props, "sectionLabel", "heading"), count(props, "stats", "número")].filter(Boolean).join(" · "),
  },
  {
    name: "CaseApproachCards", label: "Cards", description: "Itens com título e texto, em uma ou duas colunas.",
    fields: cards("// Abordagem"), defaults: { sectionLabel: "Abordagem", columns: 2, items: [{ title: "Título", body: "Texto" }] },
    summary: props => [text(props, "sectionLabel"), count(props, "items", "card")].filter(Boolean).join(" · "),
  },
  {
    name: "CaseBeforeAfter", label: "Antes e depois", description: "Duas colunas comparando o cenário anterior e o resultado.",
    fields: [
      label(undefined, "Antes e depois"),
      heading,
      { key: "banner", label: "Faixa", type: "text" },
      side("Antes"),
      side("Depois"),
      anchor,
    ],
    defaults: { sectionLabel: "Antes e depois", before: { label: "Antes", body: "Texto" }, after: { label: "Depois", body: "Texto" } },
    summary: props => text(props, "heading", "sectionLabel"),
  },
  {
    name: "CasePullQuote", label: "Destaque", description: "Uma frase em evidência, com rótulo opcional.",
    fields: [
      { key: "label", label: "Rótulo", type: "text", toggle: { hidden: null, text: "Aprendizado" } },
      { key: "body", label: "Frase", type: "textarea" },
      { key: "centered", label: "Centralizar", type: "boolean" },
    ],
    defaults: { label: "Aprendizado", body: "Frase em destaque." },
    summary: props => text(props, "body"),
  },
  {
    name: "CaseResultsQuote", label: "Depoimento", description: "Uma citação de alguém, com atribuição.",
    fields: [
      label(undefined, "Depoimento"),
      { key: "body", label: "Citação", type: "textarea" },
      { key: "attribution", label: "Atribuição", type: "text" },
      anchor,
    ],
    defaults: { body: "Citação.", attribution: "Nome · Cargo" },
    summary: props => [text(props, "attribution"), text(props, "body")].filter(Boolean).join(" — "),
  },
  {
    name: "CaseThanksCards", label: "Agradecimentos", description: "Cards para agradecer pessoas e times.",
    fields: cards("// Agradecimentos"), defaults: { sectionLabel: "Agradecimentos", columns: 2, items: [{ title: "Nome", body: "Texto" }] },
    summary: props => [text(props, "sectionLabel"), count(props, "items", "card")].filter(Boolean).join(" · "),
  },
  {
    name: "CaseResultsJourney", label: "Jornada", description: "Etapas numeradas com título e texto.",
    fields: [
      label("// Resultados · jornada"),
      heading,
      { key: "intro", label: "Introdução", type: "textarea" },
      { key: "steps", label: "Etapas", type: "list", itemLabel: "Etapa", item: [
        { key: "title", label: "Título", type: "text" },
        { key: "body", label: "Texto", type: "textarea" },
        { key: "indexLabel", label: "Número", type: "text", hint: "Padrão: 01, 02…" },
      ] },
      { key: "hideStepIndices", label: "Esconder os números", type: "boolean" },
      anchor,
    ],
    defaults: { sectionLabel: "Resultados", steps: [{ title: "Etapa", body: "Texto" }] },
    summary: props => [text(props, "heading", "sectionLabel"), count(props, "steps", "etapa")].filter(Boolean).join(" · "),
  },
  {
    name: "CaseEditorialParagraph", label: "Parágrafo editorial", description: "Um parágrafo de texto corrido.",
    fields: [
      { key: "body", label: "Texto", type: "textarea" },
      { key: "variant", label: "Estilo", type: "select", options: [{ value: "body", label: "Corpo" }, { value: "inset", label: "Recuado" }] },
    ],
    defaults: { body: "Texto." },
    summary: props => text(props, "body"),
  },
  {
    name: "CaseMediaFigure", label: "Figura", description: "Uma imagem com proporção controlada e legenda.",
    fields: [
      { key: "src", label: "Imagem", type: "image" },
      { key: "alt", label: "Descrição da imagem", type: "text", hint: "Lida por leitores de tela." },
      { key: "caption", label: "Legenda", type: "text" },
      anchor,
    ],
    defaults: { src: "", alt: "" },
    summary: props => text(props, "caption", "alt", "src"),
  },
  {
    name: "CaseMediaFullWidth", label: "Imagem larga", description: "Uma imagem na largura total do conteúdo.",
    fields: [
      { key: "src", label: "Imagem", type: "image" },
      { key: "alt", label: "Descrição da imagem", type: "text" },
      anchor,
    ],
    defaults: { src: "", alt: "" },
    summary: props => text(props, "alt", "src"),
  },
  {
    name: "CaseSectionMedia", label: "Seção com imagem", description: "Título, introdução e uma imagem.",
    fields: [
      { key: "label", label: "Título", type: "text" },
      { key: "intro", label: "Introdução", type: "textarea" },
      { key: "src", label: "Imagem", type: "image" },
      { key: "alt", label: "Descrição da imagem", type: "text" },
      anchor,
    ],
    defaults: { label: "Título", src: "", alt: "" },
    summary: props => text(props, "label", "alt"),
  },
  {
    name: "CaseMediaEmbed", label: "Incorporação com título", description: "Um site ou protótipo incorporado, com título e legenda.",
    fields: [
      { key: "src", label: "Endereço", type: "url" },
      { key: "title", label: "Título", type: "text" },
      { key: "caption", label: "Legenda", type: "text" },
      anchor,
    ],
    defaults: { src: "https://", title: "Protótipo" },
    summary: props => text(props, "title", "src"),
  },
];

/* Rhythm formats, after the Sobre and the Home. */
COMPONENTS.unshift(
  {
    name: "CaseChapter", label: "Abertura de capítulo", description: "Número e nome grandes como divisória, como as décadas do Sobre.",
    fields: [
      { key: "number", label: "Número", type: "text", hint: "Ex.: 01. Aparece gigante e vazado." },
      { key: "title", label: "Nome do capítulo", type: "text" },
      { key: "body", label: "Linha de apoio", type: "text" },
      { key: "src", label: "Imagem de fundo", type: "image", hint: "Opcional: escurecida, em tela cheia." },
      anchor,
    ],
    defaults: { number: "01", title: "Contexto" },
    summary: props => [text(props, "number"), text(props, "title")].filter(Boolean).join(" · "),
  },
  {
    name: "CaseStatement", label: "Frase centralizada", description: "Uma frase solta e grande: a ideia principal do capítulo.",
    fields: [
      { key: "body", label: "Frase", type: "textarea" },
      { key: "caption", label: "Apoio", type: "textarea" },
      anchor,
    ],
    defaults: { body: "A ideia principal deste capítulo." },
    summary: props => text(props, "body"),
  },
  {
    name: "CaseTitleBox", label: "Título + caixa", description: "Título grande à esquerda e o texto numa caixa à direita, como o \"Um pouco de mim\" do Sobre.",
    fields: [
      { key: "sectionLabel", label: "Rótulo", type: "text", toggle: { hidden: null, text: "Contexto" } },
      { key: "title", label: "Título", type: "text" },
      { key: "continuation", label: "Continuação (em cinza)", type: "text" },
      { key: "intro", label: "Apoio abaixo do título", type: "textarea" },
      { key: "body", label: "Texto da caixa", type: "textarea", hint: "Separe parágrafos com uma linha em branco." },
      anchor,
    ],
    defaults: { title: "Um pouco de contexto,", continuation: "em poucas linhas.", body: "Texto." },
    summary: props => [text(props, "title"), text(props, "continuation")].filter(Boolean).join(" "),
  },
  {
    name: "CaseLightPanel", label: "Seção clara", description: "Um painel branco como quebra visual; diagramas claros ficam em casa nele.",
    fields: [
      { key: "sectionLabel", label: "Rótulo", type: "text", toggle: { hidden: null, text: "Rótulo" } },
      { key: "heading", label: "Título", type: "text", toggle: { hidden: null, text: "Título" } },
      { key: "body", label: "Texto", type: "textarea" },
      { key: "src", label: "Imagem ou diagrama", type: "image" },
      { key: "alt", label: "Descrição da imagem", type: "text" },
      { key: "caption", label: "Legenda", type: "text" },
      anchor,
    ],
    defaults: { heading: "Título" },
    summary: props => text(props, "heading", "body", "caption"),
  },
  {
    name: "CaseBigNumber", label: "Número gigante", description: "O resultado principal, sozinho e enorme, como o \"+30\" da Home.",
    fields: [
      { key: "value", label: "Número", type: "text", hint: "Ex.: +46%" },
      { key: "label", label: "O que ele mede", type: "text" },
      { key: "body", label: "Apoio", type: "textarea" },
      anchor,
    ],
    defaults: { value: "+30", label: "O que este número mede" },
    summary: props => [text(props, "value"), text(props, "label")].filter(Boolean).join(" · "),
  },
  {
    name: "CaseIconRatio", label: "Proporção com ícones", description: "Ex.: 7 de 10 pessoas, numa grade de ícones pintados na cor do case.",
    fields: [
      label(undefined, "Em números"),
      heading,
      { key: "intro", label: "Introdução", type: "textarea" },
      { key: "icon", label: "Ícone", type: "icon" },
      { key: "value", label: "Quantos estão pintados", type: "number", hint: "Aceita fração: 6,5 pinta meio ícone." },
      { key: "total", label: "De quantos", type: "number", hint: "Total de ícones na grade (até 200). Padrão: 10." },
      { key: "display", label: "Número em destaque", type: "text", hint: "Vazio: \"7 de 10\". Ex.: 70%, 7 em cada 10." },
      { key: "label", label: "Texto", type: "textarea", hint: "Ao lado do número. Ex.: dos médicos usam o app toda semana." },
      { key: "caption", label: "Fonte ou nota", type: "text" },
      anchor,
    ],
    defaults: { icon: "person", value: 7, total: 10, label: "das pessoas fizeram isso" },
    summary: props => [text(props, "display", "heading"), typeof props.value === "number" ? `${props.value} de ${props.total ?? 10}` : ""].filter(Boolean).join(" · "),
  },
  {
    name: "CaseIconStats", label: "Números com ícone", description: "Uma grade de métricas, cada uma com um ícone, o número e um texto curto.",
    fields: [
      label(undefined, "Em números"),
      heading,
      { key: "intro", label: "Introdução", type: "textarea" },
      { key: "columns", label: "Colunas", type: "select", options: [{ value: 2, label: "2" }, { value: 3, label: "3" }, { value: 4, label: "4" }], hint: "Padrão: conforme a quantidade." },
      { key: "items", label: "Números", type: "list", itemLabel: "Número", item: [
        { key: "icon", label: "Ícone", type: "icon" },
        { key: "value", label: "Valor", type: "text" },
        { key: "label", label: "Rótulo", type: "text" },
        { key: "body", label: "Texto", type: "textarea" },
      ] },
      anchor,
    ],
    defaults: { items: [{ icon: "users", value: "1.000+", label: "médicos" }, { icon: "clock", value: "4 min", label: "para criar uma escala" }, { icon: "growth", value: "+46%", label: "na conversão" }] },
    summary: props => [text(props, "heading"), count(props, "items", "número")].filter(Boolean).join(" · "),
  },
  {
    name: "CaseTimeline", label: "Linha do tempo", description: "Marcos com data, título e texto, ao longo de uma linha.",
    fields: [
      label(undefined, "Trajetória"),
      heading,
      { key: "intro", label: "Introdução", type: "textarea" },
      { key: "layout", label: "Direção", type: "select", options: [{ value: "vertical", label: "Vertical" }], hint: "Padrão: horizontal no computador, vertical no celular." },
      { key: "items", label: "Marcos", type: "list", itemLabel: "Marco", item: [
        { key: "date", label: "Data", type: "text" },
        { key: "title", label: "Título", type: "text" },
        { key: "body", label: "Texto", type: "textarea" },
        { key: "highlight", label: "Em destaque", type: "boolean" },
      ] },
      anchor,
    ],
    defaults: { items: [{ date: "2021", title: "Início" }, { date: "2022", title: "Primeira versão", highlight: true }, { date: "2023", title: "Escala" }] },
    summary: props => [text(props, "heading"), count(props, "items", "marco")].filter(Boolean).join(" · "),
  },
  {
    name: "CaseComparison", label: "Comparação lado a lado", description: "Uma tabela visual com ✓ e ✕ comparando opções; uma coluna pode ficar em destaque.",
    // Columns and rows are edited as a table (ComparisonEditor); these are the texts around it.
    fields: [
      label(undefined, "Comparação"),
      heading,
      { key: "intro", label: "Introdução", type: "textarea" },
      { key: "caption", label: "Fonte ou nota", type: "text" },
      anchor,
    ],
    defaults: { columns: [{ label: "Antes" }, { label: "Depois", highlight: true }], rows: [{ label: "Atributo", values: ["não", "sim"] }] },
    summary: props => [text(props, "heading"), count(props, "rows", "linha")].filter(Boolean).join(" · "),
  },
  {
    name: "CaseScreens", label: "Galeria de telas", description: "De 2 a 8 telas lado a lado, cada uma com legenda; moldura de celular opcional.",
    fields: [
      label(undefined, "Produto"),
      heading,
      { key: "intro", label: "Subtítulo", type: "textarea" },
      { key: "frame", label: "Moldura", type: "select", options: [{ value: "none", label: "Sem moldura (a imagem como é)" }], hint: "Padrão: celular, com a tela cortada pelo topo." },
      { key: "screens", label: "Telas", type: "list", itemLabel: "Tela", hint: "Até 8. No celular, viram uma faixa que rola para o lado.", item: [
        { key: "src", label: "Imagem", type: "image" },
        { key: "label", label: "Legenda", type: "text", hint: "Ex.: Acesso, Marcas, Carteira" },
        { key: "caption", label: "Texto abaixo", type: "text" },
        { key: "alt", label: "Descrição da imagem", type: "text", hint: "Lida por leitores de tela. Vazio: usa a legenda." },
      ] },
      anchor,
    ],
    defaults: { heading: "Telas", screens: [{ src: "", label: "Tela 1" }, { src: "", label: "Tela 2" }, { src: "", label: "Tela 3" }] },
    summary: props => [text(props, "heading"), count(props, "screens", "tela")].filter(Boolean).join(" · "),
  },
  {
    name: "CaseImageCompare", label: "Antes e depois em imagens", description: "Duas imagens sobrepostas, com um divisor que se arrasta para comparar.",
    fields: [
      label(undefined, "Antes e depois"),
      heading,
      { key: "intro", label: "Subtítulo", type: "textarea" },
      compareSide("before", "Antes"),
      compareSide("after", "Depois"),
      { key: "caption", label: "Legenda", type: "text" },
      { key: "background", label: "Fundo", type: "select", defaultLabel: "Cinza (padrão)", options: [{ value: "none", label: "Sem fundo" }, { value: "brand", label: "Cor do case" }, { value: "custom", label: "Outra cor" }], hint: "Aparece onde as imagens não cobrem, como em PNGs transparentes." },
      { key: "color", label: "Cor do fundo", type: "color", when: { key: "background", is: ["custom"] } },
      { key: "border", label: "Borda", type: "select", defaultLabel: "Com borda", options: [{ value: "false", label: "Sem borda" }] },
      { key: "start", label: "Posição inicial do divisor", type: "number", hint: "Em %, de 0 (tudo depois) a 100 (tudo antes). Padrão: 50.", advanced: true },
      anchor,
    ],
    defaults: { before: { src: "", label: "Antes" }, after: { src: "", label: "Depois" } },
    summary: props => text(props, "heading", "caption") || "Antes e depois",
  },
  {
    name: "CaseImageStack", label: "Imagens sobrepostas", description: "Prints uns por cima dos outros: em cascata, em leque, em colunas desencontradas ou um em destaque com os outros espiando.",
    fields: [
      label(undefined, "Telas"),
      heading,
      { key: "intro", label: "Subtítulo", type: "textarea" },
      { key: "layout", label: "Composição", type: "select", options: [
        { value: "cascade", label: "Cascata: descem na diagonal, a última na frente (2 a 4)" },
        { value: "spotlight", label: "Destaque: uma grande na frente, as outras espiam por trás (2 a 3)" },
        { value: "fan", label: "Leque: abertos pela base, a do meio por cima (2 a 5)" },
        { value: "stagger", label: "Colunas desencontradas: duas colunas que se encostam (2 a 5)" },
        { value: "row", label: "Fileira: lado a lado, cada uma cobrindo a borda da vizinha (2 a 4)" },
      ], hint: "A primeira imagem é a principal: na cascata é a de trás, no destaque é a da frente." },
      { key: "items", label: "Imagens", type: "list", itemLabel: "Imagem", hint: "Pelo menos 2; o que passar do limite da composição não aparece.", item: [
        { key: "src", label: "Imagem", type: "image" },
        { key: "focus", label: "Ponto de foco", type: "focus", of: "src", hint: "O que não pode sair do quadro quando a imagem é cortada. Padrão: o topo." },
        { key: "alt", label: "Descrição da imagem", type: "text", hint: "Lida por leitores de tela." },
      ] },
      { key: "frame", label: "Moldura", type: "select", defaultLabel: "Cartão (cantos arredondados e sombra)", options: [{ value: "browser", label: "Janela de navegador" }, { value: "none", label: "Sem moldura (a imagem inteira, como é)" }] },
      { key: "ratio", label: "Proporção dos quadros", type: "select", defaultLabel: "Automática (conforme a composição)", options: [
        { value: "wide", label: "Paisagem 16:10" }, { value: "classic", label: "Clássica 4:3" }, { value: "square", label: "Quadrada" }, { value: "portrait", label: "Retrato 3:4" }, { value: "phone", label: "Celular" },
      ], hint: "Telas de computador pedem paisagem; telas de app, celular." },
      { key: "mirror", label: "Espelhar", type: "boolean", hint: "Inverte os lados: o que ia para a direita vai para a esquerda." },
      { key: "caption", label: "Legenda", type: "text" },
      { key: "background", label: "Fundo", type: "select", defaultLabel: "Cinza (padrão)", options: [{ value: "none", label: "Sem fundo" }, { value: "brand", label: "Cor do case" }, { value: "custom", label: "Outra cor" }] },
      { key: "color", label: "Cor do fundo", type: "color", when: { key: "background", is: ["custom"] } },
      anchor,
    ],
    defaults: { layout: "cascade", items: [{ src: "" }, { src: "" }, { src: "" }] },
    summary: props => [text(props, "heading", "caption"), count(props, "items", "imagem")].filter(Boolean).join(" · "),
  },
  {
    name: "CasePanel", label: "Painel de cards", description: "Cards lado a lado: gráficos, imagem e frase, números empilhados ou texto, cada um com título e fonte.",
    // The cards are edited one by one (PanelEditor); these are the texts above them.
    fields: [
      label(undefined, "Contexto"),
      heading,
      { key: "intro", label: "Introdução", type: "textarea" },
      { key: "columns", label: "Colunas", type: "select", options: [{ value: 1, label: "1" }, { value: 2, label: "2" }, { value: 3, label: "3" }], hint: "Padrão: conforme os cards, até 3." },
      anchor,
    ],
    defaults: { cards: [
      { kind: "stack", title: "Dimensionamento", items: [{ label: "Total", figure: "668 milhões" }, { label: "Brasil", figure: "216 milhões" }, { label: "Potencial", figure: "110 milhões" }] },
      { kind: "chart", title: "Por faixa", chart: { type: "bar", highlight: "1, 3", suffix: " mi", categories: ["10–18", "18–24", "25–34", "35–44"], series: [{ label: "Pessoas", values: [27.9, 19.6, 26, 15.6] }] }, source: "Fonte" },
    ] },
    summary: props => [text(props, "heading"), count(props, "cards", "card")].filter(Boolean).join(" · "),
  },
  {
    name: "CaseChart", label: "Gráfico", description: "Colunas, barras, linha, área, progresso, medidor ou antes e depois, a partir de uma tabela.",
    // The type and the table are edited above (ChartEditor); these are the texts and the options.
    fields: [
      label(undefined, "Dados"),
      heading,
      { key: "intro", label: "Introdução", type: "textarea" },
      { key: "title", label: "Título do gráfico", type: "text", hint: "Dentro do card, acima do gráfico." },
      { key: "caption", label: "Fonte ou nota", type: "text" },
      { key: "prefix", label: "Antes do número", type: "text", hint: "Ex.: R$ ou +" },
      { key: "suffix", label: "Depois do número", type: "text", hint: "Ex.: %, mil, h" },
      { key: "decimals", label: "Casas decimais", type: "number", hint: "Vazio: até uma, quando houver." },
      { key: "stacked", label: "Empilhar as séries", type: "boolean", when: WHEN_STACK },
      { key: "curve", label: "Linha", type: "select", options: [{ value: "smooth", label: "Suave" }], hint: "Padrão: reta entre os pontos.", when: WHEN_LINE },
      { key: "allValues", label: "Valor em todos os pontos", type: "boolean", hint: "Padrão: só no último.", when: WHEN_LINE },
      { key: "max", label: "Máximo", type: "number", hint: "O total que enche a barra ou o medidor. Padrão: 100.", when: WHEN_MAX },
      { key: "highlight", label: "Destacar os itens nº", type: "text", hint: "Ex.: 1, 3 destaca a primeira e a terceira linha; os outros ficam num tom suave." },
      { key: "tones", label: "Tons por item", type: "boolean", hint: "Com uma série: o primeiro item na cor, os seguintes mais suaves." },
      { key: "size", label: "Tamanho", type: "select", options: [{ value: "s", label: "Pequeno" }, { value: "m", label: "Médio" }, { value: "l", label: "Grande" }], hint: "Altura do gráfico; no progresso, a espessura das barras.", when: chartWhen("column", "line", "area", "progress") },
      { key: "hideValues", label: "Esconder os números", type: "boolean", advanced: true },
      { key: "hideGrid", label: "Esconder a grade e o eixo", type: "boolean", advanced: true, when: WHEN_PLOT },
      { key: "hideLegend", label: "Esconder a legenda", type: "boolean", advanced: true },
      { key: "yMin", label: "Eixo começa em", type: "number", advanced: true, when: WHEN_PLOT },
      { key: "yMax", label: "Eixo vai até", type: "number", advanced: true },
      anchor,
    ],
    defaults: { type: "column", title: "Título do gráfico", categories: ["2022", "2023", "2024"], series: [{ label: "Série 1", values: [12, 18, 27] }] },
    summary: props => [text(props, "title", "heading"), count(props, "categories", "item")].filter(Boolean).join(" · "),
  },
  {
    name: "CaseFlowDiagram", label: "Fluxo", description: "Diagrama em vários modelos: linha, vertical, ramificação, ciclo, funil, hub ou livre.",
    // The cards and arrows are edited on the canvas (FlowEditor); these are the texts around it.
    fields: [
      label("Fluxo"),
      heading,
      { key: "intro", label: "Introdução", type: "textarea" },
      { key: "caption", label: "Legenda", type: "text" },
      anchor,
    ],
    defaults: { layout: "linear", heading: "Como funciona", nodes: [{ id: "n1", title: "Etapa 1", body: "Texto" }, { id: "n2", title: "Etapa 2", body: "Texto", tone: "soft" }, { id: "n3", title: "Etapa 3", body: "Texto" }] },
    summary: props => [text(props, "heading", "sectionLabel"), count(props, "nodes", "cartão")].filter(Boolean).join(" · "),
  },
  {
    name: "CaseFlow", label: "Fluxo simples", description: "Etapas em cards numa linha, ligados por setas; uma pode ficar em destaque.",
    fields: [
      label(undefined, "Fluxo"),
      heading,
      { key: "steps", label: "Etapas", type: "list", itemLabel: "Etapa", item: [
        { key: "title", label: "Título", type: "text" },
        { key: "highlight", label: "Em destaque", type: "boolean" },
        { key: "body", label: "Texto", type: "textarea" },
      ] },
      { key: "numbered", label: "Numerar as etapas (01, 02…)", type: "boolean" },
      { key: "connector", label: "Ligação por baixo", type: "text", hint: "Opcional: uma linha liga a primeira e a última etapa, com este texto." },
      { key: "contextLabel", label: "Rótulo da faixa de contexto", type: "text", advanced: true },
      { key: "context", label: "Faixa de contexto", type: "text", advanced: true },
      anchor,
    ],
    defaults: { heading: "Como funciona", steps: [{ title: "Etapa 1", body: "Texto" }, { title: "Etapa 2", body: "Texto", highlight: true }, { title: "Etapa 3", body: "Texto" }] },
    summary: props => [text(props, "heading", "sectionLabel"), count(props, "steps", "etapa")].filter(Boolean).join(" · "),
  },
  {
    name: "CaseBento", label: "Bento grid", description: "Blocos de tamanhos variados: texto, número, imagem, vídeo ou citação.",
    fields: [
      label(undefined, "Rótulo"),
      heading,
      { key: "tiles", label: "Blocos", type: "list", itemLabel: "Bloco", item: [
        { key: "kind", label: "Tipo", type: "select", options: [{ value: "text", label: "Texto" }, { value: "stat", label: "Número" }, { value: "image", label: "Imagem" }, { value: "video", label: "Vídeo" }, { value: "quote", label: "Citação" }], hint: "Padrão: texto." },
        { key: "size", label: "Tamanho", type: "select", options: [{ value: "1x1", label: "1 × 1" }, { value: "2x1", label: "Largo (2 × 1)" }, { value: "1x2", label: "Alto (1 × 2)" }, { value: "2x2", label: "Grande (2 × 2)" }] },
        { ...tone, hint: "Padrão: neutro." },
        { key: "title", label: "Título", type: "text", when: { key: "kind", is: ["text", "stat", "image", "video"], fallback: "text" } },
        { key: "body", label: "Texto", type: "textarea", when: { key: "kind", is: ["text", "quote"], fallback: "text" } },
        { key: "value", label: "Número", type: "text", when: { key: "kind", is: ["stat"] } },
        { key: "label", label: "Rótulo do número", type: "text", when: { key: "kind", is: ["stat"] } },
        { key: "src", label: "Imagem", type: "image", when: { key: "kind", is: ["image"] } },
        { key: "alt", label: "Descrição da imagem", type: "text", when: { key: "kind", is: ["image"] } },
        { key: "src", label: "Vídeo", type: "image", hint: "MP4 ou WebM. Toca sem som, em loop, enquanto aparece na tela.", when: { key: "kind", is: ["video"] } },
        { key: "poster", label: "Capa do vídeo", type: "image", hint: "Opcional: aparece enquanto o vídeo carrega.", when: { key: "kind", is: ["video"] } },
        { key: "caption", label: "Legenda ou fonte", type: "text" },
      ] },
      anchor,
    ],
    defaults: { tiles: [{ kind: "text", size: "2x1", title: "Título", body: "Uma frase de destaque." }, { kind: "stat", value: "+46%", label: "O que mede" }, { kind: "image", size: "1x2", title: "Imagem" }] },
    summary: props => [text(props, "heading", "sectionLabel"), count(props, "tiles", "bloco")].filter(Boolean).join(" · "),
  },
);

export const COMPONENT_BY_NAME = new Map(COMPONENTS.map(c => [c.name, c]));

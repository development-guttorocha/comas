/**
 * Names, hints and input kinds for the fields of the Design Services files. The service editor
 * builds its form from each file's own shape, so a key missing here still shows, by its name.
 */

export const FIELD_LABELS: Record<string, string> = {
  accent: "Cor do serviço", after: "Depois", alternatives: "Texto antes dos contatos alternativos", answer: "Resposta",
  audience: "Pra quem é", badge: "Selo", before: "Antes", beforeAfter: "Antes e depois", body: "Texto",
  calendlyUrl: "Link do Calendly", caption: "Legenda", card: "Card no hub", cardCta: "Botão dos cards", cases: "Cases",
  casesCta: "Botão para todos os cases", closing: "Fechamento e contato", color: "Cor", columns: "Colunas", company: "Empresa",
  comparison: "Comparativo", componentLabel: "Rótulo do componente", continuation: "Continuação (em cinza)",
  controls: "Rótulos dos controles", cta: "Botão", cursors: "Cursores", deliverables: "Entregáveis", demo: "Demo antes e depois",
  density: "Densidade", description: "Descrição", detail: "Detalhe", duration: "Duração", email: "E-mail",
  emailCta: "Botão de e-mail", emailLink: "Link de e-mail", emailSubject: "Assunto do e-mail", faq: "Perguntas frequentes",
  file: "Nome do arquivo", fit: "Para quem é", flag: "Marca", form: "Formulário de contato", formatLabel: "Rótulo do campo formato",
  formats: "Formatos", fragments: "Fragmentos flutuantes", frameLabel: "Rótulo do frame", guide: "Quem conduz",
  guidedNotes: "Notas com critério", guidedPrompt: "Prompt com critério", hero: "Topo (hero)", hint: "Dica", href: "Link",
  inputLabel: "Rótulo do campo", inputValue: "Valor do campo", intro: "Texto de abertura", items: "Itens",
  kicker: "Rótulo pequeno", label: "Rótulo", layers: "Camadas", logos: "Nomes no marquee", logosLabel: "Título do marquee",
  marquee: "Fita de problemas", message: "Mensagem", messageHint: "Dica da mensagem", method: "Método", name: "Nome",
  nav: "Menu de âncoras", navName: "Nome no menu", next: "Próximos serviços", note: "Observação", offers: "Ofertas (para o Google)",
  on: "Cor do texto sobre ela", optionUnsure: "Opção \"ainda não sei\"", partners: "Designers parceiros", pillars: "O que eu faço",
  playground: "Playground de tokens", points: "Pontos", preview: "Tela de exemplo", primary: "Botão principal",
  primaryCta: "Botão principal", privacy: "Aviso de privacidade", process: "Processo", progressLabel: "Rótulo do progresso",
  prompt: "Prompt digitado", promptButton: "Botão do prompt", proof: "Resultados e cases", question: "Pergunta",
  radius: "Arredondamento", rawNotes: "Notas sem critério", rawPrompt: "Prompt sem critério", related: "Texto do link relacionado",
  relatedCta: "Link relacionado", relatedHref: "Endereço do link relacionado", rows: "Linhas", rules: "Regras",
  secondary: "Botão secundário", secondaryCta: "Botão secundário", sending: "Texto enquanto envia", sentBody: "Texto depois de enviar",
  sentBodyNoCalendar: "Texto depois de enviar (sem Calendly)", sentTitle: "Título depois de enviar", seoDescription: "Descrição para o Google",
  seoTitle: "Título para o Google", serviceLabel: "Rótulo do campo serviço", serviceName: "Nome do serviço",
  serviceType: "Tipo de serviço (para o Google)", signs: "Pra quem é", slug: "Endereço (slug)", steps: "Como funciona",
  sticky: "Post-it", submit: "Botão de enviar", summary: "Resumo", tabCalendar: "Aba de agendar", tabForm: "Aba de mensagem",
  tabsLabel: "Nome das abas (leitores de tela)", tag: "Etiqueta", teamSize: "Rótulo do tamanho do time",
  teamSizePlaceholder: "Opção vazia do tamanho do time", theme: "Tema", title: "Título", titleComponent: "Título: palavra que vira botão",
  titleMiddle: "Título: meio", titleStart: "Título: começo (dentro da seleção)", toggle: "Botões de alternar", tools: "Ferramentas",
  type: "Tipo", values: "Valores", voices: "Depoimentos", whatsappCta: "Botão do WhatsApp", whatsappMessage: "Mensagem do WhatsApp",
  when: "Quando",
};

export const FIELD_HINTS: Record<string, string> = {
  slug: "É o endereço da página; não muda pelo admin.",
  seoTitle: "Aparece na aba do navegador e no resultado do Google.",
  seoDescription: "O texto do resultado no Google. Até uns 160 caracteres.",
  navName: "Aparece no menu do topo, depois de \"Design Services |\".",
  calendlyUrl: "O link do evento, ex.: https://calendly.com/guttorocha/papo30",
  whatsappMessage: "Já vem escrita quando a pessoa abre o WhatsApp.",
  emailSubject: "Assunto do e-mail do botão alternativo.",
  cases: "Os cases que aparecem nesta seção, na ordem.",
  relatedHref: "Ex.: /servicos/head-de-design",
  componentLabel: "O rótulo roxo em cima da palavra que vira botão.",
};

/** The singular for one item of a list, by the list's key or, for `items`, by its parent's. */
const ITEM_BY_KEY: Record<string, string> = {
  nav: "Link", rows: "Linha", layers: "Camada", rules: "Regra", offers: "Oferta", points: "Ponto", logos: "Nome", marquee: "Problema",
  cursors: "Cursor", cases: "Case", columns: "Coluna", values: "Valor", fragments: "Fragmento", rawNotes: "Nota", guidedNotes: "Nota",
  toggle: "Botão", proof: "Prova",
};
const ITEM_BY_PARENT: Record<string, string> = {
  faq: "Pergunta", formats: "Formato", steps: "Passo", pillars: "Pilar", signs: "Sinal", deliverables: "Entregável",
  process: "Etapa", audience: "Público", next: "Serviço", tools: "Ferramenta",
};

export function itemLabel(path: Array<string | number>) {
  const keys = path.filter((p): p is string => typeof p === "string");
  const key = keys.at(-1) ?? "";
  if (key === "items") return ITEM_BY_PARENT[keys.at(-2) ?? ""] ?? "Item";
  return ITEM_BY_KEY[key] ?? "Item";
}

const LONG_KEYS = new Set(["intro", "body", "description", "answer", "summary", "seoDescription", "guidedPrompt", "rawPrompt", "sentBody", "sentBodyNoCalendar", "whatsappMessage", "caption", "note", "detail", "message", "fit", "sticky"]);

export type InputKind = "text" | "textarea" | "color" | "readonly" | "link" | "case";

export function inputKind(key: string, value: string, parentKey?: string): InputKind {
  if (key === "slug") return "readonly";
  if (parentKey === "cases") return "case";
  if (/^#[0-9a-f]{6}$/i.test(value) || (parentKey === "accent" && (key === "color" || key === "on"))) return "color";
  if (key === "href" || key === "relatedHref" || key === "calendlyUrl" || /^(https?:|\/|#)/.test(value)) return "link";
  if (LONG_KEYS.has(key) || value.length > 90) return "textarea";
  return "text";
}

export const fieldLabel = (key: string) => FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());

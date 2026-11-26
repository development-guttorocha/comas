import type { FieldDef } from "./fields";

/** Os dados do case no admin, agrupados pelo lugar onde aparecem no site. */
export const CASE_FIELD_GROUPS: { title: string; description: string; fields: FieldDef[] }[] = [
  {
    title: "Apresentação",
    description: "O topo do case e o card nas listas.",
    fields: [
      { key: "title", label: "Título", type: "text" },
      { key: "company", label: "Empresa", type: "text" },
      { key: "productTag", label: "Área", type: "text", hint: "Aparece acima do título no topo do case." },
      { key: "role", label: "Papel", type: "text" },
      { key: "year", label: "Período", type: "text" },
      { key: "summary", label: "Resumo", type: "textarea", hint: "Frase de apoio no topo do case e nas listas." },
      { key: "tags", label: "Etiquetas", type: "tags" },
      { key: "accentTags", label: "Etiquetas em destaque", type: "tags" },
    ],
  },
  {
    title: "Home",
    description: "O card do case na página inicial. Cada campo vazio usa o dado do próprio case.",
    fields: [
      { key: "draft", label: "Rascunho", type: "boolean", hint: "Fica só no admin, fora do site e das listas." },
      { key: "featuredOnSite", label: "Destaque na Home", type: "boolean", hint: "Os destacados abrem a lista de cases da Home." },
      { key: "homeImage", label: "Imagem", type: "image", hint: "Vazia: usa a imagem de capa. Aparece no card e na esteira de cases." },
      { key: "homeImageFocus", label: "Ponto de foco", type: "focus", of: "homeImage", hint: "O que não pode sair do card quando a imagem é cortada." },
      { key: "homeImageMobile", label: "Imagem no celular", type: "image", hint: "Opcional: uma versão composta para a tela em pé." },
      { key: "homeCompany", label: "Empresa", type: "text", hint: "Vazio: usa a empresa do case." },
      { key: "homeYear", label: "Período", type: "text", hint: "Vazio: usa o período do case." },
      { key: "homeTitle", label: "Título", type: "text", hint: "Vazio: usa o título do case." },
      { key: "homeLabel", label: "Rótulo dos números", type: "text", hint: "Vazio: o rótulo do bloco de métricas, ou Resultados / Entrega." },
      { key: "homeSummary", label: "Texto", type: "textarea", hint: "Vazio: a introdução do bloco de métricas." },
      { key: "homeStats", label: "Números", type: "list", itemLabel: "Número", hint: "Até dois. Vazio: os do primeiro bloco de métricas do case.", item: [
        { key: "value", label: "Valor", type: "text" },
        { key: "label", label: "Rótulo", type: "text" },
        { key: "caption", label: "Legenda", type: "text" },
      ] },
      { key: "homeNote", label: "Nota", type: "textarea", hint: "Linha pequena abaixo dos números. Vazio: a nota do bloco de métricas." },
      { key: "homeColor", label: "Cor do card", type: "color", hint: "Vazio: a cor da marca." },
      { key: "homeHighlightKind", label: "Tipo de destaque", type: "select", options: [{ value: "results", label: "Resultados" }, { value: "delivery", label: "Entrega" }], advanced: true },
    ],
  },
  {
    title: "Capa",
    description: "A imagem ou o vídeo que abre o case.",
    fields: [
      { key: "heroImage", label: "Imagem de capa", type: "image" },
      { key: "heroImageFocus", label: "Ponto de foco", type: "focus", of: "heroImage", hint: "Clique no que não pode sair da tela quando a capa é cortada." },
      { key: "heroImageMobile", label: "Capa no celular", type: "image", hint: "Opcional: uma imagem composta para a tela em pé. Sem ela, o celular corta a capa pelo ponto de foco." },
      { key: "heroVariant", label: "Formato do topo", type: "select", options: [{ value: "fullBleed", label: "Tela cheia" }, { value: "editorial", label: "Editorial" }] },
      { key: "heroFullBleedContinueLabel", label: "Texto do botão", type: "text", hint: "Padrão: Continuar." },
      { key: "heroFullBleedEyebrow", label: "Rótulo sobre o título", type: "text", hint: "Padrão: a área." },
      { key: "heroFullBleedTagline", label: "Linha abaixo do título", type: "text", hint: "Padrão: o resumo." },
      { key: "brandColor", label: "Cor da marca", type: "color" },
      { key: "heroFullBleedVideoUrl", label: "Vídeo de capa", type: "image", hint: "Substitui a imagem quando preenchido.", advanced: true },
      { key: "heroFullBleedVideoPoster", label: "Imagem do vídeo", type: "image", advanced: true },
      { key: "heroMegaWord", label: "Palavra gigante", type: "text", hint: "Só no topo editorial.", advanced: true },
      { key: "placeholder", label: "Cor de carregamento", type: "color", advanced: true },
    ],
  },
];

import fs from "node:fs";
import path from "node:path";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { componentRenders, readBlock, type BlockModel } from "@/lib/admin/caseBlocks";
import { COMPONENT_BY_NAME } from "@/lib/admin/componentSchemas";
import type { CaptionKind } from "@/lib/media/captionKinds";
import { LAYOUT_RANGE, RATIO_VALUE, STACK_LAYOUTS, STACK_RATIOS, type StackLayout, type StackRatio } from "@/lib/imageStack";
import { MATERIAL_MEDIA_PREFIX, mediaFilePath } from "@/lib/admin/materialMedia";

/**
 * When each case component makes sense, for the future AI case generator.
 *
 * The prose (when to use, when not to, what goes before and after) lives in
 * content/case-components.md so Gutto can read and correct it; `componentNotes()` and
 * `caseComponentsPrompt()` hand prompts the parts between `<!-- case-components:… -->` markers.
 * The numbers the checks need (weight, text limits, list sizes, image shapes) live here, and the
 * test fails when the .md and this file disagree. The checks are pure functions over body.json.
 */
export const CASE_COMPONENTS_FILE = path.join(process.cwd(), "content", "case-components.md");

/* ---------- Vocabulary ---------- */

/**
 * The published case the generator imitates, chosen by what the case is about. How a case opens
 * and closes is the moment's call, so it is a suggestion in the guide, never a check.
 */
export const REFERENCE_CASES = {
  /** Strategy, leadership, team and business: chapters that alternate phrase, proof and reading. */
  historia: { slug: "picpay", label: "Liderança, estratégia e negócio" },
  /** Only product and design: one section per side of the product, each shown right after its text. */
  produto: { slug: "plenno", label: "Produto e design" },
} as const;
export type CaseKind = keyof typeof REFERENCE_CASES;

/** How much a block asks of the reader: one idea at a glance, a visual with some text, or reading. */
export type Weight = "leve" | "medio" | "denso";
/** Whether the generator should reach for it: freely, only when the material clearly asks, or never. */
export type GeneratorUse = "usar" | "raro" | "evitar";
/** Width ÷ height, in words. */
export type ImageShape = "alta" | "retrato" | "quadrada" | "paisagem" | "larga" | "faixa";

export type ComponentRule = {
  weight: Weight;
  generator: GeneratorUse;
  /** Characters per text field. Paths: "body", "before.body", "items[].title". */
  limits: Record<string, number>;
  /** How many items a list should have. */
  count?: { field: string; min: number; max: number };
  maxPerCase?: number;
};

/**
 * Keys are the component names of lib/admin/componentSchemas.ts plus the site's own blocks:
 * image, images (side by side), video, embed (site, Figma prototype), divider, section (nav
 * marker), text and spacer (an empty paragraph).
 */
export const RULES: Record<string, ComponentRule> = {
  section: { weight: "leve", generator: "usar", limits: { label: 24 } },
  divider: { weight: "leve", generator: "usar", limits: {} },
  spacer: { weight: "leve", generator: "evitar", limits: {} },

  CaseTitleBox: { weight: "denso", generator: "usar", limits: { sectionLabel: 24, title: 45, continuation: 45, intro: 160, body: 520 } },
  CaseSectionSplit: { weight: "denso", generator: "usar", limits: { label: 60, body: 700 } },
  CaseStatement: { weight: "leve", generator: "usar", limits: { body: 60, caption: 320 } },
  CaseChapter: { weight: "leve", generator: "raro", limits: { number: 3, title: 40, body: 120 }, maxPerCase: 2 },
  CaseLightPanel: { weight: "denso", generator: "raro", limits: { sectionLabel: 24, heading: 80, body: 600, caption: 120 }, maxPerCase: 2 },
  text: { weight: "leve", generator: "raro", limits: { md: 400 } },
  CaseEditorialParagraph: { weight: "denso", generator: "evitar", limits: { body: 600 } },

  CaseBigNumber: { weight: "leve", generator: "usar", limits: { value: 8, label: 80, body: 220 }, maxPerCase: 1 },
  CaseStatBand: { weight: "medio", generator: "usar", limits: { sectionLabel: 40, heading: 60, intro: 200, "stats[].value": 18, "stats[].label": 40, "stats[].caption": 40, attributionNote: 200 }, count: { field: "stats", min: 2, max: 6 } },
  CaseIconStats: { weight: "medio", generator: "usar", limits: { heading: 60, intro: 200, "items[].value": 16, "items[].label": 50, "items[].body": 90 }, count: { field: "items", min: 3, max: 8 } },
  CaseIconRatio: { weight: "medio", generator: "raro", limits: { heading: 60, intro: 200, display: 12, label: 90, caption: 120 }, maxPerCase: 1 },
  CaseChart: { weight: "medio", generator: "usar", limits: { heading: 60, intro: 200, title: 60, caption: 120 }, count: { field: "categories", min: 2, max: 8 } },
  CasePanel: { weight: "denso", generator: "usar", limits: { heading: 60, intro: 200, "cards[].title": 60, "cards[].body": 700 }, count: { field: "cards", min: 2, max: 4 } },

  CaseFlowDiagram: { weight: "medio", generator: "usar", limits: { heading: 60, intro: 200, caption: 120, "nodes[].title": 30, "nodes[].body": 70 }, count: { field: "nodes", min: 3, max: 6 } },
  CaseFlow: { weight: "medio", generator: "raro", limits: { heading: 60, "steps[].title": 30, "steps[].body": 120 }, count: { field: "steps", min: 3, max: 5 } },
  CaseTimeline: { weight: "medio", generator: "raro", limits: { heading: 60, intro: 200, "items[].date": 12, "items[].title": 30, "items[].body": 120 }, count: { field: "items", min: 3, max: 6 } },
  CaseResultsJourney: { weight: "denso", generator: "raro", limits: { heading: 60, intro: 200, "steps[].title": 40, "steps[].body": 200 }, count: { field: "steps", min: 3, max: 5 } },
  CaseApproachCards: { weight: "denso", generator: "usar", limits: { sectionLabel: 30, heading: 60, "items[].title": 40, "items[].body": 240 }, count: { field: "items", min: 2, max: 4 } },
  CaseComparison: { weight: "denso", generator: "raro", limits: { heading: 60, intro: 200, caption: 120 }, count: { field: "rows", min: 3, max: 8 }, maxPerCase: 1 },
  CaseBeforeAfter: { weight: "denso", generator: "raro", limits: { heading: 60, banner: 80, "before.label": 24, "after.label": 24, "before.body": 240, "after.body": 240 }, maxPerCase: 1 },

  image: { weight: "leve", generator: "usar", limits: { caption: 120 } },
  images: { weight: "medio", generator: "raro", limits: {}, count: { field: "images", min: 2, max: 3 } },
  video: { weight: "leve", generator: "raro", limits: { caption: 120 } },
  embed: { weight: "medio", generator: "raro", limits: { caption: 120 }, maxPerCase: 2 },
  CaseBento: { weight: "medio", generator: "usar", limits: { heading: 60, "tiles[].title": 50, "tiles[].body": 260, "tiles[].value": 10, "tiles[].label": 140, "tiles[].caption": 80 }, count: { field: "tiles", min: 3, max: 6 } },
  CaseScreens: { weight: "medio", generator: "usar", limits: { heading: 60, intro: 200, "screens[].label": 24, "screens[].caption": 80 }, count: { field: "screens", min: 2, max: 8 } },
  CaseImageStack: { weight: "medio", generator: "usar", limits: { heading: 60, intro: 200, caption: 120 }, count: { field: "items", min: 2, max: 5 } },
  CaseImageCompare: { weight: "medio", generator: "raro", limits: { heading: 60, intro: 200, caption: 120, "before.label": 16, "after.label": 16 }, maxPerCase: 2 },
  CaseMediaEmbed: { weight: "medio", generator: "evitar", limits: { title: 60, caption: 120 } },
  CaseMediaFigure: { weight: "leve", generator: "evitar", limits: { caption: 120 } },
  CaseMediaFullWidth: { weight: "leve", generator: "evitar", limits: {} },
  CaseSectionMedia: { weight: "medio", generator: "evitar", limits: { label: 40, intro: 300 } },

  CasePullQuote: { weight: "leve", generator: "raro", limits: { label: 24, body: 220 }, maxPerCase: 1 },
  CaseResultsQuote: { weight: "leve", generator: "raro", limits: { body: 240, attribution: 80 }, maxPerCase: 2 },
  CaseThanksCards: { weight: "leve", generator: "raro", limits: { "items[].title": 30, "items[].body": 300 }, count: { field: "items", min: 1, max: 2 }, maxPerCase: 1 },
};

/** Blocks that only shape the page; rhythm checks look past them. */
const STRUCTURAL = new Set(["section", "divider", "spacer"]);
/** Big type that states one idea: two in a row read as two titles with nothing between. */
const HEADLINES = new Set(["CaseStatement", "CaseChapter", "CaseBigNumber"]);
/** Blocks led by a paragraph of reading. */
const TEXT_LED = new Set(["CaseTitleBox", "CaseSectionSplit", "CaseLightPanel", "CaseEditorialParagraph"]);
/** Texts the admin puts in a new component: if they reach a draft, the AI left a slot empty. */
export const PLACEHOLDERS = new Set([
  "Novo título", "Texto da seção.", "Texto", "Texto.", "Título", "Rótulo", "Frase em destaque.", "Citação.", "Nome · Cargo",
  "Etapa", "Etapa 1", "Etapa 2", "Etapa 3", "Tela 1", "Tela 2", "Tela 3", "Série 1", "Título do gráfico", "Atributo", "Nome",
  "A ideia principal deste capítulo.", "Um pouco de contexto,", "em poucas linhas.", "O que este número mede", "O que mede",
  "Uma frase de destaque.", "das pessoas fizeram isso", "Primeira versão",
]);

/* ---------- Reading body.json ---------- */

export type CaseItem = {
  /** Position in body.json. */
  index: number;
  /** A RULES key: the component name or the site's own block. */
  type: string;
  model: BlockModel;
  /** The fields the limits read: a component's props, or the block's own model. */
  props: Record<string, unknown>;
};

export function itemType(model: BlockModel): string {
  switch (model.kind) {
    case "component": return model.name;
    case "embed": return model.variant === "video" ? "video" : "embed";
    case "raw": return "raw";
    default: return model.kind;
  }
}

export function readCaseBody(blocks: NotionBlockNode[]): CaseItem[] {
  return blocks.map((block, index) => {
    const model = readBlock(block);
    const props = model.kind === "component" ? model.props : (model as unknown as Record<string, unknown>);
    return { index, type: itemType(model), model, props };
  });
}

const plain = (md: string) => md.replace(/\\(.)/g, "$1").replace(/\*\*|__|~~|`/g, "").trim();
const len = (s: string) => [...s.trim()].length;

/** A short paragraph under a block (a source, an asterisk note): it never sets the rhythm. */
function isNote(item: CaseItem) {
  return item.model.kind === "text" && item.model.style === "paragraph" && len(plain(item.model.md)) < 140;
}

export function weightOf(item: CaseItem): Weight {
  if (item.model.kind === "text") return item.model.style === "paragraph" && len(plain(item.model.md)) >= 280 ? "denso" : "leve";
  return RULES[item.type]?.weight ?? "medio";
}

/** Strings at a path like "items[].body" or "before.body". */
export function valuesAt(value: unknown, fieldPath: string): string[] {
  const [head, ...rest] = fieldPath.split(".");
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  if (head!.endsWith("[]")) {
    const list = record[head!.slice(0, -2)];
    if (!Array.isArray(list)) return [];
    return list.flatMap(entry => rest.length ? valuesAt(entry, rest.join(".")) : typeof entry === "string" ? [entry] : []);
  }
  const next = record[head!];
  if (rest.length) return valuesAt(next, rest.join("."));
  return typeof next === "string" ? [head === "md" ? plain(next) : next] : [];
}

/* ---------- Findings ---------- */

export type Severity = "erro" | "aviso";
export type Finding = { check: CheckId; severity: Severity; /** Block in body.json; -1 for the whole case. */ index: number; message: string };

/** Every check, with the line content/case-components.md uses for it. */
export const CHECKS = {
  "secao-abertura": "O corpo começa com um marcador de seção (depois de um divisor, no máximo).",
  "secao-quantidade": "De 4 a 7 seções.",
  "secao-rotulo": "Rótulo de seção curto: até 24 caracteres e 3 palavras.",
  "secao-curta": "Cada seção tem pelo menos 2 blocos de conteúdo.",
  "secao-longa": "Nenhuma seção passa de 9 blocos de conteúdo.",
  "agradecimentos": "Agradecimentos aparecem uma vez e por último.",
  "denso-seguido": "Nunca 3 blocos densos seguidos.",
  "texto-seguido": "Dois blocos guiados por parágrafo (título + caixa, título lateral, seção clara) não ficam colados.",
  "frase-seguida": "Duas frases grandes (frase centralizada, capítulo, número gigante) não ficam coladas; a exceção é frase → número.",
  "frase-sem-prova": "Toda frase centralizada é seguida, na mesma seção, pelo bloco que a prova.",
  "componente-repetido": "O mesmo componente não aparece 3 vezes seguidas.",
  "imagens-seguidas": "No máximo 3 imagens soltas seguidas; com mais, use galeria, sobreposição ou bento.",
  "divisor-duplo": "Dois divisores nunca ficam colados.",
  "divisor-solto": "O divisor de tela inteira fica colado num marcador de seção (ou antes dos agradecimentos).",
  "divisor-faltando": "Se o case separa seções com divisor de tela inteira, todas as seções têm o seu.",
  "espaco": "Espaço vazio (parágrafo em branco) no máximo um por vez e nunca no fim; prefira o espaçamento do componente.",
  "texto-longo": "Cada campo de texto respeita o limite do componente.",
  "contagem": "Listas com a quantidade de itens que o componente comporta.",
  "repeticao": "Componentes com limite por case (número gigante, capítulo…) não passam dele.",
  "componente-desconhecido": "Só componentes que existem no site.",
  "componente-invalido": "O componente precisa renderizar com os campos que tem.",
  "bloco-cru": "Nada de bloco avançado (JSON cru) num rascunho.",
  "placeholder": "Nenhum texto padrão do admin (\"Texto.\", \"Título\", \"Série 1\"…).",
  "atribuicao": "Depoimento sempre com atribuição.",
  "numero-sem-numero": "Número gigante tem número.",
  "alt": "Imagem dentro de componente tem descrição.",
  "imagem-formato": "A proporção da imagem combina com o espaço (nada de imagem vertical em espaço largo).",
  "imagem-tipo": "Componentes de telas recebem telas (pela legenda da imagem), não foto, logo ou diagrama.",
  "imagem-par": "Antes e depois em imagens: as duas com a mesma proporção.",
  "hero": "Capa (hero) coerente com a imagem que ela tem.",
} as const;
export type CheckId = keyof typeof CHECKS;

const finding = (check: CheckId, severity: Severity, index: number, message: string): Finding => ({ check, severity, index, message });
const labelOf = (type: string) => COMPONENT_BY_NAME.get(type)?.label ?? type;

/** Content items in order, without structure and notes. */
const content = (items: CaseItem[]) => items.filter(i => !STRUCTURAL.has(i.type) && !isNote(i));

type Section = { marker: CaseItem | null; items: CaseItem[] };
function sections(items: CaseItem[]): Section[] {
  const out: Section[] = [];
  let current: Section = { marker: null, items: [] };
  for (const item of items) {
    if (item.type === "section") {
      if (current.marker || current.items.some(i => !STRUCTURAL.has(i.type))) out.push(current);
      current = { marker: item, items: [] };
    } else current.items.push(item);
  }
  out.push(current);
  return out.filter(s => s.marker || s.items.some(i => !STRUCTURAL.has(i.type)));
}

/* ---------- Structure ---------- */

export function checkSections(items: CaseItem[]): Finding[] {
  const out: Finding[] = [];
  const first = items.find(i => i.type !== "divider" && i.type !== "spacer");
  if (first && first.type !== "section") out.push(finding("secao-abertura", "erro", first.index, "O case precisa começar por um marcador de seção; sem ele, o menu lateral não tem o primeiro capítulo."));
  const list = sections(items).filter(s => s.marker);
  if (list.length && (list.length < 4 || list.length > 7)) out.push(finding("secao-quantidade", "aviso", -1, `${list.length} seções; os cases publicados têm de 5 a 6.`));
  list.forEach((s, i) => {
    const label = (s.marker!.model as Extract<BlockModel, { kind: "section" }>).label;
    if (len(label) > 24 || label.split(/\s+/).length > 3) out.push(finding("secao-rotulo", "aviso", s.marker!.index, `Rótulo "${label}" longo para o menu lateral.`));
    const n = content(s.items).length;
    // The last section may be a single closing block.
    if (n < (i === list.length - 1 ? 1 : 2)) out.push(finding("secao-curta", "aviso", s.marker!.index, `A seção "${label}" tem ${n} bloco de conteúdo.`));
    if (n > 9) out.push(finding("secao-longa", "aviso", s.marker!.index, `A seção "${label}" tem ${n} blocos; divida em duas ou junte imagens num componente.`));
  });
  return out;
}

/** Thanks close the page when there are any. Everything else about the ending is the case's call. */
export function checkThanks(items: CaseItem[]): Finding[] {
  const out: Finding[] = [];
  const all = content(items);
  const thanks = all.filter(i => i.type === "CaseThanksCards");
  if (thanks.length > 1) out.push(finding("agradecimentos", "aviso", thanks[1]!.index, "Agradecimentos repetidos."));
  if (thanks.length && all[all.length - 1] !== thanks[thanks.length - 1]) out.push(finding("agradecimentos", "aviso", thanks[0]!.index, "Os agradecimentos devem ser o último bloco."));
  return out;
}

/* ---------- Rhythm ---------- */

export function checkRhythm(items: CaseItem[]): Finding[] {
  const out: Finding[] = [];
  // Dividers break a run; section markers and spacers do not (they are invisible).
  const runs: CaseItem[][] = [[]];
  for (const item of items) {
    if (item.type === "divider") runs.push([]);
    else if (!STRUCTURAL.has(item.type) && !isNote(item)) runs[runs.length - 1]!.push(item);
  }
  for (const run of runs) {
    let dense = 0;
    run.forEach((item, i) => {
      const prev = run[i - 1];
      dense = weightOf(item) === "denso" ? dense + 1 : 0;
      if (dense === 3) out.push(finding("denso-seguido", "aviso", item.index, "Terceiro bloco denso seguido: ponha uma frase, um número ou uma imagem no meio."));
      if (prev && isTextLed(prev) && isTextLed(item)) out.push(finding("texto-seguido", "aviso", item.index, `${labelOf(prev.type)} seguido de ${labelOf(item.type)}: dois blocos de leitura colados.`));
      if (prev && HEADLINES.has(prev.type) && HEADLINES.has(item.type) && !(prev.type === "CaseStatement" && item.type === "CaseBigNumber"))
        out.push(finding("frase-seguida", "aviso", item.index, `${labelOf(prev.type)} seguido de ${labelOf(item.type)}: duas frases grandes sem nada entre elas.`));
      if (item.type !== "image" && prev?.type === item.type && run[i - 2]?.type === item.type)
        out.push(finding("componente-repetido", "aviso", item.index, `${labelOf(item.type)} três vezes seguidas.`));
      if (item.type === "image" && [1, 2, 3].every(k => run[i - k]?.type === "image") && run[i - 4]?.type !== "image")
        out.push(finding("imagens-seguidas", "aviso", item.index, "Quatro imagens soltas seguidas: junte em galeria de telas, imagens sobrepostas ou bento."));
    });
  }
  // A statement opens what comes next: within its section, the next content block proves it.
  for (const s of sections(items)) {
    const list = s.items.filter(i => i.type !== "spacer" && !isNote(i));
    list.forEach((item, i) => {
      if (item.type !== "CaseStatement") return;
      let next = list[i + 1];
      if (next?.type === "CaseBigNumber") next = list[i + 2];
      if (!next || next.type === "divider" || HEADLINES.has(next.type))
        out.push(finding("frase-sem-prova", "aviso", item.index, "Frase centralizada sem o bloco que a prova logo depois (imagem, painel, fluxo, números)."));
    });
  }
  return out;
}

function isTextLed(item: CaseItem) {
  return TEXT_LED.has(item.type) || (item.model.kind === "text" && weightOf(item) === "denso");
}

export function checkDividers(items: CaseItem[]): Finding[] {
  const out: Finding[] = [];
  const visible = items.filter(i => i.type !== "spacer");
  const isBleed = (i?: CaseItem) => i?.model.kind === "divider" && i.model.size === "bleed";
  visible.forEach((item, i) => {
    if (item.type !== "divider") return;
    const prev = visible[i - 1], next = visible[i + 1];
    if (prev?.type === "divider" || (next?.type === "section" && visible[i + 2]?.type === "divider") || (prev?.type === "section" && visible[i - 2]?.type === "divider"))
      out.push(finding("divisor-duplo", "aviso", item.index, "Dois divisores colados."));
    if (!next) out.push(finding("divisor-solto", "aviso", item.index, "Divisor no fim do case."));
    else if (isBleed(item) && prev?.type !== "section" && next.type !== "section" && next.type !== "CaseThanksCards")
      out.push(finding("divisor-solto", "aviso", item.index, "Divisor de tela inteira no meio de uma seção; ele marca troca de capítulo."));
  });
  // In a case that uses full-width dividers between chapters, every chapter gets one.
  const list = sections(items).filter(s => s.marker);
  const hasBleed = (s: Section) => {
    const at = visible.indexOf(s.marker!);
    return isBleed(visible[at - 1]) || isBleed(visible[at + 1]);
  };
  const withBleed = list.filter(hasBleed);
  if (withBleed.length >= 2) for (const s of list) if (!hasBleed(s)) {
    out.push(finding("divisor-faltando", "aviso", s.marker!.index, `A seção "${(s.marker!.model as Extract<BlockModel, { kind: "section" }>).label}" não tem o divisor de tela inteira que as outras têm.`));
  }
  return out;
}

export function checkSpacers(items: CaseItem[]): Finding[] {
  const out: Finding[] = [];
  const tail = items.length - 1 - [...items].reverse().findIndex(i => i.type !== "spacer");
  items.forEach((item, i) => {
    if (item.type !== "spacer" || i > tail) return;
    if (items[i - 1]?.type === "spacer" && items[i - 2]?.type !== "spacer") out.push(finding("espaco", "aviso", item.index, "Espaços vazios em sequência; use o espaçamento acima/abaixo do componente."));
  });
  if (tail < items.length - 1) out.push(finding("espaco", "aviso", items[tail + 1]!.index, "Espaço vazio no fim do case."));
  return out;
}

/* ---------- Content ---------- */

export function checkLimits(items: CaseItem[]): Finding[] {
  const out: Finding[] = [];
  const seen = new Map<string, number>();
  for (const item of items) {
    const rule = RULES[item.type];
    if (!rule) continue;
    seen.set(item.type, (seen.get(item.type) ?? 0) + 1);
    if (rule.maxPerCase && seen.get(item.type) === rule.maxPerCase + 1)
      out.push(finding("repeticao", "aviso", item.index, `${labelOf(item.type)}: no máximo ${rule.maxPerCase} por case.`));
    for (const [field, max] of Object.entries(rule.limits)) {
      for (const value of valuesAt(item.props, field)) {
        const n = len(value);
        if (n > max) out.push(finding("texto-longo", n > max * 1.5 ? "erro" : "aviso", item.index, `${labelOf(item.type)} · ${field}: ${n} caracteres (limite ${max}).`));
      }
    }
    const count = countRange(item);
    if (count) {
      const list = item.props[count.field];
      const n = Array.isArray(list) ? list.length : 0;
      if (n < count.min || n > count.max) out.push(finding("contagem", n === 0 ? "erro" : "aviso", item.index, `${labelOf(item.type)} · ${count.field}: ${n} (comporta de ${count.min} a ${count.max}).`));
    }
  }
  return out;
}

/** The list range of an item; the image stack's depends on its layout. */
function countRange(item: CaseItem) {
  const rule = RULES[item.type];
  if (item.type === "CaseImageStack") {
    const layout = (STACK_LAYOUTS as readonly string[]).includes(item.props.layout as string) ? item.props.layout as StackLayout : "cascade";
    return { field: "items", ...LAYOUT_RANGE[layout] };
  }
  return rule?.count;
}

export function checkContent(items: CaseItem[]): Finding[] {
  const out: Finding[] = [];
  for (const item of items) {
    const { model } = item;
    if (model.kind === "raw") { out.push(finding("bloco-cru", "aviso", item.index, "Bloco avançado (JSON cru) no corpo.")); continue; }
    if (model.kind === "component") {
      if (!COMPONENT_BY_NAME.has(model.name)) { out.push(finding("componente-desconhecido", "erro", item.index, `"${model.name}" não é um componente do site.`)); continue; }
      if (!componentRenders(model)) out.push(finding("componente-invalido", "erro", item.index, `${labelOf(model.name)} não renderiza com estes campos.`));
    }
    for (const value of strings(item.props)) {
      if (PLACEHOLDERS.has(value.trim())) { out.push(finding("placeholder", "erro", item.index, `Texto padrão do admin esquecido: "${value.trim()}".`)); break; }
    }
    if (item.type === "CaseResultsQuote" && !String(item.props.attribution ?? "").trim()) out.push(finding("atribuicao", "erro", item.index, "Depoimento sem atribuição."));
    if (item.type === "CaseBigNumber" && !/\d/.test(String(item.props.value ?? ""))) out.push(finding("numero-sem-numero", "aviso", item.index, `Número gigante sem número: "${item.props.value ?? ""}".`));
    for (const missing of imagesWithoutAlt(item)) out.push(finding("alt", "aviso", item.index, `${labelOf(item.type)}: imagem sem descrição (${path.basename(missing)}).`));
  }
  return out;
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => (k === "src" || k === "id" || k === "poster" ? [] : strings(v)));
  return [];
}

function imagesWithoutAlt(item: CaseItem): string[] {
  const p = item.props;
  const list = (key: string) => (Array.isArray(p[key]) ? p[key] as Record<string, unknown>[] : []);
  const missing = (o: Record<string, unknown>) => typeof o.src === "string" && o.src.trim() && !String(o.alt ?? "").trim();
  switch (item.type) {
    case "CaseBento": return list("tiles").filter(t => t.kind === "image" && missing(t)).map(t => t.src as string);
    case "CaseImageStack": return list("items").filter(missing).map(t => t.src as string);
    case "CaseScreens": return list("screens").filter(t => missing(t) && !String(t.label ?? "").trim()).map(t => t.src as string);
    case "CaseLightPanel": case "CaseMediaFigure": case "CaseMediaFullWidth": case "CaseSectionMedia":
      return missing(p) ? [p.src as string] : [];
    default: return [];
  }
}

/* ---------- Images ---------- */

export type ImageSize = { width: number; height: number };
/** Image sizes by `src`; sources missing from the map are not checked. */
export type ImageSizes = Record<string, ImageSize>;
/** What each image shows, by `src`, from the captions (lib/media/captions.ts: `captionsFor`). */
export type ImageKinds = Record<string, CaptionKind>;
const SCREEN_KINDS = new Set<CaptionKind>(["tela-app", "tela-web"]);
/** Before and after may also compare a composed set of screens (Creator Ads' home). */
const COMPARE_KINDS = new Set<CaptionKind>(["tela-app", "tela-web", "varias-telas", "antes-depois"]);

/** Shape bands, by width ÷ height: phones and long pages are "alta"; banners are "faixa". */
export const SHAPE_BANDS: [ImageShape, number][] = [["alta", 0.6], ["retrato", 0.9], ["quadrada", 1.15], ["paisagem", 1.6], ["larga", 2.4], ["faixa", Infinity]];
export function imageShape({ width, height }: ImageSize): ImageShape {
  const r = width / height;
  return SHAPE_BANDS.find(([, max]) => r < max)![0];
}
const ratio = (s: ImageSize) => s.width / s.height;

/** Shapes each width of a single image block takes without turning into a tower or a sliver. */
export const IMAGE_SLOT_SHAPES: Record<string, { fits: ImageShape[]; tolerated: ImageShape[] }> = {
  content: { fits: ["paisagem", "larga", "faixa"], tolerated: ["quadrada"] },
  bleed: { fits: ["larga", "faixa"], tolerated: ["paisagem"] },
  w75: { fits: ["quadrada", "paisagem", "larga", "faixa"], tolerated: ["retrato"] },
  w50: { fits: ["retrato", "quadrada", "paisagem", "larga", "faixa"], tolerated: ["alta"] },
};
/** Bento tiles crop to their frame: about 1:2, 2:1 or square. */
const BENTO_RATIO: Record<string, [number, number]> = { "1x1": [0.7, 1.6], "2x2": [0.7, 1.6], "1x2": [0.25, 0.8], "2x1": [1.2, 3] };

export function checkImages(items: CaseItem[], sizes: ImageSizes): Finding[] {
  const out: Finding[] = [];
  const size = (src: unknown) => (typeof src === "string" ? sizes[src] : undefined);
  const bad = (item: CaseItem, severity: Severity, message: string) => out.push(finding("imagem-formato", severity, item.index, message));
  for (const item of items) {
    const p = item.props;
    if (item.model.kind === "image") {
      const s = size(item.model.src);
      const slot = IMAGE_SLOT_SHAPES[item.model.size || "content"];
      if (s && slot) {
        const shape = imageShape(s);
        if (!slot.fits.includes(shape)) {
          const where = item.model.size === "bleed" ? "na largura da tela" : item.model.size ? `em ${item.model.size}` : "na largura do conteúdo";
          bad(item, slot.tolerated.includes(shape) ? "aviso" : "erro", `Imagem ${shape} (${s.width}×${s.height}) ${where}; ${shape === "alta" || shape === "retrato" ? "use 50% da tela, galeria de telas ou bento" : "escolha uma largura menor"}.`);
        }
      }
    } else if (item.model.kind === "images") {
      const ratios = item.model.images.map(i => size(i.src)).filter((s): s is ImageSize => !!s).map(ratio);
      if (ratios.length > 1 && Math.max(...ratios) / Math.min(...ratios) > 1.25) bad(item, "aviso", "Imagens lado a lado com proporções diferentes: as alturas não batem.");
    } else if (item.type === "CaseChapter" || item.type === "CaseLightPanel" || item.type === "CaseMediaFigure" || item.type === "CaseMediaFullWidth" || item.type === "CaseSectionMedia") {
      const s = size(p.src);
      if (s) {
        const shape = imageShape(s);
        const vertical = shape === "alta" || shape === "retrato";
        if (item.type === "CaseLightPanel" ? shape === "alta" : vertical) bad(item, "erro", `${labelOf(item.type)} com imagem ${shape} (${s.width}×${s.height}): o espaço é largo.`);
        else if (item.type === "CaseLightPanel" && shape === "retrato") bad(item, "aviso", `Seção clara com imagem em retrato (${s.width}×${s.height}): fica muito alta.`);
        else if (item.type === "CaseMediaFullWidth" && shape !== "larga" && shape !== "faixa") bad(item, "aviso", `Imagem larga com imagem ${shape}.`);
      }
    } else if (item.type === "CaseBento") {
      for (const tile of (Array.isArray(p.tiles) ? p.tiles : []) as Record<string, unknown>[]) {
        const s = tile.kind === "image" ? size(tile.src) : undefined;
        const range = BENTO_RATIO[String(tile.size ?? "1x1")];
        if (s && range && (ratio(s) < range[0] || ratio(s) > range[1])) bad(item, "aviso", `Bento: bloco ${tile.size ?? "1x1"} com imagem ${imageShape(s)} (${s.width}×${s.height}); ela vai ser muito cortada.`);
      }
    } else if (item.type === "CaseImageStack") {
      const chosen = (STACK_RATIOS as readonly string[]).includes(p.ratio as string) ? p.ratio as StackRatio : undefined;
      if (chosen) {
        const frame = RATIO_VALUE[chosen];
        for (const it of (Array.isArray(p.items) ? p.items : []) as Record<string, unknown>[]) {
          const s = size(it.src);
          if (!s) continue;
          if ((frame >= 1.3 && ratio(s) < 0.9) || (frame <= 0.75 && ratio(s) > 1.3)) bad(item, "aviso", `Imagens sobrepostas: quadro ${chosen} com imagem ${imageShape(s)} (${s.width}×${s.height}).`);
        }
      }
    } else if (item.type === "CaseScreens") {
      if (p.frame !== "none") for (const sc of (Array.isArray(p.screens) ? p.screens : []) as Record<string, unknown>[]) {
        const s = size(sc.src);
        if (s && ratio(s) > 0.9) bad(item, "aviso", `Galeria com moldura de celular e imagem ${imageShape(s)} (${s.width}×${s.height}); use "sem moldura" para telas de computador.`);
      }
    } else if (item.type === "CaseImageCompare") {
      const before = size((p.before as Record<string, unknown> | undefined)?.src), after = size((p.after as Record<string, unknown> | undefined)?.src);
      if (before && after && Math.abs(ratio(before) / ratio(after) - 1) > 0.02)
        out.push(finding("imagem-par", "erro", item.index, `Antes ${before.width}×${before.height} e depois ${after.width}×${after.height}: o depois é cortado no quadro do antes.`));
    }
  }
  return out;
}

/** Components made for screens get screens; photos, logos and diagrams have their own places. */
export function checkImageKinds(items: CaseItem[], kinds: ImageKinds): Finding[] {
  const out: Finding[] = [];
  const name = (kind: CaptionKind) => kind.replace("-", " ");
  for (const item of items) {
    const p = item.props;
    const list = (key: string) => (Array.isArray(p[key]) ? p[key] as Record<string, unknown>[] : []);
    const srcs = item.type === "CaseImageStack" ? list("items").map(i => i.src)
      : item.type === "CaseScreens" ? list("screens").map(i => i.src)
      : item.type === "CaseImageCompare" ? [(p.before as Record<string, unknown> | undefined)?.src, (p.after as Record<string, unknown> | undefined)?.src]
      : [];
    const allowed = item.type === "CaseImageCompare" ? COMPARE_KINDS : SCREEN_KINDS;
    for (const src of srcs) {
      const kind = typeof src === "string" ? kinds[src] : undefined;
      if (kind && !allowed.has(kind)) out.push(finding("imagem-tipo", "aviso", item.index, `${labelOf(item.type)} com ${name(kind)} (${path.basename(src as string)}); ele é feito para telas.`));
    }
    if (item.type === "CaseImageStack") {
      const ratio = p.ratio as string | undefined;
      const kindsHere = list("items").map(i => (typeof i.src === "string" ? kinds[i.src] : undefined));
      // Portrait suits a long web page cropped from its focus point (Webmotors' catalogue), so only the phone frame is wrong for the web.
      if (ratio === "phone" && kindsHere.includes("tela-web")) out.push(finding("imagem-tipo", "aviso", item.index, "Imagens sobrepostas: tela web num quadro de celular; use paisagem, clássica ou retrato."));
      if (ratio === "wide" && kindsHere.includes("tela-app")) out.push(finding("imagem-tipo", "aviso", item.index, "Imagens sobrepostas: tela de app num quadro de computador; use celular ou retrato."));
    }
  }
  return out;
}

/** Every image path a body uses, for `loadImageSizes`. */
export function imageSources(items: CaseItem[]): string[] {
  const out = new Set<string>();
  const walk = (value: unknown, key = "") => {
    if (typeof value === "string") { if (key === "src" || key === "poster") out.add(value); }
    else if (Array.isArray(value)) value.forEach(v => walk(v, key));
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k);
  };
  for (const item of items) {
    if (item.model.kind === "image") out.add(item.model.src);
    else if (item.model.kind === "images") item.model.images.forEach(i => out.add(i.src));
    else walk(item.props);
  }
  return [...out].filter(src => /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(src));
}

/** Reads the size of each image under public/ (the only part of this module that touches disk). */
export async function loadImageSizes(srcs: string[], publicDir = path.join(process.cwd(), "public")): Promise<{ sizes: ImageSizes; missing: string[] }> {
  const { default: sharp } = await import("sharp");
  const sizes: ImageSizes = {};
  const missing: string[] = [];
  for (const src of srcs) {
    if (!src.startsWith("/")) continue;
    // a private Material picture (lib/admin/materialMedia.ts) lives in .admin/, not under public/
    const file = src.startsWith(MATERIAL_MEDIA_PREFIX) ? mediaFilePath(src) ?? "" : path.join(publicDir, src);
    if (!fs.existsSync(file)) { missing.push(src); continue; }
    try {
      const meta = await sharp(file, { animated: false }).metadata();
      if (meta.width && meta.height) sizes[src] = { width: meta.width, height: meta.height };
    } catch { /* not an image sharp reads: left unchecked */ }
  }
  return { sizes, missing };
}

/* ---------- Hero ---------- */

/** The case.json fields the hero uses. */
export type HeroFields = { heroVariant?: string; heroImage?: string; heroFullBleedVideoUrl?: string; heroMegaWord?: string; company?: string; title?: string; summary?: string; heroFullBleedTagline?: string };

export function checkHero(c: HeroFields, cover?: ImageSize): Finding[] {
  const out: Finding[] = [];
  const hero = (severity: Severity, message: string) => out.push(finding("hero", severity, -1, message));
  const full = c.heroVariant === "fullBleed";
  if (full && !c.heroImage?.trim() && !c.heroFullBleedVideoUrl?.trim()) hero("erro", "Capa em tela cheia sem imagem nem vídeo: o site volta para a editorial.");
  if (full && cover && !c.heroFullBleedVideoUrl?.trim()) {
    const shape = imageShape(cover);
    if (shape !== "larga") hero("aviso", `Capa em tela cheia com imagem ${shape} (${cover.width}×${cover.height}); ela pede uma imagem larga (de 1,6 a 2,4).`);
    if (cover.width < 1600) hero("aviso", `Capa em tela cheia com ${cover.width}px de largura; abaixo de 1600px ela fica borrada.`);
  }
  if (!full && len(c.heroMegaWord ?? c.company ?? "") > 12) hero("aviso", "Palavra gigante da capa editorial com mais de 12 letras: escolha uma forma curta.");
  if (c.title && len(c.title) > 60) hero("aviso", `Título com ${len(c.title)} caracteres (limite 60).`);
  const tagline = c.heroFullBleedTagline?.trim() || c.summary?.trim() || "";
  if (len(tagline) > 280) hero("aviso", `Resumo da capa com ${len(tagline)} caracteres (limite 280).`);
  return out;
}

/* ---------- All together ---------- */

export function checkCase(blocks: NotionBlockNode[], options: { sizes?: ImageSizes; kinds?: ImageKinds } = {}): Finding[] {
  const items = readCaseBody(blocks);
  return [
    ...checkSections(items), ...checkThanks(items), ...checkRhythm(items), ...checkDividers(items),
    ...checkSpacers(items), ...checkLimits(items), ...checkContent(items),
    ...(options.sizes ? checkImages(items, options.sizes) : []), ...(options.kinds ? checkImageKinds(items, options.kinds) : []),
  ].sort((a, b) => a.index - b.index || (a.severity === b.severity ? 0 : a.severity === "erro" ? -1 : 1));
}

/* ---------- The guide, for prompts ---------- */

function marked(markdown: string, name: string): string {
  const match = markdown.match(new RegExp(`<!-- case-components:${name} -->([\\s\\S]*?)<!-- /case-components:${name} -->`));
  if (!match) throw new Error(`content/case-components.md: falta a seção <!-- case-components:${name} -->.`);
  return match[1]!.trim();
}

/** Each `### \`Name\`` section of the guide, keyed by name. */
export function parseComponentNotes(markdown: string): Record<string, string> {
  const block = marked(markdown, "componentes");
  const out: Record<string, string> = {};
  for (const part of block.split(/^(?=### `)/m)) {
    const name = part.match(/^### `(\w+)`/)?.[1];
    if (name) out[name] = part.trim();
  }
  return out;
}

let cached: { mtimeMs: number; markdown: string } | undefined;
function guide(): string {
  const { mtimeMs } = fs.statSync(CASE_COMPONENTS_FILE);
  if (!cached || cached.mtimeMs !== mtimeMs) cached = { mtimeMs, markdown: fs.readFileSync(CASE_COMPONENTS_FILE, "utf8") };
  return cached.markdown;
}

export function componentNotes(): Record<string, string> {
  return parseComponentNotes(guide());
}

/** The block a generator prompt includes: rhythm, structure and the notes of the components it may use. */
export function caseComponentsPrompt(): string {
  const md = guide();
  const notes = parseComponentNotes(md);
  const usable = Object.entries(notes).filter(([name]) => RULES[name] && RULES[name]!.generator !== "evitar")
    .map(([, note]) => note.split("\n").filter(line => !line.startsWith("- **Visto em:**")).join("\n"));
  return [
    "Componentes do case (use só estes; os limites são em caracteres):", ...usable,
    marked(md, "ritmo"), marked(md, "estrutura"),
  ].join("\n\n");
}

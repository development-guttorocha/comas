import fs from "node:fs";
import path from "node:path";
import { listMedia, readCaseFiles } from "@/lib/admin/caseStore";
import { createBlock, type BlockModel } from "@/lib/admin/caseBlocks";
import { CHECKS, RULES, REFERENCE_CASES, checkCase, checkRhythm, checkSections, checkThanks, componentNotes, imageShape, readCaseBody, type CaseItem, type Finding, type ImageKinds, type ImageSizes } from "@/lib/ai/caseComponents";
import { voicePrompt } from "@/lib/ai/voice";
import { isEmptyMaterial, materialQuotes, materialToMarkdown, parseMaterial, type CaseMaterial } from "@/lib/caseMaterial";
import { getCaseMaterial } from "@/lib/admin/materialStore";
import { captionsFor, getCaption } from "@/lib/media/captions";
import { mediaFilePath } from "@/lib/admin/materialMedia";
import type { CaptionKind } from "@/lib/media/captionKinds";
import { askJson, deepSeekConfig, type DeepSeekConfig } from "@/lib/reel/deepseek";
import { blocksToMarkdown } from "@/lib/siteMarkdown";
import { SITE_URL } from "@/lib/seo";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import type { Case } from "@/lib/cases";
import { contractOf, readDraftBlock, type DraftBlock, type Dropped } from "./contract";
import { draftSource, enforceSource, type DraftSource } from "./fidelity";
import { DATA_FIELDS, emptyDataKeys, readCaseData, type DraftCaseData } from "./caseData";
import { DRAFT_VOCABULARY, parsePlan, planToText, type CasePlan, type DraftKind } from "./plan";

// Drafts a case body with DeepSeek, in the reel generator's pattern: a closed vocabulary (the
// components of lib/ai/caseComponents.ts that are not "evitar"), the rules in the prompt, a filter
// that drops what cannot be trusted, and a second pass that reviews against a checklist. Three steps:
// 1. proposePlan: the skeleton (sections, component per block, images, why). Cheap; Gutto edits it.
// 2. writeDraft: each section filled in parallel, with the schema as contract and the voice guide.
// 3. the filter (schema, images, numbers, quotes), checkCase, and one review pass when it finds problems.
// Nothing is saved here: the editor shows the draft and Salvar keeps it.

/* ---------- What the generator reads ---------- */

export type DraftImage = { src: string; width: number; height: number; kind?: CaptionKind; description?: string };

export type DraftContext = {
  slug: string;
  company: string;
  /** The case.json as saved: the data step fills only what is empty there. */
  current: Case;
  brandColor?: string;
  /** "material" when the Material tab has content; otherwise the case's current text. */
  from: "material" | "case";
  source: DraftSource;
  images: DraftImage[];
  allowed: Set<string>;
  sizes: ImageSizes;
  kinds: ImageKinds;
};

/** The case's images with their captions: the files used in the body first, mobile copies and video covers left out. */
async function caseImages(slug: string, bodyText: string): Promise<DraftImage[]> {
  const captions = await captionsFor("cases", slug);
  const used = (url: string) => { const i = bodyText.indexOf(url); return i < 0 ? Infinity : i; };
  const files = (await listMedia(slug)).filter(f => /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(f.name) && !/-(capa|mobile)\.|^ca-r3-/.test(f.name));
  const list = await Promise.all(files.map(async (f): Promise<DraftImage | null> => {
    const c = captions[f.url] ?? (f.private ? await getCaption(f.url) : null);
    if (c) return c.kind === "logo" ? null : { src: f.url, width: c.width, height: c.height, kind: c.kind, description: c.description };
    try {
      const { default: sharp } = await import("sharp");
      const file = mediaFilePath(f.url);
      if (!file) return null;
      const meta = await sharp(file).metadata();
      return meta.width && meta.height && (meta.width >= 400 || meta.height >= 400) ? { src: f.url, width: meta.width, height: meta.height } : null;
    } catch { return null; }
  }));
  return list.filter((i): i is DraftImage => !!i).sort((a, b) => used(a.src) - used(b.src)).slice(0, 60);
}

/**
 * Everything one generation needs. `material` is what the editor holds (saved or not); without it the
 * saved material is read; when it is empty, the case's current text is the source.
 */
export async function loadDraftContext(slug: string, material?: CaseMaterial): Promise<DraftContext> {
  const files = await readCaseFiles(slug);
  if (!files) throw new Error("Case não encontrado.");
  const c = files.case;
  const m = material ? parseMaterial(material) : (await getCaseMaterial(slug)) ?? {};
  const bodyText = JSON.stringify(files.body);
  const images = await caseImages(slug, bodyText);
  const meta = `Empresa: ${c.company} · Período: ${c.year} · Papel do Gutto: ${c.role}${c.productTag ? ` · Tema: ${c.productTag}` : ""}`;
  let source: DraftSource;
  let from: DraftContext["from"];
  if (!isEmptyMaterial(m)) {
    from = "material";
    source = draftSource(`${meta}\n\n${materialToMarkdown(m)}`, materialQuotes(m).map(q => q.text));
  } else {
    from = "case";
    const text = [`# ${c.title}`, c.summary, meta, blocksToMarkdown(files.body)].filter(Boolean).join("\n\n").replaceAll(SITE_URL, "").slice(0, 40000);
    source = draftSource(text, null);
  }
  return {
    slug, company: c.company, current: c, brandColor: c.brandColor, from, source, images,
    allowed: new Set(images.map(i => i.src)),
    sizes: Object.fromEntries(images.map(i => [i.src, { width: i.width, height: i.height }])),
    kinds: Object.fromEntries(images.filter(i => i.kind).map(i => [i.src, i.kind!])),
  };
}

function imageList(ctx: DraftContext) {
  return ctx.images.map(i => `- ${i.src} · ${i.kind ?? "sem legenda"} · ${imageShape(i)} ${i.width}×${i.height}${i.description ? ` · ${i.description}` : ""}`).join("\n");
}

function sourceBlock(ctx: DraftContext) {
  const what = ctx.from === "material"
    ? "Material do case (a matéria-prima que o Gutto registrou; é a única fonte de fatos)"
    : "Texto atual do case (não há material registrado; este texto é a única fonte de fatos)";
  return `${what}:\n\n${ctx.source.text}\n\nImagens do case (caminho · o que é · formato e tamanho · o que mostra):\n${imageList(ctx)}`;
}

/* ---------- The guide, cut for each prompt ---------- */

const GUIDE = path.join(process.cwd(), "content", "case-components.md");
function guidePart(name: string) {
  const md = fs.readFileSync(GUIDE, "utf8");
  return md.match(new RegExp(`<!-- case-components:${name} -->([\\s\\S]*?)<!-- /case-components:${name} -->`))?.[1]?.trim() ?? "";
}

/** One short entry per component: weight and use, when to use, which image. For the cheap plan call. */
function catalog() {
  const notes = componentNotes();
  return DRAFT_VOCABULARY.map(name => {
    const note = notes[name] ?? "";
    const head = note.split("\n")[0]?.replace(/^### /, "") ?? name;
    const meta = note.match(/\*\*Peso:\*\* (.*)/)?.[1] ?? "";
    const line = (label: string, max: number) => {
      const t = note.match(new RegExp(`- \\*\\*${label}:\\*\\* (.*)`))?.[1]?.trim();
      return t ? `  ${label}: ${t.length > max ? `${t.slice(0, max).replace(/\s+\S*$/, "")}…` : t}` : "";
    };
    return [`- ${head} · ${meta.replace(/\*\*/g, "")}`, line("Quando usar", 280), line("Imagem", 200), line("Itens", 120)].filter(Boolean).join("\n");
  }).join("\n");
}

/** The published reference as a skeleton: "[O começo] CaseTitleBox → CaseIconStats". Not the case being drafted. */
function skeleton(slug: string, except: string) {
  if (slug === except) return "";
  try {
    const items = readCaseBody(JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "cases", slug, "body.json"), "utf8")) as NotionBlockNode[]);
    const parts: string[] = [];
    for (const item of items) {
      if (item.type === "section") parts.push(`\n[${(item.model as Extract<BlockModel, { kind: "section" }>).label}]`);
      else if (item.type !== "divider" && item.type !== "spacer") parts.push(item.type);
    }
    return parts.join(" ").replace(/\] /g, "] ").trim();
  } catch { return ""; }
}

/* ---------- Rules every prompt repeats ---------- */

const FIDELITY = `Regras de fidelidade (o código confere e corta o que falhar):
- Use SOMENTE fatos, nomes e números que estão na fonte. Nunca invente, calcule (variação, soma, média) nem arredonde número ("quase 10 anos" continua "quase 10 anos").
- Todo número em algarismos, escrito como na fonte, com o que ele mede. Um número que não está na fonte é cortado junto com a frase, o item ou o bloco.
- Depoimento (CaseResultsQuote, citação no bento) só com a fala literal que está na fonte, palavra por palavra; pode cortar no fim de uma frase, nunca reescrever. Sem fala literal, não há depoimento.
- Imagens só da lista, pelo caminho exato. Telas (tela-app, tela-web) vão em galeria, imagens sobrepostas e antes e depois; diagramas, fotos e várias-telas vão soltas, no bento ou na seção clara.
- Atribuição: o Gutto só "fez" o que a fonte diz que ele fez; o que foi do time aparece como do time.`;

/* ---------- 1. The plan ---------- */

function planPrompt(ctx: DraftContext) {
  const picpay = skeleton(REFERENCE_CASES.historia.slug, ctx.slug);
  const plenno = skeleton(REFERENCE_CASES.produto.slug, ctx.slug);
  return `Você é o editor de portfólio do designer Gutto Rocha. Planeje a página de um case dele: a sequência de seções e, em cada uma, os blocos (um componente por bloco), na ordem em que o leitor vê. Ainda não escreva o texto: diga a ideia de cada bloco e por que aquele componente.

Primeiro escolha o modelo pelo que o case é: "historia" (liderança, estratégia, time e negócio; modelo PicPay) ou "produto" (só produto e design; modelo Plenno).

${guidePart("ritmo")}

${guidePart("estrutura")}
${picpay ? `\nO PicPay publicado, como esqueleto:\n${picpay}\n` : ""}${plenno ? `\nO Plenno publicado, como esqueleto:\n${plenno}\n` : ""}
Componentes que você pode usar (nome · peso · uso no gerador; "raro" só quando o material pede claramente):
${catalog()}

${FIDELITY}

Regras do plano:
- De 4 a 7 seções, cada uma com 2 a 6 blocos (a última pode ter 1). Rótulo de seção com até 24 caracteres e 3 palavras, como no menu lateral ("O começo", "Diagnóstico", "Resultados").
- Uma ideia por bloco, tirada da fonte. Não planeje bloco que a fonte não sustenta (sem número, nada de número gigante; sem fala literal, nada de depoimento).
- Use as imagens que provam cada ideia, cada uma uma vez só. Escolha o componente pelo formato e pelo tipo da imagem.
- Não inclua divisores nem marcadores de seção: o código coloca.
- "why" diz em uma frase curta por que este componente aqui (ritmo, prova, formato da imagem).

Responda só com JSON: {"kind": "historia" | "produto", "sections": [{"label": "...", "blocks": [{"component": "CaseTitleBox", "idea": "o que este bloco diz, em uma frase", "images": ["/cases/..."], "why": "..."}]}]}`;
}

export type PlanWarning = { section: number; block: number; message: string };

/** The deterministic checks the plan can already take: sections, rhythm, thanks, limits per case, image kinds. */
export function planWarnings(plan: CasePlan, kinds: ImageKinds = {}): PlanWarning[] {
  const items: CaseItem[] = [];
  const where: { section: number; block: number }[] = [];
  plan.sections.forEach((s, si) => {
    items.push({ index: items.length, type: "section", model: { kind: "section", position: si + 1, label: s.label, visible: false }, props: {} });
    where.push({ section: si, block: -1 });
    s.blocks.forEach((b, bi) => {
      const model: BlockModel = b.component === "image" ? { kind: "image", src: b.images[0] ?? "", caption: "", mobileSrc: "", size: "", crop: "", mobileCrop: "", background: true, border: true, spaceTop: "", spaceBottom: "" }
        : b.component === "text" ? { kind: "text", style: "paragraph", md: "", lossy: false }
        : b.component === "images" ? { kind: "images", images: b.images.map(src => ({ src, caption: "", mobileSrc: "" })) }
        : { kind: "component", name: b.component, props: {} };
      items.push({ index: items.length, type: b.component, model, props: {} });
      where.push({ section: si, block: bi });
    });
  });
  const findings: Finding[] = [...checkSections(items), ...checkThanks(items), ...checkRhythm(items)];
  // per-case limits (one big number, two chapters…)
  const seen = new Map<string, number>();
  items.forEach(item => {
    const max = RULES[item.type]?.maxPerCase;
    seen.set(item.type, (seen.get(item.type) ?? 0) + 1);
    if (max && seen.get(item.type) === max + 1) findings.push({ check: "repeticao", severity: "aviso", index: item.index, message: `${item.type}: no máximo ${max} por case.` });
  });
  // screens components get screens
  plan.sections.forEach((s, si) => s.blocks.forEach((b, bi) => {
    if (!["CaseImageStack", "CaseScreens", "CaseImageCompare"].includes(b.component)) return;
    const allowed = b.component === "CaseImageCompare" ? ["tela-app", "tela-web", "varias-telas", "antes-depois"] : ["tela-app", "tela-web"];
    const wrong = b.images.filter(src => kinds[src] && !allowed.includes(kinds[src]!));
    if (wrong.length) findings.push({ check: "imagem-tipo", severity: "aviso", index: items.findIndex((_, i) => where[i]!.section === si && where[i]!.block === bi), message: `${b.component} com ${wrong.map(src => `${kinds[src]} (${src.split("/").pop()})`).join(", ")}: ele é feito para telas.` });
  }));
  // sections: no dividers in a plan, so their checks stay out
  return findings.filter(f => !f.check.startsWith("divisor")).map(f => ({ ...(f.index >= 0 ? where[f.index]! : { section: -1, block: -1 }), message: f.message }));
}

export async function proposePlan(ctx: DraftContext, notes = ""): Promise<{ plan: CasePlan; warnings: PlanWarning[]; tokens: number }> {
  const cfg = await deepSeekConfig();
  const ask = notes.trim() ? `Pedido do Gutto para este rascunho (siga, desde que não contrarie a fidelidade): ${notes.trim()}\n\n` : "";
  const { data, tokens } = await askJson<unknown>(cfg, planPrompt(ctx), `${ask}${sourceBlock(ctx)}`, { effort: "low", timeoutMs: 180_000 });
  const plan = parsePlan(data, ctx.allowed);
  if (plan.sections.length < 2) throw new Error("A IA devolveu um plano sem seções aproveitáveis. Tente de novo.");
  return { plan, warnings: planWarnings(plan, ctx.kinds), tokens };
}

/* ---------- 2. Writing, section by section ---------- */

/** Same system prompt for every section of a draft (DeepSeek caches the shared start of the prompts). */
function writePrompt(types: string[]) {
  const notes = componentNotes();
  const used = [...new Set(types)];
  return `Você escreve cases de portfólio como o designer Gutto Rocha, na voz dele. Recebe a fonte do case, o plano aprovado por ele e a seção a escrever. Preencha cada bloco da seção, na ordem do plano, com o componente indicado.

Voz do Gutto (registro de projeto):
${voicePrompt("project")}

${FIDELITY}

Regras de texto:
- Cada frase afirma algo concreto da fonte: uma decisão, um número, uma mudança. Se serviria para qualquer case, reescreva.
- Respeite os limites de caracteres de cada campo: o site quebra o layout acima deles.
- Títulos são afirmações, não rótulos ("Primeiro o cliente, depois o organograma.", não "Estratégia").
- Nada de texto padrão do admin ("Texto.", "Título", "Série 1", "Etapa 1"): campo sem conteúdo fica de fora.
- Não repita o que outra seção do plano já diz.

Notas de uso dos componentes desta página:
${used.map(t => (notes[t] ?? "").split("\n").filter(l => !l.startsWith("- **Visto em:**")).join("\n")).join("\n\n")}

Contrato de cada componente (campos aceitos; "?" é opcional; qualquer outro campo é descartado):
${used.map(contractOf).join("\n")}
Todos os componentes aceitam ainda "spaceTop" e "spaceBottom": "none" | "sm" | "md" | "lg" | "xl" (o espaço acima e abaixo; deixe de fora para o padrão).

Responda só com JSON: {"blocks": [{"component": "CaseTitleBox", "props": {...}}]}, um item por bloco do plano, na mesma ordem. Se a fonte não sustenta um bloco, deixe-o de fora em vez de inventar.`;
}

function sectionAsk(ctx: DraftContext, plan: CasePlan, index: number, excerpt?: string, images?: string[]) {
  const s = plan.sections[index]!;
  const blocks = s.blocks.map((b, j) => `${j + 1}. ${b.component} — ${b.idea || "(sem ideia escrita: tire da fonte)"}${b.images.length ? `\n   imagens: ${b.images.join(", ")}` : ""}`).join("\n");
  return `${sourceBlock(ctx)}

Plano aprovado do case (modelo ${plan.kind === "produto" ? "Plenno, produto e design" : "PicPay, liderança e negócio"}):
${planToText(plan)}

${excerpt ? `Trecho do material para esta seção (use este trecho como base; o resto da fonte é contexto):\n${excerpt}\n\n` : ""}${images?.length ? `Imagens escolhidas pelo Gutto para esta seção (use estas, nos blocos em que couberem):\n${images.join("\n")}\n\n` : ""}Escreva agora a seção ${index + 1}, "${s.label}", com estes blocos:
${blocks}`;
}

export type DraftSection = { label: string; blocks: DraftBlock[] };

function rawBlocks(data: unknown): DraftBlock[] {
  const list = data && typeof data === "object" && Array.isArray((data as { blocks?: unknown }).blocks) ? (data as { blocks: unknown[] }).blocks : [];
  return list.flatMap(b => {
    if (!b || typeof b !== "object") return [];
    const o = b as Record<string, unknown>;
    const type = typeof o.component === "string" ? o.component : typeof o.type === "string" ? o.type : "";
    const props = o.props && typeof o.props === "object" && !Array.isArray(o.props) ? o.props as Record<string, unknown> : Object.fromEntries(Object.entries(o).filter(([k]) => k !== "component" && k !== "type"));
    return type ? [{ type, props }] : [];
  });
}

/**
 * Writes one section of an approved plan. `excerpt` and `images` narrow it to a piece of the material
 * and chosen images: the same call serves "refazer uma seção".
 */
export async function writeSection(ctx: DraftContext, plan: CasePlan, index: number, opts: { cfg?: DeepSeekConfig; excerpt?: string; images?: string[] } = {}): Promise<{ section: DraftSection; tokens: number }> {
  const cfg = opts.cfg ?? await deepSeekConfig();
  const section = plan.sections[index];
  if (!section) throw new Error("Seção fora do plano.");
  const images = opts.images?.filter(src => ctx.allowed.has(src));
  const types = plan.sections.flatMap(s => s.blocks.map(b => b.component));
  const { data, tokens } = await askJson<unknown>(cfg, writePrompt(types), sectionAsk(ctx, plan, index, opts.excerpt, images), { effort: "high", timeoutMs: 240_000 });
  return { section: { label: section.label, blocks: rawBlocks(data) }, tokens };
}

/* ---------- 3. Filter, checks, review ---------- */

const DIVIDER: BlockModel = { kind: "divider", color: "#161c20", size: "bleed", align: "", spaceTop: "lg", spaceBottom: "lg" };

type Filtered = { models: { section: number; model: BlockModel }[]; dropped: Dropped[] };

/** Schema, images, numbers and quotes: what survives is safe to show. */
function filter(ctx: DraftContext, sections: DraftSection[]): Filtered {
  const dropped: Dropped[] = [];
  const models: Filtered["models"] = [];
  sections.forEach((s, si) => {
    for (const raw of s.blocks) {
      const name = `${s.label} · ${raw.type}`;
      const reasons: string[] = [];
      const say = (reason: string) => { if (!reasons.includes(reason)) reasons.push(reason); };
      if (!(DRAFT_VOCABULARY as readonly string[]).includes(raw.type)) { dropped.push({ block: name, reason: "componente fora do vocabulário" }); continue; }
      let model = readDraftBlock(raw, ctx.allowed, say);
      if (model) model = enforceSource(model, ctx.source, say);
      // a cut can empty a required field: the schema has the last word
      if (model?.kind === "component") model = readDraftBlock({ type: model.name, props: model.props }, ctx.allowed, say);
      if (model) models.push({ section: si, model });
      for (const reason of reasons) dropped.push({ block: name, reason: model ? `cortado: ${reason}` : `bloco removido: ${reason}` });
      if (!model && !reasons.length) dropped.push({ block: name, reason: "bloco removido: vazio" });
    }
  });
  return { models, dropped };
}

/** The body as the site stores it: section markers (and, in the PicPay model, its full-width dividers). */
function toBody(kind: DraftKind, labels: string[], models: Filtered["models"]): NotionBlockNode[] {
  const body: NotionBlockNode[] = [];
  let position = 0;
  labels.forEach((label, si) => {
    const own = models.filter(m => m.section === si).map(m => m.model);
    // a section the filter emptied goes, and the nav numbers follow the ones that stayed
    if (!own.length) return;
    if (kind === "historia") body.push(createBlock(DIVIDER));
    body.push(createBlock({ kind: "section", position: ++position, label, visible: false }));
    for (const model of own) {
      if (kind === "historia" && model.kind === "component" && model.name === "CaseThanksCards") body.push(createBlock(DIVIDER));
      body.push(createBlock(model));
    }
  });
  return body;
}

const REVIEW_CHECKS = `- "voz": primeira pessoa, frases curtas e concretas, como nos exemplos; nenhuma palavra proibida do guia.
- "concreto": nenhuma frase que serviria para qualquer case; títulos são afirmações, não rótulos.
- "atribuicao": nada do time atribuído só ao Gutto.
- "fiel": todo número, nome e fato está na fonte, escrito como lá; todo depoimento é literal.
- "plano": as seções e os componentes seguem o plano aprovado (mesma ordem), salvo onde um aviso pedia mudança.
- "limites": nenhum campo passa do limite de caracteres do contrato.`;

function reviewPrompt(types: string[]) {
  return `Você é o editor-chefe que revisa o rascunho de um case do Gutto Rocha antes de ele ler. Recebe a fonte, o plano aprovado, o rascunho em JSON e a lista de problemas que a checagem automática achou. Corrija os problemas e reescreva o que falhar no checklist, mantendo o que já está bom.

${writePrompt(types).split("Responda só com JSON")[0]}
Como corrigir:
- Texto longo: encurte para caber no limite, sem perder o fato.
- Corte feito pelo filtro (número ou depoimento que não estava na fonte): reescreva a frase só com o que a fonte diz, ou tire o bloco.
- Ritmo (densos seguidos, frases grandes coladas, frase sem prova): troque a ordem dentro da seção ou troque o componente por um de outro peso, sem sair do vocabulário do plano.
- Não acrescente seções, não mude rótulos de seção e não invente fatos para preencher.

Checklist (responda cada item com true ou false sobre o rascunho FINAL que você devolver):
${REVIEW_CHECKS}

Responda só com JSON: {"checklist": {...}, "sections": [{"label": "...", "blocks": [{"component": "...", "props": {...}}]}]}, com todas as seções, na ordem.`;
}

/** The draft back in the shape the model wrote it, for the review. */
function asSections(labels: string[], models: Filtered["models"]) {
  return labels.map((label, si) => ({
    label,
    blocks: models.filter(m => m.section === si).map(({ model }) => {
      if (model.kind === "component") return { component: model.name, props: model.props };
      if (model.kind === "image") return { component: "image", props: { src: model.src, caption: model.caption, size: model.size } };
      if (model.kind === "images") return { component: "images", props: { images: model.images.map(i => ({ src: i.src, caption: i.caption })) } };
      if (model.kind === "text") return { component: "text", props: { style: model.style, md: model.md } };
      return { component: model.kind, props: {} };
    }),
  }));
}

export type DraftResult = {
  body: NotionBlockNode[];
  /** What checkCase still finds in the final draft. */
  findings: Finding[];
  /** What the first check found and the review fixed (empty without a review). */
  fixed: Finding[];
  /** What the filter cut, in every pass. */
  dropped: Dropped[];
  checklist?: Record<string, boolean>;
  reviewed: boolean;
  /** The case data (Dados tab) for the fields that were empty; the editor merges it as unsaved edits. */
  data: DraftCaseData;
  tokens: { plan?: number; write: number; review: number; data: number; total: number };
  from: DraftContext["from"];
};

const errors = (f: Finding[]) => f.filter(x => x.severity === "erro").length;

export async function writeDraft(ctx: DraftContext, plan: CasePlan): Promise<DraftResult> {
  if (!plan.sections.length) throw new Error("O plano está vazio.");
  const cfg = await deepSeekConfig();
  const labels = plan.sections.map(s => s.label);
  const written = await Promise.all(plan.sections.map((_, i) => writeSection(ctx, plan, i, { cfg })));
  const write = written.reduce((sum, w) => sum + w.tokens, 0);
  const first = filter(ctx, written.map(w => w.section));
  let body = toBody(plan.kind, labels, first.models);
  if (!first.models.length) throw new Error("Nenhum bloco do rascunho passou pelo filtro. Tente de novo.");
  let findings = checkCase(body, { sizes: ctx.sizes, kinds: ctx.kinds });
  const before = findings;
  const dropped = [...first.dropped];

  // review only when there is something to fix
  let review = 0;
  let checklist: Record<string, boolean> | undefined;
  let reviewed = false;
  if (findings.length || first.dropped.length) {
    const problems = [
      ...findings.map(f => `- [${f.severity}] ${CHECKS[f.check]} ${f.message}${f.index >= 0 ? ` (bloco: ${readCaseBody([body[f.index]!])[0]?.type ?? ""})` : ""}`),
      ...first.dropped.map(d => `- [filtro] ${d.block}: ${d.reason}`),
    ].join("\n");
    const types = plan.sections.flatMap(s => s.blocks.map(b => b.component));
    try {
      const answer = await askJson<{ checklist?: Record<string, boolean>; sections?: unknown }>(cfg, reviewPrompt(types),
        `${sourceBlock(ctx)}\n\nPlano aprovado:\n${planToText(plan)}\n\nRascunho:\n${JSON.stringify(asSections(labels, first.models))}\n\nProblemas encontrados:\n${problems}`,
        { effort: "low", timeoutMs: 240_000 });
      review = answer.tokens;
      const sections = (Array.isArray(answer.data.sections) ? answer.data.sections : []).map((s, i) => ({ label: labels[i] ?? "", blocks: rawBlocks(s) })).slice(0, labels.length);
      const second = filter(ctx, sections);
      const nextBody = toBody(plan.kind, labels, second.models);
      const nextFindings = checkCase(nextBody, { sizes: ctx.sizes, kinds: ctx.kinds });
      // the review is a bonus: keep it only when it did not lose blocks or add errors
      if (second.models.length >= first.models.length * 0.8 && errors(nextFindings) <= errors(findings) && nextFindings.length <= findings.length + 2) {
        body = nextBody;
        findings = nextFindings;
        dropped.push(...second.dropped.map(d => ({ ...d, reason: `revisão: ${d.reason}` })));
        checklist = answer.data.checklist;
        reviewed = true;
      }
    } catch {
      // the first draft stands if the review fails
    }
  }
  const left = new Set(findings.map(f => `${f.check}:${f.message}`));
  const fixed = reviewed ? before.filter(f => !left.has(`${f.check}:${f.message}`)) : [];
  // the Dados tab, from the same facts and the body as it ended; a failure leaves it empty, never the draft
  let data: DraftCaseData = {};
  let dataTokens = 0;
  try {
    const r = await writeCaseData(ctx, plan, body, cfg);
    data = r.data;
    dataTokens = r.tokens;
    dropped.push(...r.dropped.map(reason => ({ block: "Dados do case", reason: `cortado: ${reason}` })));
  } catch { /* the data stays for Gutto */ }
  return { body, findings, fixed, dropped, checklist, reviewed, data, tokens: { write, review, data: dataTokens, total: write + review + dataTokens }, from: ctx.from };
}

/* ---------- 4. The case data (Dados tab) ---------- */

function dataPrompt(keys: string[]) {
  return `Você preenche os dados de um case de portfólio do designer Gutto Rocha: os textos do topo do case, do card na Home e da capa. Recebe a fonte, o plano aprovado e o texto do case já escrito.

Voz do Gutto (registro de projeto):
${voicePrompt("project")}

${FIDELITY}

Campos a preencher (só estes; o limite é em caracteres):
${DATA_FIELDS.filter(f => keys.includes(f.key)).map(f => `- "${f.key}" (até ${f.max}): ${f.hint}`).join("\n")}

Regras:
- Tire tudo da fonte e do texto do case; não repita frases inteiras do corpo, resuma.
- Sem número de resultado com fonte, deixe "homeStats" de fora e use "Entrega" em "homeLabel".
- Um campo que a fonte não sustenta fica de fora.

Responda só com JSON: um objeto com os campos acima.`;
}

/** The case data for the fields still empty, from the source, the plan and the written body. */
export async function writeCaseData(ctx: DraftContext, plan: CasePlan, body: NotionBlockNode[], cfg?: DeepSeekConfig): Promise<{ data: DraftCaseData; dropped: string[]; tokens: number }> {
  const keys = emptyDataKeys(ctx.current);
  if (!keys.length) return { data: {}, dropped: [], tokens: 0 };
  const known = `Dados já preenchidos pelo Gutto (não mude; use como contexto): ${JSON.stringify(Object.fromEntries(Object.entries({ title: ctx.current.title, company: ctx.current.company, year: ctx.current.year, role: ctx.current.role, productTag: ctx.current.productTag }).filter(([k, v]) => v && !keys.includes(k as never))))}`;
  const { data, tokens } = await askJson<unknown>(cfg ?? await deepSeekConfig(), dataPrompt(keys),
    `Fonte:\n\n${ctx.source.text}\n\n${known}\n\nPlano aprovado:\n${planToText(plan)}\n\nTexto do case:\n\n${blocksToMarkdown(body).replaceAll(SITE_URL, "")}`,
    { effort: "low", timeoutMs: 180_000 });
  const dropped: string[] = [];
  return { data: readCaseData(data, keys, ctx.source, reason => dropped.push(reason)), dropped, tokens };
}

/**
 * "Refazer uma seção" (the interface comes later): one section of the plan written again, from a piece
 * of the material and chosen images, through the same filter. Returns the section's blocks without its
 * marker, ready to replace the old ones in the editor.
 */
export async function redoSection(ctx: DraftContext, plan: CasePlan, index: number, opts: { excerpt?: string; images?: string[] } = {}): Promise<{ blocks: NotionBlockNode[]; dropped: Dropped[]; tokens: number }> {
  const { section, tokens } = await writeSection(ctx, plan, index, opts);
  const { models, dropped } = filter(ctx, [section]);
  return { blocks: models.map(m => createBlock(m.model)), dropped, tokens };
}

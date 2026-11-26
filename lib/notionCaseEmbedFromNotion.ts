import type { CaseStat } from "@/lib/cases";
import type { BentoTile, FlowStep, Tone } from "@/components/case/blocks/CaseStoryBlocks";
import { readEmbedSpace, type EmbedSpace } from "@/lib/caseEmbedSpace";
import { parseFlowDiagram, type FlowDiagram } from "@/lib/flowLayout";
import { parseChartSpec, type ChartSpec } from "@/lib/chartSpec";
import { parsePanel, type Panel } from "@/lib/panel";
import { parseScreenGallery, type ScreenGallery } from "@/lib/screens";
import { parseImageCompare, type ImageCompare } from "@/lib/imageCompare";
import { parseImageStack, type ImageStack } from "@/lib/imageStack";
import { parseComparison, parseIconRatio, parseIconStats, parseTimeline, type Comparison, type IconRatio, type IconStats, type Timeline } from "@/lib/infographics";

/** Nomes exatos dos componentes permitidos no JSON / `[case:…]`. */
export const NOTION_CASE_EMBED_COMPONENTS = [
  "CasePullQuote",
  "CaseStatBand",
  "CaseSectionSplit",
  "CaseEditorialParagraph",
  "CaseMediaFullWidth",
  "CaseMediaEmbed",
  "CaseSectionMedia",
  "CaseBeforeAfter",
  "CaseMediaFigure",
  "CaseApproachCards",
  "CaseThanksCards",
  "CaseMediaGallery",
  "CaseResultsJourney",
  "CaseResultsQuote",
  "CaseFlow",
  "CaseFlowDiagram",
  "CaseChart",
  "CasePanel",
  "CaseScreens",
  "CaseImageCompare",
  "CaseImageStack",
  "CaseIconRatio",
  "CaseIconStats",
  "CaseTimeline",
  "CaseComparison",
  "CaseBento",
  "CaseChapter",
  "CaseStatement",
  "CaseTitleBox",
  "CaseLightPanel",
  "CaseBigNumber",
] as const;

export type NotionCaseEmbedComponentName = (typeof NOTION_CASE_EMBED_COMPONENTS)[number];

const WHITELIST = new Set<string>(NOTION_CASE_EMBED_COMPONENTS);

/** Componentes que aceitam blocos entre `[case:…]` … `[/case:…]` (extensível). */
export const CASE_EMBED_WRAPPER_COMPONENTS = new Set<string>(["CaseMediaGallery"]);

type ParsedCaseEmbedKind =
  | ({ kind: "CaseFlowDiagram" } & FlowDiagram)
  | ({ kind: "CaseChart" } & ChartSpec)
  | ({ kind: "CasePanel" } & Panel)
  | ({ kind: "CaseScreens" } & ScreenGallery)
  | ({ kind: "CaseImageCompare" } & ImageCompare)
  | ({ kind: "CaseImageStack" } & ImageStack)
  | ({ kind: "CaseIconRatio" } & IconRatio)
  | ({ kind: "CaseIconStats" } & IconStats)
  | ({ kind: "CaseTimeline" } & Timeline)
  | ({ kind: "CaseComparison" } & Comparison)
  | { kind: "CaseFlow"; sectionLabel?: string; heading?: string; steps: FlowStep[]; numbered?: boolean; connector?: string; contextLabel?: string; context?: string; id?: string }
  | { kind: "CaseBento"; sectionLabel?: string; heading?: string; tiles: BentoTile[]; id?: string }
  | { kind: "CaseChapter"; number?: string; title: string; body?: string; src?: string; id?: string }
  | { kind: "CaseStatement"; body: string; caption?: string; id?: string }
  | { kind: "CaseTitleBox"; sectionLabel?: string; title: string; continuation?: string; intro?: string; body: string; id?: string }
  | { kind: "CaseLightPanel"; sectionLabel?: string; heading?: string; body?: string; src?: string; alt?: string; caption?: string; id?: string }
  | { kind: "CaseBigNumber"; value: string; label?: string; body?: string; id?: string }
  | {
      kind: "CasePullQuote";
      /** Omitir ou `""` = sem rótulo acima da citação */
      label?: string;
      body: string;
      centered?: boolean;
      bgClass?: string;
      sectionClassName?: string;
      /** Borda da secção; `no-border` remove (substitui `border-t border-line`). */
      borderClass?: string;
    }
  | {
      kind: "CaseStatBand";
      stats: CaseStat[];
      /** Antes → depois: gráfico (padrão) ou cards. */
      display?: "chart" | "cards";
      sectionLabel?: string;
      /** Título em destaque abaixo do eyebrow (ex. métricas em contexto). */
      heading?: string;
      intro?: string;
      attributionNote?: string;
      editorialSourceNote?: string;
      emphasizeIndices?: number[];
      /** Borda exterior; `no-border` remove (substitui `border-y border-line`). */
      borderClass?: string;
    }
  | {
      kind: "CaseSectionSplit";
      label: string;
      layout?: "default" | "reversed" | "stacked";
      body: string;
      id?: string;
      tone?: "editorial" | "standard";
      labelColumnPx?: 220 | 240;
      borderClass?: string;
      /** Classes na coluna de texto (ex. `space-y-8`). Se omitido e houver 2+ parágrafos, usa `space-y-8`. */
      contentClassName?: string;
    }
  | {
      kind: "CaseEditorialParagraph";
      body: string;
      variant?: "body" | "inset";
      className?: string;
      /** Junta-se a `className` (ex. `border-t border-line`). */
      borderClass?: string;
    }
  | {
      kind: "CaseMediaFullWidth";
      src: string;
      alt: string;
      id?: string;
      priority?: boolean;
      borderClass?: string;
    }
  | {
      kind: "CaseMediaEmbed";
      src: string;
      title: string;
      caption?: string;
      id?: string;
      className?: string;
      heightClass?: string;
      minHeightClass?: string;
      borderClass?: string;
    }
  | {
      kind: "CaseSectionMedia";
      label?: string;
      intro?: string;
      src: string;
      alt: string;
      id?: string;
      borderClass?: string;
    }
  | {
      kind: "CaseBeforeAfter";
      sectionLabel?: string;
      heading?: string;
      banner?: string;
      before: {
        label: string;
        lead?: string;
        body: string;
        foot?: string;
        variant?: "muted" | "emphasis";
      };
      after: {
        label: string;
        lead?: string;
        body: string;
        foot?: string;
        variant?: "muted" | "emphasis";
      };
      id?: string;
      padClass?: string;
      bgClass?: string;
      borderClass?: string;
    }
  | {
      kind: "CaseMediaFigure";
      src: string;
      alt: string;
      caption?: string;
      aspectClass?: string;
      id?: string;
      priority?: boolean;
      /** Moldura do `<figure>`; `no-border` remove borda padrão. */
      borderClass?: string;
    }
  | {
      kind: "CaseApproachCards";
      sectionLabel?: string;
      heading?: string;
      items: { title: string; body: string; tone?: Tone }[];
      columns?: 1 | 2;
      id?: string;
      padClass?: string;
      bgClass?: string;
      borderClass?: string;
    }
  | {
      kind: "CaseThanksCards";
      sectionLabel?: string;
      heading?: string;
      items: { title: string; body: string; tone?: Tone }[];
      columns?: 1 | 2;
      id?: string;
      padClass?: string;
      bgClass?: string;
      borderClass?: string;
    }
  | {
      kind: "CaseMediaGallery";
      items: { src: string; alt: string; caption?: string }[];
      variant?: "uniform" | "headline";
      columns?: 2 | 3;
      id?: string;
      /** Contorno do bloco da grelha (não altera bordas internas dos tiles). */
      borderClass?: string;
    }
  | {
      kind: "CaseResultsJourney";
      /** Omitido → default visual; `""` oculta o rótulo da secção */
      sectionLabel?: string;
      /** Título forte abaixo do eyebrow (ex. «Resultados para as pessoas»). */
      heading?: string;
      /** Parágrafo de apoio opcional abaixo do título. */
      intro?: string;
      steps: { title: string; body: string; indexLabel?: string }[];
      /** `true` = sem números 01, 02… à esquerda */
      hideStepIndices?: boolean;
      id?: string;
      padClass?: string;
      bgClass?: string;
      className?: string;
      /** Borda da secção; `no-border` remove (substitui `border-y border-line`). */
      borderClass?: string;
    }
  | {
      kind: "CaseResultsQuote";
      body: string;
      attribution?: string;
      /** Rótulo acima da citação; omitir = sem rótulo */
      sectionLabel?: string;
      id?: string;
      padClass?: string;
      bgClass?: string;
      className?: string;
      /** Borda exterior da secção (ex. `border-t border-line`). */
      borderClass?: string;
    };

/** Qualquer componente, mais o espaço acima/abaixo escolhido no admin. */
export type ParsedCaseEmbed = ParsedCaseEmbedKind & { space?: EmbedSpace };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asStats(input: unknown): CaseStat[] | null {
  if (!Array.isArray(input)) return null;
  const out: CaseStat[] = [];
  for (const item of input) {
    if (!isRecord(item)) return null;
    if (typeof item.value !== "string" || typeof item.label !== "string") return null;
    const cap = item.caption;
    out.push({
      value: item.value,
      label: item.label,
      caption: typeof cap === "string" ? cap : undefined,
    });
  }
  return out.length > 0 ? out : null;
}

function asNumberArray(input: unknown): number[] | undefined {
  if (input === undefined) return undefined;
  if (!Array.isArray(input)) return undefined;
  const out: number[] = [];
  for (const x of input) {
    if (typeof x !== "number" || !Number.isInteger(x)) return undefined;
    out.push(x);
  }
  return out;
}

function optString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

function parseCasePullQuote(obj: Record<string, unknown>): ParsedCaseEmbed | null {
  if (typeof obj.body !== "string") return null;
  const label = obj.label;
  if (label !== undefined && typeof label !== "string") return null;
  const centered = obj.centered;
  return {
    kind: "CasePullQuote",
    label: typeof label === "string" ? label : undefined,
    body: obj.body,
    centered: typeof centered === "boolean" ? centered : undefined,
    bgClass: optString(obj, "bgClass"),
    sectionClassName: optString(obj, "sectionClassName"),
    borderClass: optString(obj, "borderClass"),
  };
}

function parseCaseStatBand(obj: Record<string, unknown>): ParsedCaseEmbed | null {
  const stats = asStats(obj.stats);
  if (!stats) return null;
  return {
    kind: "CaseStatBand",
    stats,
    sectionLabel: optString(obj, "sectionLabel"),
    heading: optString(obj, "heading"),
    intro: optString(obj, "intro"),
    attributionNote: optString(obj, "attributionNote"),
    editorialSourceNote: optString(obj, "editorialSourceNote"),
    emphasizeIndices: asNumberArray(obj.emphasizeIndices),
    borderClass: optString(obj, "borderClass"),
    display: obj.display === "cards" ? "cards" : undefined,
  };
}

function parseCaseSectionSplit(obj: Record<string, unknown>): ParsedCaseEmbed | null {
  if (typeof obj.label !== "string" || typeof obj.body !== "string") return null;
  const tone = obj.tone;
  const labelColumnPx = obj.labelColumnPx;
  return {
    kind: "CaseSectionSplit",
    label: obj.label,
    body: obj.body,
    id: optString(obj, "id"),
    layout: obj.layout === "reversed" || obj.layout === "stacked" ? obj.layout : undefined,
    tone: tone === "editorial" || tone === "standard" ? tone : undefined,
    labelColumnPx: labelColumnPx === 220 || labelColumnPx === 240 ? labelColumnPx : undefined,
    borderClass: optString(obj, "borderClass"),
    contentClassName: optString(obj, "contentClassName"),
  };
}

function parseCaseEditorialParagraph(obj: Record<string, unknown>): ParsedCaseEmbed | null {
  const body = typeof obj.body === "string" ? obj.body : typeof obj.text === "string" ? obj.text : null;
  if (body === null) return null;
  const variant = obj.variant;
  return {
    kind: "CaseEditorialParagraph",
    body,
    variant: variant === "body" || variant === "inset" ? variant : undefined,
    className: optString(obj, "className"),
    borderClass: optString(obj, "borderClass"),
  };
}

function parseCaseMediaFullWidth(obj: Record<string, unknown>): ParsedCaseEmbed | null {
  if (typeof obj.src !== "string" || typeof obj.alt !== "string") return null;
  const priority = obj.priority;
  return {
    kind: "CaseMediaFullWidth",
    src: obj.src,
    alt: obj.alt,
    id: optString(obj, "id"),
    priority: typeof priority === "boolean" ? priority : undefined,
    borderClass: optString(obj, "borderClass"),
  };
}

function parseCaseMediaEmbed(obj: Record<string, unknown>): ParsedCaseEmbed | null {
  if (typeof obj.src !== "string" || typeof obj.title !== "string") return null;
  return {
    kind: "CaseMediaEmbed",
    src: obj.src,
    title: obj.title,
    caption: optString(obj, "caption"),
    id: optString(obj, "id"),
    className: optString(obj, "className"),
    heightClass: optString(obj, "heightClass"),
    minHeightClass: optString(obj, "minHeightClass"),
    borderClass: optString(obj, "borderClass"),
  };
}

function parseCaseSectionMedia(obj: Record<string, unknown>): ParsedCaseEmbed | null {
  const media = obj.media;
  if (!isRecord(media) || typeof media.src !== "string" || typeof media.alt !== "string") return null;
  return {
    kind: "CaseSectionMedia",
    label: optString(obj, "label"),
    intro: optString(obj, "intro"),
    src: media.src,
    alt: media.alt,
    id: optString(obj, "id"),
    borderClass: optString(obj, "borderClass"),
  };
}

function parseBeforeAfterColumn(
  raw: unknown,
): { label: string; lead?: string; body: string; foot?: string; variant?: "muted" | "emphasis" } | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.label !== "string") return null;
  const hasBody = typeof raw.body === "string";
  const hasLead = typeof raw.lead === "string";
  if (!hasBody && !hasLead) return null;
  const body: string = hasBody ? (raw.body as string) : "";
  const variant = raw.variant;
  return {
    label: raw.label,
    lead: hasLead ? (raw.lead as string) : undefined,
    body,
    foot: optString(raw, "foot"),
    variant: variant === "muted" || variant === "emphasis" ? variant : undefined,
  };
}

function parseCaseBeforeAfter(obj: Record<string, unknown>): ParsedCaseEmbed | null {
  const before = parseBeforeAfterColumn(obj.before);
  const after = parseBeforeAfterColumn(obj.after);
  if (!before || !after) return null;
  return {
    kind: "CaseBeforeAfter",
    sectionLabel: optString(obj, "sectionLabel"),
    heading: optString(obj, "heading"),
    banner: optString(obj, "banner"),
    before,
    after,
    id: optString(obj, "id"),
    padClass: optString(obj, "padClass"),
    bgClass: optString(obj, "bgClass"),
    borderClass: optString(obj, "borderClass"),
  };
}

function parseCaseMediaFigure(obj: Record<string, unknown>): ParsedCaseEmbed | null {
  if (typeof obj.src !== "string" || typeof obj.alt !== "string") return null;
  const priority = obj.priority;
  return {
    kind: "CaseMediaFigure",
    src: obj.src,
    alt: obj.alt,
    caption: optString(obj, "caption"),
    aspectClass: optString(obj, "aspectClass"),
    id: optString(obj, "id"),
    priority: typeof priority === "boolean" ? priority : undefined,
    borderClass: optString(obj, "borderClass"),
  };
}

function parseApproachCardItems(
  input: unknown,
): { title: string; body: string; tone?: Tone }[] | null {
  if (!Array.isArray(input)) return null;
  const out: { title: string; body: string; tone?: Tone }[] = [];
  for (const item of input) {
    if (!isRecord(item)) return null;
    if (typeof item.title !== "string" || typeof item.body !== "string") return null;
    out.push({ title: item.title, body: item.body, tone: asTone(item.tone) });
  }
  return out.length > 0 ? out : null;
}

function parseCaseApproachLikeCards(
  kind: "CaseApproachCards" | "CaseThanksCards",
  obj: Record<string, unknown>,
): ParsedCaseEmbed | null {
  const items = parseApproachCardItems(obj.items);
  if (!items) return null;
  const columns = obj.columns;
  return {
    kind,
    items,
    sectionLabel: optString(obj, "sectionLabel"),
    heading: optString(obj, "heading"),
    columns: columns === 1 || columns === 2 ? columns : undefined,
    id: optString(obj, "id"),
    padClass: optString(obj, "padClass"),
    bgClass: optString(obj, "bgClass"),
    borderClass: optString(obj, "borderClass"),
  };
}

function parseCaseApproachCards(obj: Record<string, unknown>): ParsedCaseEmbed | null {
  return parseCaseApproachLikeCards("CaseApproachCards", obj);
}

function parseCaseThanksCards(obj: Record<string, unknown>): ParsedCaseEmbed | null {
  return parseCaseApproachLikeCards("CaseThanksCards", obj);
}

function parseGalleryItems(
  input: unknown,
): { src: string; alt: string; caption?: string }[] | null {
  if (!Array.isArray(input)) return null;
  const out: { src: string; alt: string; caption?: string }[] = [];
  for (const item of input) {
    if (!isRecord(item)) return null;
    if (typeof item.src !== "string" || typeof item.alt !== "string") return null;
    out.push({ src: item.src, alt: item.alt, caption: optString(item, "caption") });
  }
  return out.length > 0 ? out : null;
}

function parseCaseMediaGallery(obj: Record<string, unknown>): ParsedCaseEmbed | null {
  const items = parseGalleryItems(obj.items);
  if (!items) return null;
  const variant = obj.variant;
  const columns = obj.columns;
  return {
    kind: "CaseMediaGallery",
    items,
    variant: variant === "uniform" || variant === "headline" ? variant : undefined,
    columns: columns === 2 || columns === 3 ? columns : undefined,
    id: optString(obj, "id"),
    borderClass: optString(obj, "borderClass"),
  };
}

function parseJourneySteps(
  input: unknown,
): { title: string; body: string; indexLabel?: string }[] | null {
  if (!Array.isArray(input)) return null;
  const out: { title: string; body: string; indexLabel?: string }[] = [];
  for (const item of input) {
    if (!isRecord(item)) return null;
    if (typeof item.title !== "string" || typeof item.body !== "string") return null;
    const indexLabel = item.indexLabel;
    if (indexLabel !== undefined && typeof indexLabel !== "string") return null;
    out.push({
      title: item.title,
      body: item.body,
      ...(typeof indexLabel === "string" ? { indexLabel } : {}),
    });
  }
  return out.length > 0 ? out : null;
}

function parseCaseResultsJourney(obj: Record<string, unknown>): ParsedCaseEmbed | null {
  const steps = parseJourneySteps(obj.steps);
  if (!steps) return null;
  const hide = obj.hideStepIndices;
  return {
    kind: "CaseResultsJourney",
    steps,
    sectionLabel: optString(obj, "sectionLabel"),
    heading: optString(obj, "heading"),
    intro: optString(obj, "intro"),
    hideStepIndices: typeof hide === "boolean" ? hide : undefined,
    id: optString(obj, "id"),
    padClass: optString(obj, "padClass"),
    bgClass: optString(obj, "bgClass"),
    className: optString(obj, "className"),
    borderClass: optString(obj, "borderClass"),
  };
}

function parseCaseResultsQuoteEmbed(obj: Record<string, unknown>): ParsedCaseEmbed | null {
  if (typeof obj.body !== "string") return null;
  return {
    kind: "CaseResultsQuote",
    body: obj.body,
    attribution: optString(obj, "attribution"),
    sectionLabel: optString(obj, "sectionLabel"),
    id: optString(obj, "id"),
    padClass: optString(obj, "padClass"),
    bgClass: optString(obj, "bgClass"),
    className: optString(obj, "className"),
    borderClass: optString(obj, "borderClass"),
  };
}

const TONES = new Set(["neutral", "soft", "brand", "light", "gray"]);
function asTone(value: unknown): Tone | undefined {
  return typeof value === "string" && TONES.has(value) ? value as Tone : undefined;
}

function parseCaseFlow(obj: Record<string, unknown>): ParsedCaseEmbed | null {
  if (!Array.isArray(obj.steps)) return null;
  const steps: FlowStep[] = [];
  for (const step of obj.steps) {
    if (!isRecord(step) || typeof step.title !== "string") return null;
    steps.push({ title: step.title, body: optString(step, "body"), highlight: step.highlight === true || undefined });
  }
  if (steps.length < 2) return null;
  return {
    kind: "CaseFlow", steps, sectionLabel: optString(obj, "sectionLabel"), heading: optString(obj, "heading"),
    numbered: obj.numbered === true || undefined, connector: optString(obj, "connector"),
    contextLabel: optString(obj, "contextLabel"), context: optString(obj, "context"), id: optString(obj, "id"),
  };
}

const TILE_KINDS = new Set(["text", "stat", "image", "video", "quote"]);
const TILE_SIZES = new Set(["1x1", "2x1", "1x2", "2x2"]);
function parseCaseBento(obj: Record<string, unknown>): ParsedCaseEmbed | null {
  if (!Array.isArray(obj.tiles)) return null;
  const tiles: BentoTile[] = [];
  for (const tile of obj.tiles) {
    if (!isRecord(tile)) return null;
    const kind = typeof tile.kind === "string" && TILE_KINDS.has(tile.kind) ? tile.kind as BentoTile["kind"] : "text";
    tiles.push({
      kind, size: typeof tile.size === "string" && TILE_SIZES.has(tile.size) ? tile.size as BentoTile["size"] : undefined, tone: asTone(tile.tone),
      title: optString(tile, "title"), body: optString(tile, "body"), value: optString(tile, "value"), label: optString(tile, "label"),
      src: optString(tile, "src"), alt: optString(tile, "alt"), poster: optString(tile, "poster"), caption: optString(tile, "caption"),
    });
  }
  return tiles.length ? { kind: "CaseBento", tiles, sectionLabel: optString(obj, "sectionLabel"), heading: optString(obj, "heading"), id: optString(obj, "id") } : null;
}

function parseCaseStory(name: string, obj: Record<string, unknown>): ParsedCaseEmbed | null {
  const id = optString(obj, "id");
  switch (name) {
    case "CaseChapter":
      return typeof obj.title === "string" ? { kind: "CaseChapter", title: obj.title, number: optString(obj, "number"), body: optString(obj, "body"), src: optString(obj, "src"), id } : null;
    case "CaseStatement":
      return typeof obj.body === "string" && obj.body.trim() ? { kind: "CaseStatement", body: obj.body, caption: optString(obj, "caption"), id } : null;
    case "CaseTitleBox":
      return typeof obj.title === "string" && typeof obj.body === "string" ? { kind: "CaseTitleBox", title: obj.title, body: obj.body, continuation: optString(obj, "continuation"), sectionLabel: optString(obj, "sectionLabel"), intro: optString(obj, "intro"), id } : null;
    case "CaseLightPanel":
      return { kind: "CaseLightPanel", sectionLabel: optString(obj, "sectionLabel"), heading: optString(obj, "heading"), body: optString(obj, "body"), src: optString(obj, "src"), alt: optString(obj, "alt"), caption: optString(obj, "caption"), id };
    case "CaseBigNumber":
      return typeof obj.value === "string" && obj.value.trim() ? { kind: "CaseBigNumber", value: obj.value, label: optString(obj, "label"), body: optString(obj, "body"), id } : null;
    default:
      return null;
  }
}

function parseCaseEmbedObject(obj: Record<string, unknown>): ParsedCaseEmbed | null {
  const embed = parseCaseEmbedKind(obj);
  const space = readEmbedSpace(obj);
  return embed && space ? { ...embed, space } : embed;
}

function parseCaseEmbedKind(obj: Record<string, unknown>): ParsedCaseEmbedKind | null {
  const c = obj.component;
  if (typeof c !== "string" || !WHITELIST.has(c)) return null;
  switch (c as NotionCaseEmbedComponentName) {
    case "CasePullQuote":
      return parseCasePullQuote(obj);
    case "CaseStatBand":
      return parseCaseStatBand(obj);
    case "CaseSectionSplit":
      return parseCaseSectionSplit(obj);
    case "CaseEditorialParagraph":
      return parseCaseEditorialParagraph(obj);
    case "CaseMediaFullWidth":
      return parseCaseMediaFullWidth(obj);
    case "CaseMediaEmbed":
      return parseCaseMediaEmbed(obj);
    case "CaseSectionMedia":
      return parseCaseSectionMedia(obj);
    case "CaseBeforeAfter":
      return parseCaseBeforeAfter(obj);
    case "CaseMediaFigure":
      return parseCaseMediaFigure(obj);
    case "CaseApproachCards":
      return parseCaseApproachCards(obj);
    case "CaseThanksCards":
      return parseCaseThanksCards(obj);
    case "CaseMediaGallery":
      return parseCaseMediaGallery(obj);
    case "CaseResultsJourney":
      return parseCaseResultsJourney(obj);
    case "CaseResultsQuote":
      return parseCaseResultsQuoteEmbed(obj);
    case "CaseFlow":
      return parseCaseFlow(obj);
    case "CaseIconRatio": { const d = parseIconRatio(obj); return d ? { kind: "CaseIconRatio", ...d } : null; }
    case "CaseIconStats": { const d = parseIconStats(obj); return d ? { kind: "CaseIconStats", ...d } : null; }
    case "CaseTimeline": { const d = parseTimeline(obj); return d ? { kind: "CaseTimeline", ...d } : null; }
    case "CaseComparison": { const d = parseComparison(obj); return d ? { kind: "CaseComparison", ...d } : null; }
    case "CaseScreens": { const d = parseScreenGallery(obj); return d ? { kind: "CaseScreens", ...d } : null; }
    case "CaseImageCompare": { const d = parseImageCompare(obj); return d ? { kind: "CaseImageCompare", ...d } : null; }
    case "CaseImageStack": { const d = parseImageStack(obj); return d ? { kind: "CaseImageStack", ...d } : null; }
    case "CasePanel": { const d = parsePanel(obj); return d ? { kind: "CasePanel", ...d } : null; }
    case "CaseChart": {
      const chart = parseChartSpec(obj);
      return chart ? { kind: "CaseChart", ...chart } : null;
    }
    case "CaseFlowDiagram": {
      const diagram = parseFlowDiagram(obj);
      return diagram ? { kind: "CaseFlowDiagram", ...diagram } : null;
    }
    case "CaseBento":
      return parseCaseBento(obj);
    case "CaseChapter":
    case "CaseStatement":
    case "CaseTitleBox":
    case "CaseLightPanel":
    case "CaseBigNumber":
      return parseCaseStory(c, obj);
    default:
      return null;
  }
}

/** JSON completo (ex. code block `case`). */
export function parseCaseEmbedJson(text: string): ParsedCaseEmbed | null {
  let obj: unknown;
  try {
    obj = JSON.parse(text.trim());
  } catch {
    return null;
  }
  if (!isRecord(obj)) return null;
  return parseCaseEmbedObject(obj);
}

/**
 * Parágrafo: `[case:ComponentName] { … }` — `component` no JSON é opcional (infere pelo prefixo).
 */
const PARAGRAPH_CASE_RE = /^\[case:\s*([A-Za-z][A-Za-z0-9_]*)\]\s+(\{[\s\S]*\})\s*$/;

export function tryParseCaseEmbedParagraph(plain: string): ParsedCaseEmbed | null {
  const trimmed = plain.trim();
  const m = trimmed.match(PARAGRAPH_CASE_RE);
  if (!m) return null;
  const name = m[1]!;
  if (!WHITELIST.has(name)) return null;
  try {
    const inner = JSON.parse(m[2]!);
    if (!isRecord(inner)) return null;
    inner.component = name;
    return parseCaseEmbedObject(inner);
  } catch {
    return null;
  }
}

const WRAPPER_OPEN_RE = /^\[case:\s*([A-Za-z][A-Za-z0-9_]*)\]\s*([\s\S]*)$/;
/** Fecho `[/case:Name]` — o `/` após `[` tem de ir escapado no literal `/…/`. */
const WRAPPER_CLOSE_RE = /^\[\/case:\s*([A-Za-z][A-Za-z0-9_]*)\]\s*$/;

/**
 * Abertura `[case:ComponentName]` opcionalmente seguido de JSON só com opções (sem `items` para galeria).
 * Não coincide com `[case:…] {…}` de uma linha já tratado por `tryParseCaseEmbedParagraph`.
 */
export function tryParseCaseEmbedWrapperOpen(
  plain: string,
): { component: NotionCaseEmbedComponentName; options: Record<string, unknown> } | null {
  const trimmed = plain.trim();
  if (tryParseCaseEmbedParagraph(trimmed)) return null;
  const m = trimmed.match(WRAPPER_OPEN_RE);
  if (!m) return null;
  const name = m[1]!;
  if (!WHITELIST.has(name) || !CASE_EMBED_WRAPPER_COMPONENTS.has(name)) return null;
  const rest = (m[2] ?? "").trim();
  if (rest === "") {
    return { component: name as NotionCaseEmbedComponentName, options: {} };
  }
  if (!rest.startsWith("{")) return null;
  try {
    const parsed: unknown = JSON.parse(rest);
    if (!isRecord(parsed)) return null;
    if (name === "CaseMediaGallery" && Array.isArray(parsed.items)) return null;
    return { component: name as NotionCaseEmbedComponentName, options: parsed };
  } catch {
    return null;
  }
}

export function tryParseCaseEmbedWrapperClose(plain: string): NotionCaseEmbedComponentName | null {
  const m = plain.trim().match(WRAPPER_CLOSE_RE);
  if (!m) return null;
  const name = m[1]!;
  if (!WHITELIST.has(name) || !CASE_EMBED_WRAPPER_COMPONENTS.has(name)) return null;
  return name as NotionCaseEmbedComponentName;
}

/** Opções válidas na linha de abertura do wrapper `CaseMediaGallery` (sem `items`). */
export function caseMediaGalleryPropsFromWrapperOptions(obj: Record<string, unknown>): {
  variant?: "uniform" | "headline";
  columns?: 2 | 3;
  id?: string;
  borderClass?: string;
} {
  const variant = obj.variant;
  const columns = obj.columns;
  return {
    variant: variant === "uniform" || variant === "headline" ? variant : undefined,
    columns: columns === 2 || columns === 3 ? columns : undefined,
    id: optString(obj, "id"),
    borderClass: optString(obj, "borderClass"),
  };
}

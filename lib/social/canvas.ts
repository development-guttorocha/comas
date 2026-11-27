import { SOCIAL_PALETTE_PRESETS } from "./presets";
import type { SocialPalette, TemplatePreset } from "./types";
import type { CompiledSlide, StudioAspect, StudioBlockJson } from "./studioTypes";

/**
 * Canvas do Estúdio: cada slide é uma prancheta livre (elementos posicionados em px na base
 * 1080×1350 ou 1080×1920), mas separado em três camadas:
 *  - Conteúdo (`content`): o que se diz, por papel (título, erro, acerto, citação…).
 *  - Composição (`layoutId` + elementos com `role`): como se organiza. Trocar o layout reconstrói
 *    os elementos a partir do conteúdo, sem perder o texto; os elementos livres (`role: "free"`)
 *    ficam onde a Renata os colocou.
 *  - Estilo (`paletteId` do deck + tokens de cor): a atmosfera, trocável sem refazer nada.
 */

/* ---------------------------------------------------------------- tipos */

export type CanvasColor = keyof SocialPalette | "white" | "black" | "note" | "transparent" | "contrast";
export type CanvasFont = "serif" | "sans" | "display" | "hand";
export type CanvasTexture = "none" | "paper" | "grid" | "lines" | "dots";
export type TextVariant = "plain" | "pill" | "tarja" | "note" | "card" | "marker";

export type ContentKey =
  | "eyebrow" | "title" | "subtitle" | "body" | "wrongLabel" | "wrong" | "rightLabel" | "right"
  | "note" | "quote" | "author" | "step" | "items" | "cta" | "image";
export type CanvasRole = ContentKey | "chrome" | "decor" | "free";
export type SlideKind = "cover" | "before_after" | "step" | "checklist" | "quote" | "image" | "cta" | "free";
export type SlideContent = Partial<Record<ContentKey, string>> & { kind: SlideKind };

type ElBase = { id: string; role: CanvasRole; part?: number; x: number; y: number; w: number; h: number; rotation: number };
export type CanvasTextEl = ElBase & {
  type: "text";
  text: string;
  font: CanvasFont;
  size: number;
  weight: number;
  color: CanvasColor;
  fill?: CanvasColor;
  variant: TextVariant;
  align: "left" | "center" | "right";
  italic?: boolean;
  upper?: boolean;
  list?: "check" | "dot" | "number";
  prefix?: string;
  lineHeight?: number;
};
export type CanvasShapeEl = ElBase & {
  type: "shape";
  shape: "rect" | "circle" | "line" | "arrow" | "tape" | "underline";
  fill: CanvasColor;
  radius?: number;
  opacity?: number;
};
export type CanvasImageEl = ElBase & { type: "image"; src: string; radius?: number; overlay?: number };
export type CanvasElement = CanvasTextEl | CanvasShapeEl | CanvasImageEl;

export type CanvasSlide = {
  id: string;
  layoutId: string;
  background: CanvasColor;
  texture: CanvasTexture;
  content: SlideContent;
  elements: CanvasElement[];
};

export type StudioCanvas = { version: 1; paletteId: string; slides: CanvasSlide[] };

/* ---------------------------------------------------------------- medidas */

/** Margem de respiro: nada sai dela ao arrastar. */
export const CANVAS_MARGIN = 56;
export const CANVAS_SIZE: Record<StudioAspect, { width: number; height: number }> = {
  carousel: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
};

export type Frame = { x: number; y: number; w: number; h: number };

/** Área útil do layout (Stories reservam o topo e o rodapé da interface do Instagram). */
export function contentFrame(aspect: StudioAspect): Frame {
  const { width, height } = CANVAS_SIZE[aspect];
  const top = aspect === "story" ? 230 : 104;
  const bottom = aspect === "story" ? 260 : 120;
  return { x: 96, y: top, w: width - 192, h: height - top - bottom };
}

/** Mantém o elemento inteiro dentro da margem de respiro (considerando o tamanho, não a rotação). */
export function clampToMargin(el: Pick<ElBase, "x" | "y" | "w" | "h">, aspect: StudioAspect, margin = CANVAS_MARGIN) {
  const { width, height } = CANVAS_SIZE[aspect];
  const w = Math.min(el.w, width - margin * 2);
  const h = Math.min(el.h, height - margin * 2);
  return {
    w,
    h,
    x: Math.round(Math.min(Math.max(el.x, margin), width - margin - w)),
    y: Math.round(Math.min(Math.max(el.y, margin), height - margin - h)),
  };
}

/* ---------------------------------------------------------------- cor */

export const CANVAS_PALETTES = SOCIAL_PALETTE_PRESETS;
export const DEFAULT_PALETTE_ID = CANVAS_PALETTES[0]!.id;

export function paletteById(id: string | undefined): SocialPalette {
  return (CANVAS_PALETTES.find(p => p.id === id) ?? CANVAS_PALETTES[0]!).palette;
}

/** Paleta sugerida por editoria (o deck pode trocar depois). */
export const PRESET_PALETTE: Record<TemplatePreset, string> = {
  repertorio_banca: "indigo_mostarda",
  before_after: "indigo_lavanda",
  cycle_steps: "bordo_reta_final",
  radar_temas: "terracota_historia",
  quick_tip: "rosa_manifesto",
};

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 1;
  const n = parseInt(m[1]!, 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

const FIXED: Record<string, string> = { white: "#FFFFFF", black: "#16121F", note: "#F8E07A", transparent: "transparent" };

/** Resolve um token de cor; `contrast` escolhe texto claro ou escuro conforme o fundo. */
export function resolveColor(token: CanvasColor | undefined, palette: SocialPalette, behind?: string): string {
  if (!token) return "transparent";
  if (token === "contrast") {
    const bg = behind && behind !== "transparent" ? behind : palette.background;
    const darkest = [palette.primary, palette.background, palette.surface, palette.accent]
      .slice()
      .sort((a, b) => luminance(a) - luminance(b))[0]!;
    return luminance(bg) > 0.36 ? (luminance(darkest) < 0.12 ? darkest : FIXED.black!) : "#FFFFFF";
  }
  if (token in FIXED) return FIXED[token]!;
  return palette[token as keyof SocialPalette] ?? "transparent";
}

export const FONT_STACK: Record<CanvasFont, string> = {
  serif: "var(--font-studio-serif), Georgia, 'Times New Roman', serif",
  sans: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
  display: "var(--font-studio-display), 'Archivo Black', Impact, system-ui, sans-serif",
  hand: "var(--font-studio-hand), 'Caveat', 'Comic Sans MS', cursive",
};

/* ---------------------------------------------------------------- ids */

let counter = 0;
export const uid = (prefix = "el") => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/* ---------------------------------------------------------------- construtores */

type TextOpts = Partial<Omit<CanvasTextEl, "type" | "id" | "role" | "text" | "x" | "y" | "w" | "h">>;
export function textEl(role: CanvasRole, text: string, box: Frame, opts: TextOpts = {}): CanvasTextEl {
  return {
    id: uid("t"),
    type: "text",
    role,
    text,
    x: Math.round(box.x),
    y: Math.round(box.y),
    w: Math.round(box.w),
    h: Math.round(box.h),
    rotation: 0,
    font: "sans",
    size: 40,
    weight: 500,
    color: "contrast",
    variant: "plain",
    align: "left",
    lineHeight: 1.2,
    ...opts,
  };
}

export function shapeEl(role: CanvasRole, shape: CanvasShapeEl["shape"], box: Frame, fill: CanvasColor, opts: Partial<CanvasShapeEl> = {}): CanvasShapeEl {
  return { id: uid("s"), type: "shape", role, shape, fill, x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.w), h: Math.round(box.h), rotation: 0, ...opts };
}

export function imageEl(role: CanvasRole, src: string, box: Frame, opts: Partial<CanvasImageEl> = {}): CanvasImageEl {
  return { id: uid("i"), type: "image", role, src, x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.w), h: Math.round(box.h), rotation: 0, ...opts };
}

/* ---------------------------------------------------------------- layouts */

export type LayoutCtx = { aspect: StudioAspect; W: number; H: number; f: Frame };
export type LayoutResult = { background: CanvasColor; texture: CanvasTexture; elements: CanvasElement[] };
export type LayoutDef = { id: string; label: string; hint: string; kinds: SlideKind[]; build: (c: SlideContent, ctx: LayoutCtx) => LayoutResult };

const first = (...values: Array<string | undefined>) => values.find(v => v && v.trim())?.trim() ?? "";
const at = (f: Frame, x: number, y: number, w: number, h: number): Frame => ({ x: f.x + f.w * x, y: f.y + f.h * y, w: f.w * w, h: f.h * h });
const mainText = (c: SlideContent) => first(c.title, c.quote, c.body, c.items);
const supportText = (c: SlideContent) => {
  const used = mainText(c);
  return [c.subtitle, c.body, c.quote, c.items ? c.items.split("\n").map(l => `• ${l}`).join("\n") : undefined, c.note]
    .filter((v): v is string => Boolean(v && v.trim() && v.trim() !== used && !(c.items && v === c.items)))
    .slice(0, 1)[0] ?? "";
};

/** Rodapé com @ e contador: placeholders resolvidos na hora de desenhar. */
function chrome(ctx: LayoutCtx, color: CanvasColor = "contrast"): CanvasElement[] {
  const y = ctx.H - (ctx.aspect === "story" ? 210 : 92);
  return [
    textEl("chrome", "{{handle}}", { x: ctx.f.x, y, w: 460, h: 44 }, { size: 26, weight: 600, color, lineHeight: 1 }),
    textEl("chrome", "{{counter}}", { x: ctx.W - ctx.f.x - 200, y, w: 200, h: 44 }, { size: 26, weight: 600, color, align: "right", lineHeight: 1 }),
  ];
}

function splitChunks(text: string, maxChars: number, maxChunks: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > maxChars && out.length < maxChunks - 1) {
      out.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) out.push(cur);
  return out;
}

export const LAYOUTS: LayoutDef[] = [
  {
    id: "manchete",
    label: "Manchete",
    hint: "Capa editorial em papel, serifada grande e pílula",
    kinds: ["cover", "free", "quote", "cta"],
    build: (c, ctx) => {
      const { f } = ctx;
      const els: CanvasElement[] = [];
      if (c.eyebrow) els.push(textEl("eyebrow", c.eyebrow, at(f, 0, 0.02, 0.62, 0.055), { variant: "pill", fill: "accent", color: "contrast", size: 26, weight: 700, upper: true, lineHeight: 1 }));
      els.push(textEl("title", mainText(c) || "Escreva o título", at(f, 0, 0.13, 1, 0.46), { font: "serif", size: 104, weight: 800, color: "primary", lineHeight: 1.02 }));
      els.push(shapeEl("decor", "underline", at(f, 0, 0.6, 0.34, 0.016), "accent"));
      const sub = first(c.subtitle, c.body);
      if (sub) els.push(textEl("subtitle", sub, at(f, 0, 0.65, 0.86, 0.17), { size: 36, color: "muted", lineHeight: 1.3 }));
      els.push(textEl("cta", first(c.cta, "deslize →"), at(f, 0.5, 0.86, 0.5, 0.07), { font: "hand", size: 48, weight: 700, color: "accent", align: "right" }));
      return { background: "background", texture: "paper", elements: [...els, ...chrome(ctx, "muted")] };
    },
  },
  {
    id: "bloco",
    label: "Bloco de cor",
    hint: "Fundo cheio, caixa-alta pesada e tarja torta",
    kinds: ["cover", "cta", "quote", "free"],
    build: (c, ctx) => {
      const { f } = ctx;
      const els: CanvasElement[] = [];
      if (c.eyebrow) els.push(textEl("eyebrow", c.eyebrow, at(f, 0, 0.03, 1, 0.05), { size: 28, weight: 700, upper: true, color: "contrast", align: "center", lineHeight: 1 }));
      els.push(textEl("title", mainText(c) || "Escreva o título", at(f, 0, 0.14, 1, 0.48), { font: "display", size: 112, weight: 900, upper: true, color: "contrast", align: "center", lineHeight: 0.98 }));
      const sub = first(c.subtitle, c.body, c.author);
      if (sub) {
        const r = { ...at(f, 0.06, 0.66, 0.88, 0.13), rotation: -2 };
        els.push({ ...textEl("subtitle", sub, r, { variant: "tarja", fill: "background", color: "contrast", size: 36, weight: 600, align: "center", lineHeight: 1.25 }), rotation: -2 });
      }
      els.push(textEl("cta", first(c.cta, "deslize →"), at(f, 0.3, 0.87, 0.4, 0.06), { variant: "pill", fill: "background", color: "contrast", size: 28, weight: 700, align: "center", lineHeight: 1 }));
      return { background: "accent", texture: "none", elements: [...els, ...chrome(ctx)] };
    },
  },
  {
    id: "foto-tarja",
    label: "Foto + tarja",
    hint: "Foto sangrada com título em tarja",
    kinds: ["cover", "image", "free", "quote"],
    build: (c, ctx) => {
      const { f, W, H } = ctx;
      const els: CanvasElement[] = [imageEl("image", c.image ?? "", { x: 0, y: 0, w: W, h: H }, { overlay: 0.18 })];
      if (c.eyebrow) els.push(textEl("eyebrow", c.eyebrow, at(f, 0, 0.02, 0.6, 0.055), { variant: "pill", fill: "background", color: "contrast", size: 26, weight: 700, upper: true, lineHeight: 1 }));
      els.push({ ...textEl("title", mainText(c) || "Escreva o título", at(f, 0, 0.56, 0.94, 0.22), { variant: "tarja", fill: "accent", color: "contrast", font: "serif", size: 70, weight: 800, lineHeight: 1.08 }), rotation: -1.5 });
      const sub = first(c.subtitle, c.body);
      if (sub) els.push(textEl("subtitle", sub, at(f, 0, 0.81, 0.8, 0.1), { variant: "tarja", fill: "background", color: "contrast", size: 30, weight: 600, lineHeight: 1.25 }));
      return { background: "primary", texture: "none", elements: [...els, ...chrome(ctx, "white")] };
    },
  },
  {
    id: "verbete",
    label: "Verbete comentado",
    hint: "Cartão de dicionário com ❌ erro real e ✔️ forma correta",
    kinds: ["before_after", "step", "free"],
    build: (c, ctx) => {
      const { f } = ctx;
      const card = at(f, 0, 0.02, 1, 0.92);
      const inner = { x: card.x + 56, y: card.y + 56, w: card.w - 112, h: card.h - 112 };
      const els: CanvasElement[] = [
        shapeEl("decor", "rect", card, "surface", { radius: 32 }),
        shapeEl("decor", "tape", { x: card.x + card.w - 150, y: card.y - 18, w: 70, h: 120 }, "accent"),
      ];
      els.push(textEl("title", first(c.title, c.quote) || "PALAVRA", at(inner, 0, 0, 0.85, 0.16), { font: "serif", size: 84, weight: 800, color: "primary", lineHeight: 1 }));
      const sub = first(c.eyebrow, c.subtitle, c.step);
      if (sub) els.push(textEl("eyebrow", sub, at(inner, 0, 0.17, 1, 0.06), { size: 28, italic: true, color: "muted", lineHeight: 1.1 }));
      const wrong = first(c.wrong, c.body);
      if (wrong) els.push(textEl(c.wrong ? "wrong" : "body", wrong, at(inner, 0, 0.28, 1, 0.18), { prefix: c.wrong ? "❌ " : "", size: 38, weight: 600, color: c.wrong ? "wrong" : "primary", lineHeight: 1.25 }));
      if (c.right) els.push(textEl("right", c.right, at(inner, 0, 0.5, 1, 0.18), { prefix: "✔️ ", size: 38, weight: 600, color: "right", lineHeight: 1.25 }));
      const note = first(c.note);
      if (note) els.push(textEl("note", note, at(inner, 0, 0.74, 1, 0.24), { variant: "card", fill: "accentSoft", color: "primary", size: 30, lineHeight: 1.3 }));
      return { background: "accent", texture: "none", elements: [...els, ...chrome(ctx)] };
    },
  },
  {
    id: "antes-depois",
    label: "Antes × depois",
    hint: "Duas metades com rótulos de erro e acerto",
    kinds: ["before_after"],
    build: (c, ctx) => {
      const { f } = ctx;
      const els: CanvasElement[] = [];
      els.push(textEl("title", first(c.title) || "Na prática", at(f, 0, 0, 1, 0.12), { font: "serif", size: 64, weight: 800, color: "primary", lineHeight: 1.05 }));
      els.push(textEl("wrongLabel", first(c.wrongLabel, "Antes"), at(f, 0, 0.16, 0.4, 0.05), { variant: "pill", fill: "wrong", color: "white", size: 26, weight: 700, upper: true, lineHeight: 1 }));
      els.push(textEl("wrong", first(c.wrong) || "Frase com problema", at(f, 0, 0.23, 1, 0.22), { font: "serif", size: 46, italic: true, color: "primary", lineHeight: 1.25 }));
      els.push(shapeEl("decor", "line", at(f, 0, 0.48, 1, 0.004), "muted", { opacity: 0.5 }));
      els.push(textEl("rightLabel", first(c.rightLabel, "Depois"), at(f, 0, 0.52, 0.4, 0.05), { variant: "pill", fill: "right", color: "white", size: 26, weight: 700, upper: true, lineHeight: 1 }));
      els.push(textEl("right", first(c.right) || "Versão adequada", at(f, 0, 0.59, 1, 0.22), { font: "serif", size: 46, weight: 600, color: "primary", lineHeight: 1.25 }));
      if (c.note) els.push(textEl("note", c.note, at(f, 0, 0.84, 1, 0.1), { font: "hand", size: 40, color: "accent", lineHeight: 1.1 }));
      return { background: "background", texture: "paper", elements: [...els, ...chrome(ctx, "muted")] };
    },
  },
  {
    id: "post-it",
    label: "Post-it",
    hint: "Bilhete torto em letra de mão sobre fundo de cor",
    kinds: ["step", "quote", "free", "checklist", "cta"],
    build: (c, ctx) => {
      const { f } = ctx;
      const els: CanvasElement[] = [];
      if (c.eyebrow) els.push(textEl("eyebrow", c.eyebrow, at(f, 0, 0.02, 0.6, 0.05), { variant: "pill", fill: "background", color: "contrast", size: 26, weight: 700, upper: true, lineHeight: 1 }));
      const title = first(c.title);
      if (title) els.push(textEl("title", title, at(f, 0, 0.1, 1, 0.18), { font: "display", size: 66, weight: 900, color: "contrast", upper: true, lineHeight: 1.02 }));
      const body = first(c.quote, c.body, c.items ? c.items.split("\n").map(l => `• ${l}`).join("\n") : undefined, c.subtitle, c.note) || "Escreva o recado";
      const role: ContentKey = c.quote ? "quote" : c.body ? "body" : c.items ? "items" : c.subtitle ? "subtitle" : "note";
      els.push({ ...textEl(role, role === "items" ? (c.items ?? "") : body, at(f, 0.05, 0.33, 0.86, 0.5), { variant: "note", fill: "note", color: "black", font: "hand", size: 54, weight: 600, lineHeight: 1.15, list: role === "items" ? "dot" : undefined }), rotation: -3 });
      els.push({ ...shapeEl("decor", "arrow", at(f, 0.68, 0.84, 0.26, 0.08), "note"), rotation: -12 });
      if (c.author) els.push(textEl("author", c.author, at(f, 0.05, 0.86, 0.6, 0.05), { size: 28, weight: 600, color: "contrast" }));
      return { background: "accent", texture: "dots", elements: [...els, ...chrome(ctx)] };
    },
  },
  {
    id: "passo",
    label: "Passo numerado",
    hint: "Número gigante, título e dica grifada",
    kinds: ["step", "free", "checklist"],
    build: (c, ctx) => {
      const { f } = ctx;
      const els: CanvasElement[] = [];
      els.push(textEl("step", first(c.step, "01"), at(f, 0, 0, 0.5, 0.22), { font: "serif", size: 240, weight: 800, color: "accent", lineHeight: 0.9 }));
      if (c.eyebrow) els.push(textEl("eyebrow", c.eyebrow, at(f, 0.52, 0.06, 0.48, 0.05), { size: 26, weight: 700, upper: true, color: "muted", align: "right", lineHeight: 1 }));
      els.push(textEl("title", first(c.title, c.quote) || "Título do passo", at(f, 0, 0.27, 1, 0.2), { font: "serif", size: 68, weight: 800, color: "primary", lineHeight: 1.06 }));
      const body = first(c.body, c.subtitle, c.items);
      if (body) els.push(textEl(c.body ? "body" : c.subtitle ? "subtitle" : "items", body, at(f, 0, 0.5, 1, 0.27), { size: 38, color: "primary", lineHeight: 1.35, list: !c.body && !c.subtitle && c.items ? "dot" : undefined }));
      if (c.note) els.push(textEl("note", c.note, at(f, 0, 0.8, 1, 0.12), { variant: "marker", fill: "accentSoft", color: "primary", size: 32, weight: 600, lineHeight: 1.3 }));
      return { background: "background", texture: "lines", elements: [...els, ...chrome(ctx, "muted")] };
    },
  },
  {
    id: "checklist",
    label: "Checklist",
    hint: "Lista de conferência num cartão suave",
    kinds: ["checklist", "step", "free"],
    build: (c, ctx) => {
      const { f } = ctx;
      const els: CanvasElement[] = [];
      if (c.eyebrow) els.push(textEl("eyebrow", c.eyebrow, at(f, 0, 0.01, 1, 0.05), { size: 26, weight: 700, upper: true, color: "accent", lineHeight: 1 }));
      els.push(textEl("title", first(c.title) || "Para revisar", at(f, 0, 0.08, 1, 0.18), { font: "serif", size: 70, weight: 800, color: "primary", lineHeight: 1.05 }));
      const card = at(f, 0, 0.3, 1, 0.52);
      els.push(shapeEl("decor", "rect", card, "accentSoft", { radius: 28 }));
      const items = first(c.items, c.body) || "Item 1\nItem 2\nItem 3";
      els.push(textEl(c.items ? "items" : "body", items, { x: card.x + 44, y: card.y + 40, w: card.w - 88, h: card.h - 80 }, { size: 38, weight: 500, color: "primary", lineHeight: 1.45, list: "check" }));
      if (c.note) els.push(textEl("note", c.note, at(f, 0, 0.85, 1, 0.08), { font: "hand", size: 42, weight: 700, color: "accent" }));
      return { background: "background", texture: "grid", elements: [...els, ...chrome(ctx, "muted")] };
    },
  },
  {
    id: "citacao",
    label: "Citação",
    hint: "Aspas enormes e serifada itálica",
    kinds: ["quote", "cover", "free"],
    build: (c, ctx) => {
      const { f } = ctx;
      const els: CanvasElement[] = [];
      els.push(textEl("decor", "“", at(f, -0.02, -0.04, 0.4, 0.3), { font: "serif", size: 360, weight: 800, color: "accent", lineHeight: 1 }));
      els.push(textEl("quote", first(c.quote, c.title, c.body) || "Uma frase que fica", at(f, 0, 0.24, 1, 0.48), { font: "serif", size: 64, weight: 600, italic: true, color: "primary", lineHeight: 1.22 }));
      const author = first(c.author, c.eyebrow);
      if (author) els.push(textEl(c.author ? "author" : "eyebrow", author, at(f, 0, 0.76, 0.7, 0.055), { variant: "pill", fill: "accent", color: "contrast", size: 28, weight: 700, lineHeight: 1 }));
      return { background: "background", texture: "paper", elements: [...els, ...chrome(ctx, "muted")] };
    },
  },
  {
    id: "manifesto",
    label: "Tarjas de colagem",
    hint: "Frase recortada em tarjas tortas, estilo manifesto",
    kinds: ["quote", "cover", "free", "cta"],
    build: (c, ctx) => {
      const { f } = ctx;
      const els: CanvasElement[] = [];
      if (c.eyebrow) els.push(textEl("eyebrow", c.eyebrow, at(f, 0, 0.02, 1, 0.06), { font: "hand", size: 50, weight: 700, color: "accent" }));
      const role: ContentKey = c.title ? "title" : c.quote ? "quote" : "body";
      const chunks = splitChunks(mainText(c) || "Escrita é processo", 15, 5);
      const rowH = Math.min(0.13, 0.62 / chunks.length);
      chunks.forEach((chunk, i) => {
        const box = at(f, i % 2 ? 0.08 : 0, 0.12 + i * (rowH + 0.012), 0.92, rowH);
        els.push({ ...textEl(role, chunk, box, { part: i, variant: "tarja", fill: i % 2 ? "accent" : "primary", color: "contrast", font: "display", size: 76, weight: 900, upper: true, lineHeight: 1 }), rotation: i % 2 ? 1.5 : -2 });
      });
      const sub = first(c.subtitle, c.body !== mainText(c) ? c.body : undefined, c.author, c.cta);
      if (sub) els.push(textEl(c.subtitle ? "subtitle" : c.body && c.body !== mainText(c) ? "body" : c.author ? "author" : "cta", sub, at(f, 0, 0.82, 1, 0.1), { size: 34, weight: 600, color: "primary", lineHeight: 1.3 }));
      return { background: "background", texture: "paper", elements: [...els, ...chrome(ctx, "muted")] };
    },
  },
  {
    id: "foto-dividida",
    label: "Foto dividida",
    hint: "Foto em cima, texto embaixo",
    kinds: ["image", "cover", "step", "free"],
    build: (c, ctx) => {
      const { f, W, H } = ctx;
      const split = Math.round(H * 0.5);
      const els: CanvasElement[] = [imageEl("image", c.image ?? "", { x: 0, y: 0, w: W, h: split })];
      const below: Frame = { x: f.x, y: split + 56, w: f.w, h: H - split - 56 - (ctx.aspect === "story" ? 280 : 140) };
      if (c.eyebrow) els.push(textEl("eyebrow", c.eyebrow, at(below, 0, 0, 0.6, 0.12), { variant: "pill", fill: "accent", color: "contrast", size: 26, weight: 700, upper: true, lineHeight: 1 }));
      els.push(textEl("title", mainText(c) || "Escreva o título", at(below, 0, 0.18, 1, 0.42), { font: "serif", size: 64, weight: 800, color: "primary", lineHeight: 1.06 }));
      const sub = supportText(c) || first(c.subtitle);
      if (sub) els.push(textEl(c.subtitle ? "subtitle" : "body", sub, at(below, 0, 0.64, 1, 0.36), { size: 34, color: "muted", lineHeight: 1.3 }));
      return { background: "background", texture: "none", elements: [...els, ...chrome(ctx, "muted")] };
    },
  },
  {
    id: "chamada",
    label: "Chamada final",
    hint: "Convite para salvar, centralizado",
    kinds: ["cta", "quote"],
    build: (c, ctx) => {
      const { f } = ctx;
      const els: CanvasElement[] = [];
      if (c.eyebrow) els.push(textEl("eyebrow", c.eyebrow, at(f, 0, 0.12, 1, 0.05), { size: 28, weight: 700, upper: true, color: "contrast", align: "center", lineHeight: 1 }));
      els.push(textEl("title", mainText(c) || "Salve para consultar depois", at(f, 0, 0.22, 1, 0.3), { font: "serif", size: 84, weight: 800, color: "contrast", align: "center", lineHeight: 1.05 }));
      const body = first(c.body, c.subtitle);
      if (body) els.push(textEl(c.body ? "body" : "subtitle", body, at(f, 0.06, 0.55, 0.88, 0.14), { size: 36, color: "contrast", align: "center", lineHeight: 1.3 }));
      els.push(textEl("cta", first(c.cta, "Vamos juntos? :)"), at(f, 0.15, 0.73, 0.7, 0.07), { variant: "pill", fill: "background", color: "contrast", size: 32, weight: 700, align: "center", lineHeight: 1 }));
      els.push({ ...textEl("decor", "✦", at(f, 0.84, 0.04, 0.14, 0.1), { size: 90, color: "contrast", align: "center" }), rotation: 12 });
      return { background: "accent", texture: "dots", elements: [...els, ...chrome(ctx)] };
    },
  },
  {
    id: "impacto",
    label: "Frase de impacto",
    hint: "Uma frase gigante com grifo marca-texto",
    kinds: ["free", "quote", "step", "cover", "cta"],
    build: (c, ctx) => {
      const { f } = ctx;
      const els: CanvasElement[] = [];
      const main = mainText(c) || "Escrita é processo";
      const role: ContentKey = c.title ? "title" : c.quote ? "quote" : c.body ? "body" : "items";
      const marked = /==/.test(main) ? main : main.replace(/(\S+)(\s*[.!?…]*)$/, "==$1==$2");
      els.push(textEl(role, marked, at(f, 0, 0.16, 1, 0.52), { font: "sans", size: 100, weight: 800, color: "primary", lineHeight: 1.04 }));
      const sub = first(c.subtitle, role !== "body" ? c.body : undefined, c.author, c.note);
      if (sub) els.push(textEl(c.subtitle ? "subtitle" : role !== "body" && c.body ? "body" : c.author ? "author" : "note", sub, at(f, 0, 0.74, 0.8, 0.14), { size: 34, color: "muted", lineHeight: 1.3 }));
      if (c.eyebrow) els.push(textEl("eyebrow", c.eyebrow, at(f, 0, 0.03, 0.7, 0.05), { size: 26, weight: 700, upper: true, color: "accent", lineHeight: 1 }));
      return { background: "surface", texture: "grid", elements: [...els, ...chrome(ctx, "muted")] };
    },
  },
];

export const layoutById = (id: string) => LAYOUTS.find(l => l.id === id) ?? LAYOUTS[0]!;
export const layoutsFor = (kind: SlideKind) => {
  const fit = LAYOUTS.filter(l => l.kinds.includes(kind));
  return [...fit, ...LAYOUTS.filter(l => !l.kinds.includes(kind))];
};

/* ---------------------------------------------------------------- slide ops */

export function buildSlide(content: SlideContent, layoutId: string, aspect: StudioAspect, keep: CanvasElement[] = [], id = uid("slide")): CanvasSlide {
  const { width: W, height: H } = CANVAS_SIZE[aspect];
  const layout = layoutById(layoutId);
  const built = layout.build(content, { aspect, W, H, f: contentFrame(aspect) });
  return { id, layoutId: layout.id, background: built.background, texture: built.texture, content: { ...content }, elements: [...built.elements, ...keep] };
}

/** Troca a composição: reconstrói os elementos do layout a partir do conteúdo e mantém os livres. */
export function applyLayout(slide: CanvasSlide, layoutId: string, aspect: StudioAspect): CanvasSlide {
  const synced = syncContent(slide);
  return buildSlide(synced.content, layoutId, aspect, slide.elements.filter(e => e.role === "free"), slide.id);
}

/** Um layout diferente do atual, entre os que combinam com o tipo do slide. */
export function remixLayoutId(slide: CanvasSlide, rand: () => number = Math.random, avoid: string[] = []): string {
  const fit = LAYOUTS.filter(l => l.kinds.includes(slide.content.kind) && l.id !== slide.layoutId && !avoid.includes(l.id));
  const pool = fit.length ? fit : LAYOUTS.filter(l => l.id !== slide.layoutId);
  return pool[Math.floor(rand() * pool.length) % pool.length]!.id;
}

/** O conteúdo volta a refletir os textos editados direto na arte. */
export function syncContent(slide: CanvasSlide): CanvasSlide {
  const content: SlideContent = { ...slide.content };
  const byRole = new Map<ContentKey, CanvasElement[]>();
  for (const el of slide.elements) {
    if (el.role === "chrome" || el.role === "decor" || el.role === "free") continue;
    const list = byRole.get(el.role) ?? [];
    list.push(el);
    byRole.set(el.role, list);
  }
  for (const [role, els] of byRole) {
    if (role === "image") {
      const img = els.find(e => e.type === "image") as CanvasImageEl | undefined;
      if (img) content.image = img.src;
      continue;
    }
    const texts = els.filter((e): e is CanvasTextEl => e.type === "text").sort((a, b) => (a.part ?? 0) - (b.part ?? 0));
    if (texts.length) content[role] = texts.map(t => t.text).join(texts.length > 1 ? " " : "");
  }
  return { ...slide, content };
}

/** Uma prancheta vazia de texto livre. */
export function blankSlide(aspect: StudioAspect, layoutId = "impacto"): CanvasSlide {
  return buildSlide({ kind: "free", title: "Escreva aqui" }, layoutId, aspect);
}

/** Cópia profunda com ids novos. */
export function cloneSlide(slide: CanvasSlide): CanvasSlide {
  return { ...structuredClone(slide), id: uid("slide"), elements: slide.elements.map(e => ({ ...structuredClone(e), id: uid(e.type[0]) })) };
}

/** Reposiciona todos os slides para outro formato (4:5 ↔ 9:16), preservando os livres proporcionalmente. */
export function reflowCanvas(canvas: StudioCanvas, from: StudioAspect, to: StudioAspect): StudioCanvas {
  if (from === to) return canvas;
  const ratio = CANVAS_SIZE[to].height / CANVAS_SIZE[from].height;
  return {
    ...canvas,
    slides: canvas.slides.map(s => {
      const free = s.elements.filter(e => e.role === "free").map(e => ({ ...e, y: Math.round(e.y * ratio) }));
      return buildSlide(syncContent(s).content, s.layoutId, to, free, s.id);
    }),
  };
}

/* ---------------------------------------------------------------- roteiro ↔ canvas */

export function compiledToContent(s: CompiledSlide): SlideContent {
  switch (s.kind) {
    case "cover":
      return { kind: "cover", eyebrow: s.eyebrow, title: s.title, subtitle: s.subtitle, cta: s.cta, image: s.imageUrl };
    case "before_after":
      return { kind: "before_after", eyebrow: s.eyebrow, title: s.title, wrongLabel: s.wrongLabel, wrong: s.wrongText, rightLabel: s.rightLabel, right: s.rightText, note: s.note };
    case "step":
      return { kind: "step", step: s.stepNumber, eyebrow: s.eyebrow, title: s.title, body: s.body, note: s.tip };
    case "checklist":
      return { kind: "checklist", eyebrow: s.eyebrow, title: s.title, items: s.items.join("\n"), note: s.footerNote };
    case "quote":
      return { kind: "quote", eyebrow: s.eyebrow, quote: s.quote, author: s.author };
    case "image":
      return { kind: "image", eyebrow: s.eyebrow, title: s.title, body: s.caption, image: s.imageUrl };
    case "cta":
      return { kind: "cta", eyebrow: s.eyebrow, title: s.title, body: s.body, cta: s.buttonLabel };
    case "free":
      return {
        kind: "free",
        eyebrow: s.eyebrow,
        title: s.heading,
        body: s.paragraphs.map(p => (p.kind === "bullet" ? `• ${p.text}` : p.kind === "numbered" ? `– ${p.text}` : p.text)).join("\n") || undefined,
      };
  }
}

function cleanContent(c: SlideContent): SlideContent {
  const out: SlideContent = { kind: c.kind };
  for (const [k, v] of Object.entries(c)) if (k !== "kind" && typeof v === "string" && v.trim()) out[k as ContentKey] = v.trim();
  return out;
}

/** Monta os slides a partir do roteiro, variando a composição: nunca o mesmo layout duas vezes seguidas. */
export function slidesFromCompiled(compiled: CompiledSlide[], aspect: StudioAspect, seed = 0): CanvasSlide[] {
  let prev = "";
  const usage = new Map<string, number>();
  return compiled.map((s, i) => {
    const content = cleanContent(compiledToContent(s));
    const fit = LAYOUTS.filter(l => l.kinds.includes(content.kind) && l.id !== prev);
    const needsImage = (id: string) => (id === "foto-tarja" || id === "foto-dividida") && !content.image;
    const pool = (fit.filter(l => !needsImage(l.id)).length ? fit.filter(l => !needsImage(l.id)) : fit).slice();
    pool.sort((a, b) => (usage.get(a.id) ?? 0) - (usage.get(b.id) ?? 0));
    const least = pool.filter(l => (usage.get(l.id) ?? 0) === (usage.get(pool[0]!.id) ?? 0));
    const layout = least[(seed + i) % least.length] ?? LAYOUTS[0]!;
    prev = layout.id;
    usage.set(layout.id, (usage.get(layout.id) ?? 0) + 1);
    return buildSlide(content, layout.id, aspect);
  });
}

const inline = (text: string) => [{ type: "text", text, styles: {} }];

/** Atualiza o roteiro (BlockNote) com o que está nos slides. */
export function blocksFromCanvas(canvas: StudioCanvas): StudioBlockJson[] {
  const blocks: StudioBlockJson[] = [];
  for (const raw of canvas.slides) {
    const c = syncContent(raw).content;
    switch (c.kind) {
      case "cover":
        blocks.push({ type: "socialCover", props: { eyebrow: c.eyebrow ?? "", title: c.title ?? "", subtitle: c.subtitle ?? "", cta: c.cta ?? "", imageUrl: c.image ?? "", imageOverlay: 0.78 } });
        break;
      case "before_after":
        blocks.push({ type: "socialBeforeAfter", props: { eyebrow: c.eyebrow ?? "", title: c.title ?? "", wrongLabel: c.wrongLabel ?? "Antes", wrongText: c.wrong ?? "", rightLabel: c.rightLabel ?? "Depois", rightText: c.right ?? "", note: c.note ?? "" } });
        break;
      case "step":
        blocks.push({ type: "socialStep", props: { stepNumber: c.step ?? "01", eyebrow: c.eyebrow ?? "", title: c.title ?? "", body: c.body ?? "", tip: c.note ?? "" } });
        break;
      case "checklist":
        blocks.push({ type: "socialChecklist", props: { eyebrow: c.eyebrow ?? "", title: c.title ?? "", itemsJson: JSON.stringify((c.items ?? "").split("\n").map(s => s.trim()).filter(Boolean)), footerNote: c.note ?? "" } });
        break;
      case "quote":
        blocks.push({ type: "socialQuote", props: { eyebrow: c.eyebrow ?? "", quote: c.quote ?? c.title ?? "", author: c.author ?? "" } });
        break;
      case "image":
        blocks.push({ type: "socialImage", props: { eyebrow: c.eyebrow ?? "", title: c.title ?? "", caption: c.body ?? "", imageUrl: c.image ?? "", imageOverlay: 0.45 } });
        break;
      case "cta":
        blocks.push({ type: "socialCta", props: { eyebrow: c.eyebrow ?? "", title: c.title ?? "", body: c.body ?? "", buttonLabel: c.cta ?? "" } });
        break;
      default: {
        const heading = first(c.title, c.quote);
        if (heading) blocks.push({ type: "heading", props: { level: 2 }, content: inline(heading) });
        for (const line of first(c.body, c.items, c.subtitle).split("\n").map(l => l.trim()).filter(Boolean)) {
          const bullet = /^[•\-–]\s*/.test(line);
          blocks.push({ type: bullet ? "bulletListItem" : "paragraph", content: inline(line.replace(/^[•\-–]\s*/, "")) });
        }
        blocks.push({ type: "slideBreak", props: {} });
      }
    }
  }
  return blocks;
}

export function canvasFromCompiled(compiled: CompiledSlide[], aspect: StudioAspect, paletteId = DEFAULT_PALETTE_ID, seed = 0): StudioCanvas {
  return { version: 1, paletteId, slides: slidesFromCompiled(compiled, aspect, seed) };
}

/** Lê com tolerância o que veio do banco. */
export function readCanvas(value: unknown): StudioCanvas | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<StudioCanvas>;
  if (v.version !== 1 || !Array.isArray(v.slides)) return null;
  return {
    version: 1,
    paletteId: typeof v.paletteId === "string" ? v.paletteId : DEFAULT_PALETTE_ID,
    slides: v.slides.filter(s => s && Array.isArray(s.elements) && s.content && typeof s.content.kind === "string"),
  };
}

/* ---------------------------------------------------------------- texto */

export type TextRun = { text: string; mark?: boolean; bold?: boolean };

/** `==grifo==` vira marca-texto e `*negrito*` vira negrito. */
export function parseMarks(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const re = /==([^=]+)==|\*([^*\n]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index) });
    if (m[1] !== undefined) runs.push({ text: m[1], mark: true });
    else runs.push({ text: m[2]!, bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs;
}

export const stripMarks = (text: string) => text.replace(/==([^=]+)==/g, "$1").replace(/\*([^*\n]+)\*/g, "$1");

export function fillPlaceholders(text: string, vars: { handle: string; index: number; total: number }): string {
  return text
    .replace(/\{\{handle\}\}/g, vars.handle)
    .replace(/\{\{counter\}\}/g, vars.total > 1 ? `${vars.index + 1}/${vars.total}` : "");
}

/* ---------------------------------------------------------------- elementos livres */

export type ElementPreset = { id: string; label: string; make: (aspect: StudioAspect) => CanvasElement };

const centerBox = (aspect: StudioAspect, w: number, h: number): Frame => {
  const { width, height } = CANVAS_SIZE[aspect];
  return { x: (width - w) / 2, y: (height - h) / 2, w, h };
};

export const ELEMENT_PRESETS: ElementPreset[] = [
  { id: "texto", label: "Texto", make: a => textEl("free", "Novo texto", centerBox(a, 640, 140), { size: 48, weight: 600, color: "contrast" }) },
  { id: "titulo", label: "Título serifado", make: a => textEl("free", "Título", centerBox(a, 800, 200), { font: "serif", size: 88, weight: 800, color: "contrast", lineHeight: 1.04 }) },
  { id: "pilula", label: "Pílula", make: a => textEl("free", "DESTAQUE", centerBox(a, 360, 64), { variant: "pill", fill: "accent", color: "contrast", size: 26, weight: 700, upper: true, align: "center", lineHeight: 1 }) },
  { id: "tarja", label: "Tarja", make: a => ({ ...textEl("free", "frase em tarja", centerBox(a, 700, 110), { variant: "tarja", fill: "primary", color: "contrast", font: "display", size: 60, weight: 900, upper: true, lineHeight: 1 }), rotation: -2 }) },
  { id: "post-it", label: "Post-it", make: a => ({ ...textEl("free", "Anota no post-it do lado da cama!", centerBox(a, 460, 400), { variant: "note", fill: "note", color: "black", font: "hand", size: 50, weight: 600, lineHeight: 1.12 }), rotation: -4 }) },
  { id: "mao", label: "Letra de mão", make: a => textEl("free", "Vamos juntos? :)", centerBox(a, 560, 110), { font: "hand", size: 64, weight: 700, color: "accent" }) },
  { id: "cartao", label: "Cartão", make: a => textEl("free", "Comentário sincerão da Prô", centerBox(a, 720, 220), { variant: "card", fill: "accentSoft", color: "primary", size: 34, lineHeight: 1.3 }) },
  { id: "erro", label: "Erro ❌", make: a => textEl("free", "As ONGs corroboram com o governo", centerBox(a, 820, 120), { prefix: "❌ ", size: 38, weight: 600, color: "wrong" }) },
  { id: "acerto", label: "Acerto ✔️", make: a => textEl("free", "Os dados corroboram a tese", centerBox(a, 820, 120), { prefix: "✔️ ", size: 38, weight: 600, color: "right" }) },
  { id: "seta", label: "Seta", make: a => ({ ...shapeEl("free", "arrow", centerBox(a, 260, 90), "accent"), rotation: -10 }) },
  { id: "sublinhado", label: "Sublinhado", make: a => shapeEl("free", "underline", centerBox(a, 360, 22), "accent") },
  { id: "circulo", label: "Círculo", make: a => shapeEl("free", "circle", centerBox(a, 220, 220), "accentSoft") },
  { id: "retangulo", label: "Bloco", make: a => shapeEl("free", "rect", centerBox(a, 520, 320), "surface", { radius: 28 }) },
  { id: "fita", label: "Fita adesiva", make: a => ({ ...shapeEl("free", "tape", centerBox(a, 200, 60), "note", { opacity: 0.85 }), rotation: -8 }) },
  { id: "sticker", label: "Sticker ✦", make: a => ({ ...textEl("free", "✦", centerBox(a, 160, 160), { size: 120, color: "accent", align: "center", lineHeight: 1 }), rotation: 10 }) },
  { id: "imagem", label: "Imagem", make: a => imageEl("free", "", centerBox(a, 600, 600), { radius: 24 }) },
];

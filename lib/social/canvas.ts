import { SOCIAL_PALETTE_PRESETS } from "./presets";
import type { SocialPalette, TemplatePreset } from "./types";
import type { CompiledSlide, StudioAspect, StudioBlockJson } from "./studioTypes";

/**
 * Canvas do Estúdio: cada slide é uma prancheta livre (elementos posicionados em px na base
 * 1080×1350 ou 1080×1920), mas separado em três camadas:
 *  - Conteúdo (`content`): o que se diz, por papel (título, erro, acerto, citação…).
 *  - Composição (`layoutId` + elementos com `role`): como se organiza, em 3 famílias gráficas
 *    (`editorial`, `minimal`, `pop`). Trocar o layout reconstrói os elementos a partir do conteúdo
 *    sem perder o texto; os elementos livres (`role: "free"`) ficam onde a Renata os colocou.
 *  - Estilo (`paletteId` do deck + tokens de cor com contraste WCAG >= 4.5:1): a atmosfera.
 */

/* ---------------------------------------------------------------- tipos */

export type StyleFamily = "editorial" | "minimal" | "pop";

export const STYLE_FAMILIES: ReadonlyArray<{
  id: StyleFamily;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    id: "editorial",
    label: "Editorial & Caderno",
    shortLabel: "Editorial",
    description: "Papel literário, fichas de dicionário, folha pautada e tipografia de livro.",
  },
  {
    id: "minimal",
    label: "Minimalista & Suíço",
    shortLabel: "Minimalista",
    description: "Muito respiro, fios arquitetônicos precisos e leitura limpa.",
  },
  {
    id: "pop",
    label: "Colagem & Pop",
    shortLabel: "Colagem",
    description: "Tarjas recortadas, post-its, bordas marcadas e energia de pôster.",
  },
];

export type CanvasColor = keyof SocialPalette | "white" | "black" | "note" | "transparent" | "contrast";
export type CanvasFont = "serif" | "sans" | "display" | "hand";
export type CanvasTexture = "none" | "paper" | "grid" | "lines" | "dots";
export type TextVariant = "plain" | "pill" | "tarja" | "note" | "card" | "marker";
export type CanvasShadow = "none" | "soft" | "hard" | "note";

export type ContentKey =
  | "eyebrow" | "title" | "subtitle" | "body" | "wrongLabel" | "wrong" | "rightLabel" | "right"
  | "note" | "quote" | "author" | "step" | "items" | "cta" | "image";
export type CanvasRole = ContentKey | "chrome" | "decor" | "free";
export type SlideKind = "cover" | "before_after" | "step" | "checklist" | "quote" | "image" | "cta" | "free";
export type SlideContent = Partial<Record<ContentKey, string>> & { kind: SlideKind };

type ElBase = {
  id: string;
  role: CanvasRole;
  part?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
};

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
  hug?: boolean;
  shadow?: CanvasShadow;
  borderWidth?: number;
  borderColor?: CanvasColor;
  italic?: boolean;
  upper?: boolean;
  list?: "check" | "dot" | "number";
  prefix?: string;
  lineHeight?: number;
};

export type CanvasShapeEl = ElBase & {
  type: "shape";
  shape: "rect" | "circle" | "line" | "arrow" | "tape" | "underline" | "frame" | "notebook-margin" | "badge-star" | "quote-mark";
  fill: CanvasColor;
  radius?: number;
  opacity?: number;
  shadow?: CanvasShadow;
  borderWidth?: number;
  borderColor?: CanvasColor;
};

export type CanvasImageEl = ElBase & {
  type: "image";
  src: string;
  radius?: number;
  overlay?: number;
  shadow?: CanvasShadow;
  borderWidth?: number;
  borderColor?: CanvasColor;
};

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
  const bottom = aspect === "story" ? 260 : 124;
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

/* ---------------------------------------------------------------- cor & contraste WCAG */

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

/** Razão de contraste WCAG 2.1 entre duas cores hexadecimais (1 a 21). */
export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = luminance(hexA);
  const l2 = luminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const FIXED: Record<string, string> = {
  white: "#FFFFFF",
  black: "#120E1A",
  note: "#F8E07A",
  transparent: "transparent",
};

/**
 * Resolve um token de cor. `contrast` escolhe automaticamente a tinta da marca (`primary`),
 * tinta editorial escura (`#120E1A`) ou branco (`#FFFFFF`), garantindo contraste WCAG AA >= 4.5:1
 * contra qualquer cor de fundo (`behind`).
 */
export function resolveColor(token: CanvasColor | undefined, palette: SocialPalette, behind?: string): string {
  if (!token) return "transparent";
  if (token === "contrast") {
    const bg = behind && behind !== "transparent" ? behind : palette.background;
    if (contrastRatio(palette.primary, bg) >= 5.5) return palette.primary;
    const cBlack = contrastRatio(FIXED.black!, bg);
    const cDeep = contrastRatio("#08060E", bg);
    const cWhite = contrastRatio("#FFFFFF", bg);
    if (cWhite >= cDeep) return "#FFFFFF";
    return cBlack >= 4.55 ? FIXED.black! : "#08060E";
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

/* ---------------------------------------------------------------- construtores & medição óptica */

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

export function shapeEl(
  role: CanvasRole,
  shape: CanvasShapeEl["shape"],
  box: Frame,
  fill: CanvasColor,
  opts: Partial<CanvasShapeEl> = {},
): CanvasShapeEl {
  return {
    id: uid("s"),
    type: "shape",
    role,
    shape,
    fill,
    x: Math.round(box.x),
    y: Math.round(box.y),
    w: Math.round(box.w),
    h: Math.round(box.h),
    rotation: 0,
    ...opts,
  };
}

export function imageEl(role: CanvasRole, src: string, box: Frame, opts: Partial<CanvasImageEl> = {}): CanvasImageEl {
  return {
    id: uid("i"),
    type: "image",
    role,
    src,
    x: Math.round(box.x),
    y: Math.round(box.y),
    w: Math.round(box.w),
    h: Math.round(box.h),
    rotation: 0,
    ...opts,
  };
}

/**
 * Estima a altura óptica real de um bloco de texto levando em conta largura útil,
 * família tipográfica, caixa-alta, listas e preenchimento interno da variante.
 */
export function measureTextHeight(
  rawText: string,
  opts: {
    w: number;
    size: number;
    font?: CanvasFont;
    lineHeight?: number;
    variant?: TextVariant;
    upper?: boolean;
    list?: "check" | "dot" | "number";
    minH?: number;
    maxH?: number;
  },
): number {
  const plain = rawText.replace(/==([^=]+)==/g, "$1").replace(/\*([^*\n]+)\*/g, "$1").trim();
  const variant = opts.variant ?? "plain";
  const padX =
    variant === "note" ? 76 : variant === "card" ? 68 : variant === "tarja" || variant === "marker" ? 56 : variant === "pill" ? 52 : 8;
  const padY =
    variant === "note" ? 72 : variant === "card" ? 52 : variant === "tarja" ? 36 : variant === "marker" ? 40 : variant === "pill" ? 26 : 8;

  if (!plain) {
    const emptyH = opts.size + padY;
    return Math.min(opts.maxH ?? emptyH, Math.max(opts.minH ?? 0, emptyH));
  }

  const font = opts.font ?? "sans";
  const baseFactor = font === "display" ? 0.62 : font === "hand" ? 0.44 : font === "serif" ? 0.5 : 0.51;
  const charFactor = opts.upper ? baseFactor + 0.06 : baseFactor;
  const listIndent = opts.list ? opts.size * 1.15 : 0;
  const availW = Math.max(110, opts.w - padX - listIndent);
  const maxChars = Math.max(5, Math.floor(availW / (opts.size * charFactor)));

  const paragraphs = plain.split("\n").filter(l => l.trim().length > 0);
  let totalLines = 0;
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    let lines = 1;
    let cur = 0;
    for (const word of words) {
      const next = cur === 0 ? word.length : cur + 1 + word.length;
      if (cur > 0 && next > maxChars) {
        lines++;
        cur = word.length;
      } else {
        cur = next;
      }
    }
    totalLines += lines;
  }

  const lh = opts.lineHeight ?? 1.2;
  const listGaps = opts.list && paragraphs.length > 1 ? (paragraphs.length - 1) * Math.round(opts.size * 0.36) : 0;
  const rawH = Math.ceil(totalLines * opts.size * lh + padY + listGaps + 8);
  return Math.min(opts.maxH ?? 9999, Math.max(opts.minH ?? 0, rawH));
}

/** Centraliza um grupo vertical opticamente (levemente acima do centro matemático). */
function opticalStartY(f: Frame, totalH: number, bias = 0.44): number {
  return Math.round(f.y + Math.max(0, (f.h - totalH) * bias));
}

/* ---------------------------------------------------------------- layouts (15 modelos · 3 famílias) */

export type LayoutCtx = { aspect: StudioAspect; W: number; H: number; f: Frame };
export type LayoutResult = { background: CanvasColor; texture: CanvasTexture; elements: CanvasElement[] };
export type LayoutDef = {
  id: string;
  family: StyleFamily;
  label: string;
  hint: string;
  kinds: SlideKind[];
  build: (c: SlideContent, ctx: LayoutCtx) => LayoutResult;
};

const first = (...values: Array<string | undefined>) => values.find(v => v && v.trim())?.trim() ?? "";
const mainText = (c: SlideContent) => first(c.title, c.quote, c.body, c.items);
const supportText = (c: SlideContent) => {
  const used = mainText(c);
  return (
    [c.subtitle, c.body, c.quote, c.items ? c.items.split("\n").map(l => `• ${l}`).join("\n") : undefined, c.note]
      .filter((v): v is string => Boolean(v && v.trim() && v.trim() !== used && !(c.items && v === c.items)))
      .slice(0, 1)[0] ?? ""
  );
};

/** Rodapé editorial com assinatura @textoemciclo e paginação. */
function chrome(ctx: LayoutCtx, color: CanvasColor = "contrast"): CanvasElement[] {
  const y = ctx.H - (ctx.aspect === "story" ? 206 : 88);
  return [
    textEl("chrome", "{{handle}}", { x: ctx.f.x, y, w: 460, h: 40 }, { size: 24, weight: 600, color, lineHeight: 1 }),
    textEl("chrome", "{{counter}}", { x: ctx.W - ctx.f.x - 220, y, w: 220, h: 40 }, { size: 24, weight: 700, color, align: "right", lineHeight: 1 }),
  ];
}

const WEAK_TAIL = /^(o|a|os|as|de|da|do|dos|das|em|na|no|nos|nas|um|uma|e|é|com|por|sem)$/i;

function splitChunks(text: string, maxChars: number, maxChunks: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur: string[] = [];
  for (const w of words) {
    const joined = cur.length ? `${cur.join(" ")} ${w}` : w;
    if (cur.length && joined.length > maxChars && out.length < maxChunks - 1) {
      if (cur.length >= 2 && WEAK_TAIL.test(cur[cur.length - 1]!)) {
        const carry = cur.pop()!;
        out.push(cur.join(" "));
        cur = [carry, w];
      } else {
        out.push(cur.join(" "));
        cur = [w];
      }
    } else {
      cur.push(w);
    }
  }
  if (cur.length) out.push(cur.join(" "));
  return out;
}

export const LAYOUTS: LayoutDef[] = [
  /* ========================================================================
     FAMÍLIA 1: EDITORIAL & CADERNO (5 layouts)
     ======================================================================== */
  {
    id: "manchete",
    family: "editorial",
    label: "Capa Revista",
    hint: "Moldura literária, pílula ajustada e serifada equilibrada",
    kinds: ["cover", "free", "quote", "cta"],
    build: (c, ctx) => {
      const { f, W, H } = ctx;
      const els: CanvasElement[] = [
        shapeEl("decor", "frame", { x: 40, y: 40, w: W - 80, h: H - 80 }, "primary", { radius: 26, opacity: 0.14 }),
      ];

      const titleText = mainText(c) || "Escreva o título";
      const subText = first(c.subtitle, c.body !== titleText ? c.body : undefined);
      const ctaText = first(c.cta, "deslize →");

      const eyebrowH = c.eyebrow ? 58 : 0;
      const titleH = measureTextHeight(titleText, { w: f.w, size: 92, font: "serif", lineHeight: 1.04, minH: 112, maxH: Math.round(f.h * 0.52) });
      const ruleH = 22;
      const subH = subText
        ? measureTextHeight(subText, { w: Math.round(f.w * 0.88), size: 35, font: "sans", lineHeight: 1.35, minH: 56, maxH: Math.round(f.h * 0.24) })
        : 0;

      const lockupH = (eyebrowH ? eyebrowH + 28 : 0) + titleH + 24 + ruleH + (subH ? 26 + subH : 0);
      let y = opticalStartY(f, lockupH, 0.42);

      if (c.eyebrow) {
        els.push(
          textEl("eyebrow", c.eyebrow, { x: f.x, y, w: Math.round(f.w * 0.78), h: eyebrowH }, {
            variant: "pill",
            hug: true,
            fill: "accent",
            color: "contrast",
            size: 23,
            weight: 700,
            upper: true,
            lineHeight: 1,
          }),
        );
        y += eyebrowH + 28;
      }

      els.push(
        textEl("title", titleText, { x: f.x, y, w: f.w, h: titleH }, {
          font: "serif",
          size: 92,
          weight: 800,
          color: "primary",
          lineHeight: 1.04,
        }),
      );
      y += titleH + 24;

      els.push(shapeEl("decor", "underline", { x: f.x, y, w: 256, h: ruleH }, "accent"));
      y += ruleH;

      if (subText) {
        y += 26;
        els.push(
          textEl("subtitle", subText, { x: f.x, y, w: Math.round(f.w * 0.88), h: subH }, {
            size: 35,
            weight: 500,
            color: "muted",
            lineHeight: 1.35,
          }),
        );
      }

      const ctaY = Math.max(y + (subH || 0) + 24, f.y + f.h - 72);
      els.push(
        textEl("cta", ctaText, { x: f.x + Math.round(f.w * 0.42), y: Math.min(ctaY, f.y + f.h - 68), w: Math.round(f.w * 0.58), h: 64 }, {
          font: "hand",
          size: 46,
          weight: 700,
          color: "primary",
          align: "right",
          lineHeight: 1,
        }),
      );

      return { background: "background", texture: "paper", elements: [...els, ...chrome(ctx, "muted")] };
    },
  },

  {
    id: "verbete",
    family: "editorial",
    label: "Ficha de Dicionário",
    hint: "Cartão elevado com fita adesiva, ❌ erro real e ✔️ norma-padrão",
    kinds: ["before_after", "step", "free"],
    build: (c, ctx) => {
      const { f } = ctx;
      const innerW = f.w - 112;
      const innerX = f.x + 56;

      const headword = first(c.title, c.quote) || "corroborar";
      const grammarTag = first(c.eyebrow, c.subtitle, c.step);
      const wrong = first(c.wrong, c.body);
      const right = first(c.right);
      const note = first(c.note);

      const headH = measureTextHeight(headword, { w: Math.round(innerW * 0.88), size: 70, font: "serif", lineHeight: 1.02, minH: 82, maxH: 180 });
      const tagH = grammarTag ? measureTextHeight(grammarTag, { w: innerW, size: 28, font: "serif", lineHeight: 1.2, minH: 38, maxH: 76 }) : 0;
      const wH = wrong ? measureTextHeight(`❌ ${wrong}`, { w: innerW, size: 35, font: "sans", lineHeight: 1.3, minH: 74, maxH: 210 }) : 0;
      const rH = right ? measureTextHeight(`✔️ ${right}`, { w: innerW, size: 35, font: "sans", lineHeight: 1.3, minH: 74, maxH: 210 }) : 0;
      const nH = note ? measureTextHeight(note, { w: innerW, size: 29, variant: "card", lineHeight: 1.32, minH: 108, maxH: 210 }) : 0;

      const innerStackH =
        headH +
        (tagH ? 8 + tagH + 20 : 16) +
        2 +
        28 +
        (wH ? wH : 0) +
        (wH && rH ? 20 : 0) +
        (rH ? rH : 0) +
        (nH ? 28 + nH : 0);

      const cardH = Math.min(f.h - 20, innerStackH + 108);
      const cardY = opticalStartY(f, cardH, 0.45);
      const card: Frame = { x: f.x, y: cardY, w: f.w, h: cardH };

      const els: CanvasElement[] = [
        shapeEl("decor", "rect", card, "surface", { radius: 32, shadow: "soft", borderWidth: 2, borderColor: "primary" }),
        { ...shapeEl("decor", "tape", { x: card.x + card.w - 180, y: card.y - 22, w: 136, h: 46 }, "note", { opacity: 0.9 }), rotation: 4 },
      ];

      let y = card.y + 54;
      els.push(
        textEl("title", headword, { x: innerX, y, w: Math.round(innerW * 0.88), h: headH }, {
          font: "serif",
          size: 70,
          weight: 800,
          color: "primary",
          lineHeight: 1.02,
        }),
      );
      y += headH;

      if (tagH && grammarTag) {
        y += 8;
        els.push(
          textEl("eyebrow", grammarTag, { x: innerX, y, w: innerW, h: tagH }, {
            font: "serif",
            size: 28,
            italic: true,
            color: "muted",
            lineHeight: 1.2,
          }),
        );
        y += tagH + 20;
      } else {
        y += 16;
      }

      els.push(shapeEl("decor", "line", { x: innerX, y, w: innerW, h: 2 }, "muted", { opacity: 0.25 }));
      y += 30;

      if (wH && wrong) {
        els.push(
          textEl(c.wrong ? "wrong" : "body", wrong, { x: innerX, y, w: innerW, h: wH }, {
            prefix: c.wrong ? "❌ " : "",
            size: 35,
            weight: 600,
            color: c.wrong ? "wrong" : "primary",
            lineHeight: 1.3,
          }),
        );
        y += wH;
      }

      if (rH && right) {
        if (wH) y += 20;
        els.push(
          textEl("right", right, { x: innerX, y, w: innerW, h: rH }, {
            prefix: "✔️ ",
            size: 35,
            weight: 700,
            color: "right",
            lineHeight: 1.3,
          }),
        );
        y += rH;
      }

      if (nH && note) {
        y += 28;
        els.push(
          textEl("note", note, { x: innerX, y, w: innerW, h: nH }, {
            variant: "card",
            fill: "accentSoft",
            color: "contrast",
            size: 29,
            weight: 500,
            lineHeight: 1.32,
          }),
        );
      }

      return { background: "accent", texture: "dots", elements: [...els, ...chrome(ctx, "contrast")] };
    },
  },

  {
    id: "passo",
    family: "editorial",
    label: "Folha de Caderno",
    hint: "Papel pautado com margem de caderno, selo numérico e grifo",
    kinds: ["step", "checklist", "free"],
    build: (c, ctx) => {
      const { f, H } = ctx;
      const els: CanvasElement[] = [
        shapeEl("decor", "notebook-margin", { x: 68, y: 0, w: 8, h: H }, "accent", { opacity: 0.32 }),
      ];

      const stepNum = first(c.step, "01");
      const titleText = first(c.title, c.quote) || "Título do passo";
      const bodyText = first(c.body, c.subtitle, c.items);
      const isList = !c.body && !c.subtitle && Boolean(c.items);

      const headerH = 128;
      const titleH = measureTextHeight(titleText, { w: f.w, size: 68, font: "serif", lineHeight: 1.06, minH: 88, maxH: 260 });
      const bodyH = bodyText
        ? measureTextHeight(bodyText, { w: f.w, size: 36, lineHeight: 1.38, list: isList ? "dot" : undefined, minH: 90, maxH: 340 })
        : 0;
      const noteH = c.note
        ? measureTextHeight(c.note, { w: f.w, size: 30, variant: "marker", lineHeight: 1.32, minH: 96, maxH: 200 })
        : 0;

      const totalH = headerH + 28 + titleH + (bodyH ? 24 + bodyH : 0) + (noteH ? 30 + noteH : 0);
      let y = opticalStartY(f, totalH, 0.42);

      els.push(shapeEl("decor", "circle", { x: f.x, y, w: 124, h: 124 }, "accentSoft"));
      els.push(
        textEl("step", stepNum, { x: f.x, y: y + 18, w: 124, h: 96 }, {
          font: "serif",
          size: 64,
          weight: 800,
          color: "primary",
          align: "center",
          lineHeight: 1,
        }),
      );

      if (c.eyebrow) {
        els.push(
          textEl("eyebrow", c.eyebrow, { x: f.x + 152, y: y + 34, w: f.w - 152, h: 56 }, {
            variant: "pill",
            hug: true,
            fill: "accent",
            color: "contrast",
            size: 22,
            weight: 700,
            upper: true,
            lineHeight: 1,
          }),
        );
      }
      y += headerH + 28;

      els.push(
        textEl("title", titleText, { x: f.x, y, w: f.w, h: titleH }, {
          font: "serif",
          size: 68,
          weight: 800,
          color: "primary",
          lineHeight: 1.06,
        }),
      );
      y += titleH;

      if (bodyText) {
        y += 24;
        els.push(
          textEl(c.body ? "body" : c.subtitle ? "subtitle" : "items", bodyText, { x: f.x, y, w: f.w, h: bodyH }, {
            size: 36,
            color: "primary",
            lineHeight: 1.38,
            list: isList ? "dot" : undefined,
          }),
        );
        y += bodyH;
      }

      if (c.note) {
        y += 30;
        els.push(
          textEl("note", c.note, { x: f.x, y, w: f.w, h: noteH }, {
            variant: "marker",
            fill: "accentSoft",
            color: "contrast",
            size: 30,
            weight: 600,
            lineHeight: 1.32,
          }),
        );
      }

      return { background: "background", texture: "lines", elements: [...els, ...chrome(ctx, "muted")] };
    },
  },

  {
    id: "citacao",
    family: "editorial",
    label: "Página Literária",
    hint: "Moldura dupla de livro, aspas esculpidas e citação itálica",
    kinds: ["quote", "cover", "cta", "free"],
    build: (c, ctx) => {
      const { f, W, H } = ctx;
      const els: CanvasElement[] = [
        shapeEl("decor", "frame", { x: 44, y: 44, w: W - 88, h: H - 88 }, "primary", { radius: 22, opacity: 0.16 }),
      ];

      const quoteText = first(c.quote, c.title, c.body) || "Escrita é processo, não modelo engessado.";
      const authorText = first(c.author, c.eyebrow);
      const quoteW = Math.round(f.w * 0.92);
      const quoteX = f.x + Math.round((f.w - quoteW) / 2);

      const markH = 76;
      const quoteH = measureTextHeight(quoteText, { w: quoteW, size: 60, font: "serif", lineHeight: 1.24, minH: 130, maxH: Math.round(f.h * 0.56) });
      const authorH = authorText ? 58 : 0;
      const totalH = markH + 28 + quoteH + 28 + 3 + (authorH ? 26 + authorH : 0);

      let y = opticalStartY(f, totalH, 0.45);

      els.push(shapeEl("decor", "quote-mark", { x: Math.round(W / 2 - 52), y, w: 104, h: markH }, "accent", { opacity: 0.9 }));
      y += markH + 28;

      els.push(
        textEl("quote", quoteText, { x: quoteX, y, w: quoteW, h: quoteH }, {
          font: "serif",
          size: 60,
          weight: 600,
          italic: true,
          color: "primary",
          align: "center",
          lineHeight: 1.24,
        }),
      );
      y += quoteH + 28;

      els.push(shapeEl("decor", "line", { x: Math.round(W / 2 - 64), y, w: 128, h: 3 }, "accent", { opacity: 0.6 }));
      y += 29;

      if (authorText) {
        els.push(
          textEl(c.author ? "author" : "eyebrow", authorText, { x: quoteX, y, w: quoteW, h: authorH }, {
            variant: "pill",
            hug: true,
            fill: "accent",
            color: "contrast",
            size: 25,
            weight: 700,
            align: "center",
            lineHeight: 1,
          }),
        );
      }

      return { background: "background", texture: "paper", elements: [...els, ...chrome(ctx, "muted")] };
    },
  },

  {
    id: "checklist",
    family: "editorial",
    label: "Ficha de Revisão",
    hint: "Lista de conferência em cartão papel com nota manuscrita",
    kinds: ["checklist", "step", "before_after", "free"],
    build: (c, ctx) => {
      const { f } = ctx;
      const els: CanvasElement[] = [];

      const titleText = first(c.title) || "Para revisar antes de entregar";
      const itemsText =
        first(c.items, c.wrong && c.right ? `Evite: ${c.wrong}\nPrefira: ${c.right}` : undefined, c.body) ||
        "Ler toda a coletânea\nDefinir tese clara\nRevisar regência e concordância";

      const eyebrowH = c.eyebrow ? 54 : 0;
      const titleH = measureTextHeight(titleText, { w: f.w, size: 64, font: "serif", lineHeight: 1.06, minH: 84, maxH: 220 });
      const innerW = f.w - 96;
      const itemsH = measureTextHeight(itemsText, { w: innerW, size: 35, lineHeight: 1.4, list: "check", minH: 180, maxH: Math.round(f.h * 0.5) });
      const cardH = itemsH + 84;
      const noteH = c.note ? 64 : 0;

      const totalH = (eyebrowH ? eyebrowH + 20 : 0) + titleH + 28 + cardH + (noteH ? 24 + noteH : 0);
      let y = opticalStartY(f, totalH, 0.44);

      if (c.eyebrow) {
        els.push(
          textEl("eyebrow", c.eyebrow, { x: f.x, y, w: Math.round(f.w * 0.75), h: eyebrowH }, {
            variant: "pill",
            hug: true,
            fill: "accent",
            color: "contrast",
            size: 22,
            weight: 700,
            upper: true,
            lineHeight: 1,
          }),
        );
        y += eyebrowH + 20;
      }

      els.push(
        textEl("title", titleText, { x: f.x, y, w: f.w, h: titleH }, {
          font: "serif",
          size: 64,
          weight: 800,
          color: "primary",
          lineHeight: 1.06,
        }),
      );
      y += titleH + 28;

      const card: Frame = { x: f.x, y, w: f.w, h: cardH };
      els.push(shapeEl("decor", "rect", card, "surface", { radius: 28, shadow: "soft", borderWidth: 2, borderColor: "accentSoft" }));
      els.push(
        textEl(c.items ? "items" : "body", itemsText, { x: card.x + 48, y: card.y + 42, w: innerW, h: itemsH }, {
          size: 35,
          weight: 500,
          color: "primary",
          lineHeight: 1.4,
          list: "check",
        }),
      );
      y += cardH;

      if (c.note) {
        y += 24;
        els.push(
          textEl("note", c.note, { x: f.x, y, w: f.w, h: noteH }, {
            font: "hand",
            size: 42,
            weight: 700,
            color: "primary",
            lineHeight: 1.1,
          }),
        );
      }

      return { background: "background", texture: "paper", elements: [...els, ...chrome(ctx, "muted")] };
    },
  },

  /* ========================================================================
     FAMÍLIA 2: MINIMALISTA & SUÍÇO (5 layouts)
     ======================================================================== */
  {
    id: "suico",
    family: "minimal",
    label: "Grid Suíço",
    hint: "Fio superior, tipografia assimétrica limpa e amplo respiro",
    kinds: ["cover", "step", "free", "cta"],
    build: (c, ctx) => {
      const { f } = ctx;
      const els: CanvasElement[] = [
        shapeEl("decor", "line", { x: f.x, y: f.y, w: f.w, h: 3 }, "primary"),
      ];

      const topY = f.y + 20;
      if (c.eyebrow) {
        els.push(
          textEl("eyebrow", c.eyebrow, { x: f.x, y: topY, w: Math.round(f.w * 0.65), h: 38 }, {
            size: 22,
            weight: 700,
            upper: true,
            color: "muted",
            lineHeight: 1,
          }),
        );
      }
      els.push(
        textEl("decor", first(c.step, "ENSAIO"), { x: f.x + Math.round(f.w * 0.68), y: topY, w: Math.round(f.w * 0.32), h: 38 }, {
          size: 22,
          weight: 700,
          upper: true,
          color: "muted",
          align: "right",
          lineHeight: 1,
        }),
      );

      const titleText = mainText(c) || "Clareza constrói autoria";
      const subText = supportText(c);
      const ctaText = first(c.cta);

      const titleH = measureTextHeight(titleText, { w: f.w, size: 86, font: "sans", lineHeight: 1.02, minH: 110, maxH: Math.round(f.h * 0.48) });
      const indentX = f.x + Math.round(f.w * 0.14);
      const indentW = f.w - Math.round(f.w * 0.14);
      const subH = subText
        ? measureTextHeight(subText, { w: indentW, size: 34, lineHeight: 1.38, minH: 56, maxH: Math.round(f.h * 0.28) })
        : 0;
      const ctaH = ctaText ? 58 : 0;

      const bodyBlockH = titleH + 34 + 8 + (subH ? 28 + subH : 0) + (ctaH ? 34 + ctaH : 0);
      const innerFrame: Frame = { x: f.x, y: topY + 64, w: f.w, h: f.h - 84 };
      let y = opticalStartY(innerFrame, bodyBlockH, 0.42);

      els.push(
        textEl("title", titleText, { x: f.x, y, w: f.w, h: titleH }, {
          font: "sans",
          size: 86,
          weight: 800,
          color: "primary",
          lineHeight: 1.02,
        }),
      );
      y += titleH + 34;

      els.push(shapeEl("decor", "rect", { x: indentX, y, w: 84, h: 8 }, "accent", { radius: 99 }));
      y += 8;

      if (subText) {
        y += 28;
        els.push(
          textEl(c.subtitle ? "subtitle" : "body", subText, { x: indentX, y, w: indentW, h: subH }, {
            size: 34,
            weight: 400,
            color: "muted",
            lineHeight: 1.38,
          }),
        );
        y += subH;
      }

      if (ctaText) {
        y += 34;
        els.push(
          textEl("cta", ctaText, { x: indentX, y, w: indentW, h: ctaH }, {
            variant: "pill",
            hug: true,
            fill: "primary",
            color: "contrast",
            size: 24,
            weight: 700,
            lineHeight: 1,
          }),
        );
      }

      return { background: "surface", texture: "none", elements: [...els, ...chrome(ctx, "muted")] };
    },
  },

  {
    id: "antes-depois",
    family: "minimal",
    label: "Comparativo em Fios",
    hint: "Fios finos separando Antes e Depois com pílulas de alto contraste",
    kinds: ["before_after"],
    build: (c, ctx) => {
      const { f } = ctx;
      const els: CanvasElement[] = [];

      const titleText = first(c.title) || "Na folha de redação";
      const wrongLabel = first(c.wrongLabel, "Antes");
      const wrongText = first(c.wrong) || "Frase vaga do senso comum";
      const rightLabel = first(c.rightLabel, "Depois");
      const rightText = first(c.right) || "Construção analítica precisa";

      const eyebrowH = c.eyebrow ? 34 : 0;
      const titleH = measureTextHeight(titleText, { w: f.w, size: 58, font: "sans", lineHeight: 1.06, minH: 72, maxH: 170 });
      const wrongH = measureTextHeight(wrongText, { w: f.w, size: 42, font: "serif", lineHeight: 1.26, minH: 68, maxH: 210 });
      const rightH = measureTextHeight(rightText, { w: f.w, size: 42, font: "serif", lineHeight: 1.26, minH: 68, maxH: 210 });
      const noteH = c.note
        ? measureTextHeight(c.note, { w: f.w, size: 28, variant: "marker", lineHeight: 1.32, minH: 88, maxH: 160 })
        : 0;

      const pillH = 50;
      const totalH =
        (eyebrowH ? eyebrowH + 10 : 0) +
        titleH +
        28 +
        pillH +
        16 +
        wrongH +
        32 +
        pillH +
        16 +
        rightH +
        (noteH ? 30 + noteH : 0);

      let y = opticalStartY(f, totalH, 0.42);

      if (c.eyebrow) {
        els.push(
          textEl("eyebrow", c.eyebrow, { x: f.x, y, w: f.w, h: eyebrowH }, {
            size: 22,
            weight: 700,
            upper: true,
            color: "muted",
            lineHeight: 1,
          }),
        );
        y += eyebrowH + 10;
      }

      els.push(
        textEl("title", titleText, { x: f.x, y, w: f.w, h: titleH }, {
          font: "sans",
          size: 58,
          weight: 800,
          color: "primary",
          lineHeight: 1.06,
        }),
      );
      y += titleH + 20;

      els.push(shapeEl("decor", "line", { x: f.x, y, w: f.w, h: 2 }, "primary", { opacity: 0.14 }));
      y += 22;

      els.push(
        textEl("wrongLabel", wrongLabel, { x: f.x, y, w: Math.round(f.w * 0.6), h: pillH }, {
          variant: "pill",
          hug: true,
          fill: "wrong",
          color: "contrast",
          size: 22,
          weight: 700,
          upper: true,
          lineHeight: 1,
        }),
      );
      y += pillH + 16;

      els.push(
        textEl("wrong", wrongText, { x: f.x, y, w: f.w, h: wrongH }, {
          font: "serif",
          size: 42,
          italic: true,
          color: "primary",
          lineHeight: 1.26,
        }),
      );
      y += wrongH + 22;

      els.push(shapeEl("decor", "line", { x: f.x, y, w: f.w, h: 2 }, "primary", { opacity: 0.14 }));
      y += 22;

      els.push(
        textEl("rightLabel", rightLabel, { x: f.x, y, w: Math.round(f.w * 0.6), h: pillH }, {
          variant: "pill",
          hug: true,
          fill: "right",
          color: "contrast",
          size: 22,
          weight: 700,
          upper: true,
          lineHeight: 1,
        }),
      );
      y += pillH + 16;

      els.push(
        textEl("right", rightText, { x: f.x, y, w: f.w, h: rightH }, {
          font: "serif",
          size: 42,
          weight: 700,
          color: "primary",
          lineHeight: 1.26,
        }),
      );
      y += rightH;

      if (c.note) {
        y += 28;
        els.push(
          textEl("note", c.note, { x: f.x, y, w: f.w, h: noteH }, {
            variant: "marker",
            fill: "accentSoft",
            color: "contrast",
            size: 28,
            weight: 500,
            lineHeight: 1.32,
          }),
        );
      }

      return { background: "surface", texture: "none", elements: [...els, ...chrome(ctx, "muted")] };
    },
  },

  {
    id: "indice",
    family: "minimal",
    label: "Grande Número",
    hint: "Numeral arquitetônico com divisória vertical e coluna limpa",
    kinds: ["step", "checklist", "free"],
    build: (c, ctx) => {
      const { f } = ctx;
      const els: CanvasElement[] = [];

      const stepNum = first(c.step, "01");
      const titleText = first(c.title, c.quote) || "Domine o projeto de texto";
      const bodyText = first(c.body, c.items, c.subtitle);
      const isList = !c.body && Boolean(c.items);

      const topH = 140;
      const titleH = measureTextHeight(titleText, { w: f.w, size: 62, font: "sans", lineHeight: 1.06, minH: 84, maxH: 220 });
      const bodyH = bodyText
        ? measureTextHeight(bodyText, { w: f.w, size: 36, lineHeight: 1.4, list: isList ? "check" : undefined, minH: 80, maxH: 340 })
        : 0;
      const noteH = c.note ? measureTextHeight(c.note, { w: f.w, size: 29, lineHeight: 1.32, minH: 48, maxH: 130 }) : 0;

      const totalH = topH + 30 + 2 + 30 + titleH + (bodyH ? 24 + bodyH : 0) + (noteH ? 28 + noteH : 0);
      let y = opticalStartY(f, totalH, 0.42);

      els.push(
        textEl("step", stepNum, { x: f.x, y, w: 230, h: topH }, {
          font: "sans",
          size: 138,
          weight: 800,
          color: "primary",
          lineHeight: 0.88,
        }),
      );
      els.push(shapeEl("decor", "line", { x: f.x + 246, y: y + 14, w: 4, h: 104 }, "accent"));
      if (c.eyebrow) {
        els.push(
          textEl("eyebrow", c.eyebrow, { x: f.x + 278, y: y + 44, w: f.w - 278, h: 52 }, {
            size: 24,
            weight: 700,
            upper: true,
            color: "muted",
            lineHeight: 1.2,
          }),
        );
      }
      y += topH + 30;

      els.push(shapeEl("decor", "line", { x: f.x, y, w: f.w, h: 2 }, "primary", { opacity: 0.16 }));
      y += 32;

      els.push(
        textEl("title", titleText, { x: f.x, y, w: f.w, h: titleH }, {
          font: "sans",
          size: 62,
          weight: 800,
          color: "primary",
          lineHeight: 1.06,
        }),
      );
      y += titleH;

      if (bodyText) {
        y += 24;
        els.push(
          textEl(c.body ? "body" : c.items ? "items" : "subtitle", bodyText, { x: f.x, y, w: f.w, h: bodyH }, {
            size: 36,
            color: "muted",
            lineHeight: 1.4,
            list: isList ? "check" : undefined,
          }),
        );
        y += bodyH;
      }

      if (c.note) {
        y += 28;
        els.push(
          textEl("note", c.note, { x: f.x, y, w: f.w, h: noteH }, {
            size: 29,
            weight: 700,
            color: "primary",
            lineHeight: 1.32,
          }),
        );
      }

      return { background: "background", texture: "none", elements: [...els, ...chrome(ctx, "muted")] };
    },
  },

  {
    id: "impacto",
    family: "minimal",
    label: "Frase Pura",
    hint: "Fundo sólido profundo com frase lapidada e grifo mostarda",
    kinds: ["free", "quote", "step", "cover", "cta"],
    build: (c, ctx) => {
      const { f } = ctx;
      const els: CanvasElement[] = [];

      const main = mainText(c) || "Escrita é processo";
      const role: ContentKey = c.title ? "title" : c.quote ? "quote" : c.body ? "body" : "items";
      const marked = /==/.test(main) ? main : main.replace(/(\S+)(\s*[.!?…:)]*)$/, "==$1==$2");
      const sub = first(c.subtitle, role !== "body" ? c.body : undefined, c.author, c.note);

      const eyebrowH = c.eyebrow ? 54 : 0;
      const mainH = measureTextHeight(marked, { w: f.w, size: 84, font: "serif", lineHeight: 1.08, minH: 120, maxH: Math.round(f.h * 0.56) });
      const subH = sub ? measureTextHeight(sub, { w: Math.round(f.w * 0.85), size: 33, lineHeight: 1.36, minH: 52, maxH: 180 }) : 0;

      const totalH = (eyebrowH ? eyebrowH + 32 : 0) + mainH + (subH ? 30 + 4 + 26 + subH : 0);
      let y = opticalStartY(f, totalH, 0.45);

      if (c.eyebrow) {
        els.push(
          textEl("eyebrow", c.eyebrow, { x: f.x, y, w: Math.round(f.w * 0.75), h: eyebrowH }, {
            variant: "pill",
            hug: true,
            fill: "accent",
            color: "contrast",
            size: 22,
            weight: 700,
            upper: true,
            lineHeight: 1,
          }),
        );
        y += eyebrowH + 32;
      }

      els.push(
        textEl(role, marked, { x: f.x, y, w: f.w, h: mainH }, {
          font: "serif",
          size: 84,
          weight: 700,
          color: "contrast",
          lineHeight: 1.08,
        }),
      );
      y += mainH;

      if (sub) {
        y += 30;
        els.push(shapeEl("decor", "rect", { x: f.x, y, w: 72, h: 4 }, "accent", { radius: 99 }));
        y += 30;
        els.push(
          textEl(c.subtitle ? "subtitle" : role !== "body" && c.body ? "body" : c.author ? "author" : "note", sub, { x: f.x, y, w: Math.round(f.w * 0.85), h: subH }, {
            size: 33,
            weight: 500,
            color: "contrast",
            lineHeight: 1.36,
          }),
        );
      }

      return { background: "primary", texture: "none", elements: [...els, ...chrome(ctx, "contrast")] };
    },
  },

  {
    id: "foto-dividida",
    family: "minimal",
    label: "Foto Editorial",
    hint: "Fotografia emoldurada no topo com legenda de revista",
    kinds: ["image", "cover", "step", "free"],
    build: (c, ctx) => {
      const { f } = ctx;
      const photoH = Math.round(f.h * 0.48);
      const els: CanvasElement[] = [
        imageEl("image", c.image ?? "", { x: f.x, y: f.y, w: f.w, h: photoH }, { radius: 24, shadow: "soft" }),
      ];

      const below: Frame = { x: f.x, y: f.y + photoH + 38, w: f.w, h: f.h - photoH - 38 };
      const titleText = mainText(c) || "Escreva o título";
      const subText = supportText(c) || first(c.subtitle);

      const eyebrowH = c.eyebrow ? 48 : 0;
      const titleH = measureTextHeight(titleText, { w: below.w, size: 58, font: "serif", lineHeight: 1.08, minH: 76, maxH: Math.round(below.h * 0.52) });
      const subH = subText ? measureTextHeight(subText, { w: below.w, size: 32, lineHeight: 1.35, minH: 48, maxH: Math.round(below.h * 0.36) }) : 0;

      let y = below.y;
      if (c.eyebrow) {
        els.push(
          textEl("eyebrow", c.eyebrow, { x: below.x, y, w: Math.round(below.w * 0.7), h: eyebrowH }, {
            variant: "pill",
            hug: true,
            fill: "accentSoft",
            color: "contrast",
            size: 21,
            weight: 700,
            upper: true,
            lineHeight: 1,
          }),
        );
        y += eyebrowH + 18;
      }

      els.push(
        textEl("title", titleText, { x: below.x, y, w: below.w, h: titleH }, {
          font: "serif",
          size: 58,
          weight: 800,
          color: "primary",
          lineHeight: 1.08,
        }),
      );
      y += titleH;

      if (subText) {
        y += 18;
        els.push(
          textEl(c.subtitle ? "subtitle" : "body", subText, { x: below.x, y, w: below.w, h: subH }, {
            size: 32,
            color: "muted",
            lineHeight: 1.35,
          }),
        );
      }

      return { background: "surface", texture: "none", elements: [...els, ...chrome(ctx, "muted")] };
    },
  },

  /* ========================================================================
     FAMÍLIA 3: COLAGEM & POP / NEOBRUTALISTA (5 layouts)
     ======================================================================== */
  {
    id: "manifesto",
    family: "pop",
    label: "Tarjas de Pôster",
    hint: "Tiras recortadas justas ao texto com sombra deslocada",
    kinds: ["quote", "cover", "free", "cta"],
    build: (c, ctx) => {
      const { f } = ctx;
      const els: CanvasElement[] = [];

      const role: ContentKey = c.title ? "title" : c.quote ? "quote" : "body";
      const chunks = splitChunks(mainText(c) || "Escrita é processo vivo", 16, 4);
      const sub = first(c.subtitle, c.body !== mainText(c) ? c.body : undefined, c.author, c.cta);

      const eyebrowH = c.eyebrow ? 58 : 0;
      const stripH = chunks.length >= 4 ? 108 : 118;
      const stripGap = 16;
      const stripsTotalH = chunks.length * stripH + (chunks.length - 1) * stripGap;
      const subH = sub ? measureTextHeight(sub, { w: f.w, size: 33, lineHeight: 1.32, minH: 52, maxH: 150 }) : 0;

      const totalH = (eyebrowH ? eyebrowH + 18 : 0) + stripsTotalH + (subH ? 34 + subH : 0);
      let y = opticalStartY(f, totalH, 0.44);

      if (c.eyebrow) {
        els.push(
          textEl("eyebrow", c.eyebrow, { x: f.x, y, w: f.w, h: eyebrowH }, {
            font: "hand",
            size: 48,
            weight: 700,
            color: "primary",
            lineHeight: 1,
          }),
        );
        y += eyebrowH + 18;
      }

      chunks.forEach((chunk, i) => {
        const shiftX = i % 2 === 1 ? Math.round(f.w * 0.05) : 0;
        els.push({
          ...textEl(role, chunk, { x: f.x + shiftX, y, w: f.w - shiftX, h: stripH }, {
            part: i,
            variant: "tarja",
            hug: true,
            shadow: "hard",
            borderWidth: 3,
            borderColor: "black",
            fill: i % 2 === 0 ? "primary" : "accent",
            color: "contrast",
            font: "display",
            size: chunks.length >= 4 ? 58 : 66,
            weight: 400,
            upper: true,
            lineHeight: 1.02,
          }),
          rotation: i % 2 === 0 ? -1.8 : 1.5,
        });
        y += stripH + stripGap;
      });

      if (sub) {
        y += 18;
        els.push(
          textEl(c.subtitle ? "subtitle" : c.body && c.body !== mainText(c) ? "body" : c.author ? "author" : "cta", sub, { x: f.x, y, w: f.w, h: subH }, {
            size: 33,
            weight: 700,
            color: "primary",
            lineHeight: 1.32,
          }),
        );
      }

      return { background: "background", texture: "dots", elements: [...els, ...chrome(ctx, "muted")] };
    },
  },

  {
    id: "neobrutal",
    family: "pop",
    label: "Cartão Pop",
    hint: "Cartão com borda grossa, sombra dura e selo estrela",
    kinds: ["step", "checklist", "before_after", "cover", "free"],
    build: (c, ctx) => {
      const { f } = ctx;
      const innerW = f.w - 104;
      const innerX = f.x + 52;

      const topLabel = first(c.eyebrow, c.step ? `PASSO ${c.step}` : undefined);
      const titleText = first(c.title, c.quote) || "Ideia central";
      const footerNote = first(c.note, c.cta);
      const bodyText = first(c.items, c.body, c.subtitle);
      const isList = Boolean(c.items);

      const topH = topLabel ? 52 : 0;
      const titleH = measureTextHeight(titleText, { w: innerW, size: 58, font: "display", upper: true, lineHeight: 1.04, minH: 80, maxH: 230 });
      const wH = c.wrong && c.right ? measureTextHeight(`❌ ${c.wrong}`, { w: innerW, size: 34, lineHeight: 1.3, minH: 70, maxH: 180 }) : 0;
      const rH = c.wrong && c.right ? measureTextHeight(`✔️ ${c.right}`, { w: innerW, size: 34, lineHeight: 1.3, minH: 70, maxH: 180 }) : 0;
      const bH =
        !c.wrong || !c.right
          ? bodyText
            ? measureTextHeight(bodyText, { w: innerW, size: 35, lineHeight: 1.38, list: isList ? "check" : undefined, minH: 84, maxH: 340 })
            : 0
          : 0;
      const nH = footerNote ? measureTextHeight(footerNote, { w: innerW, size: 28, variant: "card", lineHeight: 1.3, minH: 84, maxH: 170 }) : 0;

      const midBlockH = c.wrong && c.right ? wH + 18 + rH : bH;
      const innerStackH =
        (topH ? topH + 22 : 0) +
        titleH +
        (midBlockH ? 26 + midBlockH : 0) +
        (nH ? 28 + nH : 0);

      const cardH = Math.min(f.h - 24, innerStackH + 104);
      const cardY = opticalStartY(f, cardH, 0.46);
      const card: Frame = { x: f.x, y: cardY, w: f.w, h: cardH };

      const els: CanvasElement[] = [
        shapeEl("decor", "rect", card, "surface", { radius: 28, shadow: "hard", borderWidth: 4, borderColor: "black" }),
        { ...shapeEl("decor", "badge-star", { x: card.x + card.w - 78, y: card.y - 34, w: 96, h: 96 }, "note"), rotation: 14 },
      ];

      let y = card.y + 52;
      if (topLabel) {
        els.push(
          textEl(c.eyebrow ? "eyebrow" : "step", topLabel, { x: innerX, y, w: Math.round(innerW * 0.78), h: topH }, {
            variant: "pill",
            hug: true,
            fill: "accent",
            color: "contrast",
            borderWidth: 2,
            borderColor: "black",
            size: 22,
            weight: 700,
            upper: true,
            lineHeight: 1,
          }),
        );
        y += topH + 22;
      }

      els.push(
        textEl("title", titleText, { x: innerX, y, w: innerW, h: titleH }, {
          font: "display",
          size: 58,
          weight: 400,
          upper: true,
          color: "primary",
          lineHeight: 1.04,
        }),
      );
      y += titleH;

      if (c.wrong && c.right) {
        y += 26;
        els.push(
          textEl("wrong", c.wrong, { x: innerX, y, w: innerW, h: wH }, {
            prefix: "❌ ",
            size: 34,
            weight: 600,
            color: "wrong",
            lineHeight: 1.3,
          }),
        );
        y += wH + 18;

        els.push(
          textEl("right", c.right, { x: innerX, y, w: innerW, h: rH }, {
            prefix: "✔️ ",
            size: 34,
            weight: 700,
            color: "right",
            lineHeight: 1.3,
          }),
        );
        y += rH;
      } else if (bodyText && bH) {
        y += 26;
        els.push(
          textEl(c.items ? "items" : c.body ? "body" : "subtitle", bodyText, { x: innerX, y, w: innerW, h: bH }, {
            size: 35,
            weight: 500,
            color: "primary",
            lineHeight: 1.38,
            list: isList ? "check" : undefined,
          }),
        );
        y += bH;
      }

      if (footerNote && nH) {
        y += 28;
        els.push(
          textEl(c.note ? "note" : "cta", footerNote, { x: innerX, y, w: innerW, h: nH }, {
            variant: "card",
            fill: "note",
            color: "black",
            borderWidth: 2,
            borderColor: "black",
            size: 28,
            weight: 700,
            lineHeight: 1.3,
          }),
        );
      }

      return { background: "accentSoft", texture: "grid", elements: [...els, ...chrome(ctx, "contrast")] };
    },
  },

  {
    id: "post-it",
    family: "pop",
    label: "Post-it Colagem",
    hint: "Bilhete amarelo com fita translúcida e canto dobrado",
    kinds: ["step", "quote", "free", "checklist", "cta"],
    build: (c, ctx) => {
      const { f } = ctx;
      const els: CanvasElement[] = [];

      const title = first(c.title);
      const body = first(c.quote, c.body, c.items, c.subtitle, c.note) || "Anota no post-it do lado da cama!";
      const role: ContentKey = c.quote ? "quote" : c.body ? "body" : c.items ? "items" : c.subtitle ? "subtitle" : "note";
      const isList = role === "items";

      const eyebrowH = c.eyebrow ? 52 : 0;
      const titleH = title
        ? measureTextHeight(title, { w: f.w, size: 58, font: "display", upper: true, lineHeight: 1.04, minH: 76, maxH: 190 })
        : 0;
      const noteW = Math.round(f.w * 0.88);
      const noteX = f.x + Math.round((f.w - noteW) / 2);
      const noteH = measureTextHeight(body, {
        w: noteW,
        size: 54,
        font: "hand",
        variant: "note",
        lineHeight: 1.2,
        list: isList ? "dot" : undefined,
        minH: 256,
        maxH: Math.round(f.h * 0.54),
      });

      const totalH = (eyebrowH ? eyebrowH + 20 : 0) + (titleH ? titleH + 34 : 0) + noteH + 60;
      let y = opticalStartY(f, totalH, 0.44);

      if (c.eyebrow) {
        els.push(
          textEl("eyebrow", c.eyebrow, { x: f.x, y, w: Math.round(f.w * 0.72), h: eyebrowH }, {
            variant: "pill",
            hug: true,
            shadow: "hard",
            borderWidth: 2,
            borderColor: "black",
            fill: "surface",
            color: "contrast",
            size: 22,
            weight: 700,
            upper: true,
            lineHeight: 1,
          }),
        );
        y += eyebrowH + 20;
      }

      if (title) {
        els.push(
          textEl("title", title, { x: f.x, y, w: f.w, h: titleH }, {
            font: "display",
            size: 58,
            weight: 400,
            upper: true,
            color: "contrast",
            lineHeight: 1.04,
          }),
        );
        y += titleH + 34;
      }

      els.push({
        ...textEl(role, body, { x: noteX, y, w: noteW, h: noteH }, {
          variant: "note",
          shadow: "note",
          fill: "note",
          color: "black",
          font: "hand",
          size: 52,
          weight: 700,
          lineHeight: 1.18,
          list: isList ? "dot" : undefined,
        }),
        rotation: -2.2,
      });
      els.push({
        ...shapeEl("decor", "tape", { x: Math.round(noteX + noteW / 2 - 88), y: y - 22, w: 176, h: 44 }, "white", { opacity: 0.58 }),
        rotation: 2,
      });
      y += noteH + 18;

      els.push({ ...shapeEl("decor", "arrow", { x: f.x + Math.round(f.w * 0.68), y: y - 10, w: 210, h: 74 }, "contrast"), rotation: -10 });

      if (c.author) {
        els.push(
          textEl("author", c.author, { x: noteX, y: y + 8, w: Math.round(f.w * 0.58), h: 44 }, {
            size: 26,
            weight: 700,
            color: "contrast",
            lineHeight: 1,
          }),
        );
      }

      return { background: "accent", texture: "dots", elements: [...els, ...chrome(ctx, "contrast")] };
    },
  },

  {
    id: "foto-tarja",
    family: "pop",
    label: "Foto + Tarja Pop",
    hint: "Foto sangrada com tarjas recortadas e sombra marcada",
    kinds: ["cover", "image", "free", "quote"],
    build: (c, ctx) => {
      const { f, W, H } = ctx;
      const els: CanvasElement[] = [imageEl("image", c.image ?? "", { x: 0, y: 0, w: W, h: H }, { overlay: 0.32 })];

      if (c.eyebrow) {
        els.push(
          textEl("eyebrow", c.eyebrow, { x: f.x, y: f.y + 8, w: Math.round(f.w * 0.72), h: 54 }, {
            variant: "pill",
            hug: true,
            shadow: "hard",
            borderWidth: 2,
            borderColor: "black",
            fill: "note",
            color: "black",
            size: 22,
            weight: 800,
            upper: true,
            lineHeight: 1,
          }),
        );
      }

      const titleText = mainText(c) || "Escreva o título";
      const subText = first(c.subtitle, c.body !== titleText ? c.body : undefined);

      const titleH = measureTextHeight(titleText, {
        w: Math.round(f.w * 0.94),
        size: 62,
        font: "display",
        variant: "tarja",
        upper: true,
        lineHeight: 1.04,
        minH: 108,
        maxH: 300,
      });
      const subH = subText
        ? measureTextHeight(subText, { w: Math.round(f.w * 0.86), size: 30, variant: "tarja", lineHeight: 1.28, minH: 76, maxH: 170 })
        : 0;

      const bottomTotal = titleH + (subH ? 18 + subH : 0);
      let y = f.y + f.h - bottomTotal - 20;

      els.push({
        ...textEl("title", titleText, { x: f.x, y, w: Math.round(f.w * 0.94), h: titleH }, {
          variant: "tarja",
          hug: true,
          shadow: "hard",
          borderWidth: 3,
          borderColor: "black",
          fill: "accent",
          color: "contrast",
          font: "display",
          size: 62,
          weight: 400,
          upper: true,
          lineHeight: 1.04,
        }),
        rotation: -1.5,
      });
      y += titleH;

      if (subText) {
        y += 18;
        els.push(
          textEl("subtitle", subText, { x: f.x, y, w: Math.round(f.w * 0.86), h: subH }, {
            variant: "tarja",
            hug: true,
            shadow: "hard",
            borderWidth: 2,
            borderColor: "black",
            fill: "surface",
            color: "contrast",
            size: 30,
            weight: 600,
            lineHeight: 1.28,
          }),
        );
      }

      return { background: "black", texture: "none", elements: [...els, ...chrome(ctx, "white")] };
    },
  },

  {
    id: "chamada",
    family: "pop",
    label: "Chamada Pop",
    hint: "Fechamento vibrante com selo estrela e botão tátil",
    kinds: ["cta", "quote", "cover"],
    build: (c, ctx) => {
      const { f, W } = ctx;
      const els: CanvasElement[] = [
        { ...shapeEl("decor", "badge-star", { x: f.x + f.w - 110, y: f.y + 8, w: 104, h: 104 }, "note"), rotation: 12 },
      ];

      const titleText = mainText(c) || "Salve para consultar depois";
      const bodyText = first(c.body !== titleText ? c.body : undefined, c.subtitle);
      const ctaText = first(c.cta, "Vamos juntos? :)");

      const eyebrowH = c.eyebrow ? 52 : 0;
      const titleH = measureTextHeight(titleText, { w: f.w, size: 70, font: "display", upper: true, lineHeight: 1.04, minH: 104, maxH: 300 });
      const bodyW = Math.round(f.w * 0.88);
      const bodyH = bodyText ? measureTextHeight(bodyText, { w: bodyW, size: 35, lineHeight: 1.34, minH: 56, maxH: 180 }) : 0;
      const ctaH = 72;

      const totalH = (eyebrowH ? eyebrowH + 24 : 0) + titleH + (bodyH ? 24 + bodyH : 0) + 38 + ctaH;
      let y = opticalStartY(f, totalH, 0.46);

      if (c.eyebrow) {
        els.push(
          textEl("eyebrow", c.eyebrow, { x: f.x, y, w: f.w, h: eyebrowH }, {
            variant: "pill",
            hug: true,
            fill: "surface",
            color: "contrast",
            borderWidth: 2,
            borderColor: "black",
            size: 22,
            weight: 700,
            upper: true,
            align: "center",
            lineHeight: 1,
          }),
        );
        y += eyebrowH + 24;
      }

      els.push(
        textEl("title", titleText, { x: f.x, y, w: f.w, h: titleH }, {
          font: "display",
          size: 70,
          weight: 400,
          upper: true,
          color: "contrast",
          align: "center",
          lineHeight: 1.04,
        }),
      );
      y += titleH;

      if (bodyText) {
        y += 24;
        els.push(
          textEl(c.body ? "body" : "subtitle", bodyText, { x: Math.round((W - bodyW) / 2), y, w: bodyW, h: bodyH }, {
            size: 35,
            weight: 600,
            color: "contrast",
            align: "center",
            lineHeight: 1.34,
          }),
        );
        y += bodyH;
      }

      y += 38;
      els.push(
        textEl("cta", ctaText, { x: f.x, y, w: f.w, h: ctaH }, {
          variant: "pill",
          hug: true,
          shadow: "hard",
          borderWidth: 3,
          borderColor: "black",
          fill: "note",
          color: "black",
          size: 30,
          weight: 800,
          align: "center",
          lineHeight: 1,
        }),
      );

      return { background: "accent", texture: "dots", elements: [...els, ...chrome(ctx, "contrast")] };
    },
  },
];

const LEGACY_LAYOUT_ALIASES: Record<string, string> = {
  bloco: "neobrutal",
};

export const layoutById = (id: string) => {
  const resolved = LEGACY_LAYOUT_ALIASES[id] ?? id;
  return LAYOUTS.find(l => l.id === resolved) ?? LAYOUTS[0]!;
};

export const layoutsFor = (kind: SlideKind, family: StyleFamily | "all" = "all") => {
  const pool = family === "all" ? LAYOUTS : LAYOUTS.filter(l => l.family === family);
  const fit = pool.filter(l => l.kinds.includes(kind));
  return [...fit, ...pool.filter(l => !l.kinds.includes(kind))];
};

/* ---------------------------------------------------------------- slide ops */

export function buildSlide(
  content: SlideContent,
  layoutId: string,
  aspect: StudioAspect,
  keep: CanvasElement[] = [],
  id = uid("slide"),
): CanvasSlide {
  const { width: W, height: H } = CANVAS_SIZE[aspect];
  const layout = layoutById(layoutId);
  const built = layout.build(content, { aspect, W, H, f: contentFrame(aspect) });
  return {
    id,
    layoutId: layout.id,
    background: built.background,
    texture: built.texture,
    content: { ...content },
    elements: [...built.elements, ...keep],
  };
}

/** Troca a composição: reconstrói os elementos do layout a partir do conteúdo e mantém os livres. */
export function applyLayout(slide: CanvasSlide, layoutId: string, aspect: StudioAspect): CanvasSlide {
  const synced = syncContent(slide);
  return buildSlide(synced.content, layoutId, aspect, slide.elements.filter(e => e.role === "free"), slide.id);
}

/** Um layout diferente do atual, entre os que combinam com o tipo do slide (e família opcional). */
export function remixLayoutId(
  slide: CanvasSlide,
  rand: () => number = Math.random,
  avoid: string[] = [],
  family: StyleFamily | "all" = "all",
): string {
  const familyPool = family === "all" ? LAYOUTS : LAYOUTS.filter(l => l.family === family);
  const fit = familyPool.filter(l => l.kinds.includes(slide.content.kind) && l.id !== slide.layoutId && !avoid.includes(l.id));
  const fallback = familyPool.filter(l => l.id !== slide.layoutId && !avoid.includes(l.id));
  const pool = fit.length ? fit : fallback.length ? fallback : familyPool.filter(l => l.id !== slide.layoutId);
  return (pool[Math.floor(rand() * pool.length) % Math.max(1, pool.length)] ?? familyPool[0] ?? LAYOUTS[0]!).id;
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
  return {
    ...structuredClone(slide),
    id: uid("slide"),
    elements: slide.elements.map(e => ({ ...structuredClone(e), id: uid(e.type[0]) })),
  };
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
  for (const [k, v] of Object.entries(c)) {
    if (k !== "kind" && typeof v === "string" && v.trim()) out[k as ContentKey] = v.trim();
  }
  return out;
}

/**
 * Monta os slides a partir do roteiro, variando a composição dentro da família escolhida
 * (ou entre todas) e nunca repetindo o mesmo layout duas vezes seguidas.
 */
export function slidesFromCompiled(
  compiled: CompiledSlide[],
  aspect: StudioAspect,
  seed = 0,
  family: StyleFamily | "all" = "all",
): CanvasSlide[] {
  let prev = "";
  const usage = new Map<string, number>();
  const familyPool = family === "all" ? LAYOUTS : LAYOUTS.filter(l => l.family === family);

  return compiled.map((s, i) => {
    const content = cleanContent(compiledToContent(s));
    const needsImage = (id: string) => (id === "foto-tarja" || id === "foto-dividida") && !content.image;
    const fitKind = familyPool.filter(l => l.kinds.includes(content.kind) && l.id !== prev);
    const fitNoImg = fitKind.filter(l => !needsImage(l.id));
    const famFallback = familyPool.filter(l => l.id !== prev && !needsImage(l.id));

    const pool = (fitNoImg.length ? fitNoImg : fitKind.length ? fitKind : famFallback.length ? famFallback : familyPool).slice();
    pool.sort((a, b) => (usage.get(a.id) ?? 0) - (usage.get(b.id) ?? 0));
    const least = pool.filter(l => (usage.get(l.id) ?? 0) === (usage.get(pool[0]!.id) ?? 0));
    const layout = least[(seed + i) % least.length] ?? familyPool[0] ?? LAYOUTS[0]!;
    prev = layout.id;
    usage.set(layout.id, (usage.get(layout.id) ?? 0) + 1);
    return buildSlide(content, layout.id, aspect);
  });
}

/** Reconstrói todos os slides de um canvas já existente aplicando uma família gráfica coesa. */
export function applyFamilyToCanvas(
  canvas: StudioCanvas,
  family: StyleFamily,
  aspect: StudioAspect,
  seed = 0,
): StudioCanvas {
  let prev = "";
  const usage = new Map<string, number>();
  const familyPool = LAYOUTS.filter(l => l.family === family);

  const nextSlides = canvas.slides.map((raw, i) => {
    const synced = syncContent(raw);
    const content = synced.content;
    const freeEls = raw.elements.filter(e => e.role === "free");
    const needsImage = (id: string) => (id === "foto-tarja" || id === "foto-dividida") && !content.image;
    const fitKind = familyPool.filter(l => l.kinds.includes(content.kind) && l.id !== prev);
    const fitNoImg = fitKind.filter(l => !needsImage(l.id));
    const famFallback = familyPool.filter(l => l.id !== prev && !needsImage(l.id));

    const pool = (fitNoImg.length ? fitNoImg : fitKind.length ? fitKind : famFallback.length ? famFallback : familyPool).slice();
    pool.sort((a, b) => (usage.get(a.id) ?? 0) - (usage.get(b.id) ?? 0));
    const least = pool.filter(l => (usage.get(l.id) ?? 0) === (usage.get(pool[0]!.id) ?? 0));
    const layout = least[(seed + i) % least.length] ?? familyPool[0]!;
    prev = layout.id;
    usage.set(layout.id, (usage.get(layout.id) ?? 0) + 1);
    return buildSlide(content, layout.id, aspect, freeEls, raw.id);
  });

  return { ...canvas, slides: nextSlides };
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

export function canvasFromCompiled(
  compiled: CompiledSlide[],
  aspect: StudioAspect,
  paletteId = DEFAULT_PALETTE_ID,
  seed = 0,
  family: StyleFamily | "all" = "all",
): StudioCanvas {
  return { version: 1, paletteId, slides: slidesFromCompiled(compiled, aspect, seed, family) };
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
  const pageNum = String(vars.index + 1).padStart(2, "0");
  const totalNum = String(vars.total).padStart(2, "0");
  const counterLabel =
    vars.total > 1
      ? vars.index + 1 < vars.total
        ? `${pageNum}/${totalNum} →`
        : `${pageNum}/${totalNum} ✓`
      : "";
  return text.replace(/\{\{handle\}\}/g, vars.handle).replace(/\{\{counter\}\}/g, counterLabel);
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
  { id: "pilula", label: "Pílula", make: a => textEl("free", "DESTAQUE", centerBox(a, 360, 64), { variant: "pill", hug: true, fill: "accent", color: "contrast", size: 26, weight: 700, upper: true, align: "center", lineHeight: 1 }) },
  { id: "tarja", label: "Tarja", make: a => ({ ...textEl("free", "frase em tarja", centerBox(a, 700, 118), { variant: "tarja", hug: true, shadow: "hard", borderWidth: 3, borderColor: "black", fill: "primary", color: "contrast", font: "display", size: 58, weight: 400, upper: true, lineHeight: 1.02 }), rotation: -2 }) },
  { id: "post-it", label: "Post-it", make: a => ({ ...textEl("free", "Anota no post-it do lado da cama!", centerBox(a, 460, 400), { variant: "note", shadow: "note", fill: "note", color: "black", font: "hand", size: 50, weight: 700, lineHeight: 1.15 }), rotation: -4 }) },
  { id: "mao", label: "Letra de mão", make: a => textEl("free", "Vamos juntos? :)", centerBox(a, 560, 110), { font: "hand", size: 64, weight: 700, color: "contrast" }) },
  { id: "cartao", label: "Cartão", make: a => textEl("free", "Comentário sincerão da Prô", centerBox(a, 720, 220), { variant: "card", shadow: "soft", fill: "accentSoft", color: "contrast", size: 34, lineHeight: 1.3 }) },
  { id: "erro", label: "Erro ❌", make: a => textEl("free", "As ONGs corroboram com o governo", centerBox(a, 820, 120), { prefix: "❌ ", size: 38, weight: 600, color: "wrong" }) },
  { id: "acerto", label: "Acerto ✔️", make: a => textEl("free", "Os dados corroboram a tese", centerBox(a, 820, 120), { prefix: "✔️ ", size: 38, weight: 700, color: "right" }) },
  { id: "seta", label: "Seta", make: a => ({ ...shapeEl("free", "arrow", centerBox(a, 260, 90), "contrast"), rotation: -10 }) },
  { id: "sublinhado", label: "Sublinhado", make: a => shapeEl("free", "underline", centerBox(a, 360, 22), "accent") },
  { id: "circulo", label: "Círculo", make: a => shapeEl("free", "circle", centerBox(a, 220, 220), "accentSoft") },
  { id: "retangulo", label: "Bloco", make: a => shapeEl("free", "rect", centerBox(a, 520, 320), "surface", { radius: 28, shadow: "soft" }) },
  { id: "fita", label: "Fita adesiva", make: a => ({ ...shapeEl("free", "tape", centerBox(a, 200, 56), "note", { opacity: 0.88 }), rotation: -8 }) },
  { id: "estrela", label: "Selo Pop ✦", make: a => ({ ...shapeEl("free", "badge-star", centerBox(a, 140, 140), "note"), rotation: 12 }) },
  { id: "sticker", label: "Sticker ✦", make: a => ({ ...textEl("free", "✦", centerBox(a, 160, 160), { size: 120, color: "accent", align: "center", lineHeight: 1 }), rotation: 10 }) },
  { id: "imagem", label: "Imagem", make: a => imageEl("free", "", centerBox(a, 600, 600), { radius: 24, shadow: "soft" }) },
];

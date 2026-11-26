/**
 * Imagens sobrepostas: prints empilhados, deslocados ou girados, uns por cima dos outros,
 * como nas composições de portfólio (janelas em cascata, uma tela em destaque com as outras
 * espiando por trás, leque de celulares).
 *
 * O arquivo guarda só a escolha do autor (composição, proporção, moldura). As posições saem de
 * `stackLayout`, uma função pura: o mesmo conjunto de imagens sempre dá a mesma composição, e ela
 * cabe sempre na largura do conteúdo.
 */
export type StackItem = { src: string; alt?: string; /** Ponto da imagem que fica à vista quando ela é cortada ("50% 0%"). */ focus?: string };

export const STACK_LAYOUTS = ["cascade", "spotlight", "fan", "stagger", "row"] as const;
export type StackLayout = (typeof STACK_LAYOUTS)[number];
export const STACK_FRAMES = ["card", "browser", "none"] as const;
export type StackFrame = (typeof STACK_FRAMES)[number];
export const STACK_RATIOS = ["wide", "classic", "square", "portrait", "phone"] as const;
export type StackRatio = (typeof STACK_RATIOS)[number];

/** Largura ÷ altura de cada quadro. */
export const RATIO_VALUE: Record<StackRatio, number> = { wide: 1.6, classic: 4 / 3, square: 1, portrait: 0.75, phone: 0.46 };
/** Quantas imagens cada composição comporta (e o mínimo para ela fazer sentido). */
export const LAYOUT_RANGE: Record<StackLayout, { min: number; max: number }> = {
  cascade: { min: 2, max: 4 },
  spotlight: { min: 2, max: 3 },
  fan: { min: 2, max: 5 },
  stagger: { min: 2, max: 5 },
  row: { min: 2, max: 4 },
};
/** A proporção que cada composição usa quando o autor não escolhe. */
export const LAYOUT_RATIO: Record<StackLayout, StackRatio> = { cascade: "wide", spotlight: "wide", fan: "phone", stagger: "classic", row: "phone" };

export type ImageStack = {
  items: StackItem[];
  layout: StackLayout;
  ratio?: StackRatio;
  frame: StackFrame;
  /** Espelha a composição (o que ia para a direita vai para a esquerda). */
  mirror?: boolean;
  caption?: string;
  /** Atrás da composição: o cinza do card quando não definido, nenhum, a cor do case ou `color`. */
  background?: "none" | "brand" | "custom";
  color?: string;
  sectionLabel?: string; heading?: string; intro?: string; id?: string;
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
const pick = <T extends string>(v: unknown, list: readonly T[]) => (list.includes(v as T) ? (v as T) : undefined);
const focus = (v: unknown) => (typeof v === "string" && /^\d{1,3}% \d{1,3}%$/.test(v.trim()) ? v.trim() : undefined);

export function parseImageStack(obj: Record<string, unknown>): ImageStack | null {
  const layout = pick(obj.layout, STACK_LAYOUTS) ?? "cascade";
  const items = (Array.isArray(obj.items) ? obj.items : []).flatMap((raw): StackItem[] => {
    if (!raw || typeof raw !== "object") return [];
    const o = raw as Record<string, unknown>;
    const src = str(o.src);
    return src ? [{ src, alt: str(o.alt), focus: focus(o.focus) }] : [];
  }).slice(0, LAYOUT_RANGE[layout].max);
  if (items.length < 2) return null;
  const background = obj.background === "none" || obj.background === "brand" ? obj.background
    : obj.background === "custom" && typeof obj.color === "string" && /^#[0-9a-f]{6}$/i.test(obj.color) ? "custom" : undefined;
  return {
    items, layout, ratio: pick(obj.ratio, STACK_RATIOS), frame: pick(obj.frame, STACK_FRAMES) ?? "card",
    mirror: obj.mirror === true || obj.mirror === "true" ? true : undefined, caption: str(obj.caption),
    background, color: background === "custom" ? obj.color as string : undefined,
    sectionLabel: str(obj.sectionLabel), heading: str(obj.heading), intro: str(obj.intro), id: str(obj.id),
  };
}

/** Um quadro: canto de cima à esquerda e largura, em % da largura da composição; giro em graus; z cresce para a frente. */
export type StackSlot = { x: number; y: number; w: number; rotate: number; z: number };
export type StackShape = { /** Altura da composição para a largura 100. */ height: number; slots: StackSlot[] };

/** A composição nunca passa desta altura (para a largura 100): quadros de celular não viram uma torre. */
const MAX_HEIGHT = 78;

const round = (n: number) => Math.round(n * 100) / 100;

/** As posições "soltas", no espaço da própria composição, antes de caber na largura. */
function rawSlots(layout: StackLayout, n: number, r: number): StackSlot[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  const mid = (n - 1) / 2;
  switch (layout) {
    case "cascade": {
      // cada quadro desce e avança um passo; o último fica na frente
      const w = 100 - (n - 1) * 15;
      return idx.map((i) => ({ x: i * 15, y: i * (w / r) * 0.3, w, rotate: 0, z: i }));
    }
    case "spotlight": {
      // o primeiro, grande e na frente; os outros espiam por trás, à direita
      const main = 70, side = 46, hs = side / r, offset = hs * 0.4, hm = main / r;
      const bottom = offset + hm;
      const sides = n === 2 ? [0] : [0, bottom - hs];
      return [{ x: 0, y: offset, w: main, rotate: 0, z: n }, ...sides.map((y, i) => ({ x: 54, y, w: side, rotate: 0, z: i }))];
    }
    case "fan": {
      // abertos em leque, girando pela base; o do meio por cima
      const w = 40, step = Math.min(22, 60 / (n - 1));
      return idx.map((i) => ({ x: 50 - w / 2 + (i - mid) * step, y: (i - mid) ** 2 * 2.4, w, rotate: (i - mid) * 8, z: n - Math.abs(i - mid) }));
    }
    case "stagger": {
      // duas colunas desencontradas que se encostam no meio
      const w = 58, h = w / r;
      return idx.map((i) => ({ x: (i % 2) * (100 - w), y: Math.floor(i / 2) * h * 0.8 + (i % 2) * h * 0.42, w, rotate: 0, z: i }));
    }
    case "row": {
      // lado a lado, cada um cobrindo a borda do vizinho, alternando a altura
      const overlap = 0.22, w = 100 / (1 + (n - 1) * (1 - overlap)), h = w / r;
      return idx.map((i) => ({ x: i * w * (1 - overlap), y: i % 2 ? h * 0.14 : 0, w, rotate: 0, z: n - Math.abs(i - mid) }));
    }
  }
}

/** O retângulo que o quadro ocupa depois de girar pela base (o ponto de giro do CSS). */
function bounds(s: StackSlot, h: number) {
  const a = (s.rotate * Math.PI) / 180, cx = s.x + s.w / 2, cy = s.y + h;
  const corners = [[s.x, s.y], [s.x + s.w, s.y], [s.x, s.y + h], [s.x + s.w, s.y + h]].map(([px, py]) => {
    const dx = px - cx, dy = py - cy;
    return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
  });
  return { minX: Math.min(...corners.map((c) => c[0])), maxX: Math.max(...corners.map((c) => c[0])), minY: Math.min(...corners.map((c) => c[1])), maxY: Math.max(...corners.map((c) => c[1])) };
}

/**
 * Onde cada quadro fica para `count` imagens numa composição. O resultado é ajustado: ocupa a largura
 * toda (ou a altura máxima, o que vier antes), centrado, com o giro dos quadros já contado.
 */
export function stackLayout(layout: StackLayout, count: number, ratio: StackRatio = LAYOUT_RATIO[layout], mirror = false): StackShape {
  const { min, max } = LAYOUT_RANGE[layout];
  const n = Math.min(max, Math.max(min, count));
  const r = RATIO_VALUE[ratio];
  let slots = rawSlots(layout, n, r);
  if (mirror) slots = slots.map((s) => ({ ...s, x: 100 - s.x - s.w, rotate: -s.rotate }));
  const boxes = slots.map((s) => bounds(s, s.w / r));
  const minX = Math.min(...boxes.map((b) => b.minX)), maxX = Math.max(...boxes.map((b) => b.maxX));
  const minY = Math.min(...boxes.map((b) => b.minY)), maxY = Math.max(...boxes.map((b) => b.maxY));
  const spanX = maxX - minX, spanY = maxY - minY;
  const k = Math.min(100 / spanX, MAX_HEIGHT / spanY);
  const left = (100 - spanX * k) / 2;
  return {
    height: round(spanY * k),
    slots: slots.map((s) => ({ x: round(left + (s.x - minX) * k), y: round((s.y - minY) * k), w: round(s.w * k), rotate: s.rotate, z: s.z })),
  };
}

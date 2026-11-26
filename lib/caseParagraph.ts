/**
 * O parágrafo simples do case: tamanho da fonte, alinhamento e cor. Fica no próprio bloco
 * `paragraph` (`case_size`, `case_align`, `case_color`); sem nada, é o texto de sempre.
 */
export const PARAGRAPH_SIZES = [
  { value: "", label: "Tamanho padrão" },
  { value: "sm", label: "Pequeno" },
  { value: "lg", label: "Grande" },
  { value: "xl", label: "Muito grande" },
  { value: "xxl", label: "Destaque" },
] as const;
export type ParagraphSize = (typeof PARAGRAPH_SIZES)[number]["value"];
export type ParagraphAlign = "" | "center" | "right";

export const PARAGRAPH_COLORS: { value: string; label: string }[] = [
  { value: "", label: "Cor padrão" },
  { value: "ink", label: "Clara" },
  { value: "brand", label: "Cor do case" },
  { value: "custom", label: "Personalizada…" },
];

export type ParagraphLook = { size: ParagraphSize; align: ParagraphAlign; color: string };

const NAMED = new Set(["ink", "brand"]);
const HEX = /^#[0-9a-f]{3,8}$/i;

export const paragraphColor = (v: unknown) => (typeof v === "string" && (NAMED.has(v) || HEX.test(v)) ? v : "");
export const paragraphSize = (v: unknown): ParagraphSize => PARAGRAPH_SIZES.find(s => s.value && s.value === v)?.value ?? "";
export const paragraphAlign = (v: unknown): ParagraphAlign => (v === "center" || v === "right" ? v : "");

/** What the block asks for; `undefined` when it is a plain paragraph. */
export function readParagraphLook(payload: Record<string, unknown>): ParagraphLook | undefined {
  const look = { size: paragraphSize(payload.case_size), align: paragraphAlign(payload.case_align), color: paragraphColor(payload.case_color) };
  return look.size || look.align || look.color ? look : undefined;
}

/** Only what was chosen: a plain paragraph stays as it was. */
export function writeParagraphLook(look?: ParagraphLook): Record<string, string> {
  if (!look) return {};
  return {
    ...(look.size ? { case_size: look.size } : {}),
    ...(look.align ? { case_align: look.align } : {}),
    ...(look.color ? { case_color: look.color } : {}),
  };
}

/** The attributes the page styles by (`data-*`), plus a custom colour as `--p-color`. */
export function paragraphLookAttrs(look?: ParagraphLook) {
  if (!look) return {};
  const custom = look.color.startsWith("#");
  return {
    "data-size": look.size || undefined,
    "data-align": look.align || undefined,
    "data-color": look.color ? (custom ? "custom" : look.color) : undefined,
    style: custom ? ({ "--p-color": look.color } as Record<string, string>) : undefined,
  };
}

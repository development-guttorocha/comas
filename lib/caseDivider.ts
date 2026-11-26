/**
 * O divisor do case: uma linha (com a cor padrão, a do case, outra ou nenhuma), a largura e a posição
 * dela e o espaço acima e abaixo. Fica no próprio bloco `divider` (`case_color`, `case_size`,
 * `case_align`, `case_space_top`, `case_space_bottom`); sem nada, é a linha de sempre.
 */
import { SPACE_SIZES, type SpaceSize } from "@/lib/caseEmbedSpace";

export const DIVIDER_SIZES = [
  { value: "", label: "Coluna de texto" },
  { value: "content", label: "Largura do conteúdo" },
  { value: "bleed", label: "100% da tela" },
  { value: "w75", label: "75% da tela" },
  { value: "w50", label: "50% da tela" },
  { value: "w25", label: "25% da tela" },
  { value: "w15", label: "15% da tela" },
  { value: "w10", label: "10% da tela" },
  { value: "w5", label: "5% da tela" },
] as const;
export type DividerSize = (typeof DIVIDER_SIZES)[number]["value"];
export const DIVIDER_ALIGNS = [
  { value: "", label: "Centro" },
  { value: "left", label: "Esquerda" },
  { value: "right", label: "Direita" },
] as const;
export type DividerAlign = (typeof DIVIDER_ALIGNS)[number]["value"];

export type DividerStyle = { color: string; size: DividerSize; align: DividerAlign; spaceTop: "" | SpaceSize; spaceBottom: "" | SpaceSize };

export const DIVIDER_COLORS: { value: string; label: string }[] = [
  { value: "", label: "Linha padrão" },
  { value: "none", label: "Sem cor" },
  { value: "brand", label: "Cor do case" },
  { value: "ink", label: "Texto" },
  { value: "muted", label: "Cinza" },
  { value: "custom", label: "Personalizada…" },
];

const NAMED = new Set(["none", "brand", "ink", "muted"]);
const HEX = /^#[0-9a-f]{3,8}$/i;
const space = (v: unknown): "" | SpaceSize => (typeof v === "string" && (SPACE_SIZES as readonly string[]).includes(v) ? (v as SpaceSize) : "");

export function readDivider(payload: Record<string, unknown>): DividerStyle {
  const c = typeof payload.case_color === "string" ? payload.case_color : "";
  return {
    color: NAMED.has(c) || HEX.test(c) ? c : "",
    size: DIVIDER_SIZES.find(s => s.value && s.value === payload.case_size)?.value ?? "",
    align: DIVIDER_ALIGNS.find(a => a.value && a.value === payload.case_align)?.value ?? "",
    spaceTop: space(payload.case_space_top), spaceBottom: space(payload.case_space_bottom) };
}

/** Only what was chosen: a plain divider stays `{}`. */
export function writeDivider(style: DividerStyle): Record<string, string> {
  return {
    ...(style.color ? { case_color: style.color } : {}),
    ...(style.size ? { case_size: style.size } : {}),
    ...(style.align ? { case_align: style.align } : {}),
    ...(style.spaceTop ? { case_space_top: style.spaceTop } : {}),
    ...(style.spaceBottom ? { case_space_bottom: style.spaceBottom } : {}),
  };
}

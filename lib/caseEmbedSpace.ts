/**
 * Espaço acima e abaixo de um componente do case, escolhido no admin (`spaceTop` / `spaceBottom`
 * no JSON). Sem valor, o componente usa o espaçamento próprio dele.
 */
export const SPACE_SIZES = ["none", "sm", "md", "lg", "xl"] as const;
export type SpaceSize = (typeof SPACE_SIZES)[number];
export type EmbedSpace = { top?: SpaceSize; bottom?: SpaceSize };

export const SPACE_OPTIONS: { value: "" | SpaceSize; label: string }[] = [
  { value: "", label: "Padrão" },
  { value: "none", label: "Nenhum" },
  { value: "sm", label: "Pequeno" },
  { value: "md", label: "Médio" },
  { value: "lg", label: "Grande" },
  { value: "xl", label: "Extra grande" },
];

/** Grows with the screen, like the sections' own spacing. */
export const SPACE_VALUES: Record<SpaceSize, string> = {
  none: "0px",
  sm: "clamp(24px, 3vw, 48px)",
  md: "clamp(48px, 6vw, 96px)",
  lg: "clamp(80px, 10vw, 160px)",
  xl: "clamp(120px, 15vw, 240px)",
};

const isSize = (value: unknown): value is SpaceSize => typeof value === "string" && (SPACE_SIZES as readonly string[]).includes(value);

export function readEmbedSpace(obj: Record<string, unknown>): EmbedSpace | undefined {
  const top = isSize(obj.spaceTop) ? obj.spaceTop : undefined;
  const bottom = isSize(obj.spaceBottom) ? obj.spaceBottom : undefined;
  return top || bottom ? { top, bottom } : undefined;
}

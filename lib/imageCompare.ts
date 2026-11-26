/** Antes e depois em imagens: as duas sobrepostas, com um divisor que se arrasta para comparar. */
export type CompareSide = { src: string; alt?: string; label?: string };
export type ImageCompare = {
  before: CompareSide;
  after: CompareSide;
  /** Where the divider starts, in % from the left (50 when unset). */
  start?: number;
  caption?: string;
  /** Behind the images: the card grey when unset, none, the case colour or `color`. */
  background?: "none" | "brand" | "custom";
  color?: string;
  /** false: no outline around the images. */
  border?: boolean;
  sectionLabel?: string; heading?: string; intro?: string; id?: string;
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);

function side(raw: unknown): CompareSide | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const src = str(s.src);
  return src ? { src, alt: str(s.alt), label: str(s.label) } : null;
}

export function parseImageCompare(obj: Record<string, unknown>): ImageCompare | null {
  const before = side(obj.before), after = side(obj.after);
  if (!before || !after) return null;
  const start = typeof obj.start === "number" && Number.isFinite(obj.start) ? Math.min(100, Math.max(0, obj.start)) : undefined;
  const background = obj.background === "none" || obj.background === "brand" ? obj.background
    : obj.background === "custom" && typeof obj.color === "string" && /^#[0-9a-f]{6}$/i.test(obj.color) ? "custom" : undefined;
  return { before, after, start, caption: str(obj.caption), background, color: background === "custom" ? obj.color as string : undefined, border: obj.border === false || obj.border === "false" ? false : undefined, sectionLabel: str(obj.sectionLabel), heading: str(obj.heading), intro: str(obj.intro), id: str(obj.id) };
}

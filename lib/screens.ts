/** Galeria de telas: prints lado a lado, cada um com a sua legenda, numa moldura de celular ou soltos. */
export type Screen = { src: string; alt?: string; label?: string; caption?: string; mobileSrc?: string };
export type ScreenGallery = {
  screens: Screen[];
  /** "phone": a phone outline at the device's proportions; "none": the image as it is. */
  frame?: "phone" | "none";
  sectionLabel?: string; heading?: string; intro?: string; id?: string;
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);

export function parseScreenGallery(obj: Record<string, unknown>): ScreenGallery | null {
  const screens = (Array.isArray(obj.screens) ? obj.screens : []).flatMap(raw => {
    if (!raw || typeof raw !== "object") return [];
    const s = raw as Record<string, unknown>;
    const src = str(s.src);
    return src ? [{ src, alt: str(s.alt), label: str(s.label), caption: str(s.caption) }] : [];
  }).slice(0, 8);
  if (!screens.length) return null;
  return { screens, frame: obj.frame === "none" ? "none" : "phone", sectionLabel: str(obj.sectionLabel), heading: str(obj.heading), intro: str(obj.intro), id: str(obj.id) };
}

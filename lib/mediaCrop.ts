/**
 * Recorte de imagem ou vídeo, sem mexer no arquivo: a área que aparece, em % do original
 * (`x`, `y`, `w`, `h`), e a proporção dela em pixels (`r`), para o site reservar o espaço certo
 * antes do arquivo carregar. Fica no bloco como `case_crop` (e `case_crop_mobile` na versão de celular).
 */
import type { CSSProperties } from "react";

export type MediaCrop = { x: number; y: number; w: number; h: number; r: number };

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function readCrop(value: unknown): MediaCrop | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { x, y, w, h, r } = value as Record<string, unknown>;
  if (![x, y, w, h, r].every(finite)) return undefined;
  const crop = { x: x as number, y: y as number, w: w as number, h: h as number, r: r as number };
  if (crop.w <= 0 || crop.h <= 0 || crop.r <= 0 || crop.x < 0 || crop.y < 0 || crop.x + crop.w > 100.01 || crop.y + crop.h > 100.01) return undefined;
  // The whole frame is no crop at all.
  if (crop.w >= 99.99 && crop.h >= 99.99) return undefined;
  return crop;
}

export function cleanCrop(crop: MediaCrop): MediaCrop {
  return { x: round(crop.x), y: round(crop.y), w: round(crop.w), h: round(crop.h), r: round(crop.r, 4) };
}

/** Editor props hold the crop as text: "" is none. */
export const cropFromText = (text: string) => {
  try { return text ? readCrop(JSON.parse(text)) : undefined; } catch { return undefined; }
};
export const cropToText = (crop: MediaCrop | undefined) => (crop ? JSON.stringify(cleanCrop(crop)) : "");

/** The variables `MediaCrop.module.css` reads; the phone ones only when that version has its own. */
export function cropVars(crop: MediaCrop, mobile?: MediaCrop): CSSProperties {
  const vars: Record<string, string | number> = { "--crop-r": crop.r, "--crop-x": crop.x, "--crop-y": crop.y, "--crop-w": crop.w, "--crop-h": crop.h };
  if (mobile) Object.assign(vars, { "--crop-mr": mobile.r, "--crop-mx": mobile.x, "--crop-my": mobile.y, "--crop-mw": mobile.w, "--crop-mh": mobile.h });
  return vars as CSSProperties;
}

/** For a video with controls, which must stay whole: the crop's frame, kept by covering it. */
export function cropCoverPosition(crop: MediaCrop) {
  const axis = (start: number, size: number) => (size >= 99.99 ? 50 : round((start / (100 - size)) * 100));
  return `${axis(crop.x, crop.w)}% ${axis(crop.y, crop.h)}%`;
}

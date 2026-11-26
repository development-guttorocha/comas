/** Figma covers used when a featured case has no hero image. */
export const localCovers: Record<string,string> = {
  plenno: "/home/redesign/case-plenno.png",
  brandlovers: "/home/redesign/case-brandlovrs.png",
  "loft-design": "/home/redesign/case-loft.png",
};

// Covers are served with `no-store`, so the browser would fetch them again on every
// visit. Panels and belt share one CORS-mode request (the panel <img> preloads it in
// the document head), and decoded images stay here across client-side navigations.
const covers = new Map<string, Promise<HTMLImageElement | null>>();

export function loadCover(src?: string) {
  if (!src) return Promise.resolve(null);
  let cover = covers.get(src);
  if (!cover) {
    cover = new Promise<HTMLImageElement | null>(resolve => {
      const image = new window.Image();
      image.crossOrigin = "anonymous";
      image.onload = () => image.decode().catch(() => {}).then(() => resolve(image));
      image.onerror = () => { covers.delete(src); resolve(null); };
      image.src = src;
    });
    covers.set(src, cover);
  }
  return cover;
}

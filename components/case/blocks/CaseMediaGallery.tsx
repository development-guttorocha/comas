"use client";

import { useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArtImage, VeiledImage } from "@/components/ImageVeil";
import { useLocale } from "@/components/i18n/LocaleProvider";
import styles from "./CaseMedia.module.css";

export type CaseMediaGalleryItem = {
  src: string;
  alt: string;
  caption?: string;
  /** Shown on phones instead of `src`. */
  mobileSrc?: string;
};

export interface CaseMediaGalleryProps {
  id?: string;
  className?: string;
  items: CaseMediaGalleryItem[];
  /** Quando `true`, a primeira imagem usa prioridade de carregamento. */
  prioritizeFirstImage?: boolean;
  /** Contorno do bloco (ex. `border border-line`). */
  borderClass?: string;
}

/** Each image holds this long before the next fades in. */
const ROTATE_MS = 3000;
const ZOOM_MS = 520;
const EASE = "cubic-bezier(.16, 1, .3, 1)";

const box = (rect: DOMRect) => ({ top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px` });

/**
 * Galeria automática: as imagens se revezam num único palco, com controles para voltar,
 * pausar e avançar. Clicar amplia só a imagem da vez, crescendo do palco até a tela.
 */
export default function CaseMediaGallery({ id, className = "", items, prioritizeFirstImage = false, borderClass = "" }: CaseMediaGalleryProps) {
  const { t } = useLocale();
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  // The reader's choice; until then it plays, unless they asked for less motion.
  const [playChoice, setPlayChoice] = useState<boolean | null>(null);
  const [inView, setInView] = useState(false);
  const [zoomed, setZoomed] = useState<number | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const unlock = useRef(() => {});
  const count = items.length;
  const playing = playChoice ?? !reduceMotion;
  const running = count > 1 && playing && inView && zoomed === null;

  // Only rotates while on screen.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: .4 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setActive(i => (i + 1) % count), ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [running, active, count]);

  // The zoom grows the image out of the stage, and shrinks it back on close. The stage is
  // measured with the page's scrollbar in place, since locking the scroll widens the page.
  useEffect(() => {
    const el = dialog.current, from = stage.current, to = frame.current;
    if (zoomed === null || !el || !from || !to) return;
    const start = from.getBoundingClientRect();
    if (!el.open) el.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    unlock.current = () => { document.body.style.overflow = previous; };
    if (!reduceMotion) {
      to.animate([box(start), box(to.getBoundingClientRect())], { duration: ZOOM_MS, easing: EASE });
      shade.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ZOOM_MS, easing: EASE });
    }
    return () => unlock.current();
  }, [zoomed, reduceMotion]);

  const closeZoom = useCallback(() => {
    const el = dialog.current, to = stage.current, from = frame.current;
    if (!el?.open) return;
    unlock.current();
    if (reduceMotion || !to || !from) return el.close();
    const options = { duration: ZOOM_MS * .8, easing: EASE, fill: "forwards" } as const;
    shade.current?.animate([{ opacity: 1 }, { opacity: 0 }], options);
    from.animate([box(from.getBoundingClientRect()), box(to.getBoundingClientRect())], options).finished.then(() => el.close(), () => el.close());
  }, [reduceMotion]);

  if (count === 0) return null;
  const go = (step: number) => setActive(i => (i + step + count) % count);
  const zoomItem = zoomed === null ? null : items[zoomed];

  return (
    <figure id={id} className={`${styles.gallery} ${borderClass} ${className}`.trim()}>
      <div className={styles.player}>
        <div ref={stage} className={styles.stage}>
          <div className={styles.slides} aria-live={running ? "off" : "polite"}>
            {items.map((item, i) => (
              <button
                key={`${item.src}-${i}`}
                type="button"
                className={styles.slide}
                data-active={i === active}
                inert={i !== active}
                onClick={() => setZoomed(i)}
                aria-haspopup="dialog"
                aria-label={`${t("Ampliar imagem")}: ${item.alt}`}
              >
                {/* The zoom asks for the same size, so it opens on an image already loaded. */}
                <VeiledImage src={item.src} mobileSrc={item.mobileSrc} alt={item.alt} fill sizes="100vw" priority={prioritizeFirstImage && i === 0} className={styles.slideImage} />
              </button>
            ))}
          </div>
        </div>
        {count > 1 ? (
          <div className={styles.controls}>
            <button type="button" className={styles.control} onClick={() => go(-1)} aria-label={t("Imagem anterior")}>
              <svg viewBox="0 0 18 18" aria-hidden><path d="M11 4 6 9l5 5" /></svg>
            </button>
            <button type="button" className={styles.control} onClick={() => setPlayChoice(!playing)} aria-label={playing ? t("Pausar galeria") : t("Retomar galeria")} aria-pressed={!playing}>
              {playing
                ? <svg viewBox="0 0 18 18" aria-hidden><path d="M6.5 4.5v9M11.5 4.5v9" /></svg>
                : <svg viewBox="0 0 18 18" aria-hidden><path d="M6 4.2v9.6L13.5 9z" className={styles.controlFill} /></svg>}
            </button>
            <button type="button" className={styles.control} onClick={() => go(1)} aria-label={t("Próxima imagem")}>
              <svg viewBox="0 0 18 18" aria-hidden><path d="m7 4 5 5-5 5" /></svg>
            </button>
          </div>
        ) : null}
      </div>

      {items.some(item => item.caption) ? (
        <figcaption className={`${styles.caption} ${styles.galleryCaptions}`}>
          {items.map((item, i) => <span key={`${item.src}-${i}`} data-active={i === active} aria-hidden={i !== active}>{item.caption}</span>)}
        </figcaption>
      ) : null}

      <dialog
        ref={dialog}
        className={styles.zoom}
        aria-label={zoomItem?.alt}
        onCancel={event => { event.preventDefault(); closeZoom(); }}
        onClose={() => setZoomed(null)}
        onClick={closeZoom}
      >
        {zoomItem ? (
          <>
            <div ref={shade} className={styles.zoomShade} />
            {/* The stage's own file, already loaded: no veil, nothing to wait for. */}
            <div ref={frame} className={styles.zoomFrame}>
              <ArtImage src={zoomItem.src} mobileSrc={zoomItem.mobileSrc} alt={zoomItem.alt} fill sizes="100vw" loading="eager" className={styles.zoomImage} />
            </div>
            <button type="button" className={styles.zoomClose} aria-label={t("Fechar")}>×</button>
          </>
        ) : null}
      </dialog>
    </figure>
  );
}

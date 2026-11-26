"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./EmbedFacade.module.css";

/**
 * A site, prototype or video player that loads only when asked: until then, a cover image and
 * one button. On desktop it opens full screen over the page; on phones, in a new tab.
 */
export default function EmbedFacade({ src, href, title, poster, shellClass, allow, labels }: {
  src: string;
  href: string;
  title: string;
  poster?: string;
  shellClass: string;
  allow: string;
  labels: { action: string; close: string };
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const host = (() => { try { return new URL(href).hostname.replace(/^www\./, ""); } catch { return ""; } })();

  function show() {
    if (window.matchMedia("(max-width: 767px)").matches) window.open(href, "_blank", "noopener,noreferrer");
    else setOpen(true);
  }

  // Full screen above everything; the page behind stays put.
  useEffect(() => {
    const el = dialog.current;
    if (!open || !el) return;
    el.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; if (el.open) el.close(); };
  }, [open]);

  return (
    <div className={`${styles.shell} ${shellClass}`}>
      {poster
        // eslint-disable-next-line @next/next/no-img-element -- the cover keeps the frame's own crop
        ? <img src={poster} alt="" className={styles.poster} loading="lazy" />
        : <span className={styles.placeholder} aria-hidden>{host}</span>}
      <span className={styles.scrim} aria-hidden />
      <div className={styles.actions}>
        <button type="button" className={styles.action} onClick={show} aria-haspopup="dialog">{labels.action}</button>
      </div>
      {open ? (
        <dialog ref={dialog} className={styles.full} aria-label={title} onClose={() => setOpen(false)}>
          <iframe src={src} title={title} className={styles.fullFrame} allow={allow} allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          <button type="button" className={styles.close} onClick={() => dialog.current?.close()} aria-label={labels.close}>
            <svg viewBox="0 0 24 24" aria-hidden><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </dialog>
      ) : null}
    </div>
  );
}

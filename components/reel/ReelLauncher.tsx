"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import story from "@/components/case/blocks/CaseStoryBlocks.module.css";
import type { ReelDoc } from "@/lib/reel/types";
import { beatTime, type ReelTrack } from "@/lib/reel/tracks";
import { LABELS, fmt, useReelAudio } from "./CaseReel";
import PlayIcon from "./PlayIcon";
import VideoCover, { thumb } from "./VideoCover";
import s from "./reelLauncher.module.css";

const ReelPlayer = dynamic(() => import("./ReelPlayer"), { ssr: false });

/**
 * The case's video in the quieter places a case can show it (the Vídeo tab picks one):
 * - `hero`: beside the cover's "Explorar case", in the same type;
 * - `card`: a small floating card near the bottom of the screen, which can be closed;
 * - `button`: a floating button in the same place, which can be closed;
 * - `inline`: the case's "Título + caixa" block, the video in the box, before the text.
 * All but `inline` open the player over the page; `inline` plays in place.
 */
export type ReelLauncherVariant = "hero" | "card" | "button" | "inline";

type Props = { doc: ReelDoc; track: ReelTrack; variant: ReelLauncherVariant; cover?: string; coverFocus?: string };

export default function ReelLauncher({ doc, track, variant, cover, coverFocus }: Props) {
  const labels = LABELS[doc.lang ?? "pt"];
  const { audio, open, close } = useReelAudio(track);
  const time = fmt(beatTime(track, doc.end));
  const draft = doc.draft ? <span className={s.draft}>{labels.draft}</span> : null;

  if (variant === "inline") {
    // CaseTitleBox, the content editor's "Título + caixa": the same grid, type and box, the video in the box.
    return (
      <section className={story.titleBox} aria-label={labels.eyebrow}>
        <div className={`content-wrap ${story.titleBoxGrid}`}>
          <ScrollReveal tone="editorial">
            <p className={story.label}>{labels.eyebrow}{draft}</p>
            <h2 className={story.titleBoxHeading}>{doc.title || labels.watch}</h2>
          </ScrollReveal>
          <ScrollReveal tone="editorial" delay={.08} className={`${story.box} ${s.videoBox}`}>
            {audio ? <ReelPlayer doc={doc} track={track} audio={audio} labels={labels} /> : (
              <VideoCover cover={cover} coverFocus={coverFocus} accent={doc.accent} time={time} label={`${labels.watch} · ${time}`} onOpen={open} width={1200} />
            )}
            <p>{labels.intro.replace("{t}", time)}</p>
          </ScrollReveal>
        </div>
      </section>
    );
  }

  return (
    <>
      {variant === "hero" ? (
        <button type="button" className={s.heroLink} onClick={open}>
          <span className={s.heroPlay} style={{ background: doc.accent }}><PlayIcon /></span>
          {labels.watch}
          <span className={s.heroTime}>{time}</span>
          {draft}
        </button>
      ) : (
        <Floating label={labels.eyebrow} closeLabel={labels.closeFloat} hidden={!!audio}>
          {variant === "card" ? (
            <button type="button" className={s.card} onClick={open}>
              <span className={s.cardThumb}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {cover ? <img src={thumb(cover, 640)} alt="" style={{ objectPosition: coverFocus ?? "50% 50%" }} loading="lazy" /> : null}
                <span className={s.cardPlay} style={{ background: doc.accent }}><PlayIcon /></span>
              </span>
              <span className={s.cardText}>
                <strong>{labels.watch}</strong>
                <span>{doc.title ? `${doc.title} · ` : ""}{time}</span>
                {draft}
              </span>
            </button>
          ) : (
            <button type="button" className={s.button} onClick={open}>
              <span className={s.buttonPlay} style={{ background: doc.accent }}><PlayIcon /></span>
              {labels.watch}<span className={s.heroTime}>{time}</span>{draft}
            </button>
          )}
        </Floating>
      )}
      {audio ? <ReelModal onClose={close} label={labels.eyebrow}><ReelPlayer doc={doc} track={track} audio={audio} labels={labels} /></ReelModal> : null}
    </>
  );
}

const CLOSED_KEY = "case-video-float-closed";

/**
 * Floats at the bottom of the screen once the cover has scrolled away, so it never covers the
 * case's opening; closed, it stays closed for the visit.
 */
function Floating({ label, closeLabel, hidden, children }: { label: string; closeLabel: string; hidden: boolean; children: React.ReactNode }) {
  const [closed, setClosed] = useState(true);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    try { setClosed(sessionStorage.getItem(CLOSED_KEY) === location.pathname); } catch { setClosed(false); }
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (closed) return null;
  const close = () => {
    setClosed(true);
    try { sessionStorage.setItem(CLOSED_KEY, location.pathname); } catch { /* private mode: closed for this view only */ }
  };
  return (
    <aside className={s.float} aria-label={label} data-shown={(shown && !hidden) || undefined}>
      {children}
      <button type="button" className={s.floatClose} onClick={close} aria-label={closeLabel}>×</button>
    </aside>
  );
}

/** The player over the page: Esc, the × or a click outside closes it and stops the music. */
function ReelModal({ onClose, label, children }: { onClose: () => void; label: string; children: React.ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);
  return (
    <div className={s.modal} role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <div className={s.modalBody} onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type="button" className={s.close} onClick={onClose} aria-label="Fechar">×</button>
        {children}
      </div>
    </div>
  );
}

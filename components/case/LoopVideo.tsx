"use client";

import { useEffect, useRef, useState } from "react";
import { cropVars, type MediaCrop } from "@/lib/mediaCrop";
import cropStyles from "./MediaCrop.module.css";
import styles from "./LoopVideo.module.css";

const type = (url: string) => (/\.webm(\?|$)/i.test(url) ? "video/webm" : /\.mov(\?|$)/i.test(url) ? "video/quicktime" : "video/mp4");

/**
 * A video that behaves like a GIF: silent, looping, playing only while on screen. Reduced motion
 * starts it paused; a small button pauses or plays it either way.
 */
export default function LoopVideo({ src, mp4, poster, crop, labels }: { src: string; mp4?: string; poster?: string; crop?: MediaCrop; labels: { pause: string; play: string } }) {
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setUserPaused(true); return; }
    // On screen = a fair part of the video, or of the screen for a tall one.
    const observer = new IntersectionObserver(([entry]) => {
      const seen = entry.intersectionRatio >= .4 || entry.intersectionRect.height >= window.innerHeight * .4;
      if (seen && !el.dataset.userPaused) el.play().catch(() => setPaused(true));
      else el.pause();
    }, { threshold: [0, .1, .2, .3, .4, .5, .75, 1] });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function toggle() {
    const el = video.current;
    if (!el) return;
    if (el.paused) { delete el.dataset.userPaused; setUserPaused(false); void el.play(); }
    else { el.dataset.userPaused = "1"; setUserPaused(true); el.pause(); }
  }

  return (
    <div className={`${styles.frame} ${crop ? cropStyles.crop : ""}`.trim()} style={crop ? cropVars(crop) : undefined}>
      <video ref={video} className={`${styles.video} ${crop ? cropStyles.media : ""}`.trim()} muted loop playsInline preload="metadata" poster={poster}
        onPlay={() => setPaused(false)} onPause={() => setPaused(true)}>
        {mp4 ? <source src={mp4} type="video/mp4" /> : null}
        <source src={src} type={type(src)} />
      </video>
      <button type="button" className={styles.toggle} onClick={toggle} aria-label={paused || userPaused ? labels.play : labels.pause}>
        {paused || userPaused
          ? <svg viewBox="0 0 18 18" aria-hidden><path d="M6 4.2v9.6L13.5 9z" fill="currentColor" /></svg>
          : <svg viewBox="0 0 18 18" aria-hidden><path d="M6.5 4.5v9M11.5 4.5v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}
      </button>
    </div>
  );
}

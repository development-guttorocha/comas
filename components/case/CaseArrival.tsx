"use client";

import { useEffect } from "react";

/** How long the hero holds before the page sets off, and how long the glide takes. */
const HOLD_MS = 700;
const GLIDE_MS = 1400;
const easeInOut = (t: number) => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

/** Arriving from the cases list (`?secao=<id>`): the hero shows for a moment, then the
 * page glides down to that section, so the reader sees where they landed. */
export default function CaseArrival() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("secao");
    if (!id) return;
    // Swaps the marker for the section's hash, so a reload or a shared link goes straight there.
    // Only once the arrival plays: effects may mount twice in development.
    const land = () => {
      url.searchParams.delete("secao");
      url.hash = id;
      history.replaceState(history.state, "", url);
    };
    const target = document.getElementById(id);
    if (!target) return land();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      land();
      target.scrollIntoView({ behavior: "instant", block: "start" });
      return;
    }
    let frame = 0, timer = 0;
    const cancel = () => { window.clearTimeout(timer); cancelAnimationFrame(frame); };
    // The reader taking over the scroll, during the hold or the glide, calls it off.
    const takeOver = () => { cancel(); land(); };
    const options = { passive: true, once: true } as const;
    window.addEventListener("wheel", takeOver, options);
    window.addEventListener("touchstart", takeOver, options);
    window.addEventListener("keydown", takeOver, options);
    timer = window.setTimeout(() => {
      land();
      const from = window.scrollY;
      const to = target.getBoundingClientRect().top + from - (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / GLIDE_MS);
        // Instant per frame: the page's CSS smooth scrolling would fight the easing.
        window.scrollTo({ top: from + (to - from) * easeInOut(progress), behavior: "instant" });
        if (progress < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }, HOLD_MS);
    return () => {
      cancel();
      window.removeEventListener("wheel", takeOver);
      window.removeEventListener("touchstart", takeOver);
      window.removeEventListener("keydown", takeOver);
    };
  }, []);
  return null;
}

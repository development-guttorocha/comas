"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import styles from "@/app/(pt)/cases/cases.module.css";

// Each case holds still for this share of its stretch of scroll, at either end.
const HOLD = .12;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

/** The cases pin to the screen and pass sideways, one beside the other, as the page
 * scrolls; each gets a screen of scroll. Invisible anchors mark where each case sits in
 * view, so the side index and `#case-…` links reach it like any other section. */
export default function CasesRail({ ids, children }: { ids: string[]; children: ReactNode }) {
  const { t } = useLocale();
  const track = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const [opening, setOpening] = useState(false);

  // A case's CTA blurs it while the case loads; the overlay leaves with this page,
  // when the case opens on the same hero.
  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if ((event.target as Element).closest("a[data-seamless]")) setOpening(true);
  }

  useEffect(() => {
    const trackEl = track.current, rowEl = row.current;
    if (!trackEl || !rowEl) return;
    const count = ids.length;
    let frame = 0;
    const update = () => {
      frame = 0;
      const step = trackEl.offsetHeight / count;
      const at = clamp(-trackEl.getBoundingClientRect().top / (step * (count - 1) || 1)) * (count - 1);
      const index = Math.min(Math.floor(at), count - 1);
      const offset = index + smooth(clamp((at - index - HOLD) / (1 - 2 * HOLD)));
      rowEl.style.transform = `translate3d(${-offset * 100}%, 0, 0)`;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    // Tabbing into a case that is off to the side scrolls the page to it.
    const onFocus = (event: FocusEvent) => {
      const slide = Array.from(rowEl.children).findIndex(child => child.contains(event.target as Node));
      if (slide >= 0) document.getElementById(ids[slide])?.scrollIntoView({ block: "start" });
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    rowEl.addEventListener("focusin", onFocus);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      rowEl.removeEventListener("focusin", onFocus);
    };
  }, [ids]);

  return <div ref={track} className={styles.rail} style={{ "--count": ids.length } as CSSProperties}>
    {ids.map((id, index) => <span key={id} id={id} className={styles.railAnchor} style={{ "--i": index } as CSSProperties} />)}
    <div className={styles.railStage}>
      <div ref={row} className={styles.railRow} onClick={onClick}>{children}</div>
      {opening ? <div className={styles.loading} role="status"><span className={styles.loadingBall}>{t("Carregando")}</span></div> : null}
    </div>
  </div>;
}

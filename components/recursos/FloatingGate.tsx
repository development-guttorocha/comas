"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "@/app/(pt)/recursos/trilha.module.css";

/**
 * The e-mail form as a floating panel, the way a tool's panel floats over the canvas. It opens
 * over the hero, follows the reader down the page, folds into a pill when closed, and steps
 * aside where the page has its own form (`hideWhen`).
 */
export default function FloatingGate({ title, body, pill, hideWhen, openWhile, inline, children }: {
  title: string; body: string; pill: string; hideWhen: string; openWhile: string;
  /** The same form, already on the page in the hero; the floating one only shows once it is gone. */
  inline?: boolean;
  children: ReactNode;
}) {
  const [inHero, setInHero] = useState(true);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  // While the hero's own card is on screen, nothing floats; after it, a pill that opens the panel.
  useEffect(() => {
    const el = document.getElementById(openWhile);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { setInHero(Boolean(e?.isIntersecting)); if (e?.isIntersecting) setOpen(false); }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [openWhile]);

  // Every "Receber a trilha" link on the page (nav, locked roles) opens the panel instead of jumping.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href="#receber"]');
      if (!a) return;
      e.preventDefault();
      setHidden(false);
      setOpen(true);
      window.setTimeout(() => document.querySelector<HTMLInputElement>("#receber-painel input[name=name]")?.focus(), 50);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const el = document.getElementById(hideWhen);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setHidden(Boolean(e?.isIntersecting)), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [hideWhen]);

  const card = (closable: boolean) => (
    <div className={styles.floatingCard}>
      <div className={styles.floatingHead}>
        <p>{title}<span>{body}</span></p>
        {closable ? <button type="button" onClick={() => setOpen(false)} aria-label="Minimizar">–</button> : null}
      </div>
      {children}
    </div>
  );

  if (inline) return <div className={styles.heroCard}>{card(false)}</div>;
  if (inHero && !open) return null;
  return (
    <aside id="receber-painel" className={styles.floating} data-hidden={hidden || undefined} aria-label={title}>
      {open ? card(true) : (
        <button type="button" className={styles.floatingPill} onClick={() => setOpen(true)} data-cta="flutuante-abrir">
          <span aria-hidden="true">✦</span>{pill}
        </button>
      )}
    </aside>
  );
}

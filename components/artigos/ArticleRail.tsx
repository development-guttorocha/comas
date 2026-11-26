"use client";

import { useEffect, useState } from "react";
import styles from "@/app/(pt)/artigos/artigos.module.css";

/**
 * The article's index. Beside the text on wide screens, with the section being read marked;
 * on narrower ones it is a closed box above the text.
 */
export function ArticleToc({ items }: { items: Array<{ id: string; label: string }> }) {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1360px)");
    const sync = () => setOpen(wide.matches);
    sync();
    wide.addEventListener("change", sync);
    return () => wide.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const sections = items.map(t => document.getElementById(t.id)).filter(el => el !== null);
    if (!sections.length) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
    }, { rootMargin: "-15% 0px -75% 0px" });
    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, [items]);

  if (!items.length) return null;
  return (
    <details className={styles.toc} open={open} onToggle={e => setOpen(e.currentTarget.open)}>
      <summary>Neste artigo</summary>
      <nav aria-label="Neste artigo">
        <ol>
          {items.map(t => (
            <li key={t.id}>
              <a href={`#${t.id}`} aria-current={active === t.id ? "location" : undefined} onClick={() => { if (!window.matchMedia("(min-width: 1360px)").matches) setOpen(false); }}>{t.label}</a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}

/** Copy the link, or send it on. Small and quiet: it sits next to the byline and after the text. */
export function ShareButtons({ title, url, place }: { title: string; url: string; place: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* The address bar still has it. */ }
  };
  const links = [
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
  ];
  return (
    <ul className={styles.share} aria-label="Compartilhar">
      <li><button type="button" onClick={copy} data-cta={`compartilhar-link-${place}`}>{copied ? "Link copiado ✓" : "Copiar link"}</button></li>
      {links.map(s => (
        <li key={s.label}><a href={s.href} target="_blank" rel="noopener noreferrer" data-cta={`compartilhar-${s.label.toLowerCase()}-${place}`}>{s.label}</a></li>
      ))}
    </ul>
  );
}

/** A thin bar at the very top that fills as the text is read. */
export function ReadingProgress({ target }: { target: string }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = document.getElementById(target);
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const { top, height } = el.getBoundingClientRect();
      const span = height - window.innerHeight * 0.5;
      setProgress(Math.min(1, Math.max(0, -top / Math.max(span, 1))));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(frame); };
  }, [target]);
  return <div className={styles.progress} style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />;
}

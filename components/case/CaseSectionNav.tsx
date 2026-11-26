"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CASE_SECTION_NAV_MAX } from "@/lib/caseLayout";
import { motionEaseOut } from "@/lib/motion";
import styles from "./CaseSectionNav.module.css";
import { useLocale } from "@/components/i18n/LocaleProvider";

export type CaseSectionNavItem = { id: string; label: string };
type CaseSectionNavProps = { company: string; items: CaseSectionNavItem[]; brandColor?: string; ariaLabel?: string };

const easeIn = [0.4, 0, 1, 1] as const;

function goTo(id: string) {
  const node = document.getElementById(id);
  if (!node) return false;
  node.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  history.replaceState(null, "", `#${id}`);
  return true;
}

/** As mesmas âncoras do Notion, em um índice lateral que acompanha a leitura.
 * No mobile vira uma barra ao lado do botão de menu: a seção atual fica no centro,
 * as vizinhas somem num degradê nas pontas, e um toque abre a lista inteira. */
export default function CaseSectionNav({ company, items, ariaLabel }: CaseSectionNavProps) {
  const { t } = useLocale();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLButtonElement>(null);
  const windowRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [activeId, setActiveId] = useState("");
  const [open, setOpen] = useState(false);
  const sheetId = useId();
  const reduceMotion = useReducedMotion();
  const navItems = items.slice(0, CASE_SECTION_NAV_MAX);
  const label = ariaLabel ?? `${t("Seções do case")} — ${company}`;
  const current = activeId || navItems[0]?.id;

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setPinned((sentinelRef.current?.getBoundingClientRect().top ?? 121) < 120);
      const marker = Math.min(window.innerHeight * .35, 280);
      let current = items[0]?.id ?? "";
      for (const item of items.slice(0, CASE_SECTION_NAV_MAX)) {
        const element = document.getElementById(item.id);
        if (element && element.getBoundingClientRect().top <= marker) current = item.id;
      }
      setActiveId(current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [items]);

  // Slides the mobile bar so the current section sits in its middle.
  useEffect(() => {
    const view = windowRef.current, track = trackRef.current;
    if (!view || !track) return;
    const center = () => {
      const item = track.querySelector<HTMLElement>("[data-active]");
      if (item) track.style.transform = `translateX(${view.clientWidth / 2 - item.offsetLeft - item.offsetWidth / 2}px)`;
    };
    center();
    // Also re-centres when the bar first shows and when the web font changes the labels' widths.
    const observer = new ResizeObserver(center);
    observer.observe(view);
    observer.observe(track);
    return () => observer.disconnect();
  }, [current]);

  const dismiss = useCallback(() => {
    setOpen(false);
    barRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    sheetRef.current?.querySelector<HTMLElement>('[aria-current="location"]')?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    // The bar only exists on mobile; a wider screen drops the list.
    const mobile = window.matchMedia("(max-width: 767px)");
    const onChange = () => { if (!mobile.matches) setOpen(false); };
    window.addEventListener("keydown", onKey);
    mobile.addEventListener("change", onChange);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      mobile.removeEventListener("change", onChange);
    };
  }, [open, dismiss]);

  // Same motion as the site menu, rising from the bar instead of falling from the top.
  const sheetVariants = reduceMotion
    ? {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.45, ease: motionEaseOut } },
        exit: { opacity: 0, transition: { duration: 0.45, ease: motionEaseOut } },
      }
    : {
        hidden: { clipPath: "inset(100% 0 0 0)" },
        show: { clipPath: "inset(0% 0 0 0)", transition: { duration: 0.48, ease: motionEaseOut } },
        exit: { clipPath: "inset(100% 0 0 0)", transition: { duration: 0.4, ease: easeIn } },
      };
  const listVariants = {
    hidden: {},
    show: { transition: reduceMotion ? { staggerChildren: 0 } : { staggerChildren: 0.06, delayChildren: 0.18 } },
  };
  const itemVariants = reduceMotion
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
    : { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: motionEaseOut } } };

  if (!navItems.length) return null;
  return <>
    <div ref={sentinelRef} className={styles.sentinel} aria-hidden />
    <nav aria-label={label} aria-hidden={!pinned} inert={!pinned} className={`${styles.nav} ${pinned ? styles.visible : ""}`}>
      <div className={styles.items}>
        {navItems.map(item => <a key={item.id} href={`#${item.id}`} className={styles.link}
          aria-current={current === item.id ? "location" : undefined}
          onClick={event => { if (goTo(item.id)) event.preventDefault(); }}>
          <span className={styles.label}>{item.label}</span><span className={styles.line} aria-hidden />
        </a>)}
      </div>
      <button ref={barRef} type="button" className={styles.bar} aria-haspopup="dialog" aria-expanded={open} aria-controls={sheetId}
        onClick={() => setOpen(true)}>
        <span className="sr-only">{label}: {navItems.find(item => item.id === current)?.label}</span>
        <span ref={windowRef} className={styles.window} aria-hidden>
          <span ref={trackRef} className={styles.track}>
            {navItems.map(item => <span key={item.id} className={styles.barItem} data-active={current === item.id ? "" : undefined}>{item.label}</span>)}
          </span>
        </span>
      </button>
    </nav>

    <AnimatePresence initial={false}>
      {open ? <motion.div ref={sheetRef} id={sheetId} key="sections" role="dialog" aria-modal="true" aria-label={label}
        className={styles.sheet} variants={sheetVariants} initial="hidden" animate="show" exit="exit">
        <p className={styles.sheetTitle}>{label}</p>
        <motion.ul className={styles.sheetList} variants={listVariants} initial="hidden" animate="show">
          {navItems.map(item => <motion.li key={item.id} variants={itemVariants}>
            <a href={`#${item.id}`} aria-current={current === item.id ? "location" : undefined}
              onClick={event => {
                event.preventDefault();
                setOpen(false);
                // Scroll once the page is unlocked again.
                requestAnimationFrame(() => goTo(item.id));
              }}>
              {item.label}
            </a>
          </motion.li>)}
        </motion.ul>
        <button type="button" className={styles.sheetClose} onClick={dismiss}>
          <span className="sr-only">{t("Fechar")}</span><span aria-hidden>×</span>
        </button>
      </motion.div> : null}
    </AnimatePresence>
  </>;
}

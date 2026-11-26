"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { LogoMark } from "@/components/LogoMark";
import styles from "@/app/(pt)/servicos/service-shell.module.css";

type NavLink = { label: string; href: string };

/**
 * The service pages' own menu: Design Services and the page name, links to its sections (or to other pages),
 * and two ways out that matter here: about Gutto, and the page's main action (contact by default). The section in view is marked.
 */
export default function ServiceNav({ name, links, parent, cta = { label: "Contato", href: "#contato" } }: { name: string; links: NavLink[]; parent?: NavLink; cta?: NavLink }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const panelId = useId();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The section crossing the upper third of the screen is the one being read.
  useEffect(() => {
    const sections = links.filter(l => l.href.startsWith("#")).map(l => document.getElementById(l.href.slice(1))).filter(el => el !== null);
    if (!sections.length) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(`#${entry.target.id}`);
    }, { rootMargin: "-30% 0px -60% 0px" });
    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, [links]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const item = (l: NavLink) => l.href.startsWith("#")
    ? <a key={l.href} href={l.href} aria-current={active === l.href ? "location" : undefined} onClick={() => setOpen(false)}>{l.label}</a>
    : <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>;

  return (
    <header className={styles.nav} data-scrolled={scrolled || undefined} data-open={open || undefined}>
      <div className={styles.navBar}>
        <div className={styles.navBrand}>
          <Link href="/" aria-label="Gutto Rocha, início" className={styles.navLogo}><LogoMark variant="onDark" /></Link>
          {parent ? <><Link href={parent.href} className={styles.navParent}>{parent.label}</Link><span className={styles.navSep} aria-hidden="true">|</span></> : null}
          <a href="#topo" className={styles.navName}>{name}</a>
        </div>

        <nav className={styles.navLinks} aria-label="Nesta página">{links.map(item)}</nav>

        <div className={styles.navActions}>
          <Link href="/sobre" className={styles.navGhost}>Sobre o Gutto Rocha</Link>
          <a href={cta.href} className={styles.navSolid} data-cta="nav-contato">{cta.label}</a>
          <button type="button" className={styles.navToggle} aria-expanded={open} aria-controls={panelId} aria-label={open ? "Fechar menu" : "Abrir menu"} onClick={() => setOpen(o => !o)}>
            <span /><span />
          </button>
        </div>
      </div>

      <div id={panelId} className={styles.navPanel} hidden={!open}>
        <nav aria-label="Nesta página (menu)">{links.map(item)}</nav>
        <Link href="/sobre" onClick={() => setOpen(false)}>Sobre o Gutto Rocha <span aria-hidden="true">↗</span></Link>
      </div>
    </header>
  );
}

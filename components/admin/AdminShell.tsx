"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowIcon, CloseIcon, GearIcon, GridIcon, KeyIcon, LogoMark, MoreIcon, PlayIcon } from "./icons";
import AdminAuthGate from "./AdminAuthGate";
import AdminLock, { LockButton } from "./AdminLock";
import styles from "./admin.module.css";

export type Crumb = { label: string; href?: string };

const NAV: Array<{ href: string; label: string; icon: ReactNode; match: string[] }> = [
  { href: "/admin/carrosseis", label: "Carrosséis", icon: <GridIcon />, match: ["/admin/carrosseis"] },
  { href: "/admin/reels", label: "Reels", icon: <PlayIcon />, match: ["/admin/reels"] },
  { href: "/admin/marca", label: "Marca", icon: <GearIcon />, match: ["/admin/marca"] },
];

const within = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
const currentArea = (pathname: string) => NAV.find(item => item.match.some(href => within(pathname, href)))?.href;

/** The admin frame: the areas on the left, breadcrumbs and the page's actions on top. */
export default function AdminShell({ crumbs, actions, children }: { crumbs: Crumb[]; actions?: ReactNode; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const current = currentArea(pathname);
  const isLocalHost = typeof window !== "undefined" && /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname);
  return (
    <AdminAuthGate>
      <div className={styles.app}>
        <a href="#admin-main" className={styles.skipLink}>Pular para o conteúdo</a>
        <nav className={styles.rail} aria-label="Admin">
          <Link href="/admin/carrosseis" className={styles.brand}><span className={styles.logo}><LogoMark /></span><span className={styles.navLabel}>Texto em Ciclo</span></Link>
          {NAV.map(item => (
            <Link key={item.href} href={item.href} className={styles.railButton} title={item.label} aria-current={current === item.href ? "page" : undefined}>
              {item.icon}<span className={styles.navLabel}>{item.label}</span>
            </Link>
          ))}
          <span className={styles.railSpacer} />
          {isLocalHost ? (
            <Link href="/admin/chaves" className={styles.railButton} title="Chaves locais" aria-current={within(pathname, "/admin/chaves") ? "page" : undefined}><KeyIcon /><span className={styles.navLabel}>Chaves</span></Link>
          ) : null}
          <LockButton />
          <button type="button" className={styles.railButton} title="Sair da sessão" onClick={() => window.dispatchEvent(new Event("admin:logout"))}><CloseIcon /><span className={styles.navLabel}>Sair</span></button>
        </nav>
        <header className={styles.top}>
          <nav className={styles.crumbs} aria-label="Você está em">
            {crumbs.map((crumb, i) => (
              <span key={i} className={styles.crumbs}>
                {i > 0 ? <span className={styles.crumbSep} aria-hidden>›</span> : null}
                {crumb.href && i < crumbs.length - 1 ? <Link href={crumb.href}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}
              </span>
            ))}
          </nav>
          <TopActions>{actions}</TopActions>
        </header>
        <main id="admin-main" tabIndex={-1} className={styles.main}>{children}</main>
        <AdminLock />
      </div>
    </AdminAuthGate>
  );
}

/**
 * The page's actions. On a narrow screen (≤900px) they fold behind one "⋯" button and open as a menu,
 * which stays open while one of its dialogs (Publicar o site) is open.
 */
function TopActions({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const dialogOpen = () => !!box.current?.querySelector("dialog[open]");
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (dialogOpen() || box.current?.contains(target) || toggle.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || dialogOpen()) return;
      setOpen(false);
      toggle.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <>
      <button ref={toggle} type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton} ${styles.moreActions}`} aria-label="Ações da página" aria-expanded={open} aria-controls="admin-top-actions" onClick={() => setOpen(v => !v)}><MoreIcon /></button>
      <div ref={box} id="admin-top-actions" className={styles.topActions} data-open={open || undefined}>{children}</div>
    </>
  );
}

/** Mídia: the files, and Figma, the way screens come in. */
export const MEDIA_TABS = [{ href: "/admin/midia", label: "Arquivos" }, { href: "/admin/midia/figma", label: "Figma" }];

/** Tabs between the screens of one area (Home: texts and the belt), as links. */
export function AreaTabs({ tabs }: { tabs: Array<{ href: string; label: string }> }) {
  const pathname = usePathname() ?? "";
  return (
    <nav className={styles.tabs} aria-label="Seções desta área">
      {tabs.map(tab => <Link key={tab.href} href={tab.href} className={styles.tab} aria-selected={pathname === tab.href}>{tab.label}</Link>)}
    </nav>
  );
}

/** An area's list of screens (Site): one row per screen, the whole row a link, in titled groups. */
export function AreaIndex({ title, subtitle, sections }: { title: string; subtitle: string; sections: Array<{ title: string; id?: string; items: Array<{ href: string; label: string; description: string; meta?: string }> }> }) {
  return (
    <AdminShell crumbs={[{ label: title }]}>
      <div className={styles.sheet}>
        <div className={styles.page}>
          <div className={styles.screenHead}>
            <div>
              <h1 className={styles.title}>{title}</h1>
              <p className={styles.subtitle}>{subtitle}</p>
            </div>
          </div>
          {sections.map(section => (
            <section key={section.title} id={section.id} className={styles.pendingSection} aria-label={section.title}>
              <h2 className={styles.pendingTitle}>{section.title}</h2>
              <ul className={styles.areaIndex}>
                {section.items.map(item => (
                  <li key={item.href}>
                    <Link href={item.href} className={styles.areaIndexItem}>
                      <span>
                        <strong>{item.label}{item.meta ? <span className={styles.areaIndexMeta}>{item.meta}</span> : null}</strong>
                        <span>{item.description}</span>
                      </span>
                      <span className={styles.go} aria-hidden><ArrowIcon /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

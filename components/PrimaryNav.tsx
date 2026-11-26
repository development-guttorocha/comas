"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogoMark } from "@/components/LogoMark";
import styles from "./PrimaryNav.module.css";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { useSiteContent } from "@/components/i18n/SiteContentProvider";
import NavLocaleSwitch from "@/components/NavLocaleSwitch";
import { localizedHref, localePathPtFrom } from "@/lib/navLocalePaths";
import { motionEaseOut } from "@/lib/motion";

const easeIn = [0.4, 0, 1, 1] as const;
// When the bar widens back (--nav-motion, 1.05s), it is at ~98% of its width by now.
const NAV_GROW_MS = 850;

function isNavLinkCurrent(href: string, pathname: string, home: boolean) {
  if (href === "/") return home;
  if (href === "/cases") {
    return (
      pathname === "/cases" ||
      pathname.startsWith("/cases/") ||
      pathname.startsWith("/en/cases/")
    );
  }
  return pathname === href;
}

/**
 * Menu padrão do site (desenho da Home).
 * Desktop: barra de vidro a 80% que encolhe para 40% ao rolar, com rótulos curtos.
 * Tablet: ao encolher, os links dão lugar ao botão de menu.
 * Mobile: duas bolas — logo no topo e menu no rodapé — e menu em tela inteira.
 */
export default function PrimaryNav() {
  const pathname = usePathname();
  const { locale, t } = useLocale();
  // The links, with a full label at the top and a short one once the bar shrinks (admin → Menu e 404).
  const navItems = useSiteContent().nav;
  const ptPathname = localePathPtFrom(pathname);
  const homeCurrent = ptPathname === "/";
  const [open, setOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  // Labels shorten as soon as the bar shrinks, but only lengthen once it has widened
  // again, so the items never spill outside its background on the way back.
  const [labelsShort, setLabelsShort] = useState(false);
  if (navScrolled && !labelsShort) setLabelsShort(true);
  const panelId = useId();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (navScrolled || !labelsShort) return;
    const timer = window.setTimeout(() => setLabelsShort(false), reduceMotion ? 0 : NAV_GROW_MS);
    return () => window.clearTimeout(timer);
  }, [navScrolled, labelsShort, reduceMotion]);

  const overlayVariants = reduceMotion
    ? {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.45, ease: motionEaseOut } },
        exit: { opacity: 0, transition: { duration: 0.45, ease: motionEaseOut } },
      }
    : {
        hidden: { clipPath: "inset(0 0 100% 0)" },
        show: {
          clipPath: "inset(0 0 0% 0)",
          transition: { duration: 0.48, ease: motionEaseOut },
        },
        exit: {
          clipPath: "inset(0 0 100% 0)",
          transition: { duration: 0.4, ease: easeIn },
        },
      };

  const listVariants = {
    hidden: {},
    show: {
      transition: reduceMotion
        ? { staggerChildren: 0, delayChildren: 0 }
        : { staggerChildren: 0.07, delayChildren: 0.2 },
    },
  };

  const linkVariants = reduceMotion
    ? {
        hidden: { opacity: 1, y: 0 },
        show: { opacity: 1, y: 0, transition: { duration: 0 } },
      }
    : {
        hidden: { opacity: 0, y: 32 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: motionEaseOut },
        },
      };

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // The menu button exists below 1200px (tablet once the bar shrinks, mobile always).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1200px)");
    const onChange = () => {
      if (mq.matches) close();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [close]);

  useEffect(() => {
    const onScroll = () => {
      // Hysteresis prevents flicker near the top, including elastic scrolling.
      const y = Math.max(0, window.scrollY);
      setNavScrolled((current) => (current ? y > 8 : y > 32));
    };
    const frame = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  // On the Home, "Cases" scrolls to its own cases section instead of the listing.
  const hrefFor = (href: string) =>
    homeCurrent && href === "/cases" ? "#cases" : localizedHref(href, locale);
  const current = (href: string) =>
    isNavLinkCurrent(href, ptPathname, homeCurrent) ? "page" as const : undefined;
  const logo = <LogoMark variant="onDark" className={styles.logo} />;

  return (
    <>
      <nav
        aria-label={t("Principal")}
        className={styles.header}
        data-scrolled={navScrolled}
        data-compact={labelsShort}
        data-home={homeCurrent}
      >
        <div className={styles.panel}>
          <Link href={localizedHref("/", locale)} aria-label={t("Gutto Rocha — Início")} className={styles.brand} onClick={close}>
            {logo}
            <span className={styles.name} aria-hidden="true">Gutto Rocha</span>
          </Link>
          <div className={styles.links}>
            {navItems.map((item) => (
              <Link key={item.href} href={hrefFor(item.href)} data-cursor="link" aria-current={current(item.href)} className={styles.navLink}>
                <span className={styles.fullLabel}>{item.label}</span>
                <span className={styles.shortLabel}>{item.short}</span>
              </Link>
            ))}
            <NavLocaleSwitch pathname={pathname} />
          </div>
          <button
            type="button"
            data-cursor="hover"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen(true)}
          >
            <span className="sr-only">{t("Abrir menu")}</span>
            <span aria-hidden className={styles.burger}><span /><span /><span /></span>
          </button>
        </div>
      </nav>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            key="nav-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t("Menu de navegação")}
            className={styles.overlay}
            variants={overlayVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            {/* The overlay repeats the two circles: the menu circle becomes the close. */}
            <Link href={localizedHref("/", locale)} aria-label={t("Gutto Rocha — Início")} className={`${styles.circle} ${styles.overlayBrand}`} onClick={close}>
              {logo}
            </Link>
            <motion.nav
              className={styles.overlayLinks}
              aria-label={t("Secções")}
              variants={listVariants}
              initial="hidden"
              animate="show"
            >
              {navItems.map((item) => (
                <motion.div key={item.href} variants={linkVariants}>
                  <Link href={hrefFor(item.href)} data-cursor="link" aria-current={current(item.href)} onClick={close}>
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </motion.nav>
            <div className={styles.overlayFoot}>
              <NavLocaleSwitch pathname={pathname} />
              <button type="button" data-cursor="hover" className={`${styles.circle} ${styles.closeButton}`} onClick={close}>
                <span className="sr-only">{t("Fechar menu")}</span>
                <span aria-hidden className={styles.closeIcon}>×</span>
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

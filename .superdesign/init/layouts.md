# Layouts

Root layout wraps every page with SiteNav (top) and Footer. Case pages use CaseShell (header, section nav, next case).

### `app/(pt)/layout.tsx`

```tsx
import SiteRootLayout, { siteRootMetadata, siteViewport } from "@/components/SiteRootLayout";

// The share images (opengraph-image.tsx) live outside this group, under app/: inside a route group
// Next adds a hash to their address, and the pages link to the plain `<page>/opengraph-image`.
export const generateMetadata = siteRootMetadata;
export const viewport = siteViewport;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteRootLayout locale="pt">{children}</SiteRootLayout>;
}

```

### `components/SiteRootLayout.tsx`

```tsx
import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Footer from "@/components/Footer";
import PageTransitionShell from "@/components/PageTransitionShell";
import { personJsonLd, SITE_URL, websiteJsonLd } from "@/lib/seo";
import { serializeJsonLd } from "@/lib/jsonLd";
import "@/app/globals.css";
import LocaleProvider from "@/components/i18n/LocaleProvider";
import { messagesEn } from "@/lib/i18n/messages";
import { getPageContent } from "@/lib/pages/store";
import type { FooterContent, SiteContent } from "@/lib/pages/schemas";
import SiteContentProvider from "@/components/i18n/SiteContentProvider";
import type { SiteLocale } from "@/lib/siteLocale";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

/** The site's defaults: the Home's title and description, from admin → SEO. Each page sets its own. */
export async function siteRootMetadata(): Promise<Metadata> {
  const { homeTitle: title, homeDescription: description } = await getPageContent<SiteContent>("site", "pt");
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: "Gutto Rocha",
    authors: [{ name: "Gutto Rocha", url: SITE_URL }],
    creator: "Gutto Rocha",
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    title,
    description,
    openGraph: { type: "website", siteName: "Gutto Rocha", title, description, locale: "pt_BR", alternateLocale: ["en_US"] },
    twitter: { card: "summary_large_image", title, description },
  };
}

export const siteViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

/**
 * The document for one language. Portuguese (`app/(pt)`) and English (`app/en`) are separate root
 * layouts, so the language is known at build time and every page can be prerendered; switching
 * language is a full page load.
 */
export default async function SiteRootLayout({ locale, children }: { locale: SiteLocale; children: React.ReactNode }) {
  // Both languages, so the footer and the menu stay right on the not-found page, which has no route.
  const [footerPt, footerEn, sitePt, siteEn] = await Promise.all([
    getPageContent<FooterContent>("rodape", "pt"), getPageContent<FooterContent>("rodape", "en"),
    getPageContent<SiteContent>("site", "pt"), getPageContent<SiteContent>("site", "en"),
  ]);
  const site = locale === "en" ? siteEn : sitePt;
  return (
    <html
      lang={locale === "en" ? "en" : "pt-BR"}
      data-scroll-behavior="smooth"
      className={dmSans.variable}
      suppressHydrationWarning
    >
      {/* eslint-disable-next-line @next/next/no-head-element -- this is the root layout, shared by app/(pt) and app/en */}
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd([{ ...personJsonLd, description: site.personDescription }, websiteJsonLd(locale)]) }}
        />
      </head>
      <body className="font-sans">
        <LocaleProvider locale={locale} messages={messagesEn}>
          <SiteContentProvider content={{ pt: sitePt, en: siteEn }}>
            <PageTransitionShell>
              {children}
              <Footer content={{ pt: footerPt, en: footerEn }} />
            </PageTransitionShell>
          </SiteContentProvider>
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}

```

### `components/SiteNav.tsx`

```tsx
export { default } from "./PrimaryNav";

```

### `components/PrimaryNav.tsx`

```tsx
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

```

### `components/PrimaryNav.module.css`

```css
/* Menu padrão do site, no desenho da Home.
   The header reserves its height on every page except the Home, whose hero sits under it. */
.header {
  position: sticky;
  top: 0;
  z-index: 90;
  height: 88px;
  --nav-motion: 1.05s cubic-bezier(.4, 0, .2, 1);
  --nav-compact: rgb(11 14 16 / 78%);
  --nav-glass: rgb(255 255 255 / 5%);
}
.header[data-home="true"] { height: 0; }

/* Desktop: a glass bar at 80% that shrinks to 40% once the page scrolls. */
.panel {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  box-sizing: border-box;
  width: 80%;
  min-height: 61px;
  padding: 8px;
  border-radius: 64px;
  background: var(--nav-glass);
  color: var(--color-ink);
  -webkit-backdrop-filter: blur(35px);
  backdrop-filter: blur(35px);
  box-shadow: inset 0 7px 10px rgb(255 255 255 / 3%);
  transition: width var(--nav-motion), background-color .4s ease;
}
.header[data-scrolled="true"] .panel { width: 40%; background: var(--nav-compact); }

/* Figma stroke: a translucent white gradient, brighter at both ends. */
.panel::before, .circle::before, .menuButton::before {
  content: '';
  position: absolute;
  inset: 0;
  padding: 1px;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(90deg, rgb(255 255 255 / 30%), rgb(255 255 255 / 7.5%) 5%, rgb(255 255 255 / 20.7%) 95%, rgb(255 255 255 / 30%));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.brand { display: flex; align-items: center; gap: 12px; flex-shrink: 0; min-height: 44px; color: inherit; border-radius: 50%; }
.logo { width: 44px; height: 44px; flex-shrink: 0; }
.name { font-size: 18px; line-height: 1.2; font-weight: 600; letter-spacing: -.04em; white-space: nowrap; }
.header[data-compact="true"] .name { display: none; }

.links { display: flex; align-items: center; gap: 16px; }
.navLink { padding: 8px 16px; border-radius: 16px; font-size: 14px; line-height: 1.6; font-weight: 500; white-space: nowrap; color: inherit; text-shadow: 1px 1px 8px #0008; }
.navLink[aria-current="page"] { font-weight: 700; }
.navLink:hover { background: rgb(255 255 255 / 7%); }
.shortLabel { display: none; }
/* Labels fade in whenever the bar swaps full and short versions. */
.fullLabel, .shortLabel, .name { animation: navLabelFade .5s ease both; }
@keyframes navLabelFade { from { opacity: 0; } }
.header[data-compact="true"] .links { gap: 4px; }
.header[data-compact="true"] .navLink { padding-inline: 10px; }
.header[data-compact="true"] .fullLabel { display: none; }
.header[data-compact="true"] .shortLabel { display: inline; }

.menuButton { position: relative; display: none; place-items: center; width: 44px; height: 44px; border-radius: 50%; color: inherit; }
.burger { display: grid; gap: 4px; width: 20px; }
.burger > span { height: 2px; border-radius: 2px; background: currentColor; }
:is(.brand, .navLink, .menuButton, .circle):focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }

/* Glass circle: the mobile logo and menu, and the open menu's logo and close. */
.circle {
  position: relative;
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--nav-compact);
  color: var(--color-ink);
  -webkit-backdrop-filter: blur(35px);
  backdrop-filter: blur(35px);
  box-shadow: inset 0 7px 10px rgb(255 255 255 / 3%);
}

/* Open menu: full screen. */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  padding: 16px 16px max(22px, calc(env(safe-area-inset-bottom) + 14px));
  background: #0b0e10;
  color: var(--color-ink);
}
.overlayBrand { align-self: flex-start; }
.overlayLinks { display: grid; gap: 28px; margin-block: auto; padding: 48px 8px; font-size: clamp(32px, 9vw, 56px); font-weight: 700; line-height: 1.1; letter-spacing: -.03em; }
.overlayLinks a { color: inherit; transition: opacity .2s ease; }
.overlayLinks a:hover { opacity: .7; }
.overlayLinks a[aria-current="page"] { text-decoration: underline !important; text-underline-offset: .12em; text-decoration-thickness: 2px; }
.overlayFoot { display: flex; align-items: center; justify-content: space-between; padding-left: 8px; }
.closeIcon { font-size: 30px; line-height: 1; }

/* Tablet: short labels; once the bar shrinks, the links give way to the menu button. */
@media (max-width: 1199px) and (min-width: 768px) {
  .fullLabel { display: none; }
  .shortLabel { display: inline; }
  .links { gap: 4px; }
  .navLink { padding-inline: 10px; }
  .header[data-compact="true"] .links { display: none; }
  .header[data-compact="true"] .menuButton { display: grid; }
}

/* Mobile: no bar and no shrinking, just two circles — the logo centred at the top and
   the menu at the foot of the screen, within thumb reach. */
@media (max-width: 767px) {
  .panel, .header[data-scrolled="true"] .panel {
    inset: 16px 16px auto;
    justify-content: center;
    width: auto;
    min-height: 0;
    padding: 0;
    transform: none;
    background: none;
    box-shadow: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    transition: none;
  }
  .panel::before, .links, .name { display: none; }
  .brand, .menuButton {
    position: relative;
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--nav-glass);
    -webkit-backdrop-filter: blur(35px);
    backdrop-filter: blur(35px);
    box-shadow: inset 0 7px 10px rgb(255 255 255 / 3%);
  }
  .brand::before { content: ''; position: absolute; inset: 0; padding: 1px; border-radius: inherit; pointer-events: none; background: linear-gradient(90deg, rgb(255 255 255 / 30%), rgb(255 255 255 / 7.5%) 5%, rgb(255 255 255 / 20.7%) 95%, rgb(255 255 255 / 30%)); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
  /* Over light sections the logo circle darkens; the menu circle floats over anything, so it stays dark. */
  .header[data-scrolled="true"] .brand { background: var(--nav-compact); }
  .overlayBrand { align-self: center; }
  .menuButton, .closeButton { position: fixed; z-index: 1; right: 16px; bottom: max(16px, calc(env(safe-area-inset-bottom) + 8px)); }
  .menuButton { background: var(--nav-compact); }
}
/* Above mobile the close sits beside the language switcher, in the flow. */
@media (min-width: 768px) {
  .overlay { padding: 24px 32px 32px; }
}

@media (prefers-reduced-motion: reduce) {
  .panel { transition: none; }
  .fullLabel, .shortLabel, .name { animation: none; }
}
@media print {
  .header { display: none; }
}

```

### `components/Footer.tsx`

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { buttonClassName } from "@/components/ui/buttonStyles";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { localizedHref } from "@/lib/navLocalePaths";
import type { FooterContent } from "@/lib/pages/schemas";
import type { SiteLocale } from "@/lib/siteLocale";
import styles from "./Footer.module.css";

function Pill({ href, label }: { href: string; label: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.a
      href={href}
      data-cursor="link"
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      className={buttonClassName({ variant: "footerPill" })}
      whileHover={reduceMotion ? undefined : { x: 4 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {label}
    </motion.a>
  );
}

/**
 * Footer compartilhado: chamada final, marca e contatos. O texto vem de `content/pages/rodape.json`
 * (editado no admin, em Páginas), nas duas línguas; a língua atual escolhe qual mostrar.
 */
export default function Footer({ content }: { content: Record<SiteLocale, FooterContent> }) {
  const { locale } = useLocale();
  const c = content[locale];
  // The admin is a tool with its own frame, not a page of the site; service pages bring their own footer.
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/servicos") || pathname?.startsWith("/recursos") || pathname?.startsWith("/artigos") || pathname?.startsWith("/fale-comigo")) return null;

  return (
    <footer className={styles.footer} data-accent-cursor-surface>
      <section className={styles.cta} aria-labelledby="site-footer-contact">
        <div className={styles.ctaInner}>
          <div>
            <p className={styles.kicker}>{c.kicker}</p>
            <h2 id="site-footer-contact">{c.title}</h2>
          </div>
          <nav className={styles.ctaLinks} aria-label={locale === "en" ? "More" : "Mais"}>
            {c.links.map(link => link.href.startsWith("/")
              ? <Link key={link.href} href={localizedHref(link.href, locale)}>{link.label} <span aria-hidden>↗</span></Link>
              : <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label} <span aria-hidden>↗</span></a>)}
          </nav>
        </div>
      </section>

      <div className={styles.contact}>
        <div className={`content-wrap text-center ${styles.wordmarkWrap}`}>
          <div
            aria-hidden
            className={`${styles.wordmark} portfolio-footer-wordmark font-bold leading-none tracking-[-0.065em]`}
            style={{ fontSize: "clamp(40px, 17cqw, 190px)" }}
          >
            {c.wordmark}
          </div>
        </div>

        <div className="content-wrap mt-8 flex flex-wrap items-center justify-center gap-2 md:mt-10">
          {c.pills.map(pill => <Pill key={pill.href} href={pill.href} label={pill.label} />)}
        </div>
      </div>
    </footer>
  );
}

```

### `components/Footer.module.css`

```css
.footer {
  width: 100%;
  padding-bottom: max(24px, env(safe-area-inset-bottom, 0px));
}

.cta,
.contact {
  width: 80%;
  margin-inline: auto;
}

.cta {
  padding-block: clamp(56px, 6vw, 88px);
  border-radius: 24px 24px 0 0;
  background: #ef352c;
  color: #080808;
}

.ctaInner {
  display: flex;
  width: calc(100% - 80px);
  margin-inline: auto;
  align-items: end;
  justify-content: space-between;
  gap: 48px;
}

.kicker {
  margin-bottom: 16px;
  font-size: 10px;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.cta h2 {
  max-width: 24ch;
  font-size: clamp(28px, 2.8vw, 42px);
  font-weight: 700;
  letter-spacing: -.055em;
  line-height: 1.1;
}

.ctaLinks {
  display: flex;
  flex-shrink: 0;
  gap: 32px;
}

.ctaLinks a {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 18px;
  color: #080808;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .035em;
  text-transform: uppercase;
}

.ctaLinks a:hover {
  text-decoration: underline !important;
  text-underline-offset: 5px;
}

.contact {
  overflow: hidden;
  padding: clamp(48px, 6vw, 88px) 0 clamp(48px, 5vw, 80px);
  border-radius: 0 0 24px 24px;
  background: #fff;
  color: #080808;
}

/* A palavra é medida pela largura da coluna (cqw), não da tela, para nunca vazar e sair do centro. */
.wordmarkWrap {
  container-type: inline-size;
}

.wordmark {
  font-style: normal;
  white-space: nowrap;
}

@media (max-width: 1023px) and (min-width: 768px) {
  .cta,
  .contact {
    width: 86%;
  }
}

@media (max-width: 900px) {
  .ctaInner {
    align-items: start;
    flex-direction: column;
    gap: 24px;
  }
}

@media (max-width: 767px) {
  .cta,
  .contact {
    width: calc(100% - 48px);
  }

  .ctaInner {
    width: calc(100% - 40px);
  }

  .ctaLinks {
    flex-wrap: wrap;
    gap: 8px 24px;
  }
}

/* Room for the floating chapter index that Home and Sobre show on touch screens. */
@media (max-width: 899px), (hover: none) {
  .footer {
    padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  }
}

```

### `components/case/CaseShell.tsx`

```tsx
import type { ReactNode } from "react";
import styles from "./CaseChrome.module.css";
import CaseArrival from "@/components/case/CaseArrival";
import CaseNav from "@/components/case/CaseNav";
import CaseNextLink from "@/components/case/CaseNextLink";
import CaseSectionNav from "@/components/case/CaseSectionNav";
import { CaseImageThemeProvider } from "@/components/ImageVeil";
import type { CaseSectionNavItem } from "@/components/case/CaseSectionNav";
import { DEFAULT_SITE_LOCALE, type SiteLocale } from "@/lib/siteLocale";

export type { CaseSectionNavItem };

export interface CaseShellNext {
  slug: string;
  title: string;
  company: string;
  brandColor?: string;
  cover?: string;
}

interface CaseShellProps {
  /** `en` para `/en/cases/…` (links “próximo case” e locale coerente). */
  locale?: SiteLocale;
  next?: CaseShellNext;
  /** Topo da página (hero e eventual mídia logo abaixo). O menu local e a barra de progresso aparecem logo a seguir. */
  hero: ReactNode;
  /** Âncoras da navegação local (máx. 5); empresa à esquerda, links à direita. Cor de marca na barra de progresso. */
  sectionNav: {
    company: string;
    items: CaseSectionNavItem[];
    brandColor?: string;
  };
  children: ReactNode;
  /** Sobrescreve `--color-accent` localmente no case (ex.: cor vinda do Notion). */
  accentColor?: string;
}

/** Shell partilhado: nav global, hero, navegação local do case + progresso de leitura, conteúdo, próximo case. */
export default function CaseShell({
  locale = DEFAULT_SITE_LOCALE,
  next,
  hero,
  sectionNav,
  children,
  accentColor,
}: CaseShellProps) {
  return (
    <CaseImageThemeProvider color={accentColor} label={sectionNav.company}>
      <CaseNav />
      <main className={`case-content portfolio-case-page ${styles.page}`} style={accentColor ? { ["--case-brand" as string]: accentColor } : undefined}>
        {hero}
        <CaseArrival />
        <CaseSectionNav
          company={sectionNav.company}
          items={sectionNav.items}
          brandColor={sectionNav.brandColor}
        />
        {children}
        {next ? <CaseNextLink locale={locale} {...next} /> : null}
      </main>
    </CaseImageThemeProvider>
  );
}

```

### `components/case/CaseChrome.module.css`

```css
.page { --color-accent: var(--color-ink); min-width: 0; }
.container { width: var(--content-width); margin-inline: auto; }
.hero { position: relative; overflow: hidden; padding-block: clamp(64px, 8vw, 120px) clamp(48px, 6vw, 88px); background: var(--color-surface); }
.heroCopy { max-width: 960px; }
.heroCopy h1 { max-width: 18ch; text-wrap: balance; }
.heroCopy > p:last-child { max-width: 680px; }
/* A row of key figures, like a product page's specs: small label, large value. */
.meta { display: grid; grid-template-columns: repeat(var(--meta-columns, 3), minmax(0, 1fr)); gap: 40px 32px; margin: 0; padding-block: clamp(64px, 7vw, 112px); text-align: left; }
/* The figures span the content width: first flush left, last flush right, the rest centred.
   Each one keeps its label and value left-aligned to each other. */
.meta > div { justify-self: center; }
.meta > div:first-child { justify-self: start; }
.meta > div:last-child { justify-self: end; }
.meta dt { margin-bottom: 8px; color: var(--color-muted); font-size: 14px; font-weight: 600; line-height: 1.4; }
.meta dd { margin: 0; color: var(--color-ink); font-size: var(--type-subheading); font-weight: var(--weight-heading); line-height: 1.15; letter-spacing: var(--tracking-heading); text-wrap: balance; }
.meta dd > span { display: block; margin-top: 8px; color: var(--color-muted); font-size: 14px; font-weight: 500; letter-spacing: 0; }
/* The tags close the row, centred under the figures, as pills like the 3P's on the Home. */
.metaTagsRow { grid-column: 1 / -1; }
.meta .metaTags { display: flex; flex-wrap: wrap; gap: 8px; font-size: 14px; font-weight: 400; letter-spacing: 0; }
.meta .metaTags > span { margin: 0; padding: 6px 16px; border: 1px solid var(--color-control-line); border-radius: var(--radius-control); color: var(--color-subtle); line-height: 1.5; }
.cover { position: relative; isolation: isolate; display: flex; flex-direction: column; overflow: hidden; width: 100%; min-height: 100svh; margin-top: -88px; background: #000; color: #f8f8f5; }
.coverContent { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 32px 64px; flex: 1; padding: clamp(28px, 4vw, 64px) var(--page-gutter); padding-top: calc(88px + clamp(28px, 4vw, 64px)); }
.coverCopy { min-width: 0; }
.coverCopy :is(h1, h2) { max-width: 16ch; font-size: clamp(40px, 5.2vw, 80px); font-weight: 700; line-height: 1.04; letter-spacing: -.045em; text-wrap: balance; }
.coverCopy p { max-width: 640px; margin-top: 24px; font-size: clamp(18px, 1.5vw, 22px); line-height: 1.55; color: var(--color-accent); }
.coverEyebrow { margin-bottom: 20px; font-size: 14px; font-weight: 600; }
.coverCounter { margin-bottom: 12px; color: rgb(248 248 245 / 60%); font-size: 13px; font-variant-numeric: tabular-nums; letter-spacing: .04em; }
/* A cover in a list: the picture is one big link under the text, and the CTA stays clickable on top. */
.coverHit { position: absolute; inset: 0; z-index: 1; }
.coverContentOver { pointer-events: none; }
.coverContentOver .coverLink { pointer-events: auto; }
.coverLink { display: inline-flex; align-items: center; align-self: end; justify-self: end; gap: 24px; font-size: 14px; font-weight: 700; text-transform: uppercase; }
.coverLink span { font-size: 22px; }
/* Próximo case: card no padrão dos WorkCards, na largura do footer e afastado dele. */
.next { padding-block: var(--pad-section-md); }
.nextCard { display: grid; grid-template-columns: minmax(0, 1fr); overflow: hidden; border-radius: var(--radius-card); background: var(--color-card); color: var(--color-ink); text-decoration: none; }
.nextBody { display: flex; flex-direction: column; align-items: flex-start; gap: 24px; min-width: 0; padding: var(--card-padding); }
.nextCompany { color: var(--color-muted); font-size: 14px; font-weight: 600; letter-spacing: var(--tracking-label); }
.nextTitle { max-width: 18ch; font-size: var(--type-subheading); line-height: 1.12; letter-spacing: -.04em; font-weight: 700; text-wrap: balance; }
.nextCta { margin-top: auto; }
.nextCard:hover .nextCta { background: var(--color-card-alt); border-color: var(--color-ink); }
.nextMedia { position: relative; aspect-ratio: 1.6; overflow: hidden; background: var(--color-card-alt); }
.nextMedia img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform .5s cubic-bezier(.2, .65, .3, 1); }
.nextCard:hover .nextMedia img { transform: scale(1.015); }
@media (min-width: 768px) {
  .nextCard { grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); }
  .nextBody { padding: clamp(32px, 3.5vw, 56px); }
  .nextMedia { aspect-ratio: auto; min-height: 100%; }
}
/* On phones the CTA sits under the copy, clear of the menu button in the bottom-right corner. */
@media (max-width: 767px) { .cover { margin-top: -80px; } .coverContent { grid-template-columns: minmax(0, 1fr); align-content: end; padding-top: 108px; } .coverLink { justify-self: start; } .meta { grid-template-columns: minmax(0, 1fr); gap: 32px; } .meta > div, .meta > div:last-child { justify-self: start; } }
@media (prefers-reduced-motion: reduce) { .nextMedia img { transition: none; } .nextCard:hover .nextMedia img { transform: none; } }

```


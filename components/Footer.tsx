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
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/servicos") || pathname?.startsWith("/recursos") || pathname?.startsWith("/artigos") || pathname?.startsWith("/fale-comigo") || pathname?.startsWith("/termos-de-uso")) return null;

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

        <div className={styles.legal}>
          <Link href="/termos-de-uso">
            {locale === "en" ? "Terms of use" : "Termos de uso"}
          </Link>
        </div>
      </div>
    </footer>
  );
}

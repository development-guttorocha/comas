"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { useReducedMotion } from "framer-motion";
import { localizedHref } from "@/lib/navLocalePaths";
import Link from "next/link";
import type { HomeContent } from "@/lib/pages/schemas";
import HomeShader from "./home/HomeShader";
import styles from "./home/HomeHero.module.css";

type HeroContent = Pick<HomeContent, "wordmark" | "reflection" | "statement" | "statementSub" | "primaryCta" | "secondaryCta" | "video" | "poster">;

export default function HomeHeroClient({ content: c }: { content: HeroContent }) {
  const { locale } = useLocale();
  const reduced = useReducedMotion();
  return <section id="inicio" className={styles.hero} aria-labelledby="home-title">
    <div className={styles.backdrop} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- exact Figma poster for reduced motion */}
      {reduced ? <img src={c.poster} width={1024} height={576} alt="" /> : <video src={c.video} poster={c.poster} autoPlay muted loop playsInline preload="metadata" />}
      <HomeShader className={styles.shader} />
    </div>
    <div className={styles.shade} aria-hidden="true" />
    <div className={styles.inner}>
      <h1 id="home-title" className={styles.wordmark}>{c.wordmark}</h1>
      <p className={styles.statement}><strong>{c.statement}</strong><span>{c.statementSub}</span></p>
      <div className={styles.actions}>
        <a className={styles.primary} href="#como-lidero">{c.primaryCta}</a>
        <Link className={styles.secondary} href={localizedHref("/sobre", locale)}>{c.secondaryCta}</Link>
      </div>
      <span className={styles.reflection} aria-hidden="true">{c.reflection}</span>
    </div>
  </section>;
}

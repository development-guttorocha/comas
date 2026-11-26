import Link from "next/link";
import type { ReactNode } from "react";
import { VeiledImage } from "@/components/ImageVeil";
import styles from "../CaseChrome.module.css";

export type CaseHeroFullBleedMedia =
  | {
      type: "image";
      src: string;
      alt: string;
      priority?: boolean;
      /** Shown on phones instead of `src`. */
      mobileSrc?: string;
      /** The point kept in view when the cover is cropped (`"50% 30%"`). */
      focus?: string;
    }
  | {
      type: "video";
      src: string;
      poster?: string;
    };

export interface CaseHeroFullBleedProps {
  eyebrow: string;
  title: ReactNode;
  tagline?: ReactNode;
  /** Id do elemento seguinte (ex. primeira secção de conteúdo) — âncora do botão Continuar */
  nextSectionId: string;
  /** Sem mídia, o hero usa a cor de marca como fundo. */
  media?: CaseHeroFullBleedMedia;
  /** Nível do título: `h1` na página do case; `h2` quando o hero aparece numa lista. */
  titleAs?: "h1" | "h2";
  /** Leva o CTA a outra página (ex. o case completo) em vez de rolar até `nextSectionId`. */
  href?: string;
  ctaClassName?: string;
  /** Conteúdo extra sob o texto (ex.: números do case na lista). */
  extra?: ReactNode;
  /** Acima do rótulo (ex.: "01 / 06"). */
  counter?: string;
  /**
   * Texto do CTA. Se definido e não vazio → usado **na íntegra** (sem acrescentar empresa).
   * Se omitido → padrão “Continuar” ou “Continuar {company}” quando `company` existe.
   */
  continueLabel?: string;
  company?: string;
  /** Cor de fundo do CTA (hex da marca); sem isto usa `bg-accent`. */
  brandColor?: string;
  /** Ancora da secção hero (navegação local) */
  sectionId?: string;
  className?: string;
  /**
   * Altura do hero — por defeito ocupa a viewport (`100svh`), com a navegação sobreposta.
   * Sobrescrever só em casos excecionais.
   */
  minHeightClass?: string;
  /** Classes extra no título (ex. cor de destaque estilo Apple) */
  titleClassName?: string;
  /** Ao lado do CTA (ex.: o vídeo do case). */
  ctaAside?: ReactNode;
}


export default function CaseHeroFullBleed({ eyebrow, title, tagline, nextSectionId, media, titleAs: Title = "h1", href, ctaClassName = "", extra, counter, continueLabel, company, brandColor, sectionId, className = "", minHeightClass = "", titleClassName = "", ctaAside }: CaseHeroFullBleedProps) {
  const ctaLabel = continueLabel?.trim() || (company?.trim() ? `Continuar ${company.trim()}` : "Continuar");
  const ctaClass = `${styles.coverLink} ${ctaClassName}`;
  return (
    <section id={sectionId} className={`${styles.cover} ${minHeightClass} ${className}`} style={media ? undefined : { background: brandColor }}>
      {media ? <div className="absolute inset-0" aria-hidden>
        {media.type === "image" ? <VeiledImage src={media.src} mobileSrc={media.mobileSrc} focus={media.focus} alt={media.alt} fill priority={media.priority ?? true} sizes="100vw" className="object-cover object-center" /> : <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline poster={media.poster}><source src={media.src} type="video/mp4" /></video>}
      </div> : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" aria-hidden />
      {/* In a list, the whole picture opens the case; the CTA stays the labelled way in. */}
      {href ? <Link href={href} className={styles.coverHit} aria-hidden tabIndex={-1} data-seamless /> : null}
      <div className={`${styles.coverContent} ${href ? styles.coverContentOver : ""}`}>
        <div className={styles.coverCopy}>
          {counter ? <div className={styles.coverCounter}>{counter}</div> : null}
          <div className={styles.coverEyebrow}>{eyebrow}</div>
          <Title className={titleClassName}>{title}</Title>
          {tagline ? <p>{tagline}</p> : null}
          {extra}
        </div>
        {/* The case opens on this same hero, so it skips the page curtain and simply scrolls on. */}
        {(() => {
          const cta = href
            ? <Link href={href} className={ctaClass} data-seamless>{ctaLabel}<span aria-hidden>↗</span></Link>
            : <a href={`#${nextSectionId}`} className={ctaClass}>{ctaLabel}<span aria-hidden>↓</span></a>;
          return ctaAside ? <div className={styles.coverActions}>{ctaAside}{cta}</div> : cta;
        })()}
      </div>
    </section>
  );
}

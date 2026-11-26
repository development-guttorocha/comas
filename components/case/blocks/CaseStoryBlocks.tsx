import type { ReactNode } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import LoopVideo from "@/components/case/LoopVideo";
import styles from "./CaseStoryBlocks.module.css";

/**
 * Formatos para dar ritmo ao case, na linha do Sobre e da Home: abertura de capítulo, frase,
 * título + caixa, painel claro, número gigante, fluxo e bento. A cor de destaque vem de
 * `--case-brand` (a cor do case).
 */

export type Tone = "neutral" | "soft" | "brand" | "light" | "gray";
const toneClass = (tone?: Tone) => (tone ? styles[`tone_${tone}`] ?? "" : "");

/** Paragraphs from a text where a blank line starts a new one. */
function Paragraphs({ text, className }: { text: string; className?: string }) {
  return <>{text.split(/\n\s*\n/).map((p, i) => <p key={i} className={className}>{p}</p>)}</>;
}

function Header({ sectionLabel, heading, intro, centered }: { sectionLabel?: string; heading?: string; intro?: string; centered?: boolean }) {
  if (!sectionLabel && !heading && !intro) return null;
  return (
    <header className={`${styles.header} ${centered ? styles.centered : ""}`}>
      {sectionLabel ? <p className={styles.label}>{sectionLabel}</p> : null}
      {heading ? <h2 className={styles.heading}>{heading}</h2> : null}
      {intro ? <p className={styles.intro}>{intro}</p> : null}
    </header>
  );
}

/* ---------- Chapter opening ---------- */

export function CaseChapter({ number, title, body, src, id }: { number?: string; title: string; body?: string; src?: string; id?: string }) {
  return (
    <section id={id} className={`${styles.chapter} ${src ? styles.chapterImage : ""}`}>
      {src ? <>
        {/* eslint-disable-next-line @next/next/no-img-element -- a full-bleed backdrop, cropped by CSS */}
        <img src={src} alt="" className={styles.chapterBackdrop} loading="lazy" />
        <span className={styles.chapterShade} aria-hidden />
      </> : null}
      <ScrollReveal tone="editorial" className={styles.chapterCopy}>
        {number ? <span className={styles.chapterNumber} aria-hidden>{number}</span> : null}
        <h2 className={styles.chapterTitle}>{title}</h2>
        {body ? <p className={styles.chapterBody}>{body}</p> : null}
      </ScrollReveal>
    </section>
  );
}

/* ---------- Statement ---------- */

export function CaseStatement({ body, caption, id }: { body: string; caption?: string; id?: string }) {
  return (
    <section id={id} className={styles.statement}>
      <ScrollReveal tone="editorial" className="content-wrap">
        <p className={styles.statementText}>{body}</p>
        {caption ? <p className={styles.statementCaption}>{caption}</p> : null}
      </ScrollReveal>
    </section>
  );
}

/* ---------- Title + box ---------- */

export function CaseTitleBox({ sectionLabel, title, continuation, intro, body, id }: { sectionLabel?: string; title: string; continuation?: string; intro?: string; body: string; id?: string }) {
  return (
    <section id={id} className={styles.titleBox}>
      <div className={`content-wrap ${styles.titleBoxGrid}`}>
        <ScrollReveal tone="editorial">
          {sectionLabel ? <p className={styles.label}>{sectionLabel}</p> : null}
          <h2 className={styles.titleBoxHeading}>{title}{continuation ? <span> {continuation}</span> : null}</h2>
          {intro ? <p className={styles.intro}>{intro}</p> : null}
        </ScrollReveal>
        <ScrollReveal tone="editorial" delay={.08} className={styles.box}>
          <Paragraphs text={body} />
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ---------- Light panel ---------- */

export function CaseLightPanel({ sectionLabel, heading, body, src, alt = "", caption, id }: { sectionLabel?: string; heading?: string; body?: string; src?: string; alt?: string; caption?: string; id?: string }) {
  return (
    <section id={id} className={styles.lightSection}>
      <div className={styles.lightPanel}>
        <ScrollReveal tone="editorial" className={styles.lightCopy}>
          {sectionLabel ? <p className={styles.label}>{sectionLabel}</p> : null}
          {heading ? <h2 className={styles.lightHeading}>{heading}</h2> : null}
          {body ? <div className={styles.lightBody}><Paragraphs text={body} /></div> : null}
        </ScrollReveal>
        {src ? (
          <figure className={styles.lightFigure}>
            {/* eslint-disable-next-line @next/next/no-img-element -- diagrams keep their own proportions */}
            <img src={src} alt={alt} loading="lazy" />
            {caption ? <figcaption>{caption}</figcaption> : null}
          </figure>
        ) : null}
      </div>
    </section>
  );
}

/* ---------- Big number ---------- */

export function CaseBigNumber({ value, label, body, id }: { value: string; label?: string; body?: string; id?: string }) {
  return (
    <section id={id} className={styles.bigNumber}>
      <ScrollReveal tone="editorial" className="content-wrap">
        <p className={styles.bigValue}>{value}</p>
        {label ? <p className={styles.bigLabel}>{label}</p> : null}
        {body ? <p className={styles.bigBody}>{body}</p> : null}
      </ScrollReveal>
    </section>
  );
}

/* ---------- Flow ---------- */

export type FlowStep = { title: string; body?: string; highlight?: boolean };

export function CaseFlow({ sectionLabel, heading, steps, numbered, connector, contextLabel, context, id }: {
  sectionLabel?: string; heading?: string; steps: FlowStep[]; numbered?: boolean; connector?: string; contextLabel?: string; context?: string; id?: string;
}) {
  return (
    <section id={id} className={styles.section}>
      <div className="content-wrap">
        <ScrollReveal tone="editorial"><Header sectionLabel={sectionLabel} heading={heading} /></ScrollReveal>
        <ScrollReveal tone="editorial" delay={.06}>
          <ol className={styles.flow} style={{ ["--steps" as string]: steps.length }}>
            {steps.map((step, i) => (
              <li key={i} className={`${styles.flowStep} ${step.highlight ? styles.flowHighlight : ""}`}>
                {numbered ? <span className={styles.flowIndex}>{String(i + 1).padStart(2, "0")}</span> : null}
                <h3>{step.title}</h3>
                {step.body ? <p>{step.body}</p> : null}
                {i < steps.length - 1 ? <span className={styles.flowArrow} aria-hidden /> : null}
              </li>
            ))}
          </ol>
          {connector ? <div className={styles.flowConnector}><span>{connector}</span></div> : null}
          {context ? (
            <div className={styles.flowContext}>
              {contextLabel ? <p className={styles.label}>{contextLabel}</p> : null}
              <p>{context}</p>
            </div>
          ) : null}
        </ScrollReveal>
      </div>
    </section>
  );
}

/* ---------- Bento ---------- */

export type BentoTile = {
  kind: "text" | "stat" | "image" | "video" | "quote";
  size?: "1x1" | "2x1" | "1x2" | "2x2";
  tone?: Tone;
  title?: string;
  body?: string;
  value?: string;
  label?: string;
  src?: string;
  alt?: string;
  /** Cover shown before a video plays. */
  poster?: string;
  caption?: string;
};
type VideoLabels = { pause: string; play: string };

function Tile({ tile, videoLabels }: { tile: BentoTile; videoLabels: VideoLabels }) {
  let content: ReactNode;
  if (tile.kind === "image") {
    content = <>
      {tile.title ? <h3 className={styles.tileTitle}>{tile.title}</h3> : null}
      {tile.src ? (
        <div className={styles.tileMedia}>
          {/* eslint-disable-next-line @next/next/no-img-element -- tiles crop to their own frame */}
          <img src={tile.src} alt={tile.alt ?? ""} loading="lazy" />
        </div>
      ) : null}
      {tile.caption ? <p className={styles.tileCaption}>{tile.caption}</p> : null}
    </>;
  } else if (tile.kind === "video") {
    content = <>
      {tile.title ? <h3 className={styles.tileTitle}>{tile.title}</h3> : null}
      {tile.src ? <div className={styles.tileMedia}><LoopVideo src={tile.src} poster={tile.poster} labels={videoLabels} /></div> : null}
      {tile.caption ? <p className={styles.tileCaption}>{tile.caption}</p> : null}
    </>;
  } else if (tile.kind === "stat") {
    content = <>
      {tile.title ? <h3 className={styles.tileTitle}>{tile.title}</h3> : null}
      <p className={styles.tileValue}>{tile.value}</p>
      {tile.label ? <p className={styles.tileLabel}>{tile.label}</p> : null}
      {tile.caption ? <p className={styles.tileCaption}>{tile.caption}</p> : null}
    </>;
  } else if (tile.kind === "quote") {
    content = <>
      <blockquote className={styles.tileQuote}>{tile.body}</blockquote>
      {tile.caption ? <p className={styles.tileCaption}>{tile.caption}</p> : null}
    </>;
  } else {
    content = <>
      {tile.title ? <h3 className={styles.tileTitle}>{tile.title}</h3> : null}
      {tile.body ? <p className={styles.tileBody}>{tile.body}</p> : null}
      {tile.caption ? <p className={styles.tileCaption}>{tile.caption}</p> : null}
    </>;
  }
  return <div className={`${styles.tile} ${styles[`size_${(tile.size ?? "1x1").replace("x", "_")}`] ?? ""} ${toneClass(tile.tone ?? "neutral")} ${styles[`kind_${tile.kind}`] ?? ""}`}>{content}</div>;
}

export function CaseBento({ sectionLabel, heading, tiles, id, videoLabels = { pause: "Pausar vídeo", play: "Reproduzir vídeo" } }: { sectionLabel?: string; heading?: string; tiles: BentoTile[]; id?: string; videoLabels?: VideoLabels }) {
  return (
    <section id={id} className={styles.section}>
      <div className="content-wrap">
        <ScrollReveal tone="editorial"><Header sectionLabel={sectionLabel} heading={heading} /></ScrollReveal>
        <ScrollReveal tone="editorial" delay={.06} className={styles.bento}>
          {tiles.map((tile, i) => <Tile key={i} tile={tile} videoLabels={videoLabels} />)}
        </ScrollReveal>
      </div>
    </section>
  );
}

export { toneClass };

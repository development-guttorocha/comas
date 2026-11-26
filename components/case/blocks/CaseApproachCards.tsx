import type { ReactNode } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import styles from "./CaseEditorialBlocks.module.css";
import { toneClass, type Tone } from "./CaseStoryBlocks";

export type CaseApproachCardItem = {
  title: string;
  /** Fundo do card: neutro, suave (cor do case), cor do case, claro ou cinza. Omitido = sem fundo. */
  tone?: Tone;
  /** Parágrafos ou conteúdo rico */
  body: ReactNode;
};

export interface CaseApproachCardsProps {
  id?: string;
  className?: string;
  /** Ex.: `// Abordagem` */
  sectionLabel?: string;
  /** Título opcional abaixo do rótulo. */
  heading?: string;
  items: CaseApproachCardItem[];
  /** Grelha em duas colunas a partir de `md` (padrão). */
  columns?: 1 | 2;
  /** Cartão de destaque por baixo da grelha (ex. terceiro eixo com métricas). */
  featured?: ReactNode;
  padClass?: string;
  bgClass?: string;
  borderClass?: string;
  maxWidthClass?: string;
}

/**
 * Cards de abordagem em grelha — padrão WebMotors (dois cartões + opcional featured).
 */
export default function CaseApproachCards({
  id,
  className = "",
  sectionLabel = "// Abordagem",
  heading,
  items,
  columns = 2,
  featured,
  padClass = styles.sectionPad,
  bgClass = "",
  borderClass = "",
  maxWidthClass = "",
}: CaseApproachCardsProps) {
  const grid = `${styles.grid} ${columns === 2 ? styles.twoColumns : ""}`;

  return (
    <section
      id={id}
      className={`w-full ${padClass} ${borderClass} ${bgClass} ${className}`.trim()}
    >
      <div
        className={`content-wrap w-full min-w-0 max-w-full ${styles.stack} ${maxWidthClass}`.trim()}
      >
        <ScrollReveal tone="editorial">
          {sectionLabel ? <p className={styles.sectionLabel}>{sectionLabel}</p> : null}
          {heading ? <h2 className={styles.heading}>{heading}</h2> : null}
          <div className={grid}>
            {items.map((item, i) => (
              <article
                key={`${item.title}-${i}`}
                className={`${styles.item} ${item.tone ? `${styles.itemTone} ${toneClass(item.tone)}` : ""}`}
              >
                <h3 className={styles.itemTitle}>{item.title}</h3>
                <div className={styles.body}>{item.body}</div>
              </article>
            ))}
          </div>
        </ScrollReveal>

        {featured ? (
          <ScrollReveal tone="editorial">{featured}</ScrollReveal>
        ) : null}
      </div>
    </section>
  );
}

import type { ReactNode } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import styles from "./CaseEditorialBlocks.module.css";
import { toneClass, type Tone } from "./CaseStoryBlocks";

export type CaseThanksCardItem = {
  title: string;
  /** Fundo do card: neutro, suave (cor do case), cor do case, claro ou cinza. Omitido = sem fundo. */
  tone?: Tone;
  /** Parágrafos ou conteúdo rico */
  body: ReactNode;
};

export interface CaseThanksCardsProps {
  id?: string;
  className?: string;
  /** Ex.: `// Agradecimentos` */
  sectionLabel?: string;
  /** Título opcional abaixo do rótulo. */
  heading?: string;
  items: CaseThanksCardItem[];
  /** Grelha em duas colunas a partir de `md` (padrão). */
  columns?: 1 | 2;
  /** Cartão de destaque por baixo da grelha (opcional). */
  featured?: ReactNode;
  padClass?: string;
  bgClass?: string;
  borderClass?: string;
  maxWidthClass?: string;
}

/**
 * Variante centrada / editorial — agradecimentos ou mensagens finais.
 * Mantém API semelhante a `CaseApproachCards`, com apresentação distinta.
 */
export default function CaseThanksCards({
  id,
  className = "",
  sectionLabel = "// Agradecimentos",
  heading,
  items,
  columns = 2,
  featured,
  padClass = styles.sectionPad,
  bgClass = "",
  borderClass = "",
  maxWidthClass = "",
}: CaseThanksCardsProps) {
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
                <div className={styles.body}>
                  {item.body}
                </div>
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

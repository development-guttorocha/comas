import { VeiledImage } from "@/components/ImageVeil";
import type { ReactNode } from "react";
import { CASE_MEDIA_BLOCK } from "@/lib/caseLayout";
import styles from "./CaseMedia.module.css";

export interface CaseMediaFigureProps {
  id?: string;
  className?: string;
  src: string;
  alt: string;
  caption?: ReactNode;
  /** Proporção do contentor (imagem com `object-cover`). */
  aspectClass?: string;
  priority?: boolean;
  sizes?: string;
  /** Moldura do `<figure>`; vazio = sem borda. */
  borderClass?: string;
}

/**
 * Imagem com legenda abaixo — útil para uma única arte com contexto.
 */
export default function CaseMediaFigure({
  id,
  className = "",
  src,
  alt,
  caption,
  aspectClass = "aspect-[16/10]",
  priority = false,
  sizes = "(min-width: 1200px) 1000px, 90vw",
  borderClass = "",
}: CaseMediaFigureProps) {
  return (
    <figure
      id={id}
      className={`${CASE_MEDIA_BLOCK} ${styles.figure} ${borderClass} ${className}`.trim()}
    >
      <div className={`${styles.frame} ${aspectClass}`}>
        <VeiledImage
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover object-center"
        />
      </div>
      {caption ? (
        <figcaption className={styles.caption}>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

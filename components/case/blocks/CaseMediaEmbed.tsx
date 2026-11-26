import type { ReactNode } from "react";
import { CASE_MEDIA_BLOCK } from "@/lib/caseLayout";
import styles from "./CaseMedia.module.css";

export interface CaseMediaEmbedProps {
  id?: string;
  className?: string;
  /** URL completa do iframe (Figma, prototipo, mapa, etc.). */
  src: string;
  title: string;
  caption?: ReactNode;
  /** Altura fixa do iframe (ex.: `h-[520px] md:h-[680px]`). */
  heightClass?: string;
  /** Altura mínima do bloco (iframe em scroll interno). */
  minHeightClass?: string;
}

/**
 * Embed genérico (Figma, prototipos, outros iframes) com moldura editorial.
 */
export default function CaseMediaEmbed({
  id,
  className = "",
  src,
  title,
  caption,
  heightClass,
  minHeightClass = "min-h-[480px] md:min-h-[560px]",
}: CaseMediaEmbedProps) {
  const frameHeightClass = heightClass?.trim() ? heightClass : minHeightClass;
  return (
    <figure
      id={id}
      className={`${CASE_MEDIA_BLOCK} ${styles.figure} ${className}`.trim()}
    >
      <div className={`${styles.frame} ${frameHeightClass}`}>
        <iframe
          title={title}
          src={src}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
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

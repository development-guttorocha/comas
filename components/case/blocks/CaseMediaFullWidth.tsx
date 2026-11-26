import { VeiledImage } from "@/components/ImageVeil";
import { CASE_MEDIA_BLOCK } from "@/lib/caseLayout";
import styles from "./CaseMedia.module.css";

interface CaseMediaFullWidthProps {
  src: string;
  alt: string;
  className?: string;
  id?: string;
  priority?: boolean;
  /** Moldura do contentor (ex. `border-t border-line`). */
  borderClass?: string;
}

/**
 * Imagem full-bleed (largura do viewport), altura natural.
 */
export default function CaseMediaFullWidth({
  src,
  alt,
  className = "",
  id,
  priority = false,
  borderClass = "",
}: CaseMediaFullWidthProps) {
  return (
    <div
      id={id}
      className={`relative ${CASE_MEDIA_BLOCK} ${styles.figure} ${borderClass} ${className}`.trim()}
    >
      <VeiledImage
        src={src}
        alt={alt}
        width={2000}
        height={1125}
        sizes="100vw"
        priority={priority}
        className={styles.image}
        veilClassName="rounded-[24px]"
      />
    </div>
  );
}

"use client";

import { useState } from "react";

type HomeFigmaArtProps = {
  /** Caminho em `public/` — export do Figma (PNG ou SVG). */
  src: string;
  alt: string;
  className?: string;
};

/**
 * Ilustração opcional: se o ficheiro não existir ou falhar o load, não renderiza nada.
 * Coloca o asset em `public/` com o mesmo `src` (ex.: `/home/manifesto-art.png`).
 */
export default function HomeFigmaArt({ src, alt, className = "" }: HomeFigmaArtProps) {
  const [ok, setOk] = useState(true);

  if (!ok) return null;

  const cls = ["illustration", className].filter(Boolean).join(" ");

  return (
    // eslint-disable-next-line @next/next/no-img-element -- fallback sem dimensões fixas do build
    <img
      src={src}
      alt={alt}
      className={cls}
      loading="lazy"
      decoding="async"
      onError={() => setOk(false)}
    />
  );
}

"use client";

import { useState } from "react";
import { WorkMonogram } from "@/components/guide";
import { ImageVeil, useImageReady } from "@/components/ImageVeil";

/** Case cover with a monogram fallback when the signed Notion URL fails. */
export default function CaseCoverImage({ src, company, brandColor }: { src?: string; company: string; brandColor?: string }) {
  const [failed, setFailed] = useState(false);
  const { ready, fadeClass, ref, markReady } = useImageReady();
  if (!src || failed) return <WorkMonogram>{company}</WorkMonogram>;
  return (
    <div className="relative h-full">
      {/* eslint-disable-next-line @next/next/no-img-element -- remote case assets retain their source URL */}
      <img ref={ref} className={fadeClass || undefined} src={src} alt="" loading="lazy" decoding="async" width={1600} height={1000} onLoad={markReady} onError={() => setFailed(true)} />
      <ImageVeil ready={ready} color={brandColor} label={company} />
    </div>
  );
}

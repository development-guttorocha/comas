"use client";
/* eslint-disable @next/next/no-img-element -- a generated preview from the local admin API. */

import { useEffect, useState } from "react";
import styles from "./admin.module.css";

/**
 * How a page looks when shared: the generated image, then the card's title, description and
 * address as LinkedIn and WhatsApp show them. Follows the texts as they are typed.
 */
export default function SharePreview({ kicker, title, line, accent, footer, metaTitle, metaDescription, url }: {
  kicker?: string; title: string; line?: string; accent?: { color: string; on: string }; footer?: string;
  metaTitle: string; metaDescription: string; url: string;
}) {
  const query = new URLSearchParams({ kicker: kicker ?? "", title, line: line ?? "", footer: footer ?? "", ...(accent ? { accent: accent.color, on: accent.on } : {}) }).toString();
  const [src, setSrc] = useState(`/api/admin/og-preview?${query}`);
  const [loading, setLoading] = useState(false);

  // Waits for a pause in typing before asking for a new image.
  useEffect(() => {
    const next = `/api/admin/og-preview?${query}`;
    if (next === src) return;
    const timer = window.setTimeout(() => { setLoading(true); setSrc(next); }, 500);
    return () => window.clearTimeout(timer);
  }, [query, src]);

  return (
    <figure className={styles.sharePreview} data-loading={loading || undefined}>
      <img src={src} alt="Prévia da imagem de compartilhamento" width={1200} height={630} onLoad={() => setLoading(false)} onError={() => setLoading(false)} />
      <figcaption>
        <span>{url.replace(/^https?:\/\//, "")}</span>
        <strong>{metaTitle || "Sem título"}</strong>
        <small>{metaDescription}</small>
      </figcaption>
    </figure>
  );
}

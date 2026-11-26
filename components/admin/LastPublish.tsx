"use client";

import { useEffect, useState } from "react";
import { ClockIcon, ExternalIcon } from "./icons";
import styles from "./admin.module.css";

const FALLBACK_SITE = "https://www.guttorocha.com.br";
const when = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * When the site last went live, from Vercel, with a way to open it.
 * Change `refresh` to read again past the server's one-minute memory (after a publish).
 */
export default function LastPublish({ refresh = 0 }: { refresh?: number }) {
  const [state, setState] = useState<{ at?: number | null; siteUrl?: string; error?: string } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/last-publish${refresh ? "?fresh=1" : ""}`)
      .then(response => response.json())
      .then(data => { if (alive) setState(data); })
      .catch(() => { if (alive) setState({ error: "Não foi possível consultar a Vercel." }); });
    return () => { alive = false; };
  }, [refresh]);

  const detail = !state ? "Consultando a Vercel…"
    : state.error ? state.error
    : state.at ? when.format(new Date(state.at))
    : "Nenhuma publicação encontrada";

  return (
    <div className={`${styles.panel} ${styles.banner}`} aria-live="polite">
      <span className={styles.bannerIcon}><ClockIcon /></span>
      <span><strong>Última publicação</strong>&ensp;{detail}</span>
      <a className={`${styles.button} ${styles.small}`} style={{ marginLeft: "auto" }} href={state?.siteUrl ?? FALLBACK_SITE} target="_blank" rel="noreferrer"><ExternalIcon />Ir para o site</a>
    </div>
  );
}

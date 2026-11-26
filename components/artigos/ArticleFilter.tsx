"use client";

import { Children, isValidElement, useEffect, useState, type ReactNode } from "react";
import styles from "@/app/(pt)/artigos/artigos.module.css";

/**
 * Theme pills over the list. The cards come rendered from the server, each tagged with its
 * theme (`data-theme`); filtering only hides the others. `?tema=` in the address picks one.
 */
export function ArticleFilter({ themes, children, ad }: {
  themes: Array<{ key: string; label: string; count: number }>;
  children: ReactNode;
  /** Shown after the sixth card, only in the unfiltered list. */
  ad?: ReactNode;
}) {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("tema");
    if (fromUrl && themes.some(t => t.key === fromUrl)) setTheme(fromUrl);
  }, [themes]);

  const pick = (key: string | null) => {
    setTheme(key);
    const url = new URL(window.location.href);
    if (key) url.searchParams.set("tema", key); else url.searchParams.delete("tema");
    window.history.replaceState(null, "", url);
  };

  const cards = Children.toArray(children).filter(child =>
    !theme || (isValidElement<{ "data-theme"?: string }>(child) && child.props["data-theme"] === theme));
  const total = themes.reduce((n, t) => n + t.count, 0);

  return (
    <>
      <ul className={styles.filters} aria-label="Filtrar por tema">
        <li><button type="button" aria-pressed={!theme} onClick={() => pick(null)}>Todos <small>{total}</small></button></li>
        {themes.map(t => (
          <li key={t.key}><button type="button" aria-pressed={theme === t.key} onClick={() => pick(t.key)}>{t.label} <small>{t.count}</small></button></li>
        ))}
      </ul>
      {cards.length ? (
        <div className={styles.grid}>
          {cards.flatMap((card, i) => (i === 5 && !theme && ad ? [card, <div key="ad" className={styles.gridAd}>{ad}</div>] : [card]))}
        </div>
      ) : <p className={styles.empty}>Ainda não há textos neste tema. Os próximos aparecem aqui.</p>}
    </>
  );
}

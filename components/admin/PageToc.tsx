"use client";

import { useEffect, useState } from "react";
import styles from "./admin.module.css";

/** The page's index: one link per group, the one in view marked; "Google e compartilhamento" closes it. */
export default function PageToc({ groups }: { groups: Array<{ id: string; label: string; last?: boolean }> }) {
  const [current, setCurrent] = useState(groups[0]?.id ?? "");
  useEffect(() => {
    const seen = new Map<string, number>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) seen.set(entry.target.id, entry.isIntersecting ? entry.boundingClientRect.top : Infinity);
      const top = [...seen].filter(([, y]) => y !== Infinity).sort((a, b) => a[1] - b[1])[0];
      if (top) setCurrent(top[0]);
    }, { rootMargin: "0px 0px -60% 0px" });
    groups.forEach(g => { const el = document.getElementById(g.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [groups.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <nav className={styles.pageToc} aria-label="Partes da página">
      {groups.map(g => (
        <a key={g.id} href={`#${g.id}`} aria-current={current === g.id ? "true" : undefined} data-last={g.last || undefined}
          onClick={event => { event.preventDefault(); // A jump, not a glide: a long smooth scroll would take far longer than the 120–200ms the admin allows.
          document.getElementById(g.id)?.scrollIntoView({ block: "start" }); setCurrent(g.id); }}>
          {g.label}
        </a>
      ))}
    </nav>
  );
}

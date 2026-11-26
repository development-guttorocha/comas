"use client";

import { track } from "@vercel/analytics";
import { useState } from "react";
import type { SalaryGuideContent } from "@/lib/resources";
import styles from "@/app/(pt)/recursos/recursos.module.css";

/** Five signs; the answer depends on how many hold, with a warning when only the outside offer does. */
export default function RaiseCheck({ copy }: { copy: SalaryGuideContent["raise"] }) {
  const [checked, setChecked] = useState<boolean[]>(() => copy.items.map(() => false));
  const count = checked.filter(Boolean).length;
  const result = [...copy.results].reverse().find(r => count >= r.min)!;
  const offerOnly = count === 1 && checked[copy.items.length - 1];
  const toggle = (i: number) => setChecked(c => {
    const next = c.map((v, n) => (n === i ? !v : v));
    track("raise_check", { count: next.filter(Boolean).length });
    return next;
  });
  return (
    <div className={styles.raise}>
      <ul className={styles.guideChecklist}>
        {copy.items.map((t, i) => <li key={t}><label><input type="checkbox" checked={checked[i]} onChange={() => toggle(i)} />{t}</label></li>)}
      </ul>
      <output className={styles.raiseResult} aria-live="polite" data-level={copy.results.indexOf(result)}>
        <span>{count} {copy.count}</span>
        <strong>{result.title}</strong>
        <p>{offerOnly ? copy.offerOnly : result.body}</p>
      </output>
    </div>
  );
}

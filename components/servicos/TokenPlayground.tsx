"use client";

import { useState, type CSSProperties } from "react";
import type { DesignSystemContent } from "@/lib/services";
import styles from "@/app/(pt)/servicos/design-system.module.css";

const COLORS = [
  { name: "Lima", value: "#d7ff3d", on: "#0b0b0b" },
  { name: "Azul", value: "#2f6bff", on: "#ffffff" },
  { name: "Roxo", value: "#9747ff", on: "#ffffff" },
  { name: "Coral", value: "#ff5a3c", on: "#0b0b0b" },
];
const RADII = [{ label: "0", value: 0 }, { label: "8", value: 8 }, { label: "24", value: 24 }];
const DENSITIES = [{ label: "Compacta", value: 12 }, { label: "Confortável", value: 18 }];
const THEMES = ["Claro", "Escuro"] as const;

/**
 * A tiny product screen driven by four tokens. Each control rewrites a CSS variable on the
 * preview, the way a real system propagates one decision everywhere.
 */
export default function TokenPlayground({ copy }: { copy: DesignSystemContent["playground"] }) {
  const [color, setColor] = useState(COLORS[0]);
  const [radius, setRadius] = useState(RADII[1].value);
  const [space, setSpace] = useState(DENSITIES[1].value);
  const [theme, setTheme] = useState<(typeof THEMES)[number]>("Claro");
  const dark = theme === "Escuro";

  const tokens = {
    "--tk-brand": color.value,
    "--tk-on-brand": color.on,
    "--tk-radius": `${radius}px`,
    "--tk-space": `${space}px`,
    "--tk-bg": dark ? "#141414" : "#ffffff",
    "--tk-fg": dark ? "#f5f5f0" : "#0b0b0b",
    "--tk-muted": dark ? "#8b8b85" : "#6b6b66",
    "--tk-line": dark ? "#2b2b2b" : "#e4e4df",
    "--tk-field": dark ? "#1d1d1d" : "#f5f5f2",
  } as CSSProperties;

  const p = copy.preview;
  return (
    <div className={styles.playground}>
      <div className={styles.controls}>
        <fieldset>
          <legend>{copy.controls.color}</legend>
          <div className={styles.swatches}>
            {COLORS.map(c => (
              <button key={c.name} type="button" aria-label={c.name} aria-pressed={c.value === color.value} style={{ background: c.value }} onClick={() => setColor(c)} />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{copy.controls.radius}</legend>
          <div className={styles.segmented}>
            {RADII.map(r => <button key={r.label} type="button" aria-pressed={r.value === radius} onClick={() => setRadius(r.value)}>{r.label}px</button>)}
          </div>
        </fieldset>
        <fieldset>
          <legend>{copy.controls.density}</legend>
          <div className={styles.segmented}>
            {DENSITIES.map(d => <button key={d.label} type="button" aria-pressed={d.value === space} onClick={() => setSpace(d.value)}>{d.label}</button>)}
          </div>
        </fieldset>
        <fieldset>
          <legend>{copy.controls.theme}</legend>
          <div className={styles.segmented}>
            {THEMES.map(t => <button key={t} type="button" aria-pressed={t === theme} onClick={() => setTheme(t)}>{t}</button>)}
          </div>
        </fieldset>
        <pre className={styles.tokenCode} aria-label="Tokens atuais">
          <span>color.brand</span> {color.value}{"\n"}
          <span>radius.md</span>   {radius}px{"\n"}
          <span>space.base</span>  {space}px{"\n"}
          <span>theme</span>       {dark ? "dark" : "light"}
        </pre>
      </div>

      <div className={styles.previewCanvas}>
        <span className={styles.previewLabel}>◆ Screen / Campaign</span>
        {/* Decorative sample: the controls are the interactive part. */}
        <div className={styles.preview} style={tokens} aria-hidden="true">
          <div className={styles.previewHead}>
            <strong>{p.title}</strong>
            <span className={styles.previewBadge}>{p.badge}</span>
          </div>
          <div className={styles.previewField}>
            <span>{p.inputLabel}</span>
            <span className={styles.previewInput}>{p.inputValue}</span>
          </div>
          <div className={styles.previewToggle}><span>{p.toggle}</span><i /></div>
          <div className={styles.previewProgress}>
            <span>{p.progressLabel}</span><span>68%</span>
            <div><i /></div>
          </div>
          <div className={styles.previewActions}>
            <span className={styles.previewSecondary}>{p.secondary}</span>
            <span className={styles.previewPrimary}>{p.primary}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

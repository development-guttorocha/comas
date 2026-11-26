"use client";
/* eslint-disable @next/next/no-img-element -- admin thumbnails: local files on this machine, no optimizer needed. */

import { useId, useState } from "react";
import { INFO_ICON_LABELS, INFO_ICON_NAMES, InfoIcon } from "@/lib/infographicIcons";
import { setValue, type FieldDef, type Values } from "@/lib/admin/fields";
import { MediaThumb, useMediaPicker } from "./MediaPicker";
import { DownIcon, PlusIcon, TrashIcon, UpIcon } from "./icons";
import styles from "./admin.module.css";

const asString = (value: unknown) => (typeof value === "string" ? value : typeof value === "number" ? String(value) : "");
const asList = (value: unknown): Values[] => (Array.isArray(value) ? value.filter(v => v && typeof v === "object") as Values[] : []);

export function move<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export function ImageInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label?: string }) {
  const pick = useMediaPicker();
  return (
    <div className={styles.imageField}>
      <span className={styles.imagePreview}><MediaThumb src={value} /></span>
      <div className={styles.field}>
        <div className={styles.imageActions}>
          <button type="button" className={`${styles.button} ${styles.small}`} onClick={async () => { const url = await pick(value); if (url) onChange(url); }}>{value ? "Trocar" : "Escolher"}{label ? ` ${label}` : ""}</button>
          {value ? <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={() => onChange("")}>Remover</button> : null}
        </div>
        <input className={`${styles.input} ${styles.mono}`} value={value} onChange={event => onChange(event.target.value)} placeholder="/cases/… ou https://…" aria-label="Endereço da mídia" />
      </div>
    </div>
  );
}

/** One field of a schema; lists and groups recurse. */
/** `defaults`: what the site uses while a field is empty, shown as its placeholder. */
/** The chosen icon, opening a grid of all of them. */
function IconPicker({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const current = INFO_ICON_NAMES.includes(value as never) ? value : "person";
  return (
    <div className={styles.iconPicker}>
      <button type="button" className={`${styles.button} ${styles.small}`} aria-expanded={open} aria-label={`${label}: ${INFO_ICON_LABELS[current]}. Trocar`} onClick={() => setOpen(v => !v)}>
        <InfoIcon name={current} className={styles.iconGlyph} />{INFO_ICON_LABELS[current]}
      </button>
      {open ? (
        <div className={styles.iconGrid} role="listbox" aria-label={label}>
          {INFO_ICON_NAMES.map(name => (
            <button key={name} type="button" role="option" aria-selected={name === current} className={styles.iconOption} title={INFO_ICON_LABELS[name]} onClick={() => { onChange(name); setOpen(false); }}>
              <InfoIcon name={name} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Field({ def, values, onChange, defaults }: { def: FieldDef; values: Values; onChange: (values: Values) => void; defaults?: Values }) {
  const id = useId();
  const value = values[def.key];
  const fallback = defaults?.[def.key];
  const placeholder = typeof fallback === "string" && fallback.trim() ? fallback : undefined;
  const set = (next: unknown) => onChange(setValue(values, def.key, next));
  const hint = def.hint ? <span className={styles.hint}>{def.hint}</span> : null;

  switch (def.type) {
    case "boolean":
      return (
        <label className={`${styles.switchRow} ${styles.fieldWide}`} htmlFor={id}>
          <span className={styles.field}><span>{def.label}</span>{hint}</span>
          <input id={id} type="checkbox" className={styles.switch} checked={value === true} onChange={event => set(event.target.checked || undefined)} />
        </label>
      );
    case "select": {
      const numeric = def.options.some(o => typeof o.value === "number");
      return (
        <label className={styles.field}><span className={styles.label}>{def.label}</span>
          <select className={styles.select} value={asString(value)} onChange={event => set(event.target.value === "" ? undefined : numeric ? Number(event.target.value) : event.target.value)}>
            <option value="">{def.defaultLabel ?? "Padrão"}</option>
            {def.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>{hint}
        </label>
      );
    }
    case "textarea":
      return (
        <label className={`${styles.field} ${styles.fieldWide}`}><span className={styles.label}>{def.label}</span>
          <textarea className={styles.textarea} value={asString(value)} onChange={event => set(event.target.value)} rows={3} placeholder={placeholder} />{hint}
        </label>
      );
    case "number":
      return (
        <label className={styles.field}><span className={styles.label}>{def.label}</span>
          <input type="number" className={styles.input} value={asString(value)} onChange={event => set(event.target.value === "" ? undefined : Number(event.target.value))} />{hint}
        </label>
      );
    case "color":
      return (
        <div className={styles.field}><label className={styles.label} htmlFor={id}>{def.label}</label>
          <div className={styles.colorRow}>
            <input type="color" value={[asString(value), placeholder ?? ""].find(c => /^#[0-9a-f]{6}$/i.test(c)) ?? "#000000"} onChange={event => set(event.target.value.toUpperCase())} aria-label={`${def.label}: seletor`} />
            <input id={id} className={`${styles.input} ${styles.mono}`} value={asString(value)} placeholder={placeholder} onChange={event => set(event.target.value)} />
          </div>{hint}
        </div>
      );
    case "tags":
      return (
        <label className={styles.field}><span className={styles.label}>{def.label}</span>
          <input className={styles.input} value={Array.isArray(value) ? value.join(", ") : ""} onChange={event => set(event.target.value.split(",").map(t => t.trim()).filter(Boolean))} placeholder="Separe por vírgulas" />{hint}
        </label>
      );
    case "icon":
      return (
        <div className={styles.field}><span className={styles.label}>{def.label}</span>
          <IconPicker value={asString(value)} onChange={set} label={def.label} />{hint}
        </div>
      );
    case "image":
      return (
        <div className={`${styles.field} ${styles.fieldWide}`}><span className={styles.label}>{def.label}</span>
          <ImageInput value={asString(value)} onChange={set} />{hint}
        </div>
      );
    case "focus": {
      const src = asString(values[def.of]);
      const focus = asString(value) || "50% 50%";
      const [x, y] = focus.split(" ");
      return (
        <div className={`${styles.field} ${styles.fieldWide}`}><span className={styles.label}>{def.label}</span>
          {src ? (
            <div className={styles.focusRow}>
              <button type="button" className={styles.focusPicker} aria-label="Marcar o ponto de foco" onClick={event => {
                const r = event.currentTarget.getBoundingClientRect();
                const pct = (n: number) => `${Math.round(Math.min(100, Math.max(0, n * 100)))}%`;
                set(`${pct((event.clientX - r.left) / r.width)} ${pct((event.clientY - r.top) / r.height)}`);
              }}>
                <img src={src} alt="" />
                <span className={styles.focusDot} style={{ left: x, top: y }} />
              </button>
              <div className={styles.focusPreviews} aria-hidden>
                <span className={styles.focusWide}><img src={src} alt="" style={{ objectPosition: focus }} /></span>
                <span className={styles.focusTall}><img src={src} alt="" style={{ objectPosition: focus }} /></span>
              </div>
            </div>
          ) : <span className={styles.hint}>Escolha a imagem primeiro.</span>}
          <span className={styles.hint}>{def.hint} {value ? <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={() => set(undefined)}>Centralizar</button> : null}</span>
        </div>
      );
    }
    case "indices": {
      const list = asList(values[def.of]);
      const chosen = new Set(Array.isArray(value) ? value as number[] : []);
      return (
        <div className={`${styles.field} ${styles.fieldWide}`}><span className={styles.label}>{def.label}</span>
          <div className={styles.checks}>
            {list.map((item, i) => (
              <label key={i} className={styles.check}>
                <input type="checkbox" checked={chosen.has(i)} onChange={event => {
                  const next = new Set(chosen);
                  if (event.target.checked) next.add(i); else next.delete(i);
                  set([...next].sort((a, b) => a - b));
                }} />
                {asString(item.value) || `Item ${i + 1}`}
              </label>
            ))}
          </div>{hint}
        </div>
      );
    }
    case "group": {
      const inner = value && typeof value === "object" ? value as Values : {};
      return (
        <fieldset className={`${styles.group} ${styles.fieldWide}`}>
          <legend className={styles.groupHead}>{def.label}</legend>
          <Fields defs={def.fields} values={inner} onChange={next => set(next)} />
        </fieldset>
      );
    }
    case "list": {
      const list = asList(value);
      return (
        <div className={`${styles.field} ${styles.fieldWide}`}>
          <span className={styles.label}>{def.label}</span>
          <div className={styles.list}>
            {list.map((item, i) => (
              <fieldset key={i} className={styles.group}>
                <div className={styles.groupHead}>
                  <span>{def.itemLabel} {i + 1}</span>
                  <span style={{ display: "flex", gap: 2 }}>
                    <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton}`} aria-label="Subir" disabled={i === 0} onClick={() => set(move(list, i, i - 1))}><UpIcon /></button>
                    <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton}`} aria-label="Descer" disabled={i === list.length - 1} onClick={() => set(move(list, i, i + 1))}><DownIcon /></button>
                    <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton} ${styles.danger}`} aria-label={`Remover ${def.itemLabel.toLowerCase()}`} onClick={() => set(list.filter((_, j) => j !== i))}><TrashIcon /></button>
                  </span>
                </div>
                <Fields defs={def.item} values={item} onChange={next => set(list.map((old, j) => (j === i ? next : old)))} />
              </fieldset>
            ))}
            <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {/* Empty, the site shows the defaults: start from them instead of from scratch. */}
              {!list.length && Array.isArray(fallback) && fallback.length ? <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => set(structuredClone(fallback))}>Editar os atuais ({fallback.length})</button> : null}
              <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => set([...list, {}])}><PlusIcon />Adicionar {def.itemLabel.toLowerCase()}</button>
            </span>
          </div>{hint}
        </div>
      );
    }
    default: {
      if ("toggle" in def && def.toggle) {
        const toggle = def.toggle;
        const shown = toggle.hidden === "" ? value !== "" : value !== undefined;
        const switchTo = (on: boolean) => {
          if (!on) onChange(toggle.hidden === "" ? { ...values, [def.key]: "" } : setValue(values, def.key, undefined));
          else onChange(toggle.hidden === "" ? setValue(values, def.key, undefined) : setValue(values, def.key, toggle.text ?? def.label));
        };
        return (
          <div className={styles.field}>
            <label className={styles.switchRow} style={{ minHeight: 0 }}>
              <span className={styles.label}>{def.label}</span>
              <input type="checkbox" className={styles.switch} checked={shown} onChange={event => switchTo(event.target.checked)} aria-label={`Mostrar ${def.label.toLowerCase()}`} />
            </label>
            {shown
              ? <input className={styles.input} value={asString(value)} placeholder={toggle.placeholder} onChange={event => set(event.target.value)} aria-label={def.label} />
              : <span className={styles.hint}>Sem {def.label.toLowerCase()}.</span>}
            {hint}
          </div>
        );
      }
      return (
        <label className={styles.field}><span className={styles.label}>{def.label}</span>
          <input className={`${styles.input} ${def.type === "url" ? styles.mono : ""}`} type={def.type === "url" ? "url" : "text"} value={asString(value)} placeholder={placeholder} readOnly={"readOnly" in def && def.readOnly} onChange={event => set(event.target.value)} />{hint}
        </label>
      );
    }
  }
}

/** A schema as a form; advanced fields fold away. */
export function Fields({ defs: all, values, onChange, defaults }: { defs: FieldDef[]; values: Values; onChange: (values: Values) => void; defaults?: Values }) {
  const defs = all.filter(d => !d.when || d.when.is.includes(String(values[d.when.key] ?? d.when.fallback ?? "")));
  const main = defs.filter(d => !d.advanced), advanced = defs.filter(d => d.advanced);
  return (
    <div className={styles.grid2}>
      {main.map(def => <Field key={def.key} def={def} values={values} onChange={onChange} defaults={defaults} />)}
      {advanced.length ? (
        <details className={`${styles.advanced} ${styles.fieldWide}`}>
          <summary>Avançado</summary>
          <div className={styles.grid2}>{advanced.map(def => <Field key={def.key} def={def} values={values} onChange={onChange} defaults={defaults} />)}</div>
        </details>
      ) : null}
    </div>
  );
}

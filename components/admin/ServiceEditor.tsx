"use client";

import { useCallback, useEffect, useState } from "react";
import { useLeaveGuard } from "./useLeaveGuard";
import { fieldLabel, FIELD_HINTS, inputKind, itemLabel } from "@/lib/admin/serviceLabels";
import AdminShell from "./AdminShell";
import PageToc from "./PageToc";
import BusyOverlay from "./BusyOverlay";
import SharePreview from "./SharePreview";
import { api, Toast, useToast } from "./client";
import { DownIcon, ExternalIcon, PlusIcon, TrashIcon, UpIcon } from "./icons";
import styles from "./admin.module.css";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
type Obj = Record<string, Json>;
type Path = Array<string | number>;
type Change = (path: Path, update: (value: Json) => Json) => void;
type CaseOption = { slug: string; label: string };

const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

function setAt(value: Json, path: Path, update: (value: Json) => Json): Json {
  if (!path.length) return update(value);
  const [step, ...rest] = path;
  if (Array.isArray(value)) return value.map((item, i) => (i === step ? setAt(item, rest, update) : item));
  const node = isObj(value) ? value : {};
  return { ...node, [step]: setAt(node[step as string] ?? null, rest, update) };
}

/** A new list item: the first one's shape, emptied. */
function blankLike(value: Json): Json {
  if (typeof value === "string") return "";
  if (Array.isArray(value)) return [];
  if (isObj(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, blankLike(v)]));
  return value;
}

/** An item's first filled text, to name it while folded. */
function preview(value: Json): string {
  if (typeof value === "string") return value.trim();
  if (isObj(value)) for (const v of Object.values(value)) { const text = preview(v); if (text) return text; }
  return "";
}
const short = (text: string) => (text.length > 64 ? `${text.slice(0, 64)}…` : text);

function ListControls({ label, index, length, onMove, onRemove }: { label: string; index: number; length: number; onMove: (to: number) => void; onRemove: () => void }) {
  return (
    <span style={{ display: "flex", gap: 2 }} onClick={event => event.preventDefault()}>
      <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton}`} aria-label={`Subir ${label} ${index + 1}`} disabled={index === 0} onClick={() => onMove(index - 1)}><UpIcon /></button>
      <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton}`} aria-label={`Descer ${label} ${index + 1}`} disabled={index === length - 1} onClick={() => onMove(index + 1)}><DownIcon /></button>
      {/* The last item stays: an empty list would lose the shape new items are made from. */}
      <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton}`} aria-label={`Remover ${label} ${index + 1}`} disabled={length <= 1} onClick={onRemove}><TrashIcon /></button>
    </span>
  );
}

function TextField({ name, value, path, parentKey, change, cases }: { name: string; value: string; path: Path; parentKey?: string; change: Change; cases: CaseOption[] }) {
  const kind = inputKind(name, value, parentKey);
  const set = (next: string) => change(path, () => next);
  const label = typeof name === "string" && !/^\d+$/.test(name) ? fieldLabel(name) : "";
  const hint = FIELD_HINTS[name];
  let control;
  if (kind === "readonly") control = <input className={`${styles.input} ${styles.mono}`} value={value} readOnly />;
  else if (kind === "textarea") control = <textarea className={styles.textarea} value={value} onChange={e => set(e.target.value)} rows={3} />;
  else if (kind === "case") control = (
    <select className={styles.select} value={value} onChange={e => set(e.target.value)}>
      {cases.some(c => c.slug === value) ? null : <option value={value}>{value || "Escolha um case"}</option>}
      {cases.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
    </select>
  );
  else if (kind === "color") control = (
    <div className={styles.colorRow}>
      <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={e => set(e.target.value)} aria-label={`${label}: seletor`} />
      <input className={`${styles.input} ${styles.mono}`} value={value} onChange={e => set(e.target.value)} />
    </div>
  );
  else control = <input className={`${styles.input} ${kind === "link" ? styles.mono : ""}`} value={value} onChange={e => set(e.target.value)} />;
  return (
    <label className={styles.field}>
      {label ? <span className={styles.label}>{label}</span> : null}
      {control}
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  );
}

/** Any value of the file: texts become inputs, groups become boxes, lists get add, move and remove. */
function Node({ name, value, path, change, cases, parentKey }: { name: string; value: Json; path: Path; change: Change; cases: CaseOption[]; parentKey?: string }) {
  if (typeof value === "string") return <TextField name={name} value={value} path={path} parentKey={parentKey} change={change} cases={cases} />;
  if (Array.isArray(value)) {
    const item = itemLabel(path);
    const move = (from: number, to: number) => change(path, list => {
      const next = [...(list as Json[])];
      next.splice(to, 0, next.splice(from, 1)[0]!);
      return next;
    });
    const remove = (i: number) => change(path, list => (list as Json[]).filter((_, j) => j !== i));
    const add = () => change(path, list => [...(list as Json[]), blankLike((list as Json[])[0] ?? "")]);
    const strings = value.every(v => typeof v === "string");
    return (
      <div className={styles.field}>
        <span className={styles.label}>{fieldLabel(name)}</span>
        {FIELD_HINTS[name] ? <span className={styles.hint}>{FIELD_HINTS[name]}</span> : null}
        <div className={styles.list}>
          {strings ? value.map((text, i) => (
            <div key={i} className={styles.serviceListRow}>
              <Node name={String(i)} value={text} path={[...path, i]} change={change} cases={cases} parentKey={name} />
              <ListControls label={item} index={i} length={value.length} onMove={to => move(i, to)} onRemove={() => remove(i)} />
            </div>
          )) : value.map((entry, i) => (
            // Long lists start folded, each item named by its first text, so the form stays scannable.
            <details key={i} className={`${styles.group} ${styles.foldItem}`} open={value.length <= 3}>
              <summary className={styles.groupHead}>
                <span className={styles.foldTitle}>{item} {i + 1}{preview(entry) ? <small> · {short(preview(entry))}</small> : null}</span>
                <ListControls label={item} index={i} length={value.length} onMove={to => move(i, to)} onRemove={() => remove(i)} />
              </summary>
              <Node name={String(i)} value={entry} path={[...path, i]} change={change} cases={cases} parentKey={name} />
            </details>
          ))}
          <button type="button" className={`${styles.button} ${styles.ghost}`} style={{ justifySelf: "start" }} onClick={add}><PlusIcon />Adicionar {item.toLowerCase()}</button>
        </div>
      </div>
    );
  }
  if (isObj(value)) {
    const fields = Object.entries(value).map(([key, v]) => <Node key={key} name={key} value={v} path={[...path, key]} change={change} cases={cases} parentKey={name} />);
    // A list item's fields sit straight in its fold; a nested group gets its own box.
    if (/^\d+$/.test(name)) return <div className={styles.form}>{fields}</div>;
    return (
      <fieldset className={`${styles.group} ${styles.serviceGroup}`}>
        <legend className={styles.label}>{fieldLabel(name)}</legend>
        {fields}
      </fieldset>
    );
  }
  return null;
}

const text = (v: Json | undefined) => (typeof v === "string" ? v : "");

/** The service's share card from the texts on screen, as each service's opengraph-image renders it. */
function ServiceSharePreview({ values, path }: { values: Obj; path: string }) {
  const hub = !("serviceName" in values);
  const accent = isObj(values.accent) ? { color: text(values.accent.color), on: text(values.accent.on) } : { color: "#f8f8f5", on: "#0b0b0b" };
  const title = hub ? text(isObj(values.hero) ? values.hero.title : undefined) : text(values.serviceName);
  const line = hub ? "Prototipagem com IA, design system no Figma e Head de Design as a service." : text(isObj(values.card) ? values.card.summary : undefined);
  return <SharePreview kicker="Design Services" title={title} line={line} accent={accent} footer="guttorocha.com.br/servicos" metaTitle={text(values.seoTitle)} metaDescription={text(values.seoDescription)} url={`guttorocha.com.br${path}`} />;
}

type Section = { id: string; label: string; keys: string[] };

/** The file's top level as panels: loose texts first ("Geral e SEO"), then one panel per group or list. */
function sectionsOf(values: Obj): Section[] {
  const loose = Object.keys(values).filter(key => typeof values[key] === "string");
  const rest = Object.keys(values).filter(key => typeof values[key] !== "string");
  return [
    ...(loose.length ? [{ id: "geral", label: "Geral e SEO", keys: loose }] : []),
    ...rest.map(key => ({ id: key, label: fieldLabel(key), keys: [key] })),
  ];
}

/** A whole Design Services file as a form built from its own shape. */
export default function ServiceEditor({ slug, label, path, values: initial, revision: initialRevision, cases }: {
  slug: string; label: string; path: string; values: Obj; revision: string; cases: CaseOption[];
}) {
  const [values, setValues] = useState<Obj>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [revision, setRevision] = useState(initialRevision);
  const [saving, setSaving] = useState(false);
  const { toast, show, clear } = useToast();
  const dirty = JSON.stringify(values) !== saved;
  const sections = sectionsOf(values);

  const change: Change = useCallback((p, update) => setValues(current => setAt(current, p, update) as Obj), []);

  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    try {
      const data = await api<{ values: Obj; revision: string }>(`/api/admin/services/${slug}`, { method: "PUT", body: { revision, values } });
      setValues(data.values); setSaved(JSON.stringify(data.values)); setRevision(data.revision);
      show("Serviço salvo: já aparece aqui no computador e vai ao ar no próximo deploy.");
      return true;
    } catch (error) { show(error); return false; } finally { setSaving(false); }
  }, [revision, show, slug, values]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key === "s") { event.preventDefault(); if (dirty && !saving) void save(); } };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [dirty, save, saving]);
  // Leaving with unsaved edits asks first, and the edits wait in this browser for the next visit.
  const leave = useLeaveGuard({ id: `service:${slug}`, dirty, value: values, base: revision, onRestore: setValues, onDiscard: () => setValues(JSON.parse(saved)), onSave: save });

  return (
    <AdminShell
      crumbs={[{ label: "Site", href: "/admin/site" }, { label }]}
      actions={<>
        <span className={styles.saveState} data-dirty={dirty} data-saving={saving || undefined} aria-live="polite">{saving ? "Salvando…" : dirty ? "Alterações não salvas" : "Tudo salvo"}</span>
        <a className={`${styles.button} ${styles.ghost}`} href={path} target="_blank" rel="noreferrer"><ExternalIcon />Ver no site</a>
        <button type="button" className={`${styles.button} ${styles.primary}`} disabled={!dirty || saving} title={dirty ? "⌘S" : "Nada mudou desde o último salvamento"} onClick={() => void save()}>Salvar</button>
      </>}
    >
      <div className={`${styles.sheet} ${styles.pageSheet}`}>
        {leave.ui}
        <div className={styles.pageLayout}>
          <PageToc groups={sections.map(s => ({ id: `sec-${s.id}`, label: s.label }))} />
          <div className={styles.pageBody}>
            <div className={styles.screenHead}>
              <div>
                <h1 className={styles.title}>{label}</h1>
                <p className={styles.subtitle}>Todos os textos, listas e links da página, em português. Salve para ver no site aqui no computador.</p>
              </div>
            </div>
            {sections.map(section => (
              <section key={section.id} id={`sec-${section.id}`} className={styles.editGroup} aria-label={section.label}>
                <h2>{section.label}</h2>
                {(() => {
                  const form = (
                    <div className={styles.form}>
                      {section.keys.map(key => {
                        const v = values[key]!;
                        // A top-level group shows its fields straight in the section, which already names it.
                        if (isObj(v)) return Object.entries(v).map(([k, child]) => <Node key={k} name={k} value={child} path={[key, k]} change={change} cases={cases} parentKey={key} />);
                        return <Node key={key} name={key} value={v} path={[key]} change={change} cases={cases} />;
                      })}
                    </div>
                  );
                  // The SEO texts sit beside the share card they produce.
                  return section.id === "geral" ? <div className={styles.seoGroup}>{form}<ServiceSharePreview values={values} path={path} /></div> : form;
                })()}
              </section>
            ))}
          </div>
        </div>
      </div>
      <BusyOverlay label={saving ? "Salvando o serviço…" : ""} />
      <Toast toast={toast} onClose={toast?.tone === "bad" ? clear : undefined} />
    </AdminShell>
  );
}

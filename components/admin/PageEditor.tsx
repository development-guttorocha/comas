"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLeaveGuard } from "./useLeaveGuard";
import { textState, translationCounts, type FieldDef, type Localized, type PageValues } from "@/lib/pages/model";
import { PAGE_SCHEMA_BY_SLUG } from "@/lib/pages/schemas";
import { screenFiles, screenGroups, SITE_SCREEN_BY_ID } from "@/lib/pages/screens";
import AdminShell, { AreaTabs } from "./AdminShell";
import PageToc from "./PageToc";
import BusyOverlay from "./BusyOverlay";
import SharePreview from "./SharePreview";
import { splitTitle } from "@/lib/ogText";
import { api, Toast, useToast } from "./client";
import { DownIcon, ExternalIcon, PlusIcon, SparkIcon, TrashIcon, UpIcon } from "./icons";
import { useSearchParams } from "next/navigation";
import styles from "./admin.module.css";

type Path = Array<string | number>;

/** The text the pending panel pointed at (`?campo=eras.2.body`): opened, scrolled to and highlighted. */
const TargetContext = createContext("");
type Change = (path: Path, update: (value: unknown) => unknown) => void;

function setAt(value: unknown, path: Path, update: (value: unknown) => unknown): unknown {
  if (!path.length) return update(value);
  const [step, ...rest] = path;
  if (Array.isArray(value)) return value.map((item, i) => (i === step ? setAt(item, rest, update) : item));
  const node = (value ?? {}) as Record<string, unknown>;
  return { ...node, [step]: setAt(node[step as string], rest, update) };
}

/** An item's first filled text, to name it while folded. */
function preview(fields: FieldDef[], item: PageValues) {
  for (const field of fields) {
    const value = item[field.key];
    const text = typeof value === "string" ? value : value && typeof value === "object" && !Array.isArray(value) ? (value as Localized).pt : "";
    if (text?.trim()) return text.trim().length > 70 ? `${text.trim().slice(0, 70)}…` : text.trim();
  }
  return "";
}

const STATE_CHIP = { missing: { label: "Falta o inglês", tone: "warn" }, stale: { label: "Mudou no português", tone: "warn" } } as const;
/** An empty `enFrom` marks English a review flagged (scripts/audit-page-translations.ts), not a changed Portuguese. */
const chipFor = (state: "missing" | "stale", text: Localized) => (state === "stale" && text.enFrom === "" ? { label: "Revisar o inglês", tone: "warn" } : STATE_CHIP[state]);

function TextPair({ field, text, path, change }: { field: FieldDef; text: Localized; path: Path; change: Change }) {
  const state = textState(text);
  const Input = field.type === "textarea" ? "textarea" : "input";
  const className = field.type === "textarea" ? styles.textarea : styles.input;
  const key = path.join(".");
  // Highlighted until its English is in day: the mark goes away as the problem does.
  const target = useContext(TargetContext) === key && state !== "ok";
  return (
    <div className={styles.field} data-field={key} data-target={target || undefined}>
      {target ? <span className={styles.targetNote}>Pendência: escreva o inglês deste texto e salve.</span> : null}
      <span className={styles.pairHead}>
        <span className={styles.label}>{field.label}</span>
        {state !== "ok" ? <span className={styles.chip} data-tone={chipFor(state, text).tone}>{chipFor(state, text).label}</span> : null}
      </span>
      <div className={styles.pair}>
        <label className={styles.pairSide}><span className={styles.lang}>PT</span>
          {/* A text that never recorded its source gets one now, so this edit shows the English as out of date. */}
          <Input className={className} value={text.pt} onChange={event => change(path, value => {
            const current = value as Localized;
            return { ...current, pt: event.target.value, enFrom: current.enFrom ?? (current.en.trim() ? current.pt : undefined) };
          })} />
        </label>
        {/* Editing the English marks it as written from the Portuguese on screen. */}
        <label className={styles.pairSide}><span className={styles.lang}>EN</span>
          <Input className={className} value={text.en} data-state={state} onChange={event => change(path, value => ({ ...(value as Localized), en: event.target.value, enFrom: (value as Localized).pt }))} />
        </label>
      </div>
      {field.hint ? <span className={styles.hint}>{field.hint}</span> : null}
    </div>
  );
}

function FieldView({ field, value, path, change }: { field: FieldDef; value: unknown; path: Path; change: Change }) {
  const target = useContext(TargetContext);
  if (field.type === "text" || field.type === "textarea") return <TextPair field={field} text={value as Localized} path={path} change={change} />;
  if (field.type === "list") {
    const items = Array.isArray(value) ? value as PageValues[] : [];
    const move = (from: number, to: number) => change(path, list => {
      const next = [...(list as PageValues[])];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
    const blank = Object.fromEntries(field.item.map(f => [f.key, f.type === "list" ? [] : f.type === "text" || f.type === "textarea" ? { pt: "", en: "" } : ""]));
    return (
      <div className={styles.field}>
        <span className={styles.label}>{field.label}</span>
        <div className={styles.list}>
          {items.map((item, i) => (
            // Long lists start folded, each item named by its first text, so the page stays scannable.
            <details key={i} className={`${styles.group} ${styles.foldItem}`} open={items.length <= 3 || target.startsWith(`${path.join(".")}.${i}.`)}>
              <summary className={styles.groupHead}>
                <span className={styles.foldTitle}>{field.itemLabel} {i + 1}{preview(field.item, item) ? <small> · {preview(field.item, item)}</small> : null}</span>
                <span style={{ display: "flex", gap: 2 }} onClick={event => event.preventDefault()}>
                  <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton}`} aria-label={`Subir ${field.itemLabel} ${i + 1}`} disabled={i === 0} onClick={() => move(i, i - 1)}><UpIcon /></button>
                  <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton}`} aria-label={`Descer ${field.itemLabel} ${i + 1}`} disabled={i === items.length - 1} onClick={() => move(i, i + 1)}><DownIcon /></button>
                  <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton}`} aria-label={`Remover ${field.itemLabel} ${i + 1}`} onClick={() => change(path, list => (list as PageValues[]).filter((_, j) => j !== i))}><TrashIcon /></button>
                </span>
              </summary>
              {field.item.map(sub => <FieldView key={sub.key} field={sub} value={item[sub.key]} path={[...path, i, sub.key]} change={change} />)}
            </details>
          ))}
          <button type="button" className={`${styles.button} ${styles.ghost}`} style={{ justifySelf: "start" }} onClick={() => change(path, list => [...(list as PageValues[] ?? []), structuredClone(blank)])}><PlusIcon />Adicionar {field.itemLabel.toLowerCase()}</button>
        </div>
        {field.hint ? <span className={styles.hint}>{field.hint}</span> : null}
      </div>
    );
  }
  return (
    <label className={styles.field}>
      <span className={styles.label}>{field.label}</span>
      <input className={styles.input} type={field.type === "email" ? "email" : "text"} inputMode={field.type === "url" ? "url" : undefined}
        value={String(value ?? "")} onChange={event => change(path, () => event.target.value)} />
      {field.hint ? <span className={styles.hint}>{field.hint}</span> : null}
    </label>
  );
}

/** A page's share card from the texts on screen (Portuguese), as the site will render it. */
function PagePreview({ page, values }: { page: string; values: PageValues }) {
  const title = (values[`${page}Title`] as Localized | undefined)?.pt ?? "";
  const description = (values[`${page}Description`] as Localized | undefined)?.pt ?? "";
  return <SharePreview {...splitTitle(title)} line={description} metaTitle={title} metaDescription={description} url={`guttorocha.com.br${page === "home" ? "" : `/${page}`}`} />;
}

export const HomeTabs = () => <AreaTabs tabs={[{ href: "/admin/site/home", label: "Textos" }, { href: "/admin/site/home/esteira", label: "Esteira de cases" }]} />;

type Files = Record<string, { values: PageValues; revision: string }>;
const valuesOf = (files: Files) => Object.fromEntries(Object.entries(files).map(([slug, file]) => [slug, file.values])) as Record<string, PageValues>;

/**
 * One screen of Site: a page's texts, links and lists, Portuguese and English side by side, and last its
 * "Google e compartilhamento" (from site.json). A screen may read two files; Salvar saves the ones that changed.
 */
export default function PageEditor({ screen: screenId, files: initial, apiReady }: { screen: string; files: Files; apiReady: boolean }) {
  const screen = SITE_SCREEN_BY_ID.get(screenId)!;
  const slugs = useMemo(() => screenFiles(screen), [screen]);
  const groupsOf = useCallback((slug: string) => screenGroups(screen, slug), [screen]);
  const [values, setValues] = useState(() => valuesOf(initial));
  const [saved, setSaved] = useState(() => valuesOf(initial));
  const [revisions, setRevisions] = useState(() => Object.fromEntries(Object.entries(initial).map(([slug, file]) => [slug, file.revision])) as Record<string, string>);
  const [busy, setBusy] = useState<"" | "save" | "translate">("");
  const { toast, show, clear } = useToast();

  const change: Change = useCallback((path, update) => setValues(current => setAt(current, path, update) as Record<string, PageValues>), []);
  const changed = slugs.filter(slug => JSON.stringify(values[slug]) !== JSON.stringify(saved[slug]));
  const dirty = changed.length > 0;
  const fieldsOf = useCallback((slug: string) => groupsOf(slug).flatMap(group => group.fields), [groupsOf]);
  const pendingOf = (slug: string) => { const c = translationCounts(fieldsOf(slug), values[slug]); return c.missing + c.stale; };
  const pending = slugs.reduce((sum, slug) => sum + pendingOf(slug), 0);

  const save = useCallback(async (): Promise<boolean> => {
    setBusy("save");
    try {
      for (const slug of slugs) {
        if (JSON.stringify(values[slug]) === JSON.stringify(saved[slug])) continue;
        const data = await api<{ values: PageValues; revision: string }>(`/api/admin/pages/${slug}`, { method: "PUT", body: { revision: revisions[slug], values: values[slug] } });
        setValues(v => ({ ...v, [slug]: data.values })); setSaved(v => ({ ...v, [slug]: data.values })); setRevisions(r => ({ ...r, [slug]: data.revision }));
      }
      show("Página salva: vai ao ar no próximo deploy.");
      return true;
    } catch (error) { show(error); return false; } finally { setBusy(""); }
  }, [revisions, saved, show, slugs, values]);

  async function translate() {
    setBusy("translate");
    try {
      let total = 0;
      for (const slug of slugs) {
        if (!pendingOf(slug)) continue;
        // Only this screen's groups of the file get translated.
        const data = await api<{ values: PageValues; translated: number }>(`/api/admin/pages/${slug}`, { method: "POST", body: { values: values[slug], groups: groupsOf(slug).map(g => g.label) } });
        setValues(v => ({ ...v, [slug]: data.values }));
        total += data.translated;
      }
      show(`A IA traduziu ${total} ${total === 1 ? "texto" : "textos"}. Revise e salve.`);
    } catch (error) { show(error); } finally { setBusy(""); }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key === "s") { event.preventDefault(); if (dirty && !busy) void save(); } };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [busy, dirty, save]);
  // Leaving with unsaved edits asks first, and the edits wait in this browser for the next visit.
  const leave = useLeaveGuard({ id: `site:${screen.id}`, dirty, value: values, base: slugs.map(slug => revisions[slug]).join("|"), onRestore: setValues, onDiscard: () => setValues(saved), onSave: save });

  // Arriving from Pendências: scroll to the text (`?campo=file.key`) and put the cursor in its English.
  const target = useSearchParams()?.get("campo") ?? "";
  useEffect(() => {
    if (!target) return;
    // After Next's own scroll to the top of a new page, which would undo this one.
    const timer = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-field="${CSS.escape(target)}"]`);
      if (!el) return;
      el.scrollIntoView({ block: "center" });
      el.querySelectorAll<HTMLElement>("input, textarea")[1]?.focus({ preventScroll: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [target]);

  const groups = screen.parts.flatMap(part => PAGE_SCHEMA_BY_SLUG.get(part.slug)!.groups.filter(part.keep).map(group => ({ slug: part.slug, group })))
    .map(({ slug, group }, i) => ({ slug, group, id: `grupo-${i + 1}`, label: group.preview ? "Google e compartilhamento" : group.label }));

  return (
    <TargetContext.Provider value={target}>
    <AdminShell
      crumbs={screen.id === "home" ? [{ label: "Site", href: "/admin/site" }, { label: "Home", href: "/admin/site/home" }, { label: "Textos" }] : [{ label: "Site", href: "/admin/site" }, { label: screen.label }]}
      actions={<>
        <span className={styles.saveState} data-dirty={dirty} data-saving={busy === "save" || undefined} aria-live="polite">{busy === "save" ? "Salvando…" : dirty ? "Alterações não salvas" : "Tudo salvo"}</span>
        {screen.paths ? <a className={`${styles.button} ${styles.ghost}`} href={screen.paths.pt} target="_blank" rel="noreferrer"><ExternalIcon />Ver no site</a> : null}
        <button type="button" className={`${styles.button} ${styles.primary}`} disabled={!dirty || !!busy} title={dirty ? "⌘S" : "Nada mudou desde o último salvamento"} onClick={() => void save()}>Salvar</button>
      </>}
    >
      <div className={`${styles.sheet} ${styles.pageSheet}`}>
        {leave.ui}
        <div className={styles.pageLayout}>
          <PageToc groups={groups.map(g => ({ id: g.id, label: g.label, last: !!g.group.preview }))} />
          <div className={styles.pageBody}>
            {screen.id === "home" ? <HomeTabs /> : null}
            <div className={styles.screenHead}>
              <div>
                <h1 className={styles.title}>{screen.label}</h1>
                <p className={styles.subtitle}>{screen.description}</p>
              </div>
              <button type="button" className={styles.button} disabled={!!busy || !pending || !apiReady} aria-busy={busy === "translate" || undefined}
                title={!apiReady ? "Configure OPENAI_API_KEY" : !pending ? "O inglês desta página está em dia" : undefined} onClick={() => void translate()}>
                <SparkIcon />Traduzir pendentes com IA{pending ? ` (${pending})` : ""}
              </button>
            </div>
            {dirty ? <p className={`${styles.hint} ${styles.pageNote}`}>O site mostra a versão salva: salve para as mudanças valerem no próximo deploy.</p> : null}
            {groups.map(({ slug, group, id, label }) => {
              const form = <div className={styles.form}>{group.fields.map(field => <FieldView key={field.key} field={field} value={values[slug][field.key]} path={[slug, field.key]} change={change} />)}</div>;
              return (
                <section key={id} id={id} className={styles.editGroup} aria-label={label}>
                  <h2>{label}</h2>
                  {group.preview ? <p className={styles.hint}>O título e a descrição desta página no Google e nos links compartilhados, com a imagem que aparece junto.{group.hint ? ` ${group.hint}` : ""}</p> : group.hint ? <p className={styles.hint}>{group.hint}</p> : null}
                  {group.preview ? <div className={styles.seoGroup}>{form}<PagePreview page={group.preview} values={values[slug]} /></div> : form}
                </section>
              );
            })}
            <p className={`${styles.hint} ${styles.pageNote}`} style={{ marginTop: 8 }}>Sem inglês, a página em inglês mostra o português daquele texto. Editar o inglês à mão marca o texto como revisado.</p>
          </div>
        </div>
      </div>
      <BusyOverlay label={busy === "translate" ? "Traduzindo com IA…" : busy === "save" ? "Salvando a página…" : ""} />
      <Toast toast={toast} onClose={toast?.tone === "bad" ? clear : undefined} />
    </AdminShell>
    </TargetContext.Provider>
  );
}

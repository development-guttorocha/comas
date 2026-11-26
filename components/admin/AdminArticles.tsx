"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { articleSeries, articleThemes, type Article, type ArticleTheme } from "@/lib/articleTaxonomy";
import AdminShell from "./AdminShell";
import BusyOverlay from "./BusyOverlay";
import { api, Toast, useToast } from "./client";
import { ArrowIcon, ExternalIcon, PlusIcon, SearchIcon } from "./icons";
import styles from "./admin.module.css";

type Row = Article & { minutes: number };

const slugify = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);

type Filter = "todos" | "publicados" | "rascunhos";
const FILTERS: { id: Filter; label: string; test: (row: Row) => boolean }[] = [
  { id: "todos", label: "Todos", test: () => true },
  { id: "publicados", label: "Publicados", test: row => !row.draft },
  { id: "rascunhos", label: "Rascunhos", test: row => !!row.draft },
];

/** The articles: how many, in which themes, and each one to open; a new one starts as a draft. */
export default function AdminArticles({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState({ title: "", slug: "", slugTouched: false, theme: "design-systems" as ArticleTheme });
  const [creating, setCreating] = useState(false);
  const { toast, show } = useToast();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const test = FILTERS.find(f => f.id === filter)!.test;
    return rows.filter(row => test(row) && (!q || `${row.title} ${row.dek}`.toLowerCase().includes(q)));
  }, [filter, query, rows]);
  const published = rows.filter(row => !row.draft);
  const themes = Object.entries(articleThemes) as [ArticleTheme, (typeof articleThemes)[ArticleTheme]][];

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      await api("/api/admin/articles", { method: "POST", body: { title: draft.title, slug: draft.slug, theme: draft.theme } });
      router.push(`/admin/artigos/${draft.slug}`);
    } catch (error) {
      show(error);
      setCreating(false);
    }
  }

  return (
    <AdminShell
      crumbs={[{ label: "Artigos" }]}
      actions={<>
        <a className={`${styles.button} ${styles.ghost}`} href="/artigos" target="_blank" rel="noreferrer"><ExternalIcon />Ver no site</a>
        <button type="button" className={styles.button} onClick={() => dialog.current?.showModal()}><PlusIcon />Novo artigo</button>
      </>}
    >
      <div className={styles.sheet}>
      <div className={styles.page}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Artigos</h1>
            {/* One line of facts instead of a card per theme: the list below is the work. */}
            <p className={styles.pageSummary}>
              {[
                `${rows.length} ${rows.length === 1 ? "artigo" : "artigos"}`,
                `${published.length} no site`,
                `${rows.length - published.length} em rascunho`,
                ...themes.flatMap(([key, theme]) => {
                  const count = published.filter(row => row.theme === key).length;
                  return count ? [`${theme.label} ${count}`] : [];
                }),
              ].join(" · ")}
            </p>
          </div>
          <label className={styles.search}>
            <SearchIcon />
            <input type="search" placeholder="Buscar artigo…" value={query} onChange={event => setQuery(event.target.value)} aria-label="Buscar artigo" />
          </label>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="Filtrar artigos">
          {FILTERS.map(f => (
            <button key={f.id} type="button" role="tab" className={styles.tab} aria-selected={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}<span className={styles.tabCount}>{rows.filter(f.test).length}</span>
            </button>
          ))}
        </div>

        <section className={styles.rows} aria-label="Artigos">
          {visible.map(row => (
            <div key={row.slug} className={styles.row} style={{ gridTemplateColumns: "minmax(0, 1fr) 110px 110px 32px" }}>
              <span style={{ minWidth: 0 }}>
                <span className={styles.rowTitle} style={{ display: "block" }}>{row.title}</span>
                <span className={styles.rowMeta} style={{ display: "block" }}>
                  {articleThemes[row.theme].label}{row.series ? ` · Série ${articleSeries[row.series].label}` : ""} · {row.minutes} min · {row.publishedAt}
                </span>
              </span>
              <span>{row.draft ? <span className={styles.chip} data-tone="warn">Rascunho</span> : <span className={styles.chip}>No site</span>}</span>
              <span className={styles.chip}>{row.ads === false ? "Sem anúncios" : "Com anúncios"}</span>
              <span className={styles.rowArrow} aria-hidden><ArrowIcon /></span>
              <Link href={`/admin/artigos/${row.slug}`} className={styles.rowLink} aria-label={`Editar ${row.title}`} />
            </div>
          ))}
          {!visible.length ? <p className={styles.emptyBody}>{query ? "Nenhum artigo encontrado." : "Nenhum artigo aqui ainda."}</p> : null}
        </section>
      </div>
      </div>

      <dialog ref={dialog} className={styles.dialog} style={{ width: "min(480px, 94vw)" }} onClick={event => { if (event.target === dialog.current) dialog.current.close(); }}>
        <form onSubmit={create}>
          <div className={styles.dialogHead}><h2>Novo artigo</h2></div>
          <div className={styles.form} style={{ padding: 16 }}>
            <label className={styles.field}><span className={styles.label}>Título</span>
              <input className={styles.input} required autoFocus value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value, slug: d.slugTouched ? d.slug : slugify(e.target.value) }))} />
            </label>
            <label className={styles.field}><span className={styles.label}>Tema</span>
              <select className={styles.input} value={draft.theme} onChange={e => setDraft(d => ({ ...d, theme: e.target.value as ArticleTheme }))}>
                {themes.map(([key, theme]) => <option key={key} value={key}>{theme.label}</option>)}
              </select>
              <span className={styles.hint}>O tema decide o serviço que aparece no texto e no fim do artigo.</span>
            </label>
            <label className={styles.field}><span className={styles.label}>Endereço</span>
              <input className={`${styles.input} ${styles.mono}`} required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={e => setDraft(d => ({ ...d, slug: e.target.value, slugTouched: true }))} />
              <span className={styles.hint}>guttorocha.com.br/artigos/{draft.slug || "…"}</span>
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={() => dialog.current?.close()}>Cancelar</button>
              <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={creating}>{creating ? "Criando…" : "Criar artigo"}</button>
            </div>
          </div>
        </form>
      </dialog>
      <BusyOverlay label={creating ? "Criando o artigo…" : ""} />
      <Toast toast={toast} />
    </AdminShell>
  );
}

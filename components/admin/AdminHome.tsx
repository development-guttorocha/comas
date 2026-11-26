"use client";
/* eslint-disable @next/next/no-img-element -- admin thumbnails: local files on this machine, no optimizer needed. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CaseRow, TranslationState } from "@/lib/admin/overview";
import AdminShell from "./AdminShell";
import BusyOverlay from "./BusyOverlay";
import { api, relativeTime, Toast, useToast } from "./client";
import { ArchiveIcon, ArrowIcon, CopyIcon, MoreIcon, PlusIcon, SearchIcon, TrashIcon } from "./icons";
import styles from "./admin.module.css";
import c from "./adminCases.module.css";

export const TRANSLATION_CHIP: Record<TranslationState, { label: string; tone: string }> = {
  published: { label: "Inglês publicado", tone: "good" },
  outdated: { label: "Inglês desatualizado", tone: "warn" },
  draft: { label: "Rascunho em inglês", tone: "warn" },
  none: { label: "Sem inglês", tone: "bad" },
};

const slugify = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

type Filter = "ativos" | "destaques" | "rascunhos" | "arquivados";
const FILTERS: { id: Filter; label: string; test: (row: CaseRow) => boolean }[] = [
  { id: "ativos", label: "Ativos", test: row => !row.archived },
  { id: "destaques", label: "Na esteira", test: row => !row.archived && row.featured },
  { id: "rascunhos", label: "Rascunhos", test: row => !row.archived && row.draft },
  { id: "arquivados", label: "Arquivados", test: row => row.archived },
];

function rowStatus(row: CaseRow) {
  if (row.archived) return " · Arquivado, fora do site";
  if (row.draft) return " · Rascunho, fora do site";
  return row.featured ? " · Na esteira da Home" : "";
}

/** The row's "…": the actions that change the case as a whole. */
function RowMenu({ row, onAction }: { row: CaseRow; onAction: (action: "archive" | "duplicate" | "delete") => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  const item = (action: Parameters<typeof onAction>[0], icon: React.ReactNode, title: string, note: string, danger?: boolean) => (
    <button type="button" role="menuitem" className={`${styles.menuItem} ${danger ? styles.menuDanger : ""}`} onClick={() => { setOpen(false); onAction(action); }}>
      <span className={styles.menuIcon}>{icon}</span><span><strong>{title}</strong><small>{note}</small></span>
    </button>
  );
  return (
    <span ref={box} className={styles.rowMenu}>
      <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton}`} aria-label={`Ações de ${row.title}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(v => !v)}><MoreIcon /></button>
      {open ? (
        <div className={`${styles.menu} ${styles.rowMenuList}`} role="menu">
          {item("duplicate", <CopyIcon />, "Duplicar", "Cópia como rascunho, com a mídia")}
          {item("archive", <ArchiveIcon />, row.archived ? "Desarquivar" : "Arquivar", row.archived ? "Volta para o site" : "Sai do site e fica guardado aqui")}
          {item("delete", <TrashIcon />, "Excluir", "Vai para a lixeira local", true)}
        </div>
      ) : null}
    </span>
  );
}

// The Cases screen: the list is the work, so it comes first. What used to be four cards of numbers
// is one line under the title; the only state that asks for something (English to review) links
// straight to it. The last publish lives in the Publicar site dialog.
export default function AdminHome({ rows }: { rows: CaseRow[]; mediaBytes?: number; mediaFiles?: number }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { toast, show } = useToast();
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState({ title: "", company: "", slug: "", slugTouched: false });
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<Filter>("ativos");
  const [busy, setBusy] = useState("");
  const [busyLabel, setBusyLabel] = useState("");
  const copyDialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const [copy, setCopy] = useState<{ from: CaseRow; title: string; slug: string } | null>(null);
  const [removing, setRemoving] = useState<CaseRow | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const test = FILTERS.find(f => f.id === filter)!.test;
    return rows.filter(row => test(row) && (!q || `${row.title} ${row.company} ${row.slug}`.toLowerCase().includes(q)));
  }, [filter, query, rows]);

  async function run(slug: string, label: string, work: () => Promise<unknown>, done: string) {
    setBusy(slug);
    setBusyLabel(label);
    try { await work(); show(done); router.refresh(); } catch (error) { show(error); } finally { setBusy(""); setBusyLabel(""); }
  }
  function act(row: CaseRow, action: "archive" | "duplicate" | "delete") {
    if (action === "archive") void run(row.slug, row.archived ? "Desarquivando…" : "Arquivando…", () => api(`/api/admin/cases/${row.slug}`, { method: "PATCH", body: { archived: !row.archived } }), row.archived ? "Desarquivado: o case voltou para o site." : "Arquivado: o case saiu do site.");
    if (action === "duplicate") { setCopy({ from: row, title: `${row.title} (cópia)`, slug: `${row.slug}-copia` }); copyDialog.current?.showModal(); }
    if (action === "delete") { setRemoving(row); deleteDialog.current?.showModal(); }
  }
  async function duplicate(event: React.FormEvent) {
    event.preventDefault();
    if (!copy) return;
    setBusy(copy.from.slug);
    setBusyLabel("Duplicando o case…");
    try {
      await api("/api/admin/cases", { method: "POST", body: { duplicateFrom: copy.from.slug, slug: copy.slug, title: copy.title } });
      router.push(`/admin/cases/${copy.slug}`);
    } catch (error) { show(error); setBusy(""); setBusyLabel(""); }
  }
  function remove() {
    if (!removing) return;
    deleteDialog.current?.close();
    void run(removing.slug, "Excluindo o case…", () => api(`/api/admin/cases/${removing.slug}`, { method: "DELETE" }), "Excluído. Está na lixeira local, em .content-history/deleted.");
  }
  // The summary counts what is in use; archived cases only show under their tab.
  const active = rows.filter(row => !row.archived);
  // The English to review is that of cases on the site, as in Pendências; a draft shows its state on its own row.
  const pending = active.filter(row => !row.draft && row.translation !== "published");
  const featured = active.filter(row => row.featured && !row.draft).length;
  const drafts = active.filter(row => row.draft).length;

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      await api("/api/admin/cases", { method: "POST", body: { slug: draft.slug, title: draft.title, company: draft.company } });
      router.push(`/admin/cases/${draft.slug}`);
    } catch (error) {
      show(error);
      setCreating(false);
    }
  }

  return (
    <AdminShell
      crumbs={[{ label: "Cases" }]}
      actions={<button type="button" className={styles.button} onClick={() => dialog.current?.showModal()}><PlusIcon />Novo case</button>}
    >
      <div className={styles.sheet}>
      <div className={styles.page}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Cases</h1>
            <p className={styles.pageSummary}>
              {active.length} {active.length === 1 ? "case" : "cases"}
              {featured ? <> · <Link href="/admin/site/home/esteira" className={c.quietLink}>{featured} na esteira da Home</Link></> : ""}
              {drafts ? ` · ${drafts} ${drafts === 1 ? "rascunho" : "rascunhos"}` : ""}
              {" · "}
              {pending.length ? (
                <span className={c.warn}>inglês para revisar em {pending.map((row, i) => <span key={row.slug}>{i ? ", " : ""}<Link href={`/admin/cases/${row.slug}?aba=ingles`}>{row.company}</Link></span>)}</span>
              ) : "inglês em dia"}
            </p>
          </div>
          <label className={styles.search}>
            <SearchIcon />
            <input type="search" placeholder="Buscar case…" value={query} onChange={event => setQuery(event.target.value)} aria-label="Buscar case" />
          </label>
        </div>

        <div className={c.toolbar}>
          <div className={styles.tabs} role="tablist" aria-label="Filtrar cases">
            {FILTERS.map(f => (
              <button key={f.id} type="button" role="tab" className={styles.tab} aria-selected={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}<span className={styles.tabCount}>{rows.filter(f.test).length}</span>
              </button>
            ))}
          </div>
        </div>

        <section className={styles.rows} aria-label="Cases">
          {visible.map(row => (
            <div key={row.slug} className={`${styles.row} ${c.row}`} data-busy={busy === row.slug || undefined} data-archived={row.archived || undefined}>
              <span className={styles.thumb}>{row.cover ? <img src={row.cover} alt="" loading="lazy" /> : null}</span>
              <span style={{ minWidth: 0 }}>
                <span className={styles.rowTitle} style={{ display: "block" }}>{row.title}</span>
                <span className={styles.rowMeta} style={{ display: "block" }}>{row.company} · {row.year}{rowStatus(row)}</span>
              </span>
              <span>{row.translation === "published" ? <span className={styles.chip}>Inglês em dia</span> : <span className={styles.chip} data-tone={TRANSLATION_CHIP[row.translation].tone}>{TRANSLATION_CHIP[row.translation].label}</span>}</span>
              <span className={styles.when} suppressHydrationWarning>{relativeTime(row.editedAt)}</span>
              {/* The arrow rests here; the "…" takes its place on hover or focus. */}
              <span className={styles.rowEnd}>
                <span className={styles.rowArrow} aria-hidden><ArrowIcon /></span>
                <span className={styles.rowActions}><RowMenu row={row} onAction={action => act(row, action)} /></span>
              </span>
              {/* The whole row opens the case; the buttons on the right sit above it; last, so the columns keep their order. */}
              <Link href={`/admin/cases/${row.slug}`} className={styles.rowLink} aria-label={`Editar ${row.title}`} />
            </div>
          ))}
          {!visible.length ? <p className={styles.emptyBody}>{query ? "Nenhum case encontrado." : filter === "arquivados" ? "Nenhum case arquivado." : "Nenhum case aqui."}</p> : null}
        </section>
      </div>
      </div>

      <dialog ref={dialog} className={styles.dialog} style={{ width: "min(460px, 94vw)" }} onClick={event => { if (event.target === dialog.current) dialog.current.close(); }}>
        <form onSubmit={create}>
          <div className={styles.dialogHead}><h2>Novo case</h2></div>
          <div className={styles.form} style={{ padding: 16 }}>
            <label className={styles.field}><span className={styles.label}>Título</span>
              <input className={styles.input} required autoFocus value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
            </label>
            <label className={styles.field}><span className={styles.label}>Empresa</span>
              <input className={styles.input} required value={draft.company} onChange={e => setDraft(d => ({ ...d, company: e.target.value, slug: d.slugTouched ? d.slug : slugify(e.target.value) }))} />
            </label>
            <label className={styles.field}><span className={styles.label}>Endereço</span>
              <input className={`${styles.input} ${styles.mono}`} required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={e => setDraft(d => ({ ...d, slug: e.target.value, slugTouched: true }))} />
              <span className={styles.hint}>guttorocha.com.br/cases/{draft.slug || "…"}</span>
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={() => dialog.current?.close()}>Cancelar</button>
              <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={creating}>{creating ? "Criando…" : "Criar case"}</button>
            </div>
          </div>
        </form>
      </dialog>
      <dialog ref={copyDialog} className={styles.dialog} style={{ width: "min(460px, 94vw)" }} onClick={event => { if (event.target === copyDialog.current) copyDialog.current.close(); }}>
        {copy ? (
          <form onSubmit={duplicate}>
            <div className={styles.dialogHead}><h2>Duplicar {copy.from.company}</h2></div>
            <div className={styles.form} style={{ padding: 16 }}>
              <p className={styles.hint} style={{ margin: 0 }}>A cópia leva os dados, o conteúdo e a mídia, e começa como rascunho, fora do site. A tradução não é copiada.</p>
              <label className={styles.field}><span className={styles.label}>Título</span>
                <input className={styles.input} required autoFocus value={copy.title} onChange={e => setCopy(c => c && { ...c, title: e.target.value })} />
              </label>
              <label className={styles.field}><span className={styles.label}>Endereço</span>
                <input className={`${styles.input} ${styles.mono}`} required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={copy.slug} onChange={e => setCopy(c => c && { ...c, slug: e.target.value })} />
                <span className={styles.hint}>guttorocha.com.br/cases/{copy.slug || "…"}</span>
              </label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={() => copyDialog.current?.close()}>Cancelar</button>
                <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={!!busy}>{busy ? "Duplicando…" : "Duplicar"}</button>
              </div>
            </div>
          </form>
        ) : null}
      </dialog>
      <dialog ref={deleteDialog} className={styles.dialog} style={{ width: "min(440px, 94vw)" }} onClick={event => { if (event.target === deleteDialog.current) deleteDialog.current.close(); }}>
        {removing ? (
          <div>
            <div className={styles.dialogHead}><h2>Excluir {removing.company}?</h2></div>
            <div className={styles.form} style={{ padding: 16 }}>
              <p style={{ margin: 0, fontSize: 14 }}>“{removing.title}” sai do site e do admin. O conteúdo, a mídia e a tradução vão para <code>.content-history/deleted/</code>, de onde dá para recuperar.</p>
              {!removing.archived ? <p className={styles.hint} style={{ margin: 0 }}>Para só tirar do site, prefira arquivar.</p> : null}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className={`${styles.button} ${styles.ghost}`} autoFocus onClick={() => deleteDialog.current?.close()}>Cancelar</button>
                <button type="button" className={`${styles.button} ${styles.dangerSolid}`} onClick={remove}>Excluir</button>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
      <BusyOverlay label={busyLabel} />
      <Toast toast={toast} />
    </AdminShell>
  );
}

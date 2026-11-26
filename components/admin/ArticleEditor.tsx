"use client";
/* eslint-disable @next/next/no-img-element -- admin preview: local files on this machine, no optimizer needed. */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLeaveGuard } from "./useLeaveGuard";
import { articleSeries, articleThemes, type Article } from "@/lib/articleTaxonomy";
import type { FieldDef, Values } from "@/lib/admin/fields";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import AdminShell from "./AdminShell";
import BusyOverlay from "./BusyOverlay";
import { api, Toast, useToast } from "./client";
import { Fields } from "./Fields";
import { ExternalIcon, GridIcon, SectionIcon } from "./icons";
import { CropProvider } from "./CropDialog";
import { MediaProvider } from "./MediaPicker";
import styles from "./admin.module.css";

export type ArticleTab = "conteudo" | "dados";
const TABS: { id: ArticleTab; label: string; icon: React.ReactNode }[] = [
  { id: "conteudo", label: "Texto", icon: <SectionIcon /> },
  { id: "dados", label: "Dados", icon: <GridIcon /> },
];

const DocumentEditor = dynamic(() => import("./editor/DocumentEditor"), { ssr: false, loading: () => <p className={styles.hint} style={{ padding: 24 }}>Abrindo o editor…</p> });

/** The article's data, grouped by where it shows on the site. */
function fieldGroups(cases: Array<{ value: string; label: string }>): { title: string; description: string; fields: FieldDef[] }[] {
  return [
    {
      title: "Topo do artigo",
      description: "Título, a tese em uma frase e o tema, que decide o serviço ligado ao texto.",
      fields: [
        { key: "title", label: "Título", type: "text" },
        { key: "dek", label: "Linha fina", type: "textarea", hint: "A tese em uma frase, abaixo do título. Também vira a descrição nos cards." },
        { key: "theme", label: "Tema", type: "select", options: Object.entries(articleThemes).map(([value, t]) => ({ value, label: t.label })), hint: "Liga o artigo ao serviço: card no meio do texto e bloco no fim." },
        { key: "series", label: "Série", type: "select", defaultLabel: "Nenhuma", options: Object.entries(articleSeries).map(([value, s]) => ({ value, label: s.label })), hint: "Liga os textos da série com anterior e próximo." },
        { key: "publishedAt", label: "Publicado em", type: "text", hint: "AAAA-MM-DD. Ordena a lista: o mais recente fica em destaque." },
      ],
    },
    {
      title: "Capa",
      description: "Uma foto, ou, sem foto, as palavras-chave em grade numerada.",
      fields: [
        { key: "cover", label: "Foto", type: "group", fields: [
          { key: "src", label: "Imagem", type: "image" },
          { key: "alt", label: "Descrição da imagem", type: "text", hint: "Para leitores de tela e para o Google." },
          { key: "credit", label: "Crédito", type: "text", hint: "Quem fez a foto, e a licença quando houver." },
        ] },
        { key: "coverWords", label: "Palavras da capa", type: "tags", hint: "Usadas quando não há foto. Até 10; a primeira ganha a cor do tema." },
      ],
    },
    {
      title: "Ligações",
      description: "Os cases que provam o ponto aparecem depois do texto, em \"Na prática\".",
      fields: [
        { key: "relatedCases", label: "Cases relacionados", type: "tags", hint: `Endereços dos cases: ${cases.map(c => c.value).join(", ")}.` },
      ],
    },
    {
      title: "Publicação",
      description: "Rascunhos só abrem neste computador. Os anúncios do serviço aparecem sempre.",
      fields: [
        { key: "draft", label: "Rascunho", type: "boolean", hint: "Fica fora do site, das listas e do sitemap." },
        { key: "ads", label: "Anúncios de terceiros", type: "boolean", hint: "AdSense na margem e no meio do texto, quando a conta estiver ativa." },
        { key: "seoTitle", label: "Título no Google", type: "text", hint: "Vazio: usa o título com \" | Gutto Rocha\"." },
        { key: "seoDescription", label: "Descrição no Google", type: "textarea", hint: "Vazia: usa a linha fina. Até uns 155 caracteres." },
      ],
    },
  ];
}

/** How the article shows in the lists of the site. */
function CardPreview({ data }: { data: Article }) {
  const words = data.coverWords?.length ? data.coverWords : [data.title];
  return (
    <aside className={`${styles.panel} ${styles.coverCard}`} aria-label="Prévia do card">
      <span className={styles.previewLabel}>Card na lista de artigos</span>
      <div className={styles.coverImage} style={{ background: "#151515" }}>
        {data.cover?.src ? <img src={data.cover.src} alt="" /> : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%", gap: 1, background: "#2b2b2b" }}>
            {words.slice(0, 4).map(w => <span key={w} style={{ padding: 10, background: "#151515", color: "#f5f2eb", fontWeight: 700, fontSize: 14 }}>{w}</span>)}
          </div>
        )}
      </div>
      <div style={{ display: "grid", gap: 6, padding: 14 }}>
        <span className={styles.label}>{articleThemes[data.theme]?.label ?? "Sem tema"}{data.series ? ` · ${articleSeries[data.series].label}` : ""}</span>
        <strong style={{ fontSize: 15 }}>{data.title || "Sem título"}</strong>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>{data.dek || "Sem linha fina."}</span>
        <span style={{ display: "flex", gap: 6, marginTop: 6 }}>
          {data.draft ? <span className={styles.chip} data-tone="warn">Rascunho</span> : <span className={styles.chip} data-tone="good">No site</span>}
          <span className={styles.chip}>{data.ads === false ? "Sem anúncios" : "Com anúncios"}</span>
        </span>
      </div>
    </aside>
  );
}

export default function ArticleEditor({ initial, cases, initialTab }: {
  initial: { article: Article; body: NotionBlockNode[]; revision: string };
  cases: Array<{ value: string; label: string }>;
  initialTab: ArticleTab;
}) {
  const slug = initial.article.slug;
  const [data, setData] = useState(initial.article);
  const [body, setBody] = useState(initial.body);
  const [revision, setRevision] = useState(initial.revision);
  const [saved, setSaved] = useState({ article: JSON.stringify(initial.article), body: JSON.stringify(initial.body) });
  const [tab, setTab] = useState<ArticleTab>(initialTab);
  const [resetKey, setResetKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const { toast, show, clear } = useToast();
  const groups = useMemo(() => fieldGroups(cases), [cases]);

  const articleDirty = useMemo(() => JSON.stringify(data) !== saved.article, [data, saved.article]);
  const bodyDirty = useMemo(() => JSON.stringify(body) !== saved.body, [body, saved.body]);
  const dirty = articleDirty || bodyDirty;

  const save = useCallback(async (): Promise<boolean> => {
    if (!dirty || saving) return !dirty;
    setSaving(true);
    try {
      const result = await api<{ revision: string; article: Article }>(`/api/admin/articles/${slug}`, { method: "PUT", body: { revision, ...(articleDirty ? { article: data } : {}), ...(bodyDirty ? { body } : {}) } });
      setRevision(result.revision);
      setData(result.article);
      setSaved({ article: JSON.stringify(result.article), body: JSON.stringify(body) });
      show("Salvo. Abra o artigo no site para conferir.");
      return true;
    } catch (error) {
      show(error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [articleDirty, body, bodyDirty, data, dirty, revision, saving, show, slug]);

  function discard() {
    setData(JSON.parse(saved.article));
    setBody(JSON.parse(saved.body));
    setResetKey(k => k + 1);
    clear();
  }

  function selectTab(next: ArticleTab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "conteudo") url.searchParams.delete("aba"); else url.searchParams.set("aba", next);
    history.replaceState(history.state, "", url);
  }

  // ⌘S / Ctrl+S saves.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void save(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  // Leaving with unsaved edits asks first, and the edits wait in this browser for the next visit.
  const unsaved = useMemo(() => ({ data, body }), [data, body]);
  const leave = useLeaveGuard({
    id: `article:${slug}`, dirty, value: unsaved, base: revision,
    onRestore: kept => { setData(kept.data); setBody(kept.body); setResetKey(k => k + 1); },
    onDiscard: discard, onSave: save,
  });

  return (
    <AdminShell
      crumbs={[{ label: "Artigos", href: "/admin/artigos" }, { label: data.title || "Sem título" }]}
      actions={<>
        <span className={styles.saveState} data-dirty={dirty} aria-live="polite">{saving ? "Salvando…" : dirty ? "Alterações não salvas" : "Salvo"}</span>
        {dirty ? <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={discard}>Descartar</button> : null}
        <a className={styles.button} href={`/artigos/${slug}`} target="_blank" rel="noreferrer"><ExternalIcon />Ver no site</a>
        <button type="button" className={`${styles.button} ${styles.primary}`} disabled={!dirty || saving} onClick={() => void save()} title="⌘S">Salvar</button>
      </>}
    >
      <MediaProvider slug={slug} folder="articles"><CropProvider>
        <div className={styles.page}>
          {leave.ui}
          <div className={styles.editorHead}>
            <div className={styles.editorTitle}>
              <div style={{ minWidth: 0 }}>
                <h1 className={styles.title}>{data.title || "Sem título"}</h1>
                <p className={styles.subtitle}>{articleThemes[data.theme]?.label} · {data.publishedAt}{data.draft ? " · Rascunho, fora do site" : ""}</p>
              </div>
            </div>
            <div className={styles.tabs} role="tablist" aria-label="Partes do artigo">
              {TABS.map(t => <button key={t.id} type="button" role="tab" className={styles.tab} aria-selected={tab === t.id} onClick={() => selectTab(t.id)}>{t.icon}{t.label}</button>)}
            </div>
          </div>
          <div role="tabpanel" key={resetKey}>
            {tab === "conteudo" ? (
              <div className={styles.panel}>
                <p className={styles.hint} style={{ margin: 0, padding: "12px 16px 0" }}>Títulos de nível 1 viram o índice do artigo. O card do serviço entra sozinho por volta de um terço do texto.</p>
                <DocumentEditor slug={slug} body={body} onChange={setBody} mediaFolder="articles" />
              </div>
            ) : (
              <div className={styles.dataLayout}>
                <div className={styles.page} style={{ gap: 12 }}>
                  {groups.map(group => (
                    <section key={group.title} className={`${styles.panel} ${styles.formPanel}`}>
                      <div><h2>{group.title}</h2><p className={styles.hint} style={{ margin: "2px 0 0" }}>{group.description}</p></div>
                      <Fields defs={group.fields} values={data as unknown as Values} onChange={values => setData(values as unknown as Article)} />
                    </section>
                  ))}
                  <section className={`${styles.panel} ${styles.formPanel}`}>
                    <div><h2>Endereço</h2><p className={styles.hint} style={{ margin: "2px 0 0" }}>Mudar o endereço quebraria links já compartilhados; por isso ele fica fixo.</p></div>
                    <input className={`${styles.input} ${styles.mono}`} readOnly value={`/artigos/${slug}`} aria-label="Endereço" />
                  </section>
                </div>
                <div className={styles.previews}><CardPreview data={data} /></div>
              </div>
            )}
          </div>
        </div>
      </CropProvider></MediaProvider>
      <BusyOverlay label={saving ? "Salvando o artigo…" : ""} />
      <Toast toast={toast} onClose={toast?.tone === "bad" ? clear : undefined} />
    </AdminShell>
  );
}

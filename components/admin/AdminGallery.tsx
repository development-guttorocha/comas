"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GalleryItem } from "@/lib/admin/gallery";
import { CAPTION_KINDS } from "@/lib/media/captionKinds";
import AdminShell, { AreaTabs, MEDIA_TABS } from "./AdminShell";
import { api, Toast, useToast } from "./client";
import { SearchIcon, TrashIcon } from "./icons";
import styles from "./admin.module.css";

type Sort = "recent" | "old" | "name" | "size" | "case";
type Use = "all" | "unused" | "used";

const SORTS: { value: Sort; label: string }[] = [
  { value: "recent", label: "Mais recentes" },
  { value: "old", label: "Mais antigas" },
  { value: "name", label: "Nome (A–Z)" },
  { value: "size", label: "Maiores primeiro" },
  { value: "case", label: "Por case" },
];

/** In use, or too new to tell: a file sent in the last 24 h may still be open in an editor. */
const isUsed = (i: GalleryItem) => i.usedIn.length > 0 || i.recent;
const status = (i: GalleryItem) => i.usedIn.length ? (i.fromMaterial ? "No material (ainda não salvo)" : `Em uso (${i.usedIn.length})`) : i.recent ? "Enviada há menos de 24 h" : "Sem uso";
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.round(n / 1024)} KB`);
const thumb = (item: GalleryItem) => (item.kind === "video" || item.name.endsWith(".svg") || item.name.endsWith(".gif") ? item.url : `/_next/image?url=${encodeURIComponent(item.url)}&w=384&q=75`);

/** The AI caption's alt; before there is one, the file name made readable ("image-3.png" → "image 3"). */
const altOf = (i: GalleryItem) => i.alt || i.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();

/** A thumbnail or the full file: a video plays in place, an image shows as it is. */
function Media({ item, src, style, lazy, controls }: { item: GalleryItem; src: string; style: React.CSSProperties; lazy?: boolean; controls?: boolean }) {
  if (item.kind === "video") return <video src={item.url} muted={!controls} controls={controls} preload="metadata" style={style} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={altOf(item)} loading={lazy ? "lazy" : undefined} style={style} />;
}

/**
 * Every image and video of the cases and articles in one place: search, sort, filter by case
 * or by use, and delete. Deleting moves the files to .content-history/deleted-media/, so
 * nothing is lost; a file still mentioned somewhere asks before it goes.
 */
export default function AdminGallery() {
  const [items, setItems] = useState<GalleryItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [place, setPlace] = useState("all");
  const [use, setUse] = useState<Use>("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<GalleryItem | null>(null);
  const [confirming, setConfirming] = useState<GalleryItem[] | null>(null);
  const { toast, show, clear } = useToast();

  const [progress, setProgress] = useState<{ pending: number; failed: number; error?: string }>({ pending: 0, failed: 0 });
  const load = useCallback(() => api<{ items: GalleryItem[]; captions: { pending: number; failed: number; error?: string } }>("/api/admin/gallery").then((d) => { setItems(d.items); setProgress(d.captions); return d.captions.pending; }).catch((e) => { show(e); return 0; }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // while images are being described, look again every few seconds so the descriptions appear
    let live = true, timer: ReturnType<typeof setTimeout>;
    const tick = async () => { const pending = await load(); if (live && pending > 0) timer = setTimeout(tick, 4000); };
    void tick();
    return () => { live = false; clearTimeout(timer); };
  }, [load]);

  const places = useMemo(() => [...new Set((items ?? []).map((i) => `${i.folder}/${i.slug}`))].sort(), [items]);
  const shown = useMemo(() => {
    const words = query.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).filter(Boolean);
    const list = (items ?? []).filter((i) => {
      if (place !== "all" && `${i.folder}/${i.slug}` !== place) return false;
      if (use === "unused" && isUsed(i)) return false;
      if (use === "used" && !isUsed(i)) return false;
      const hay = `${i.name} ${i.slug} ${i.folder} ${i.description ?? ""} ${i.alt ?? ""} ${i.captionKind ? CAPTION_KINDS[i.captionKind] : ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    const by: Record<Sort, (a: GalleryItem, b: GalleryItem) => number> = {
      recent: (a, b) => b.modified.localeCompare(a.modified),
      old: (a, b) => a.modified.localeCompare(b.modified),
      name: (a, b) => a.name.localeCompare(b.name),
      size: (a, b) => b.size - a.size,
      case: (a, b) => `${a.folder}/${a.slug}`.localeCompare(`${b.folder}/${b.slug}`) || a.name.localeCompare(b.name),
    };
    return list.sort(by[sort]);
  }, [items, query, sort, place, use]);

  const toggle = (url: string) => setPicked((p) => { const n = new Set(p); if (n.has(url)) n.delete(url); else n.add(url); return n; });
  const total = shown.reduce((s, i) => s + i.size, 0);

  /** Asks first: the dialog lists every file that will go, with a warning on the ones still in use. */
  const ask = (urls: string[]) => setConfirming((items ?? []).filter((i) => urls.includes(i.url)));

  async function remove(urls: string[]) {
    const list = (items ?? []).filter((i) => urls.includes(i.url));
    setConfirming(null);
    setBusy(true);
    try {
      await api("/api/admin/gallery", { method: "DELETE", body: { urls } });
      setItems((cur) => (cur ?? []).filter((i) => !urls.includes(i.url)));
      setPicked(new Set());
      setOpen(null);
      show(`${list.length} ${list.length === 1 ? "arquivo excluído" : "arquivos excluídos"}. Publique o site para tirar do ar.`);
    } catch (error) { show(error); }
    setBusy(false);
  }

  return (
    <AdminShell crumbs={[{ label: "Mídia" }]}>
      <div className={styles.page}>
        <AreaTabs tabs={MEDIA_TABS} />
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Mídia</h1>
            <p className={styles.subtitle}>Todas as imagens e vídeos dos cases e artigos. “Sem uso” quer dizer que nenhum conteúdo, página, rascunho da IA ou material menciona o arquivo, e que ele foi enviado há mais de 24 h.</p>
          </div>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.search}>
            <SearchIcon />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, case ou o que a imagem mostra" aria-label="Buscar" />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select className={styles.select} style={{ width: "auto" }} value={place} onChange={(e) => setPlace(e.target.value)} aria-label="Pasta">
              <option value="all">Todos os cases e artigos</option>
              {places.map((p) => <option key={p} value={p}>{p.endsWith("/") ? `${p}(raiz)` : p.replace(/^cases\//, "").replace(/^articles\//, "artigo: ")}</option>)}
            </select>
            <select className={styles.select} style={{ width: "auto" }} value={use} onChange={(e) => setUse(e.target.value as Use)} aria-label="Uso">
              <option value="all">Usadas e sem uso</option>
              <option value="unused">Só sem uso</option>
              <option value="used">Só em uso</option>
            </select>
            <select className={styles.select} style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar">
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span className={styles.rowMeta}>{items ? `${shown.length} ${shown.length === 1 ? "arquivo" : "arquivos"} · ${kb(total)}` : "Carregando…"}{progress.pending ? ` · descrevendo ${progress.pending} ${progress.pending === 1 ? "imagem" : "imagens"}…` : ""}{!progress.pending && progress.failed ? ` · ${progress.failed} sem descrição (${progress.error ?? "erro"}); tentamos de novo mais tarde` : ""}</span>
          {shown.length ? (
            <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => setPicked(picked.size === shown.length ? new Set() : new Set(shown.map((i) => i.url)))}>
              {picked.size === shown.length ? "Limpar seleção" : "Selecionar estes"}
            </button>
          ) : null}
          {picked.size ? (
            <button type="button" className={`${styles.button} ${styles.small}`} disabled={busy} onClick={() => ask([...picked])}><TrashIcon />Excluir {picked.size} {picked.size === 1 ? "selecionado" : "selecionados"}</button>
          ) : null}
        </div>

        {/* While the list loads, the grid shows its own shape, still. */}
        {!items ? (
          <ul aria-hidden style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
            {Array.from({ length: 10 }, (_, i) => <li key={i} className={styles.skeletonTile} />)}
          </ul>
        ) : null}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
          {shown.map((i) => (
            <li key={i.url} className={styles.panel} style={{ padding: 0, overflow: "hidden", contentVisibility: "auto", containIntrinsicSize: "auto 260px", outline: picked.has(i.url) ? "2px solid var(--ink)" : undefined }}>
              <button type="button" onClick={() => setOpen(i)} style={{ all: "unset", cursor: "zoom-in", display: "block", width: "100%", aspectRatio: "4 / 3", background: "repeating-conic-gradient(rgb(127 127 127 / 12%) 0 25%, transparent 0 50%) 0 0 / 16px 16px" }} aria-label={`Ver ${i.name}${i.alt ? `: ${i.alt}` : ""}`}>
                <Media item={i} src={thumb(i)} style={{ width: "100%", height: "100%", objectFit: "contain" }} lazy />
              </button>
              <div style={{ padding: "8px 10px", display: "grid", gap: 4 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                  <input type="checkbox" checked={picked.has(i.url)} onChange={() => toggle(i.url)} aria-label={`Selecionar ${i.name}${i.alt ? `: ${i.alt}` : ""}`} />
                  <span className={styles.rowTitle} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }} title={i.name}>{i.name}</span>
                </label>
                <span className={styles.rowMeta} style={{ fontSize: 11 }}>
                  {i.slug || "(raiz)"} · {kb(i.size)}{i.width ? ` · ${i.width}×${i.height}` : ""}
                </span>
                <span className={styles.chip} data-tone={isUsed(i) ? "good" : "warn"} style={{ justifySelf: "start" }}>{status(i)}</span>
              </div>
            </li>
          ))}
        </ul>

        {open ? (
          <div role="dialog" aria-label={open.name} onClick={() => setOpen(null)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgb(0 0 0 / 60%)", display: "grid", placeItems: "center", padding: 24 }}>
            <div className={styles.panel} onClick={(e) => e.stopPropagation()} style={{ boxShadow: "var(--shadow)", maxWidth: "min(1100px, 100%)", maxHeight: "100%", overflow: "auto", padding: 16, display: "grid", gap: 12 }}>
              <Media item={open} src={open.url} style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }} controls />
              <div style={{ display: "grid", gap: 4 }}>
                <span className={styles.rowTitle}>{open.name}</span>
                <span className={`${styles.rowMeta} ${styles.mono}`}>{open.url} · {kb(open.size)}{open.width ? ` · ${open.width}×${open.height}` : ""}</span>
                {open.description ? <p style={{ margin: "4px 0", fontSize: 13, lineHeight: 1.45 }}>{open.captionKind ? <strong>{CAPTION_KINDS[open.captionKind]}. </strong> : null}{open.description}</p> : open.kind === "image" ? <span className={styles.rowMeta}>Descrição em preparo…</span> : null}
                {open.alt ? <span className={styles.rowMeta}>Texto alternativo: {open.alt}</span> : null}
                <span className={styles.rowMeta}>{open.usedIn.length ? `${open.fromMaterial ? "Só no material da IA: " : "Usada em: "}${open.usedIn.join(", ")}` : open.recent ? "Enviada há menos de 24 h; pode estar aberta em um editor." : "Nenhum conteúdo nem página menciona este arquivo."}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => { void navigator.clipboard.writeText(open.url); show("Endereço copiado."); }}>Copiar endereço</button>
                <button type="button" className={`${styles.button} ${styles.small}`} disabled={busy} onClick={() => ask([open.url])}><TrashIcon />Excluir</button>
                <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => setOpen(null)}>Fechar</button>
              </div>
            </div>
          </div>
        ) : null}
        {confirming ? (
          <div role="dialog" aria-modal="true" aria-label="Confirmar exclusão" onClick={() => setConfirming(null)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgb(0 0 0 / 60%)", display: "grid", placeItems: "center", padding: 24 }}>
            <div className={styles.panel} onClick={(e) => e.stopPropagation()} style={{ boxShadow: "var(--shadow)", width: "min(560px, 100%)", maxHeight: "100%", overflow: "auto", padding: 16, display: "grid", gap: 12 }}>
              <span className={styles.rowTitle}>Excluir {confirming.length} {confirming.length === 1 ? "arquivo" : "arquivos"} ({kb(confirming.reduce((n, i) => n + i.size, 0))})?</span>
              <span className={styles.rowMeta}>Eles saem do site e vão para .content-history/deleted-media/ neste Mac, de onde dá para recuperar.</span>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6, maxHeight: "40vh", overflow: "auto" }}>
                {confirming.map((i) => (
                  <li key={i.url} style={{ display: "grid", gap: 2 }}>
                    <span className={`${styles.rowMeta} ${styles.mono}`}>{i.url}</span>
                    <span className={styles.chip} data-tone={isUsed(i) ? "warn" : "good"} style={{ justifySelf: "start" }}>{isUsed(i) ? `${status(i)}: o site pode mostrar a imagem quebrada` : "Sem uso"}</span>
                  </li>
                ))}
              </ul>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className={`${styles.button} ${styles.small}`} disabled={busy} onClick={() => void remove(confirming.map((i) => i.url))}><TrashIcon />Excluir</button>
                <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => setConfirming(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <Toast toast={toast} onClose={clear} />
    </AdminShell>
  );
}

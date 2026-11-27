"use client";
/* eslint-disable @next/next/no-img-element -- media library thumbnails come from blob, supabase, data URLs or local public. */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SocialMediaItem } from "@/lib/social/media";
import AdminShell from "./AdminShell";
import BusyOverlay from "./BusyOverlay";
import { api, Toast, useToast } from "./client";
import { CopyIcon, SearchIcon, SparkIcon, TrashIcon, UploadIcon } from "./icons";
import MuapiGeneratorDialog from "./MuapiGeneratorDialog";
import styles from "./admin.module.css";

type Sort = "recent" | "old" | "name" | "size";
type Use = "all" | "unused" | "used";

const SORTS: { value: Sort; label: string }[] = [
  { value: "recent", label: "Mais recentes" },
  { value: "old", label: "Mais antigas" },
  { value: "name", label: "Nome (A–Z)" },
  { value: "size", label: "Maiores primeiro" },
];

const kb = (n: number) =>
  !n ? "—" : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

function MediaView({ item, controls, style }: { item: SocialMediaItem; controls?: boolean; style: React.CSSProperties }) {
  if (item.kind === "video") return <video src={item.url} muted={!controls} controls={controls} preload="metadata" style={style} />;
  return <img src={item.url} alt={item.name} loading="lazy" style={style} />;
}

export default function AdminSocialMedia() {
  const [items, setItems] = useState<SocialMediaItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [folder, setFolder] = useState("all");
  const [use, setUse] = useState<Use>("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState<SocialMediaItem | null>(null);
  const [confirming, setConfirming] = useState<SocialMediaItem[] | null>(null);
  const [muapiOpen, setMuapiOpen] = useState(false);
  const { toast, show, clear } = useToast();

  const load = useCallback(() => {
    return api<{ items: SocialMediaItem[] }>("/api/social/media")
      .then(d => setItems(d.items))
      .catch(e => show(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const folders = useMemo(() => [...new Set((items ?? []).map(i => i.folder))].sort(), [items]);

  const shown = useMemo(() => {
    const words = query
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/\s+/)
      .filter(Boolean);
    const list = (items ?? []).filter(i => {
      if (folder !== "all" && i.folder !== folder) return false;
      if (use === "unused" && i.usedIn.length > 0) return false;
      if (use === "used" && i.usedIn.length === 0) return false;
      const hay = `${i.name} ${i.folder} ${i.usedIn.join(" ")}`.toLowerCase();
      return words.every(w => hay.includes(w));
    });
    const by: Record<Sort, (a: SocialMediaItem, b: SocialMediaItem) => number> = {
      recent: (a, b) => b.modified.localeCompare(a.modified),
      old: (a, b) => a.modified.localeCompare(b.modified),
      name: (a, b) => a.name.localeCompare(b.name),
      size: (a, b) => b.size - a.size,
    };
    return list.sort(by[sort]);
  }, [items, query, sort, folder, use]);

  const total = shown.reduce((s, i) => s + i.size, 0);

  const toggle = (url: string) =>
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setBusy("Enviando arquivos para a biblioteca…");
    try {
      for (const file of Array.from(list)) {
        const form = new FormData();
        form.set("folder", "estudio");
        form.set("file", file);
        await api("/api/social/media", { method: "POST", body: form });
      }
      await load();
      show(`${list.length} ${list.length === 1 ? "arquivo enviado" : "arquivos enviados"}!`, "good");
    } catch (e) {
      show(e);
    } finally {
      setBusy("");
    }
  }

  async function remove(urls: string[]) {
    setConfirming(null);
    setBusy("Excluindo arquivos…");
    try {
      await api("/api/social/media", { method: "DELETE", body: { urls } });
      setItems(cur => (cur ?? []).filter(i => !urls.includes(i.url)));
      setPicked(new Set());
      setOpen(null);
      show(`${urls.length} ${urls.length === 1 ? "arquivo excluído" : "arquivos excluídos"}.`, "good");
    } catch (e) {
      show(e);
    } finally {
      setBusy("");
    }
  }

  return (
    <AdminShell
      crumbs={[{ label: "Mídia" }]}
      actions={
        <>
          <button type="button" className={styles.button} onClick={() => setMuapiOpen(true)}>
            <SparkIcon />Gerar imagem IA
          </button>
          <label className={`${styles.button} ${styles.primary}`} aria-disabled={!!busy}>
            <UploadIcon />Enviar arquivo
            <input
              type="file"
              accept="image/*,video/mp4,video/webm"
              multiple
              hidden
              disabled={!!busy}
              onChange={e => {
                void upload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </>
      }
    >
      <div
        className={styles.page}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          void upload(e.dataTransfer.files);
        }}
      >
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Mídia</h1>
            <p className={styles.subtitle}>
              Fotos de redação, referências visuais, stickers, vídeos e artes geradas com IA disponíveis no Estúdio, Carrosséis e Reels. Arraste arquivos para qualquer lugar desta tela para enviar.
            </p>
          </div>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.search}>
            <SearchIcon />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nome, pasta ou post onde está em uso…"
              aria-label="Buscar"
            />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select
              className={styles.select}
              style={{ width: "auto" }}
              value={folder}
              onChange={e => setFolder(e.target.value)}
              aria-label="Pasta"
            >
              <option value="all">Todas as origens</option>
              {folders.map(f => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select
              className={styles.select}
              style={{ width: "auto" }}
              value={use}
              onChange={e => setUse(e.target.value as Use)}
              aria-label="Uso"
            >
              <option value="all">Usadas e sem uso</option>
              <option value="used">Só em uso nos posts</option>
              <option value="unused">Só sem uso</option>
            </select>
            <select
              className={styles.select}
              style={{ width: "auto" }}
              value={sort}
              onChange={e => setSort(e.target.value as Sort)}
              aria-label="Ordenar"
            >
              {SORTS.map(s => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span className={styles.rowMeta}>
            {items ? `${shown.length} ${shown.length === 1 ? "arquivo" : "arquivos"} · ${kb(total)}` : "Carregando…"}
          </span>
          {shown.length ? (
            <button
              type="button"
              className={`${styles.button} ${styles.small}`}
              onClick={() => setPicked(picked.size === shown.length ? new Set() : new Set(shown.map(i => i.url)))}
            >
              {picked.size === shown.length ? "Limpar seleção" : "Selecionar estes"}
            </button>
          ) : null}
          {picked.size ? (
            <button
              type="button"
              className={`${styles.button} ${styles.small}`}
              disabled={!!busy}
              onClick={() => setConfirming((items ?? []).filter(i => picked.has(i.url)))}
            >
              <TrashIcon />Excluir {picked.size} {picked.size === 1 ? "selecionado" : "selecionados"}
            </button>
          ) : null}
        </div>

        {!items ? (
          <ul
            aria-hidden
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gap: 8,
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            }}
          >
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i} className={styles.skeletonTile} />
            ))}
          </ul>
        ) : shown.length === 0 ? (
          <div className={styles.panel} style={{ padding: 24, textAlign: "center", display: "grid", gap: 10, justifyItems: "center" }}>
            <p className={styles.rowTitle} style={{ margin: 0 }}>
              {items.length ? "Nenhum arquivo encontrado com esses filtros." : "Sua biblioteca de mídia ainda está vazia."}
            </p>
            <p className={styles.hint} style={{ margin: 0 }}>
              Envie fotos de redação, texturas, recortes de jornal ou gere ilustrações editoriais com IA.
            </p>
          </div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gap: 8,
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            }}
          >
            {shown.map(i => (
              <li
                key={i.url}
                className={styles.panel}
                style={{
                  padding: 0,
                  overflow: "hidden",
                  outline: picked.has(i.url) ? "2px solid var(--ink)" : undefined,
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  style={{
                    all: "unset",
                    cursor: "zoom-in",
                    display: "block",
                    width: "100%",
                    aspectRatio: "4 / 3",
                    background: "repeating-conic-gradient(rgb(127 127 127 / 12%) 0 25%, transparent 0 50%) 0 0 / 16px 16px",
                  }}
                  aria-label={`Ver ${i.name}`}
                >
                  <MediaView item={i} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
                <div style={{ padding: "8px 10px", display: "grid", gap: 4 }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                    <input
                      type="checkbox"
                      checked={picked.has(i.url)}
                      onChange={() => toggle(i.url)}
                      aria-label={`Selecionar ${i.name}`}
                    />
                    <span
                      className={styles.rowTitle}
                      style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}
                      title={i.name}
                    >
                      {i.name}
                    </span>
                  </label>
                  <span className={styles.rowMeta} style={{ fontSize: 11 }}>
                    {i.folder} · {kb(i.size)}
                    {i.width ? ` · ${i.width}×${i.height}` : ""}
                  </span>
                  <span
                    className={styles.chip}
                    data-tone={i.usedIn.length > 0 ? "good" : undefined}
                    style={{ justifySelf: "start" }}
                  >
                    {i.usedIn.length > 0 ? `Em uso (${i.usedIn.length})` : "Disponível"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {open ? (
          <div
            role="dialog"
            aria-label={open.name}
            onClick={() => setOpen(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              background: "rgb(0 0 0 / 65%)",
              display: "grid",
              placeItems: "center",
              padding: 24,
            }}
          >
            <div
              className={styles.panel}
              onClick={e => e.stopPropagation()}
              style={{
                boxShadow: "var(--shadow)",
                maxWidth: "min(960px, 100%)",
                maxHeight: "100%",
                overflow: "auto",
                padding: 16,
                display: "grid",
                gap: 12,
              }}
            >
              <MediaView item={open} controls style={{ maxWidth: "100%", maxHeight: "68vh", objectFit: "contain" }} />
              <div style={{ display: "grid", gap: 4 }}>
                <span className={styles.rowTitle}>{open.name}</span>
                <span className={`${styles.rowMeta} ${styles.mono}`}>
                  {open.folder} · {kb(open.size)}
                  {open.width ? ` · ${open.width}×${open.height}` : ""}
                </span>
                <span className={styles.rowMeta}>
                  {open.usedIn.length ? `Em uso em: ${open.usedIn.join(", ")}` : "Ainda não usada em nenhum post salvo."}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.small}`}
                  onClick={() => {
                    void navigator.clipboard.writeText(open.url);
                    show("Endereço copiado!", "good");
                  }}
                >
                  <CopyIcon />Copiar endereço
                </button>
                {open.source !== "post" ? (
                  <button
                    type="button"
                    className={`${styles.button} ${styles.small}`}
                    onClick={() => setConfirming([open])}
                  >
                    <TrashIcon />Excluir
                  </button>
                ) : null}
                <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => setOpen(null)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {confirming ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar exclusão"
            onClick={() => setConfirming(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 60,
              background: "rgb(0 0 0 / 65%)",
              display: "grid",
              placeItems: "center",
              padding: 24,
            }}
          >
            <div
              className={styles.panel}
              onClick={e => e.stopPropagation()}
              style={{ width: "min(520px, 100%)", padding: 16, display: "grid", gap: 12 }}
            >
              <span className={styles.rowTitle}>
                Excluir {confirming.length} {confirming.length === 1 ? "arquivo" : "arquivos"}?
              </span>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6, maxHeight: "36vh", overflow: "auto" }}>
                {confirming.map(i => (
                  <li key={i.url} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <span className={`${styles.rowMeta} ${styles.mono}`} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                      {i.name}
                    </span>
                    <span className={styles.chip} data-tone={i.usedIn.length ? "warn" : "good"}>
                      {i.usedIn.length ? `Em uso (${i.usedIn.length})` : "Sem uso"}
                    </span>
                  </li>
                ))}
              </ul>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={() => setConfirming(null)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className={`${styles.button} ${styles.primary}`}
                  onClick={() => void remove(confirming.map(i => i.url))}
                >
                  <TrashIcon />Excluir
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <MuapiGeneratorDialog
        open={muapiOpen}
        kindFilter="image"
        inlineDataUrl
        onClose={() => setMuapiOpen(false)}
        onResult={() => {
          setMuapiOpen(false);
          void load();
          show("Arte gerada e salva na Mídia!", "good");
        }}
      />
      <BusyOverlay label={busy} />
      <Toast toast={toast} onClose={clear} />
    </AdminShell>
  );
}

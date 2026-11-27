"use client";
/* eslint-disable @next/next/no-img-element -- admin thumbnails: local/blob/data files, no optimizer needed. */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MediaFile } from "@/lib/admin/caseStore";
import BusyOverlay from "./BusyOverlay";
import { api } from "./client";
import { CloseIcon, SearchIcon, SparkIcon, UploadIcon } from "./icons";
import MuapiGeneratorDialog from "./MuapiGeneratorDialog";
import styles from "./admin.module.css";

type Pick = (current?: string) => Promise<string | null>;
const MediaContext = createContext<Pick>(async () => null);

/** Fields ask for an image or video; the picker answers with its address (or null). */
export function useMediaPicker() {
  return useContext(MediaContext);
}

const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.startsWith("data:video/");
export function MediaThumb({ src }: { src: string }) {
  if (!src) return <>Sem mídia</>;
  return isVideo(src) ? <video src={src} muted playsInline preload="metadata" /> : <img src={src} alt="" loading="lazy" />;
}

export function MediaProvider({
  slug,
  folder = "cases",
  source = "admin",
  children,
}: {
  slug: string;
  folder?: "cases" | "articles" | "estudio" | "carrosseis" | "reels";
  source?: "admin" | "social";
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((value: string | null) => void) | null>(null);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [current, setCurrent] = useState<string>();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [muapiOpen, setMuapiOpen] = useState(false);

  const endpoint = source === "social" ? "/api/social/media" : `/api/admin/media?slug=${slug}&folder=${folder}`;

  const load = useCallback(async () => {
    try {
      const data = await api<{ files?: MediaFile[]; items?: MediaFile[] }>(endpoint);
      setFiles(data.files ?? data.items ?? []);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [endpoint]);

  const pick = useCallback<Pick>(value => {
    setCurrent(value);
    setQuery("");
    setError("");
    void load();
    dialog.current?.showModal();
    return new Promise(resolve => {
      resolver.current = resolve;
    });
  }, [load]);

  const finish = (value: string | null) => {
    resolver.current?.(value);
    resolver.current = null;
    dialog.current?.close();
  };

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    setError("");
    try {
      let last: MediaFile | null = null;
      const postUrl = source === "social" ? "/api/social/media" : "/api/admin/media";
      for (const file of Array.from(list)) {
        const form = new FormData();
        form.set("slug", slug);
        form.set("folder", folder);
        form.set("file", file);
        last = (await api<{ file: MediaFile }>(postUrl, { method: "POST", body: form })).file;
      }
      await load();
      // One file: that is the choice. Several: pick among them.
      if (last && list.length === 1) finish(last.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter(f => f.name.toLowerCase().includes(q));
  }, [files, query]);

  useEffect(() => () => resolver.current?.(null), []);

  return (
    <MediaContext.Provider value={pick}>
      {children}
      <BusyOverlay label={busy ? "Enviando os arquivos…" : ""} />
      <dialog
        ref={dialog}
        className={styles.dialog}
        onClose={() => {
          resolver.current?.(null);
          resolver.current = null;
        }}
        onClick={event => {
          if (event.target === dialog.current) finish(null);
        }}
      >
        <div className={styles.dialogHead}>
          <h2>{source === "social" ? "Biblioteca de Mídia" : "Mídia do case"}</h2>
          {source === "social" ? (
            <button
              type="button"
              className={`${styles.button} ${styles.small}`}
              onClick={() => setMuapiOpen(true)}
            >
              <SparkIcon />Gerar com IA
            </button>
          ) : null}
          <label className={`${styles.button} ${styles.primary}`} aria-disabled={busy}>
            <UploadIcon />{busy ? "Enviando…" : "Enviar arquivo"}
            <input
              type="file"
              accept="image/*,video/mp4,video/webm"
              multiple
              hidden
              disabled={busy}
              onChange={event => {
                void upload(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          {current ? (
            <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={() => finish("")}>
              Remover
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.button} ${styles.ghost} ${styles.iconButton}`}
            aria-label="Fechar"
            onClick={() => finish(null)}
          >
            <CloseIcon />
          </button>
        </div>
        {files.length > 4 ? (
          <div style={{ padding: "10px 16px 0" }}>
            <label className={styles.search} style={{ width: "100%" }}>
              <SearchIcon />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Filtrar por nome do arquivo…"
                aria-label="Filtrar mídia"
              />
            </label>
          </div>
        ) : null}
        {error ? <p className={styles.error} style={{ padding: "12px 16px 0" }}>{error}</p> : null}
        <div
          className={styles.mediaGrid}
          onDragOver={event => event.preventDefault()}
          onDrop={event => {
            event.preventDefault();
            void upload(event.dataTransfer.files);
          }}
        >
          {filtered.map(file => (
            <button
              key={file.url}
              type="button"
              className={styles.mediaItem}
              aria-pressed={file.url === current}
              onClick={() => finish(file.url)}
            >
              <span className={styles.imagePreview}><MediaThumb src={file.url} /></span>
              <span>{file.name}</span>
              <span>
                {file.size
                  ? file.size >= 1024 * 1024
                    ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
                    : `${Math.max(1, Math.round(file.size / 1024))} KB`
                  : "Em uso"}
              </span>
            </button>
          ))}
          {!filtered.length ? (
            <p className={styles.hint}>
              {files.length
                ? "Nenhum arquivo corresponde à busca."
                : "Nenhum arquivo ainda. Envie ou arraste imagens e vídeos para cá, ou gere uma arte com IA."}
            </p>
          ) : null}
        </div>
      </dialog>
      {source === "social" ? (
        <MuapiGeneratorDialog
          open={muapiOpen}
          kindFilter="image"
          inlineDataUrl
          onClose={() => setMuapiOpen(false)}
          onResult={url => {
            setMuapiOpen(false);
            finish(url);
          }}
        />
      ) : null}
    </MediaContext.Provider>
  );
}

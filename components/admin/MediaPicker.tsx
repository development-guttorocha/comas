"use client";
/* eslint-disable @next/next/no-img-element -- admin thumbnails: local files on this machine, no optimizer needed. */

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { MediaFile } from "@/lib/admin/caseStore";
import BusyOverlay from "./BusyOverlay";
import { api } from "./client";
import { CloseIcon, UploadIcon } from "./icons";
import styles from "./admin.module.css";

type Pick = (current?: string) => Promise<string | null>;
const MediaContext = createContext<Pick>(async () => null);

/** Fields ask for an image or video; the picker answers with its address (or null). */
export function useMediaPicker() {
  return useContext(MediaContext);
}

const isVideo = (url: string) => /\.(mp4|webm)$/i.test(url);
export function MediaThumb({ src }: { src: string }) {
  if (!src) return <>Sem mídia</>;
  return isVideo(src) ? <video src={src} muted playsInline preload="metadata" /> : <img src={src} alt="" loading="lazy" />;
}

export function MediaProvider({ slug, folder = "cases", children }: { slug: string; folder?: "cases" | "articles"; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((value: string | null) => void) | null>(null);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [current, setCurrent] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try { setFiles((await api<{ files: MediaFile[] }>(`/api/admin/media?slug=${slug}&folder=${folder}`)).files); }
    catch (e) { setError((e as Error).message); }
  }, [slug, folder]);

  const pick = useCallback<Pick>(value => {
    setCurrent(value);
    setError("");
    void load();
    dialog.current?.showModal();
    return new Promise(resolve => { resolver.current = resolve; });
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
      for (const file of Array.from(list)) {
        const form = new FormData();
        form.set("slug", slug);
        form.set("folder", folder);
        form.set("file", file);
        last = (await api<{ file: MediaFile }>("/api/admin/media", { method: "POST", body: form })).file;
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

  useEffect(() => () => resolver.current?.(null), []);

  return (
    <MediaContext.Provider value={pick}>
      {children}
      <BusyOverlay label={busy ? "Enviando os arquivos…" : ""} />
      <dialog ref={dialog} className={styles.dialog} onClose={() => { resolver.current?.(null); resolver.current = null; }} onClick={event => { if (event.target === dialog.current) finish(null); }}>
        <div className={styles.dialogHead}>
          <h2>Mídia do case</h2>
          <label className={`${styles.button} ${styles.primary}`} aria-disabled={busy}>
            <UploadIcon />{busy ? "Enviando…" : "Enviar arquivo"}
            <input type="file" accept="image/*,video/mp4,video/webm" multiple hidden disabled={busy} onChange={event => { void upload(event.target.files); event.target.value = ""; }} />
          </label>
          {current ? <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={() => finish("")}>Remover</button> : null}
          <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton}`} aria-label="Fechar" onClick={() => finish(null)}><CloseIcon /></button>
        </div>
        {error ? <p className={styles.error} style={{ padding: "12px 16px 0" }}>{error}</p> : null}
        <div className={styles.mediaGrid} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void upload(event.dataTransfer.files); }}>
          {files.map(file => (
            <button key={file.url} type="button" className={styles.mediaItem} aria-pressed={file.url === current} onClick={() => finish(file.url)}>
              <span className={styles.imagePreview}><MediaThumb src={file.url} /></span>
              <span>{file.name}</span>
              <span>{file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`}</span>
            </button>
          ))}
          {!files.length ? <p className={styles.hint}>Nenhum arquivo ainda. Envie ou arraste imagens e vídeos para cá.</p> : null}
        </div>
      </dialog>
    </MediaContext.Provider>
  );
}

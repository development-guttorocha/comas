"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cropFromText, cropToText, type MediaCrop } from "@/lib/mediaCrop";
import styles from "./CropDialog.module.css";
import admin from "./admin.module.css";

/**
 * Recorte de imagem ou vídeo: arraste a área (ou os cantos) sobre o arquivo, livre ou numa
 * proporção. Responde com o recorte em texto, "" para o arquivo inteiro, ou null se cancelar.
 */

type Crop = (src: string, crop: string) => Promise<string | null>;
const CropContext = createContext<Crop>(async () => null);
export const useCropper = () => useContext(CropContext);

type Box = { x: number; y: number; w: number; h: number };
const FULL: Box = { x: 0, y: 0, w: 100, h: 100 };
const RATIOS: { label: string; value: number | null }[] = [
  { label: "Livre", value: null }, { label: "16:9", value: 16 / 9 }, { label: "4:3", value: 4 / 3 }, { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 }, { label: "9:16", value: 9 / 16 }, { label: "21:9", value: 21 / 9 },
];
const MIN = 4;
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
type Handle = (typeof HANDLES)[number] | "move";
const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The largest box of `ratio` (in pixels) around the centre of `box`, inside the file. */
function fitRatio(box: Box, ratio: number, size: { w: number; h: number }): Box {
  const pct = ratio * size.h / size.w; // w% / h% for that pixel ratio
  let w = 100, h = w / pct;
  if (h > 100) { h = 100; w = h * pct; }
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  return { w, h, x: clamp(cx - w / 2, 0, 100 - w), y: clamp(cy - h / 2, 0, 100 - h) };
}

export function CropProvider({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((value: string | null) => void) | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState("");
  const [box, setBox] = useState<Box>(FULL);
  const [ratio, setRatio] = useState<number | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const drag = useRef<{ handle: Handle; start: Box; x: number; y: number } | null>(null);

  const open = useCallback<Crop>((url, text) => {
    const crop = cropFromText(text);
    setSrc(url);
    setSize(null);
    setRatio(null);
    setBox(crop ? { x: crop.x, y: crop.y, w: crop.w, h: crop.h } : FULL);
    dialog.current?.showModal();
    return new Promise(resolve => { resolver.current = resolve; });
  }, []);

  const finish = (value: string | null) => {
    resolver.current?.(value);
    resolver.current = null;
    dialog.current?.close();
  };
  useEffect(() => () => resolver.current?.(null), []);

  function chooseRatio(value: number | null) {
    setRatio(value);
    if (value && size) setBox(b => fitRatio(b, value, size));
  }

  function startDrag(handle: Handle, event: ReactPointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    drag.current = { handle, start: box, x: event.clientX, y: event.clientY };
    try { (event.target as Element).setPointerCapture(event.pointerId); } catch { /* synthetic events */ }
  }

  function onPointerMove(event: ReactPointerEvent) {
    const d = drag.current, rect = stage.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const dx = ((event.clientX - d.x) / rect.width) * 100, dy = ((event.clientY - d.y) / rect.height) * 100;
    const s = d.start;
    if (d.handle === "move") { setBox({ ...s, x: clamp(s.x + dx, 0, 100 - s.w), y: clamp(s.y + dy, 0, 100 - s.h) }); return; }
    let left = s.x, top = s.y, right = s.x + s.w, bottom = s.y + s.h;
    if (d.handle.includes("w")) left = clamp(left + dx, 0, right - MIN);
    if (d.handle.includes("e")) right = clamp(right + dx, left + MIN, 100);
    if (d.handle.includes("n")) top = clamp(top + dy, 0, bottom - MIN);
    if (d.handle.includes("s")) bottom = clamp(bottom + dy, top + MIN, 100);
    if (ratio && size) {
      // Width leads; the height follows the ratio from the fixed side, and both shrink to fit.
      const pct = ratio * size.h / size.w;
      let w = right - left, h = w / pct;
      const roomH = d.handle.includes("n") ? bottom : 100 - top;
      if (h > roomH) { h = roomH; w = h * pct; }
      if (d.handle.includes("w")) left = right - w; else right = left + w;
      if (d.handle.includes("n")) top = bottom - h; else bottom = top + h;
    }
    setBox({ x: left, y: top, w: right - left, h: bottom - top });
  }

  const crop: MediaCrop | undefined = size ? { ...box, r: (box.w * size.w) / (box.h * size.h) } : undefined;
  const whole = box.w >= 99.99 && box.h >= 99.99;
  const pixels = size ? `${Math.round(box.w * size.w / 100)} × ${Math.round(box.h * size.h / 100)} px` : "";

  return (
    <CropContext.Provider value={open}>
      {children}
      <dialog ref={dialog} className={`${admin.dialog} ${styles.dialog}`} onClose={() => { resolver.current?.(null); resolver.current = null; }}>
        <div className={admin.dialogHead}>
          <h2>Recortar</h2>
          <div className={styles.ratios} role="radiogroup" aria-label="Proporção">
            {RATIOS.map(r => <button key={r.label} type="button" role="radio" aria-checked={ratio === r.value} className={styles.ratio} onClick={() => chooseRatio(r.value)}>{r.label}</button>)}
          </div>
        </div>
        <div className={styles.body}>
          {src ? (
            <div ref={stage} className={styles.stage} onPointerMove={onPointerMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
              {isVideo(src)
                ? <video className={styles.media} src={src} muted loop autoPlay playsInline onLoadedMetadata={e => setSize({ w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })} />
                // eslint-disable-next-line @next/next/no-img-element -- the file as it is, to draw on
                : <img className={styles.media} src={src} alt="" onLoad={e => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />}
              <div className={styles.box} style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }} onPointerDown={e => startDrag("move", e)}>
                <span className={styles.thirds} aria-hidden />
                {HANDLES.filter(h => !ratio || h.length === 2).map(h => <span key={h} className={styles.handle} data-handle={h} onPointerDown={e => startDrag(h, e)} aria-hidden />)}
              </div>
            </div>
          ) : null}
        </div>
        <div className={styles.foot}>
          <span className={styles.size}>{whole ? "Arquivo inteiro" : pixels}</span>
          <button type="button" className={`${admin.button} ${admin.ghost} ${admin.small}`} onClick={() => { setBox(FULL); setRatio(null); }} disabled={whole}>Arquivo inteiro</button>
          <button type="button" className={`${admin.button} ${admin.ghost} ${admin.small}`} onClick={() => finish(null)}>Cancelar</button>
          <button type="button" className={`${admin.button} ${admin.primary} ${admin.small}`} disabled={!size} onClick={() => finish(whole ? "" : cropToText(crop))}>Aplicar</button>
        </div>
      </dialog>
    </CropContext.Provider>
  );
}

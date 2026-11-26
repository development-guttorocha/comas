"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Case } from "@/lib/cases";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { api } from "./client";
import styles from "./admin.module.css";
import p from "./casePreview.module.css";

// The case as the site renders it, next to the editor. The real page runs in an iframe
// (/admin/cases/<slug>/previa); after each change the editor sends what is on screen and asks the
// iframe to refresh in place, so the scroll stays where Gutto was reading.

const WIDTHS = { desktop: 1280, mobile: 390 } as const;
type Device = keyof typeof WIDTHS;
const DEVICE_KEY = "case-preview-device";
const MESSAGE = { refresh: "case-preview:refresh", ready: "case-preview:ready", idle: "case-preview:idle" };

export default function CasePreview({ slug, data, body }: { slug: string; data: Case; body: NotionBlockNode[] }) {
  const [device, setDevice] = useState<Device>("desktop");
  const [src, setSrc] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  const [box, setBox] = useState({ width: 0, height: 0 });
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const ready = useRef(false);
  const started = useRef(false);

  useEffect(() => { try { if (localStorage.getItem(DEVICE_KEY) === "mobile") setDevice("mobile"); } catch { /* desktop */ } }, []);
  const pick = (next: Device) => { setDevice(next); try { localStorage.setItem(DEVICE_KEY, next); } catch { /* this page only */ } };

  // Each change: after a short pause, send what is on screen, then refresh the iframe in place.
  useEffect(() => {
    let live = true;
    setBusy(true);
    const timer = window.setTimeout(async () => {
      try {
        await api(`/api/admin/cases/${slug}/preview`, { method: "POST", body: { case: data, body } });
        if (!live) return;
        setFailed("");
        if (!started.current) { started.current = true; setSrc(`/admin/cases/${slug}/previa`); }
        else if (ready.current) frame.current?.contentWindow?.postMessage({ type: MESSAGE.refresh }, window.location.origin);
        else setBusy(false);
      } catch (error) {
        if (live) { setFailed(error instanceof Error ? error.message : "A prévia não atualizou."); setBusy(false); }
      }
    }, 350);
    return () => { live = false; window.clearTimeout(timer); };
  }, [slug, data, body]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === MESSAGE.ready) ready.current = true;
      if (event.data?.type === MESSAGE.ready || event.data?.type === MESSAGE.idle) setBusy(false);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // The page renders at a real screen width and is scaled down to the column.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const width = WIDTHS[device];
  const scale = box.width ? Math.min(1, box.width / width) : 1;

  return (
    <aside className={`${styles.panel} ${p.preview}`} aria-label="Prévia do case">
      <div className={p.head}>
        <div className={styles.tabs} role="tablist" aria-label="Largura da prévia">
          {(["desktop", "mobile"] as const).map(d => (
            <button key={d} type="button" role="tab" className={styles.tab} aria-selected={device === d} onClick={() => pick(d)}>{d === "desktop" ? "Desktop" : "Celular"}</button>
          ))}
        </div>
        <span className={p.state} data-state={failed ? "bad" : busy || !src ? "busy" : "ok"} aria-live="polite">{failed ? failed : busy || !src ? "Atualizando…" : "Prévia com o que está na tela"}</span>
      </div>
      <div className={p.stage} ref={stage} data-device={device}>
        {src && box.width ? (
          <div className={p.screen} style={{ width: width * scale, height: device === "mobile" ? Math.min(box.height, 844 * scale) : box.height }}>
            <iframe
              ref={frame} src={src} title="Prévia do case"
              style={{ width, height: (device === "mobile" ? Math.min(box.height, 844 * scale) : box.height) / scale, transform: `scale(${scale})` }}
              onLoad={() => setBusy(false)}
            />
          </div>
        ) : null}
      </div>
    </aside>
  );
}

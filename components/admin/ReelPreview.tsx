"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useReelPlayback } from "./useReelPlayback";
import ReelStage from "@/components/reel/ReelStage";
import { W } from "@/components/reel/motion";
import { kindLabel } from "@/lib/reel/sceneFields";
import { beatLength, beatTime, type ReelTrack } from "@/lib/reel/tracks";
import type { ReelDoc } from "@/lib/reel/types";
import styles from "./admin.module.css";
import r from "./reel.module.css";

// The video tab's live preview: the same stage the site plays, redrawn as the reel is
// edited, with a timeline in beats that shows the music's sections under the scenes.

const fmt = (t: number) => {
  const s = Math.max(0, Math.floor(t + 1e-6));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function ReelPreview({
  doc,
  track,
  selectedId,
  onSelect,
}: {
  doc: ReelDoc;
  track: ReelTrack;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const { t, playing, play, stop, seek, onReady } = useReelPlayback(doc, track);
  const beat = beatLength(track);
  const toBeat = (time: number) => Math.max(0, (time - track.t0) / beat);
  const duration = beatTime(track, doc.end);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Picking a scene shows it with its content in: two beats into it.
  const sorted = useMemo(() => ({ ...doc, scenes: [...doc.scenes].sort((a, b) => a.at - b.at) }), [doc]);
  const scenes = sorted.scenes;
  const selected = scenes.find((s) => s.id === selectedId);
  const selectedAt = selected?.at;
  useEffect(() => {
    if (selectedAt === undefined) return;
    seek(beatTime(track, selectedAt + 2));
  }, [selectedAt, seek, track]);

  const pct = (b: number) => `${(Math.min(b, doc.end) / doc.end) * 100}%`;
  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return beatTime(track, ((event.clientX - rect.left) / rect.width) * doc.end);
  };

  return (
    <aside className={`${styles.panel} ${r.preview}`} aria-label="Prévia do vídeo">
      <span className={styles.previewLabel}>Prévia</span>
      <div ref={boxRef} className={r.screen} style={{ height: scale ? 1080 * scale : undefined }}>
        {scale > 0 ? <ReelStage doc={sorted} track={track} scale={scale} reducedMotion={false} onReady={onReady} /> : null}
      </div>
      <div className={r.controls}>
        <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => (playing ? stop() : play(t))}>
          {playing ? "Pausar" : "Tocar"}
        </button>
        {selected ? (
          <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={() => play(beatTime(track, Math.max(0, selected.at - 1)))}>
            Tocar a cena
          </button>
        ) : null}
        <span className={r.time}>
          {fmt(t)} / {fmt(duration)} · batida {Math.floor(toBeat(t))}
        </span>
      </div>
      <div
        className={r.timeline}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          seek(fromPointer(e));
        }}
      >
        <div className={r.music} aria-label="Partes da música">
          {track.sections.filter((s) => s.beat < doc.end).map((s, i, list) => (
            <span
              key={i}
              className={r.section}
              data-tone={s.tone}
              style={{ left: pct(s.beat), width: `calc(${pct((list[i + 1]?.beat ?? doc.end))} - ${pct(s.beat)})` }}
              title={`${s.label} · batida ${s.beat}`}
            >
              {s.label}
            </span>
          ))}
        </div>
        <div className={r.scenes}>
          {scenes.map((s, i) => {
            const end = scenes[i + 1]?.at ?? doc.end;
            return (
              <button
                key={s.id}
                type="button"
                className={r.segment}
                aria-pressed={s.id === selectedId}
                style={{ left: pct(s.at), width: `calc(${pct(end)} - ${pct(s.at)})` }}
                onClick={() => onSelect(s.id)}
                title={`${kindLabel(s.kind)} · batida ${s.at}`}
              >
                {kindLabel(s.kind)}
              </button>
            );
          })}
        </div>
        <span className={r.playhead} style={{ left: pct(toBeat(t)) }} aria-hidden />
      </div>
      <p className={styles.hint} style={{ padding: "0 14px 14px", margin: 0 }}>
        Clique na linha do tempo para ir a um ponto. As faixas de cima são as partes da música: comece cenas fortes nos drops.
      </p>
    </aside>
  );
}

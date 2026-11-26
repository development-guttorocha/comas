"use client";

import { useMemo, useState } from "react";
import { beatTime, type ReelTrack } from "@/lib/reel/tracks";
import type { ReelDoc, ReelScene } from "@/lib/reel/types";
import {
  SCENE_KINDS,
  fromForm,
  kindLabel,
  newReel,
  newScene,
  reelFields,
  reelFromForm,
  reelToForm,
  sceneFields,
  toForm,
  type SceneKind,
} from "@/lib/reel/sceneFields";
import { Fields } from "./Fields";
import { CopyIcon, PlusIcon, TrashIcon } from "./icons";
import ReelPreview from "./ReelPreview";
import styles from "./admin.module.css";
import r from "./reel.module.css";

// The case's video: general settings, the scenes as forms, and the live preview. The reel
// is saved with the case (the editor's Salvar), as content/cases/<slug>/reel.json.

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const byBeat = (scenes: ReelScene[]) => [...scenes].sort((a, b) => a.at - b.at);

function uniqueId(scenes: ReelScene[], kind: string) {
  const ids = new Set(scenes.map((s) => s.id));
  let n = 1;
  while (ids.has(`${kind}-${n}`)) n++;
  return `${kind}-${n}`;
}

export default function ReelEditor({
  reel,
  onChange,
  accent,
  company,
  tracks,
}: {
  reel: ReelDoc | null;
  onChange: (reel: ReelDoc | null) => void;
  accent: string;
  company: string;
  tracks: ReelTrack[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(reel?.scenes[0]?.id ?? null);
  const [addKind, setAddKind] = useState<SceneKind>("title");
  const track = reel ? tracks.find((t) => t.id === reel.track) ?? tracks[0] ?? null : null;
  const settings = useMemo(() => (reel ? reelToForm(reel) : {}), [reel]);

  if (!reel || !track) {
    return (
      <section className={`${styles.panel} ${r.empty}`}>
        <h2>Este case ainda não tem vídeo</h2>
        <p className={styles.hint}>
          O vídeo aparece na página do case, logo abaixo da capa, e toca com música. Ele começa como rascunho: só vai para o site quando você ligar “Mostrar no site” e salvar. Ele é montado com cenas prontas: você escolhe o tipo, escreve os textos e
          ajusta em que batida da música cada uma começa.
        </p>
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => {
          const created = newReel(accent, `${company} em 1 minuto`, tracks[0]?.id ?? "");
          onChange(created);
          setSelectedId(created.scenes[0].id);
        }}>
          <PlusIcon />
          Criar vídeo
        </button>
      </section>
    );
  }

  const setScenes = (scenes: ReelScene[]) => onChange({ ...reel, scenes: byBeat(scenes) });
  const updateScene = (id: string, next: ReelScene) => setScenes(reel.scenes.map((s) => (s.id === id ? next : s)));
  const select = (id: string) => setSelectedId((cur) => (cur === id ? null : id));

  const add = () => {
    const sorted = byBeat(reel.scenes);
    const index = sorted.findIndex((s) => s.id === selectedId);
    const after = index >= 0 ? sorted[index] : sorted[sorted.length - 1];
    const next = index >= 0 ? sorted[index + 1] : undefined;
    // halfway to the next scene, on a bar; or 8 beats after the last one
    const at = after ? (next ? Math.max(after.at + 4, Math.round((after.at + next.at) / 8) * 4) : after.at + 8) : 0;
    const scene = newScene(addKind, at, uniqueId(reel.scenes, addKind));
    onChange({ ...reel, scenes: byBeat([...reel.scenes, scene]), end: Math.max(reel.end, at + 8) });
    setSelectedId(scene.id);
  };

  const duplicate = (scene: ReelScene) => {
    const copy = { ...structuredClone(scene), id: uniqueId(reel.scenes, scene.kind), at: scene.at + 4, chapter: undefined };
    setScenes([...reel.scenes, copy]);
    setSelectedId(copy.id);
  };

  const remove = (scene: ReelScene) => {
    if (reel.scenes.length === 1) return;
    setScenes(reel.scenes.filter((s) => s.id !== scene.id));
    if (selectedId === scene.id) setSelectedId(null);
  };

  const scenes = byBeat(reel.scenes);
  const ids = new Map<string, number>();
  scenes.forEach((s) => ids.set(s.id, (ids.get(s.id) ?? 0) + 1));

  return (
    <div className={r.layout}>
      <div className={styles.page} style={{ gap: 12 }}>
        <section className={`${styles.panel} ${styles.formPanel}`}>
          <div className={r.panelHead}>
            <div>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Vídeo do case
                {reel.draft ? <span className={styles.chip} data-tone="warn">Rascunho, fora do site</span> : <span className={styles.chip} data-tone="good">No site</span>}
              </h2>
              <p className={styles.hint} style={{ margin: "2px 0 0" }}>
                {scenes.length} cenas · {fmt(beatTime(track, reel.end))} · música {track.title}, {track.bpm} BPM
              </p>
            </div>
            <label className={r.publish}>
              <span>Mostrar no site</span>
              <input
                type="checkbox"
                className={styles.switch}
                checked={!reel.draft}
                onChange={(e) => {
                  const next = { ...reel };
                  if (e.target.checked) delete next.draft;
                  else next.draft = true;
                  onChange(next);
                }}
              />
            </label>
            <button
              type="button"
              className={`${styles.button} ${styles.ghost} ${styles.small} ${styles.danger}`}
              onClick={() => {
                if (window.confirm("Remover o vídeo deste case? Ao salvar, o arquivo do vídeo é apagado (fica uma cópia no histórico).")) onChange(null);
              }}
            >
              <TrashIcon />
              Remover vídeo
            </button>
          </div>
          <Fields defs={reelFields(tracks)} values={settings} onChange={(v) => onChange(reelFromForm(reel, v))} />
        </section>

        <ol className={r.sceneList}>
          {scenes.map((scene, i) => {
            const open = scene.id === selectedId;
            const nextAt = scenes[i + 1]?.at ?? reel.end;
            const length = nextAt - scene.at;
            const warn = length <= 0 ? "Começa depois da próxima cena" : ids.get(scene.id)! > 1 ? "Identificador repetido" : scene.at >= reel.end ? "Começa depois do fim do vídeo" : "";
            return (
              <li key={scene.id} className={`${styles.panel} ${r.scene}`} data-open={open}>
                <button type="button" className={r.sceneHead} aria-expanded={open} onClick={() => select(scene.id)}>
                  <span className={r.sceneIndex}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={r.sceneName}>
                    <strong>{kindLabel(scene.kind)}</strong>
                    {scene.chapter ? <span className={styles.chip}>{scene.chapter}</span> : null}
                  </span>
                  <span className={r.sceneMeta}>
                    batida {scene.at} · {fmt(beatTime(track, scene.at))} · {length} batidas
                  </span>
                  {warn ? <span className={styles.chip} data-tone="warn">{warn}</span> : null}
                </button>
                {open ? (
                  <div className={r.sceneBody}>
                    <Fields defs={sceneFields(scene.kind)} values={toForm(scene)} onChange={(v) => {
                      const next = fromForm(v);
                      updateScene(scene.id, next);
                      if (next.id !== scene.id) setSelectedId(next.id);
                    }} />
                    <div className={r.sceneActions}>
                      <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => duplicate(scene)}>
                        <CopyIcon />
                        Duplicar
                      </button>
                      <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small} ${styles.danger}`} disabled={scenes.length === 1} onClick={() => remove(scene)}>
                        <TrashIcon />
                        Remover cena
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>

        <section className={`${styles.panel} ${r.adder}`}>
          <label className={styles.field} style={{ flex: 1 }}>
            <span className={styles.label}>Nova cena {selectedId ? "depois da cena aberta" : "no fim"}</span>
            <select className={styles.select} value={addKind} onChange={(e) => setAddKind(e.target.value as SceneKind)}>
              {SCENE_KINDS.map((k) => (
                <option key={k.kind} value={k.kind}>
                  {k.label}: {k.description}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={styles.button} onClick={add}>
            <PlusIcon />
            Adicionar cena
          </button>
        </section>
      </div>
      <div className={r.side}>
        <ReelPreview doc={reel} track={track} selectedId={selectedId} onSelect={(id) => setSelectedId(id)} />
      </div>
    </div>
  );
}

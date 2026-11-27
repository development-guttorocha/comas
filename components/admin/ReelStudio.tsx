"use client";
/* eslint-disable @next/next/no-img-element -- admin thumbnails of local files. */

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import ReelStage from "@/components/reel/ReelStage";
import { STAGE_SIZE } from "@/components/reel/motion";
import { defaultBeats, insertScene, moveScene, removeScene, resizeScene, sceneLengths, trackBeats, BAR, MAX_BEATS, MIN_BEATS } from "@/lib/reel/layout";
import { FOCUS_X } from "@/lib/reel/screens";
import { SCENE_KINDS, fromForm, kindLabel, newReel, newScene, simpleFields, toForm, trackLabel, type SceneKind } from "@/lib/reel/sceneFields";
import { beatLength, beatTime, type ReelTrack } from "@/lib/reel/tracks";
import { PERSONALITY_LABEL, type Personality } from "@/components/reel/motion";
import { DIRECTIONS, TRANSITIONS, transitionLabel } from "@/components/reel/transitions";
import { AUDIENCE_OPTIONS, DEFAULT_PARAMS, FOCUS_OPTIONS, PERSONALITY_OPTIONS, SECONDS_OPTIONS, type ReelParams } from "@/lib/reel/params";
import { REEL_DISPLAYS, type ReelAspect, type ReelDisplay, type ReelDoc, type ReelScene, type ScreensScene } from "@/lib/reel/types";
import BusyOverlay from "./BusyOverlay";
import { api } from "./client";
import { Fields } from "./Fields";
import { CopyIcon, PlusIcon, SparkIcon, TrashIcon } from "./icons";
import ReelEditor from "./ReelEditor";
import { useReelPlayback } from "./useReelPlayback";
import styles from "./admin.module.css";
import s from "./studio.module.css";

const ACCENT_SWATCHES = [
  { name: "Roxo", hex: "#3E2A8D" },
  { name: "Mostarda", hex: "#E5B314" },
  { name: "Bordô", hex: "#7F1C21" },
  { name: "Rosa", hex: "#D94B82" },
  { name: "Terracota", hex: "#C93B17" },
] as const;

// The video tab's simple editor: a big preview with its controls, the open scene's texts and
// images on the side, and a timeline where scenes are clips (drag to reorder, pull the edge to
// change the length) above the music. Timing follows the order on its own; the AI drafts the
// whole video; the advanced editor stays one click away.

const fmt = (t: number) => `${Math.floor(Math.max(0, t) / 60)}:${String(Math.floor(Math.max(0, t) % 60)).padStart(2, "0")}`;
const thumb = (src: string) => `/_next/image?url=${encodeURIComponent(src)}&w=384&q=75`;
const MODE_KEY = "admin.reel.mode";
const PARAMS_KEY = "admin.reel.params";
const UPLOAD_VALUE = "__upload__";
const LIBRARY_VALUE = "__library__";

type LibrarySong = { id: string; title: string; artist: string; meta: string; preview: string };
type LibrarySource = "freetouse" | "youtube";
type LibraryCategory = { id: string; name: string; type: "Genre" | "Mood" };
type LibraryPage = { songs: LibrarySong[]; total: number; next: number | null; categories?: LibraryCategory[] };

/**
 * Search a music library, hear a song, add it: it is downloaded once and measured like an
 * upload. Free To Use first (words, genre or mood); the YouTube Audio Library is the fallback,
 * and the dialog switches to it on its own when Free To Use doesn't answer.
 */
function LibraryDialog({ onAdd, onClose }: { onAdd: (source: LibrarySource, id: string) => Promise<boolean>; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [source, setSource] = useState<LibrarySource>("freetouse");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [result, setResult] = useState<LibraryPage | null>(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const [fellBack, setFellBack] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => audio.current?.pause();
  }, []);
  const address = (offset: number) =>
    `/api/admin/reel-tracks/library?source=${source}&q=${encodeURIComponent(q)}${source === "freetouse" && category ? `&category=${category}` : ""}&offset=${offset}`;
  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(async () => {
      try {
        const data = await api<LibraryPage>(address(0));
        if (!alive) return;
        setResult(data);
        if (data.categories) setCategories(data.categories);
        setError("");
      } catch (e) {
        if (!alive) return;
        // Free To Use is down or refused: the YouTube list takes over
        if (source === "freetouse") {
          setFellBack(true);
          setSource("youtube");
        } else setError((e as Error).message);
      }
    }, 250);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, source]);
  const loadMore = async () => {
    if (result?.next == null) return;
    setMore(true);
    try {
      const data = await api<LibraryPage>(address(result.next));
      setResult((r) => (r ? { ...data, songs: [...r.songs, ...data.songs.filter((x) => !r.songs.some((y) => y.id === x.id))] } : data));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMore(false);
    }
  };
  const pick = (next: LibrarySource) => {
    audio.current?.pause();
    setPlaying(null);
    setResult(null);
    setError("");
    setSource(next);
  };
  const toggle = (song: LibrarySong) => {
    if (playing === song.id) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    audio.current?.pause();
    const a = new Audio(song.preview);
    a.onended = () => setPlaying(null);
    void a.play().catch(() => setPlaying(null));
    audio.current = a;
    setPlaying(song.id);
  };
  const group = (type: LibraryCategory["type"]) => categories.filter((c) => c.type === type);
  return (
    <dialog ref={ref} className={s.dialog} onCancel={(e) => { e.preventDefault(); onClose(); }} aria-labelledby="lib-title">
      <div className={s.libraryBody}>
        <h2 id="lib-title">♫ Buscar música</h2>
        <div className={s.librarySources} role="tablist" aria-label="Biblioteca">
          <button type="button" role="tab" aria-selected={source === "freetouse"} onClick={() => pick("freetouse")}>Free To Use</button>
          <button type="button" role="tab" aria-selected={source === "youtube"} onClick={() => pick("youtube")}>YouTube (reserva)</button>
        </div>
        <div className={s.librarySearch}>
          <input className={styles.input} autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={source === "freetouse" ? "Buscar: piano, corporate, lofi, um artista…" : "Buscar pelo nome: piano, upbeat, sunday…"} aria-label="Buscar música" />
          {source === "freetouse" && categories.length ? (
            <select className={styles.input} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Gênero ou clima">
              <option value="">Todos os gêneros e climas</option>
              <optgroup label="Clima">{group("Mood").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
              <optgroup label="Gênero">{group("Genre").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
            </select>
          ) : null}
        </div>
        <p className={styles.hint} style={{ margin: 0 }}>
          {error ||
            (fellBack && source === "youtube" ? "A Free To Use não respondeu agora; mostrando a biblioteca do YouTube. " : "") +
              (result ? `${result.total.toLocaleString("pt-BR")} ${q || category ? "encontradas" : "músicas"}${result.next != null ? `, mostrando ${result.songs.length}` : ""}.` : error ? "" : "Carregando…")}
        </p>
        <ul className={s.libraryList}>
          {result?.songs.map((song) => (
            <li key={song.id}>
              <button type="button" className={s.ctrl} onClick={() => toggle(song)} aria-label={playing === song.id ? `Parar ${song.title}` : `Ouvir ${song.title}`}>
                {playing === song.id ? (
                  <svg viewBox="0 0 24 24" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
                )}
              </button>
              <span className={s.librarySong}>
                <span>{song.title}{song.artist ? <em> · {song.artist}</em> : null}</span>
                {song.meta ? <small>{song.meta}</small> : null}
              </span>
              <button
                type="button"
                className={`${styles.button} ${styles.small}`}
                disabled={adding !== null}
                onClick={async () => {
                  audio.current?.pause();
                  setPlaying(null);
                  setAdding(song.id);
                  const ok = await onAdd(source, song.id);
                  setAdding(null);
                  if (ok) onClose();
                }}
              >
                {adding === song.id ? "Analisando…" : "Adicionar"}
              </button>
            </li>
          ))}
          {result?.next != null ? (
            <li className={s.libraryMore}>
              <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} disabled={more} onClick={() => void loadMore()}>
                {more ? "Carregando…" : "Carregar mais"}
              </button>
            </li>
          ) : null}
        </ul>
        <p className={styles.hint} style={{ margin: 0 }}>
          {source === "freetouse"
            ? "Só faixas gratuitas (as premium ficam de fora). O crédito que a Free To Use pede sai sozinho, discreto, na linha de música embaixo do vídeo."
            : "Lista não oficial do YouTube. A licença varia por música e o uso fora do YouTube não é garantido; confira a faixa no YouTube Studio antes de publicar."}
        </p>
        <div className={s.dialogActions}>
          <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={onClose}>Fechar</button>
        </div>
      </div>
    </dialog>
  );
}

/** Music picker with "Enviar nova música…": the upload comes back measured and gets picked. */
function TrackSelect({ tracks, value, onChange, onUpload, onLibrary, label = "Música", socialMode }: { tracks: ReelTrack[]; value?: string; onChange: (id: string) => void; onUpload: (file: File) => Promise<ReelTrack | null>; onLibrary: () => Promise<ReelTrack | null>; label?: string; socialMode?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <label className={s.toolField}>
      <span>{label}</span>
      <select
        className={styles.select}
        value={value ?? tracks[0]?.id ?? ""}
        onChange={(e) => {
          if (e.target.value === UPLOAD_VALUE) input.current?.click();
          else if (e.target.value === LIBRARY_VALUE) void onLibrary().then((t) => t && onChange(t.id));
          else onChange(e.target.value);
        }}
      >
        {tracks.map((x) => (
          <option key={x.id} value={x.id}>{trackLabel(x)}</option>
        ))}
        {!socialMode ? (
          <>
            <option value={UPLOAD_VALUE}>＋ Enviar nova música…</option>
            <option value={LIBRARY_VALUE}>♫ Buscar música (Free To Use, YouTube)…</option>
          </>
        ) : null}
      </select>
      {!socialMode ? (
        <input
          ref={input}
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.aif,.aiff"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const added = await onUpload(file);
            if (added) onChange(added.id);
          }}
        />
      ) : null}
    </label>
  );
}

/** What to ask of the AI: every field has a default, so Gerar works untouched. */
function GenerateDialog({ tracks, current, replacing, socialMode, onUpload, onLibrary, onCancel, onGenerate }: { tracks: ReelTrack[]; current?: string; replacing: boolean; socialMode?: boolean; onUpload: (file: File) => Promise<ReelTrack | null>; onLibrary: () => Promise<ReelTrack | null>; onCancel: () => void; onGenerate: (p: ReelParams) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [p, setP] = useState<ReelParams>(() => {
    let saved: Partial<ReelParams> = {};
    try { saved = JSON.parse(localStorage.getItem(PARAMS_KEY) || "{}"); } catch { /* fine */ }
    return { ...DEFAULT_PARAMS, ...saved, track: current ?? saved.track ?? tracks[0]?.id };
  });
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const set = <K extends keyof ReelParams>(k: K, v: ReelParams[K]) => setP((x) => ({ ...x, [k]: v }));
  const chosenTrack = tracks.find((t) => t.id === p.track);
  const maxSeconds = chosenTrack ? Math.floor(chosenTrack.length - chosenTrack.t0) : 75;
  return (
    <dialog ref={ref} className={s.dialog} onCancel={(e) => { e.preventDefault(); onCancel(); }} aria-labelledby="gen-title">
      <form method="dialog" onSubmit={(e) => { e.preventDefault(); onGenerate(p); }}>
        <h2 id="gen-title"><SparkIcon />{socialMode ? "Criar roteiro de Reel com IA" : "Gerar vídeo com IA"}</h2>
        <p className={styles.hint}>
          {socialMode
            ? "Conte o tema do vídeo e a IA monta as cenas verticais (9:16) sincronizadas na música. Você pode editar cada texto e imagem depois."
            : "A IA lê o case e monta o roteiro com estas escolhas. Tudo continua editável depois, sem gastar IA."}
        </p>
        <div className={s.dialogGrid}>
          <label className={s.toolField}>
            <span>Duração</span>
            <select className={styles.select} value={p.seconds} onChange={(e) => set("seconds", Number(e.target.value))}>
              {SECONDS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} disabled={o.value > maxSeconds}>{o.label}{o.value > maxSeconds ? " (música curta)" : ""}</option>
              ))}
            </select>
          </label>
          <TrackSelect tracks={tracks} value={p.track} onChange={(id) => set("track", id)} onUpload={onUpload} onLibrary={onLibrary} socialMode={socialMode} />
          <label className={s.toolField}>
            <span>Movimento</span>
            <select className={styles.select} value={p.personality} onChange={(e) => set("personality", e.target.value as ReelParams["personality"])}>
              {PERSONALITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}: {o.hint}</option>
              ))}
            </select>
          </label>
          {!socialMode ? (
            <>
              <label className={s.toolField}>
                <span>Foco da história</span>
                <select className={styles.select} value={p.focus} onChange={(e) => set("focus", e.target.value as ReelParams["focus"])}>
                  {FOCUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label className={s.toolField}>
                <span>Para quem</span>
                <select className={styles.select} value={p.audience} onChange={(e) => set("audience", e.target.value as ReelParams["audience"])}>
                  {AUDIENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          <label className={`${s.toolField} ${s.dialogWide}`}>
            <span>{socialMode ? "Tema ou ideia do Reel" : "Pedidos para a IA (opcional)"}</span>
            <textarea
              className={styles.textarea}
              rows={3}
              value={p.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder={
                socialMode
                  ? "Ex.: 3 erros que derrubam a nota na introdução do ENEM; tom acolhedor e prático."
                  : "Ex.: abrir com o resultado; não usar a foto da equipe; destacar a pesquisa com os creators."
              }
            />
          </label>
        </div>
        {replacing ? (
          <p className={styles.hint} style={{ margin: 0 }}>
            {socialMode
              ? "A proposta nova aparece ao lado do vídeo atual para você comparar antes de aplicar."
              : "O rascunho novo substitui o vídeo atual na tela e é salvo sozinho. O vídeo de antes fica em Versões."}
          </p>
        ) : null}
        <div className={s.dialogActions}>
          <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={onCancel}>Cancelar</button>
          <button type="submit" className={`${styles.button} ${styles.primary}`}><SparkIcon />Gerar</button>
        </div>
      </form>
    </dialog>
  );
}

/** The picture a scene's clip shows, if it has one. */
function sceneImage(scene: ReelScene): string | undefined {
  switch (scene.kind) {
    case "title": return scene.image;
    case "list": return scene.image;
    case "image": return scene.src;
    case "quote": return scene.photo;
    case "compare": return scene.after.src || scene.before.src;
    case "screens": return scene.boards?.find((b) => b.src)?.src ?? scene.shots?.find((x) => x.src)?.src;
    default: return undefined;
  }
}

/** The first words a scene shows, for its clip. */
function sceneText(scene: ReelScene): string {
  const strip = (v?: string) => (v ?? "").replace(/\*/g, "").replace(/\n/g, " ");
  switch (scene.kind) {
    case "title": case "end": return strip(scene.lines?.join(" "));
    case "image": return strip(scene.lines?.join(" ")) || "";
    case "flow": case "list": case "cards": return strip(scene.heading);
    case "number": return `${scene.prefix ?? ""}${scene.value} ${scene.suffix ?? ""}`;
    case "metrics": return scene.value;
    case "screens": return strip(scene.title);
    case "compare": return `${scene.before.label} → ${scene.after.label}`;
    case "quote": return strip(scene.quote);
    case "role": return strip(scene.heading);
    case "delta": return `${scene.before?.value ?? ""} → ${scene.after?.value ?? ""} ${scene.suffix ?? ""}`;
  }
}

/** Manual camera shots as boards: each cut to a board, aimed at the screen of its next move. */
function boardsFromShots(scene: ScreensScene): NonNullable<ScreensScene["boards"]> {
  return scene.shots.flatMap((shot, i) => {
    if (!shot.src) return [];
    const x = scene.shots[i + 1] && !scene.shots[i + 1].src ? scene.shots[i + 1].cam[1] : 960;
    const focus = (Object.entries(FOCUS_X) as [keyof typeof FOCUS_X, number][]).reduce((a, b) => (Math.abs(b[1] - x) < Math.abs(a[1] - x) ? b : a))[0];
    return [{ src: shot.src, focus }];
  });
}

// ── music waveform, decoded once per file ────────────────────────────────────
const peaksCache = new Map<string, Promise<number[]>>();
function loadPeaks(src: string, length: number, bins = 900): Promise<number[]> {
  if (!peaksCache.has(src)) {
    peaksCache.set(
      src,
      (async () => {
        const data = await (await fetch(src)).arrayBuffer();
        const ctx = new AudioContext();
        const audio = await ctx.decodeAudioData(data);
        void ctx.close();
        const ch = audio.getChannelData(0);
        const per = Math.floor((audio.sampleRate * length) / bins);
        const out: number[] = [];
        for (let i = 0; i < bins; i++) {
          let peak = 0;
          for (let j = i * per; j < (i + 1) * per && j < ch.length; j += 16) peak = Math.max(peak, Math.abs(ch[j]));
          out.push(peak);
        }
        const max = Math.max(...out, 0.001);
        return out.map((v) => v / max);
      })(),
    );
  }
  return peaksCache.get(src)!;
}

function Waveform({ track, end, width }: { track: ReelTrack; end: number; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadPeaks(track.src, track.length).then((p) => alive && setPeaks(p)).catch(() => {});
    return () => { alive = false; };
  }, [track.src, track.length]);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !peaks || !width) return;
    const dpr = window.devicePixelRatio || 1;
    const h = 40;
    cv.width = Math.round(width * dpr);
    cv.height = h * dpr;
    const g = cv.getContext("2d");
    if (!g) return;
    g.scale(dpr, dpr);
    g.clearRect(0, 0, width, h);
    g.fillStyle = "rgba(91, 70, 229, 0.38)";
    const seconds = beatTime(track, end);
    const bars = Math.floor(width / 3);
    for (let i = 0; i < bars; i++) {
      const t = (i / bars) * seconds;
      const v = peaks[Math.min(peaks.length - 1, Math.floor((t / track.length) * peaks.length))] ?? 0;
      const bh = Math.max(2, v * (h - 6));
      g.fillRect(i * 3, (h - bh) / 2, 2, bh);
    }
  }, [peaks, width, end, track]);
  return <canvas ref={ref} className={s.wave} style={{ width, height: 40 }} aria-hidden />;
}

// ── the studio ───────────────────────────────────────────────────────────────

/** A new video from the AI while the case already has one: it waits for Gutto's choice (audit R5). */
export type ReelProposal = { at: string; reel: ReelDoc; tokens: number };

export default function ReelStudio({
  slug,
  reel,
  onChange,
  accent,
  company,
  notify,
  tracks: initialTracks,
  proposal,
  onProposal,
  undo,
  onUndo,
  generateUrl,
  socialMode,
}: {
  slug: string;
  reel: ReelDoc | null;
  onChange: (reel: ReelDoc | null) => void;
  accent: string;
  company: string;
  notify: (message: unknown, tone?: "good" | "bad") => void;
  tracks: ReelTrack[];
  /** Kept by the editor, so a proposal survives a tab change. */
  proposal: ReelProposal | null;
  onProposal: (proposal: ReelProposal | null) => void;
  /** The video as it was before the AI's went in, for "Desfazer IA". */
  undo: ReelDoc | null;
  onUndo: (reel: ReelDoc | null) => void;
  /** Optional custom AI endpoint (e.g. /api/social/generate) when used outside local Cases. */
  generateUrl?: string;
  /** Hides portfolio-only controls and defaults to 9:16 vertical Reels. */
  socialMode?: boolean;
}) {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [generating, setGenerating] = useState(false);
  const [asking, setAsking] = useState(false);
  const [tracks, setTracks] = useState(initialTracks);
  const [uploading, setUploading] = useState(false);

  // the music search dialog answers the picker that opened it
  const [library, setLibrary] = useState<((t: ReelTrack | null) => void) | null>(null);
  const openLibrary = () => new Promise<ReelTrack | null>((resolve) => setLibrary(() => resolve));
  const addFromLibrary = async (source: LibrarySource, id: string) => {
    try {
      const { track } = await api<{ track: ReelTrack }>("/api/admin/reel-tracks/library", { method: "POST", body: { id, source } });
      setTracks((list) => [...list, track]);
      const from = source === "youtube" ? "da biblioteca do YouTube" : "da Free To Use";
      notify(track.steady === false
        ? `“${track.title}” adicionada ${from}. Sem batida marcada: as cenas vão acompanhar a energia da música.`
        : `“${track.title}” adicionada ${from}: ${track.bpm} BPM.${source === "youtube" ? " Confira a licença dela antes de publicar." : ""}`);
      library?.(track);
      return true;
    } catch (error) {
      notify(error);
      return false;
    }
  };

  /** Sends a song to the library: it comes back measured and trimmed. */
  const uploadTrack = async (file: File): Promise<ReelTrack | null> => {
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const { track } = await api<{ track: ReelTrack }>("/api/admin/reel-tracks", { method: "POST", body: form });
      setTracks((list) => [...list, track]);
      const parts = [...new Set(track.sections.map((x) => x.label))].join(", ");
      notify(track.steady === false
        ? `“${track.title}” adicionada. Ela não tem batida marcada: as cenas vão acompanhar a energia da música (${parts}).`
        : `“${track.title}” adicionada: ${track.bpm} BPM, partes encontradas: ${parts}.`);
      return track;
    } catch (error) {
      notify(error);
      return null;
    } finally {
      setUploading(false);
    }
  };
  useEffect(() => {
    if (socialMode) return;
    try {
      if (localStorage.getItem(MODE_KEY) === "advanced") setMode("advanced");
    } catch { /* storage off: simple */ }
  }, [socialMode]);
  const switchMode = (next: "simple" | "advanced") => {
    setMode(next);
    try { localStorage.setItem(MODE_KEY, next); } catch { /* fine */ }
  };

  const generate = async (params: ReelParams) => {
    setAsking(false);
    try { localStorage.setItem(PARAMS_KEY, JSON.stringify({ ...params, notes: undefined })); } catch { /* fine */ }
    setGenerating(true);
    try {
      const endpoint = generateUrl ?? `/api/admin/cases/${slug}/reel`;
      const result = await api<{ reel: ReelDoc; tokens: number }>(endpoint, { method: "POST", body: params });
      const generatedReel: ReelDoc = socialMode ? { ...result.reel, aspect: result.reel.aspect ?? "9:16" } : result.reel;
      const motion = generatedReel.motion ? ` · movimento ${PERSONALITY_LABEL[generatedReel.motion].toLowerCase()}` : "";
      if (reel?.scenes.length) {
        // The case already has a video: the new one waits next to it, and the current one stays until Gutto picks.
        onProposal({ at: new Date().toISOString(), reel: generatedReel, tokens: result.tokens });
        setViewing("proposal");
        notify(`A IA propôs um vídeo novo: ${generatedReel.scenes.length} cenas${motion}. O atual continua até você escolher.`);
      } else {
        onChange(generatedReel);
        notify(`Rascunho pronto: ${generatedReel.scenes.length} cenas${motion}.`);
      }
    } catch (error) {
      notify(error);
    } finally {
      setGenerating(false);
    }
  };

  // While a proposal waits, the studio shows it or the current video; edits go to the one on screen.
  const [viewing, setViewing] = useState<"proposal" | "current">("proposal");
  const showing = proposal && viewing === "proposal" ? proposal.reel : reel;
  const edit = (next: ReelDoc | null) => (proposal && viewing === "proposal" ? (next ? onProposal({ ...proposal, reel: next }) : undefined) : onChange(next));
  const useProposal = () => {
    if (!proposal) return;
    onUndo(reel);
    onChange(proposal.reel);
    onProposal(null);
    setViewing("current");
    notify("O vídeo da IA entrou no lugar do anterior. Se não quiser, use Desfazer IA.");
  };
  const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const aiBar = proposal ? (
    <div className={`${styles.panel} ${s.aiBar}`} role="status">
      <span className={s.aiTitle}><SparkIcon />Proposta da IA <span>{proposal.reel.scenes.length} cenas · {when(proposal.at)}</span></span>
      <div className={s.aiView} role="group" aria-label="Mostrar">
        <button type="button" aria-pressed={viewing === "proposal"} onClick={() => setViewing("proposal")}>Proposta</button>
        <button type="button" aria-pressed={viewing === "current"} onClick={() => setViewing("current")}>Vídeo atual</button>
      </div>
      <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={() => { onProposal(null); setViewing("current"); }}>Ignorar</button>
      <button type="button" className={styles.button} onClick={useProposal}>Usar tudo</button>
    </div>
  ) : undo ? (
    <div className={`${styles.panel} ${s.aiBar}`}>
      <span className={s.aiTitle}>O vídeo da IA entrou no lugar do anterior, que ficou guardado.</span>
      <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => { onChange(undo); onUndo(null); notify("A IA foi desfeita: o vídeo voltou a como estava."); }}>Desfazer IA</button>
      <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={() => onUndo(null)}>Ok</button>
    </div>
  ) : null;

  const busy = (
    <>
      <BusyOverlay label={generating ? (socialMode ? "A IA está montando as cenas verticais (9:16) do seu Reel…" : "A IA está escrevendo e revisando o roteiro a partir do case. Leva de dois a três minutos…") : uploading ? "Analisando a música: andamento, batidas e partes…" : ""} />
      {asking ? <GenerateDialog tracks={tracks} current={reel?.track} replacing={Boolean(reel?.scenes.length)} socialMode={socialMode} onUpload={uploadTrack} onLibrary={openLibrary} onCancel={() => setAsking(false)} onGenerate={(p) => void generate(p)} /> : null}
      {library ? (
        <LibraryDialog
          onAdd={addFromLibrary}
          onClose={() => {
            library(null);
            setLibrary(null);
          }}
        />
      ) : null}
    </>
  );

  if (!reel) {
    return (
      <section className={`${styles.panel} ${s.empty}`}>
        <span className={s.emptyIcon}><SparkIcon /></span>
        <h2>{socialMode ? "Crie seu primeiro Reel vertical (9:16)" : "Crie o vídeo deste case"}</h2>
        <p className={styles.hint}>
          {socialMode
            ? "A IA cria um roteiro em formato vertical para Instagram Reels já sincronizado na música. Depois você edita cada cena, cor, texto e imagem aqui mesmo."
            : "A IA lê o texto e as imagens do case e monta um vídeo de cerca de um minuto, com cenas encaixadas na música. Depois você ajusta os textos, as imagens e a ordem aqui mesmo, sem precisar da IA. O vídeo começa como rascunho e só vai para o site quando você quiser."}
        </p>
        <div className={s.emptyActions}>
          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => setAsking(true)}>
            <SparkIcon />
            Gerar com IA
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => onChange({ ...newReel(accent, socialMode ? `Reel · ${company}` : `${company} em 1 minuto`, tracks[0]?.id ?? ""), aspect: socialMode ? "9:16" : "16:9" })}
          >
            Começar do zero
          </button>
        </div>
        {busy}
      </section>
    );
  }

  if (!socialMode && mode === "advanced") {
    return (
      <div className={styles.page} style={{ gap: 12 }}>
        {aiBar}
        <div className={s.modeBar}>
          <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => switchMode("simple")}>← Editor simples</button>
          <span className={styles.hint}>Modo avançado: batidas, câmeras e tempos de cada elemento.</span>
        </div>
        <ReelEditor key={proposal && viewing === "proposal" ? proposal.at : "current"} reel={showing!} onChange={edit} accent={accent} company={company} tracks={tracks} />
      </div>
    );
  }

  return (
    <>
      {aiBar}
      <Studio key={proposal && viewing === "proposal" ? proposal.at : "current"} reel={showing!} tracks={tracks} socialMode={socialMode} onChange={edit} onGenerate={() => setAsking(true)} onAdvanced={() => switchMode("advanced")} onUpload={uploadTrack} onLibrary={openLibrary} />
      {busy}
    </>
  );
}

const TRANSITION_GLYPH: Partial<Record<NonNullable<ReelScene["enter"]>, string>> = {
  cut: "|", fade: "◐", push: "⇥", wipe: "▤", iris: "◯", zoom: "⤢", zoomThrough: "⊕", blinds: "▧", flash: "✦", curtain: "◧",
};
const SPEEDS = [
  { beats: 0.5, label: "Rápida" },
  { beats: 1, label: "Normal" },
  { beats: 2, label: "Lenta" },
];

/** Picks how a scene arrives: the transition, its direction and its length. */
function TransitionPicker({ scene, left, onChange, onPlay, onClose }: { scene: ReelScene; left: number; onChange: (patch: Partial<Pick<ReelScene, "enter" | "enterDir" | "enterBeats">>) => void; onPlay: () => void; onClose: () => void }) {
  const kind = scene.enter === "slide" ? "push" : scene.enter ?? "cut";
  const current = TRANSITIONS.find((t) => t.value === kind);
  return (
    <div className={s.picker} style={{ left }} role="dialog" aria-label="Transição">
      <div className={s.pickerHead}>
        <strong>Transição</strong>
        <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton}`} onClick={onClose} aria-label="Fechar">×</button>
      </div>
      <div className={s.pickerGrid} role="radiogroup" aria-label="Tipo de transição">
        {TRANSITIONS.map((t) => (
          <button key={t.value} type="button" role="radio" aria-checked={kind === t.value} className={s.pickerItem} title={t.hint} onClick={() => onChange({ enter: t.value })}>
            <span aria-hidden>{TRANSITION_GLYPH[t.value]}</span>
            {t.label}
          </button>
        ))}
      </div>
      <p className={styles.hint} style={{ margin: 0 }}>{current?.hint}</p>
      {current?.directional ? (
        <div className={s.pickerRow}>
          <span className={styles.label}>Direção</span>
          <div className={s.segmented}>
            {DIRECTIONS.map((d) => (
              <button key={d.value} type="button" aria-pressed={(scene.enterDir ?? "right") === d.value} onClick={() => onChange({ enterDir: d.value })}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {kind !== "cut" ? (
        <div className={s.pickerRow}>
          <span className={styles.label}>Duração</span>
          <div className={s.segmented}>
            {SPEEDS.map((v) => (
              <button key={v.beats} type="button" aria-pressed={(scene.enterBeats ?? 1) === v.beats} onClick={() => onChange({ enterBeats: v.beats })}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <button type="button" className={`${styles.button} ${styles.small}`} onClick={onPlay}>
        ▶ Ver a transição
      </button>
    </div>
  );
}

function Studio({ reel, tracks, socialMode, onChange, onGenerate, onAdvanced, onUpload, onLibrary }: { reel: ReelDoc; tracks: ReelTrack[]; socialMode?: boolean; onChange: (reel: ReelDoc | null) => void; onGenerate: () => void; onAdvanced: () => void; onUpload: (file: File) => Promise<ReelTrack | null>; onLibrary: () => Promise<ReelTrack | null> }) {
  const track = tracks.find((t) => t.id === reel.track) ?? tracks[0];
  const aspect: ReelAspect = reel.aspect ?? (socialMode ? "9:16" : "16:9");
  const { w: stageW, h: stageH } = STAGE_SIZE[aspect];
  const sorted = useMemo(() => ({ ...reel, aspect, scenes: [...reel.scenes].sort((a, b) => a.at - b.at) }), [reel, aspect]);
  const scenes = sorted.scenes;
  const lengths = useMemo(() => sceneLengths(sorted), [sorted]);
  const [selectedId, setSelectedId] = useState<string | null>(scenes[0]?.id ?? null);
  // a new draft (from the AI) has other scenes: open its first one
  const firstId = scenes[0]?.id ?? null;
  const hasSelected = scenes.some((x) => x.id === selectedId);
  useEffect(() => {
    if (!hasSelected) setSelectedId(firstId);
  }, [hasSelected, firstId]);
  const index = scenes.findIndex((x) => x.id === selectedId);
  const selected = index >= 0 ? scenes[index] : null;
  const { t, playing, duration, play, stop, seek, onReady } = useReelPlayback(sorted, track);
  const beat = beatLength(track);
  const maxBeats = trackBeats(track);
  // open on the cover frame, like the site's player
  const coverAt = useRef<number | null>(beatTime(track, reel.cover ?? 8));
  useEffect(() => {
    if (coverAt.current === null) return;
    seek(coverAt.current);
    coverAt.current = null;
  }, [seek]);
  const [loop, setLoop] = useState(false);

  // stage size (updates automatically when switching 9:16 <-> 16:9)
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const sync = (width: number) => {
      if (width > 0) setScale(width / stageW);
    };
    sync(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => sync(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [stageW]);

  // timeline size
  const lanesRef = useRef<HTMLDivElement>(null);
  const [laneW, setLaneW] = useState(0);
  useEffect(() => {
    const el = lanesRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setLaneW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const span = Math.max(reel.end, 32);
  const pxBeat = laneW / span;
  const xOf = (b: number) => b * pxBeat;
  const beatOfTime = (time: number) => Math.max(0, (time - track.t0) / beat);

  const sceneRange = useCallback((i: number): [number, number] => [beatTime(track, scenes[i].at), beatTime(track, scenes[i].at + lengths[i])], [lengths, scenes, track]);

  const selectScene = (id: string) => {
    setSelectedId(id);
    const i = scenes.findIndex((x) => x.id === id);
    if (i < 0) return;
    if (playing && loop) play(sceneRange(i)[0], sceneRange(i));
    // show the scene with its content in: about two thirds into it
    else if (!playing) seek(beatTime(track, scenes[i].at + Math.max(1, lengths[i] * 0.65)));
  };

  const togglePlay = () => {
    if (playing) return stop();
    if (loop && index >= 0) {
      const range = sceneRange(index);
      play(t >= range[0] && t < range[1] ? t : range[0], range);
    } else play(t);
  };

  // keyboard: space plays, delete removes the open scene (outside text fields)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── edits (timing always re-laid on the music) ──
  const update = (i: number, scene: ReelScene) => onChange({ ...sorted, scenes: scenes.map((x, j) => (j === i ? { ...scene, at: x.at } : x)) });
  const resize = (i: number, beats: number) => onChange(resizeScene(sorted, i, Math.min(MAX_BEATS, Math.max(MIN_BEATS, beats))));
  const remove = (i: number) => {
    if (scenes.length <= 1) return;
    const next = removeScene(sorted, i);
    onChange(next);
    setSelectedId(next.scenes[Math.min(i, next.scenes.length - 1)]?.id ?? null);
  };
  const uniqueId = (kind: string) => {
    const ids = new Set(scenes.map((x) => x.id));
    let n = 1;
    while (ids.has(`${kind}-${n}`)) n++;
    return `${kind}-${n}`;
  };
  const duplicate = (i: number) => {
    const copy = { ...structuredClone(scenes[i]), id: uniqueId(scenes[i].kind), chapter: undefined };
    onChange(insertScene(sorted, i + 1, copy, lengths[i]));
    setSelectedId(copy.id);
  };
  // ── transitions: the marker between two clips opens the picker ──
  const [transitionAt, setTransitionAt] = useState<number | null>(null);
  const setTransition = (i: number, patch: Partial<Pick<ReelScene, "enter" | "enterDir" | "enterBeats">>) => {
    const next = { ...scenes[i], ...patch };
    if (next.enter === "cut") delete next.enterBeats;
    update(i, next);
  };
  const playTransition = (i: number) => {
    const from = beatTime(track, Math.max(0, scenes[i].at - 1.5));
    const to = beatTime(track, scenes[i].at + (scenes[i].enterBeats ?? 1) + 2);
    play(from, [from, to]);
  };
  useEffect(() => {
    if (transitionAt === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTransitionAt(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [transitionAt]);

  const [adding, setAdding] = useState(false);
  const add = (kind: SceneKind) => {
    const at = index >= 0 ? index + 1 : scenes.length;
    const scene = { ...newScene(kind, 0, uniqueId(kind)), enter: kind === "compare" ? ("cut" as const) : ("fade" as const) };
    onChange(insertScene(sorted, at, scene, defaultBeats[kind]));
    setSelectedId(scene.id);
    setAdding(false);
  };

  // ── drag to reorder ──
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const dropIndexAt = (clientX: number) => {
    const rect = lanesRef.current!.getBoundingClientRect();
    const b = (clientX - rect.left) / pxBeat;
    let i = 0;
    while (i < scenes.length && scenes[i].at + lengths[i] / 2 < b) i++;
    return i;
  };
  const onDragOver = (e: DragEvent) => {
    if (dragFrom === null) return;
    e.preventDefault();
    setDropAt(dropIndexAt(e.clientX));
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (dragFrom !== null && dropAt !== null) {
      const to = dropAt > dragFrom ? dropAt - 1 : dropAt;
      if (to !== dragFrom) onChange(moveScene(sorted, dragFrom, to));
    }
    setDragFrom(null);
    setDropAt(null);
  };

  // ── pull the right edge to resize, in whole bars ──
  const resizing = useRef<{ i: number; x: number; beats: number } | null>(null);
  const startResize = (e: ReactPointerEvent, i: number) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizing.current = { i, x: e.clientX, beats: lengths[i] };
    setSelectedId(scenes[i].id);
  };
  const moveResize = (e: ReactPointerEvent) => {
    const r = resizing.current;
    if (!r) return;
    const beats = Math.min(MAX_BEATS, Math.max(MIN_BEATS, r.beats + Math.round((e.clientX - r.x) / pxBeat / BAR) * BAR));
    if (beats !== lengths[r.i]) resize(r.i, beats);
  };

  // ── scrubbing on the ruler ──
  const scrubbing = useRef(false);
  const scrubTo = (clientX: number) => {
    const rect = lanesRef.current!.getBoundingClientRect();
    seek(beatTime(track, Math.max(0, Math.min(reel.end, (clientX - rect.left) / pxBeat))));
  };

  const over = reel.end > maxBeats;
  const sceneNow = scenes.findIndex((x, i) => beatOfTime(t) >= x.at && beatOfTime(t) < x.at + lengths[i]);
  const rulerStep = 5;
  const ticks = Array.from({ length: Math.floor(duration / rulerStep) + 1 }, (_, i) => i * rulerStep);

  const screensManual = selected?.kind === "screens" && selected.shots?.length > 0;

  return (
    <div className={s.studio}>
      <div className={s.toolbar}>
        <button type="button" className={`${styles.button} ${styles.small}`} onClick={onGenerate}>
          <SparkIcon />
          {socialMode ? "Gerar roteiro IA" : "Gerar de novo com IA"}
        </button>

        <div className={s.toolField} style={{ minWidth: "auto" }}>
          <span>Formato</span>
          <div className={s.aspectToggle} role="group" aria-label="Formato do vídeo">
            <button
              type="button"
              aria-pressed={aspect === "9:16"}
              onClick={() => onChange({ ...reel, aspect: "9:16" })}
            >
              <span className={s.aspectIconV} aria-hidden />
              9:16 Vertical
            </button>
            <button
              type="button"
              aria-pressed={aspect === "16:9"}
              onClick={() => onChange({ ...reel, aspect: "16:9" })}
            >
              <span className={s.aspectIconH} aria-hidden />
              16:9 Horizontal
            </button>
          </div>
        </div>

        <TrackSelect tracks={tracks} value={reel.track} onChange={(id) => onChange({ ...reel, track: id })} onUpload={onUpload} onLibrary={onLibrary} socialMode={socialMode} />

        <label className={s.toolField}>
          <span>Movimento</span>
          <select className={styles.select} value={reel.motion ?? "energetic"} onChange={(e) => onChange({ ...reel, motion: e.target.value === "energetic" ? undefined : (e.target.value as Personality) })}>
            {(Object.keys(PERSONALITY_LABEL) as Personality[]).map((p) => (
              <option key={p} value={p}>{PERSONALITY_LABEL[p]}</option>
            ))}
          </select>
        </label>

        {socialMode ? (
          <div className={s.toolField} style={{ minWidth: "auto" }}>
            <span>Cor destaque</span>
            <div className={s.swatches} role="group" aria-label="Cor de destaque do vídeo">
              {ACCENT_SWATCHES.map((sw) => (
                <button
                  key={sw.hex}
                  type="button"
                  className={s.swatch}
                  style={{ background: sw.hex }}
                  title={sw.name}
                  aria-label={`Cor ${sw.name}`}
                  aria-pressed={reel.accent.toLowerCase() === sw.hex.toLowerCase()}
                  onClick={() => onChange({ ...reel, accent: sw.hex })}
                />
              ))}
            </div>
          </div>
        ) : null}

        {!socialMode ? (
          <label className={s.toolField} title={REEL_DISPLAYS.find((d) => d.id === (reel.display ?? "destaque"))?.hint}>
            <span>Na página do case</span>
            <select className={styles.select} value={reel.display ?? "destaque"} onChange={(e) => onChange({ ...reel, display: e.target.value === "destaque" ? undefined : (e.target.value as ReelDisplay) })}>
              {REEL_DISPLAYS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </label>
        ) : null}

        <label className={s.toolField} style={{ flex: 1 }}>
          <span>{socialMode ? "Título do vídeo" : "Linha da capa"}</span>
          <input className={styles.input} value={reel.title} onChange={(e) => onChange({ ...reel, title: e.target.value })} />
        </label>

        {!socialMode ? (
          <>
            <label className={s.publish}>
              {reel.draft ? <span className={styles.chip} data-tone="warn">Rascunho</span> : <span className={styles.chip} data-tone="good">No site</span>}
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
            <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={onAdvanced}>Modo avançado</button>
          </>
        ) : null}
      </div>

      <div className={s.main} data-aspect={aspect}>
        <div className={s.stageCol}>
          <div ref={stageRef} className={s.stage} style={{ height: scale ? Math.round(stageH * scale) : undefined }} onClick={togglePlay}>
            {scale > 0 ? <ReelStage doc={sorted} track={track} scale={scale} reducedMotion={false} onReady={onReady} hideDefaultCta={socialMode} /> : null}
          </div>
          <div className={s.controls}>
            <span className={s.clock}>
              {fmt(t)}<span> / {fmt(duration)}</span>
            </span>
            <button type="button" className={s.ctrl} onClick={() => seek(0)} aria-label="Voltar ao início">
              <svg viewBox="0 0 24 24" aria-hidden><rect x="5" y="5" width="2.4" height="14" rx="1" /><path d="M19 5.5v13a.8.8 0 0 1-1.2.7L8.5 12.7a.8.8 0 0 1 0-1.4l9.3-6.5a.8.8 0 0 1 1.2.7Z" /></svg>
            </button>
            <button type="button" className={`${s.ctrl} ${s.play}`} onClick={togglePlay} aria-label={playing ? "Pausar" : "Tocar"}>
              {playing ? (
                <svg viewBox="0 0 24 24" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
              )}
            </button>
            <button type="button" className={s.ctrl} data-on={loop} aria-pressed={loop} onClick={() => setLoop((v) => !v)} title="Repetir a cena aberta" aria-label="Repetir a cena aberta">
              <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3l3 3-3 3M4 12V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 12v3a3 3 0 0 1-3 3H4" /></svg>
            </button>
            <span className={s.now}>{sceneNow >= 0 ? `Cena ${sceneNow + 1}/${scenes.length} · ${kindLabel(scenes[sceneNow].kind)}` : ""}</span>
          </div>
        </div>

        <div className={s.inspectorSlot}>
        <aside className={`${styles.panel} ${s.inspector}`} aria-label="Cena aberta">
          {selected ? (
            <>
              <div className={s.inspectorHead}>
                <span className={s.kindBadge}>{String(index + 1).padStart(2, "0")}</span>
                <strong>{kindLabel(selected.kind)}</strong>
                <span className={styles.hint} style={{ marginLeft: "auto" }}>{fmt(beatTime(track, selected.at))}</span>
              </div>
              <div className={s.duration}>
                <span className={styles.label}>Duração</span>
                <div className={s.stepper}>
                  <button type="button" className={`${styles.button} ${styles.small}`} disabled={lengths[index] <= MIN_BEATS} onClick={() => resize(index, lengths[index] - BAR)} aria-label="Mais curta">−</button>
                  <span>{(lengths[index] * beat).toFixed(1).replace(".", ",")} s</span>
                  <button type="button" className={`${styles.button} ${styles.small}`} disabled={lengths[index] >= MAX_BEATS} onClick={() => resize(index, lengths[index] + BAR)} aria-label="Mais longa">+</button>
                </div>
              </div>
              {screensManual ? (
                <div className={s.notice}>
                  <span className={styles.hint}>Esta cena usa movimentos de câmera feitos à mão. Para editar aqui, troque por pranchas: a câmera passa a ser automática.</span>
                  <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => update(index, { ...(selected as ScreensScene), boards: boardsFromShots(selected as ScreensScene), shots: [] })}>Usar pranchas</button>
                </div>
              ) : null}
              <div className={s.fields}>
                <Fields defs={simpleFields(selected.kind).filter((f) => !(screensManual && f.key === "boards"))} values={toForm(selected)} onChange={(v) => update(index, { ...fromForm(v), id: selected.id })} />
              </div>
              <div className={s.inspectorActions}>
                <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => setAdding((v) => !v)}><PlusIcon />Nova cena</button>
                <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => duplicate(index)}><CopyIcon />Duplicar</button>
                <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small} ${styles.danger}`} disabled={scenes.length <= 1} onClick={() => remove(index)}><TrashIcon />Remover</button>
              </div>
            </>
          ) : (
            <p className={styles.hint} style={{ padding: 16, margin: 0 }}>Escolha uma cena na linha do tempo para editar os textos e as imagens.</p>
          )}
        </aside>
        </div>
      </div>

      <div className={`${styles.panel} ${s.timeline}`}>
        <div className={s.laneLabels} aria-hidden>
          <span />
          <span>Cenas</span>
          <span>Música</span>
        </div>
        <div className={s.lanesWrap}>
          <div ref={lanesRef} className={s.lanes} onDragOver={onDragOver} onDrop={onDrop} onDragLeave={() => setDropAt(null)}>
            <div
              className={s.ruler}
              onPointerDown={(e) => {
                scrubbing.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                scrubTo(e.clientX);
              }}
              onPointerMove={(e) => scrubbing.current && scrubTo(e.clientX)}
              onPointerUp={() => (scrubbing.current = false)}
            >
              {ticks.map((sec) => (
                <span key={sec} className={s.tick} style={{ left: xOf(beatOfTime(sec)) }}>{sec}s</span>
              ))}
            </div>

            <div className={s.clips}>
              {scenes.map((scene, i) => {
                const img = sceneImage(scene);
                return (
                  <div
                    key={scene.id}
                    className={s.clip}
                    data-selected={scene.id === selectedId}
                    data-dragging={dragFrom === i}
                    data-has-img={img ? "true" : undefined}
                    style={{ left: xOf(scene.at), width: Math.max(8, xOf(lengths[i]) - 3) }}
                    draggable
                    onDragStart={(e) => {
                      setDragFrom(i);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => {
                      setDragFrom(null);
                      setDropAt(null);
                    }}
                    onClick={() => selectScene(scene.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Cena ${i + 1}: ${kindLabel(scene.kind)}. Arraste para mudar a ordem.`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        selectScene(scene.id);
                      } else if (e.key === "ArrowLeft" && i > 0) onChange(moveScene(sorted, i, i - 1));
                      else if (e.key === "ArrowRight" && i < scenes.length - 1) onChange(moveScene(sorted, i, i + 1));
                      else if (e.key === "Delete" || e.key === "Backspace") remove(i);
                    }}
                  >
                    {img ? <img src={thumb(img)} alt="" className={s.clipImg} draggable={false} /> : null}
                    <span className={s.clipText}>
                      <strong>{kindLabel(scene.kind)}</strong>
                      <span>{sceneText(scene)}</span>
                    </span>
                    {scene.chapter ? <span className={s.clipChapter}>{scene.chapter}</span> : null}
                    <span
                      className={s.handle}
                      onPointerDown={(e) => startResize(e, i)}
                      onPointerMove={moveResize}
                      onPointerUp={() => (resizing.current = null)}
                      aria-hidden
                      title="Arraste para mudar a duração"
                    />
                  </div>
                );
              })}
              {scenes.slice(1).map((scene, k) => {
                const i = k + 1;
                const kind = scene.enter === "slide" ? "push" : scene.enter ?? "cut";
                return (
                  <button
                    key={`tr-${scene.id}`}
                    type="button"
                    className={s.transition}
                    data-kind={kind}
                    data-open={transitionAt === i}
                    style={{ left: xOf(scene.at) - 1.5 }}
                    onClick={() => setTransitionAt((v) => (v === i ? null : i))}
                    aria-label={`Transição para a cena ${i + 1}: ${transitionLabel(scene.enter)}`}
                    title={transitionLabel(scene.enter)}
                  >
                    {TRANSITION_GLYPH[kind] ?? "|"}
                  </button>
                );
              })}
              {transitionAt !== null && scenes[transitionAt] ? (
                <TransitionPicker
                  scene={scenes[transitionAt]}
                  left={Math.min(Math.max(xOf(scenes[transitionAt].at) - 160, 0), Math.max(0, laneW - 320))}
                  onChange={(patch) => setTransition(transitionAt, patch)}
                  onPlay={() => playTransition(transitionAt)}
                  onClose={() => setTransitionAt(null)}
                />
              ) : null}
              {dropAt !== null ? <span className={s.dropMark} style={{ left: xOf(dropAt < scenes.length ? scenes[dropAt].at : reel.end) - 2 }} /> : null}
              <div className={s.addWrap} style={{ left: Math.min(laneW - 34, xOf(reel.end) + 4) }}>
                <button type="button" className={s.add} onClick={() => setAdding((v) => !v)} aria-expanded={adding} aria-label="Adicionar cena">
                  <PlusIcon />
                </button>
                {adding ? (
                  <div className={s.menu} role="menu">
                    <span className={styles.label} style={{ padding: "4px 8px" }}>Nova cena {index >= 0 ? `depois da cena ${index + 1}` : "no fim"}</span>
                    {SCENE_KINDS.map((k) => (
                      <button key={k.kind} type="button" role="menuitem" className={s.menuItem} onClick={() => add(k.kind)}>
                        <strong>{k.label}</strong>
                        <span>{k.description}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className={s.music}>
              {track.sections.filter((x) => x.beat < span).map((x, i, all) => (
                <span key={i} className={s.section} data-tone={x.tone} style={{ left: xOf(x.beat), width: xOf((all[i + 1]?.beat ?? span) - x.beat) }}>
                  {x.label}
                </span>
              ))}
              <Waveform track={track} end={span} width={laneW} />
              {maxBeats < span ? <span className={s.noMusic} style={{ left: xOf(maxBeats) }}>Fim da música</span> : null}
            </div>

            <span className={s.playhead} style={{ left: xOf(Math.min(span, beatOfTime(t))) }} aria-hidden />
          </div>
        </div>
      </div>
      <p className={styles.hint} style={{ margin: 0 }}>
        {over ? <strong style={{ color: "var(--warn)" }}>O vídeo passou do fim da música: encurte ou remova uma cena. </strong> : null}
        Arraste as cenas para mudar a ordem e puxe a borda direita para mudar a duração; o tempo se encaixa na música sozinho. Cenas que começam num <em>Drop</em> ganham mais força.
        Espaço toca e pausa.
      </p>
    </div>
  );
}

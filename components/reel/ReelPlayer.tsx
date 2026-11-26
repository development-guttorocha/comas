"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { ReelDoc } from "@/lib/reel/types";
import { beatTime, type ReelTrack } from "@/lib/reel/tracks";
import ReelStage, { reelTiming } from "./ReelStage";
import { DEFAULT_CTA } from "@/lib/reel/params";
import { W } from "./motion";
import p from "./player.module.css";

// Plays the stage like a video: one clock drives the frame function, the music follows
// it (or leads it, while it is actually playing), with scrubbing, chapters, mute and
// fullscreen. Plays once and holds the last frame.

type Phase = "loading" | "playing" | "paused" | "ended";

interface Controller {
  ready: (frame: (t: number) => void) => void;
  toggle: () => void;
  replay: () => void;
  seek: (t: number) => void;
  nudge: (d: number) => void;
  mute: (m: boolean) => void;
}

const fmt = (t: number) => {
  const sec = Math.max(0, Math.floor(t + 1e-6));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
};

export default function ReelPlayer({
  doc,
  track,
  audio,
  labels,
}: {
  doc: ReelDoc;
  track: ReelTrack;
  /** created (and unlocked) by the click that opened the player */
  audio: HTMLAudioElement;
  labels: { play: string; pause: string; replay: string; mute: string; unmute: string; fullscreen: string; exitFullscreen: string; loading: string; progress: string; music: string; talk: string; talkHref: string };
}) {
  const timing = reelTiming(doc, track);
  const { duration } = timing;
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [t, setT] = useState(0);
  const [muted, setMuted] = useState(false);
  const [full, setFull] = useState(false);
  const [rm, setRm] = useState(false);
  const audioRef = useRef(audio);
  const ctl = useRef<Controller | null>(null);
  const [phaseNow, setPhaseNow] = useState<Phase>("loading");

  useEffect(() => {
    setRm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // stage scale follows the player's width
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setScale(Math.min(width / W, height / 1080));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === boxRef.current?.parentElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // The playback engine lives outside React's render: one clock, the frame function and the music.
  useEffect(() => {
    const a = audioRef.current;
    const fadeAt = doc.fadeOut ? [beatTime(track, doc.fadeOut[0]), beatTime(track, doc.fadeOut[1])] : null;
    const fade = (time: number) => (!fadeAt ? 1 : time <= fadeAt[0] ? 1 : time >= fadeAt[1] ? 0 : 1 - (time - fadeAt[0]) / (fadeAt[1] - fadeAt[0]));
    const now = () => performance.now() / 1000;
    let clock = { t: 0, at: 0, running: false };
    let raf = 0;
    let lastUi = -1;
    let frame: ((t: number) => void) | null = null;
    let phase: Phase = "loading";
    const setP = (next: Phase) => {
      phase = next;
      setPhaseNow(next);
    };
    const current = () => (clock.running ? clock.t + (now() - clock.at) : clock.t);
    const draw = (time: number, force = false) => {
      frame?.(time);
      // the progress bar only needs ~10 updates a second
      if (force || Math.abs(time - lastUi) > 0.1) {
        lastUi = time;
        setT(time);
      }
    };
    const tick = () => {
      let time = current();
      // while the music is really playing, it is the clock
      if (!a.paused && a.readyState >= 3 && time < track.length - 0.05) {
        const at = a.currentTime;
        if (Math.abs(at - time) < 0.25) {
          time = at;
          clock = { t: at, at: now(), running: true };
        } else a.currentTime = time;
      }
      a.volume = fade(time);
      if (time >= duration) {
        clock = { t: duration, at: now(), running: false };
        a.pause();
        draw(duration, true);
        setP("ended");
        return;
      }
      draw(time);
      raf = requestAnimationFrame(tick);
    };
    const play = (from?: number) => {
      const start = from ?? (clock.t >= duration ? 0 : clock.t);
      clock = { t: start, at: now(), running: true };
      try {
        a.currentTime = start;
      } catch {
        /* not seekable yet: the tick re-syncs */
      }
      a.volume = fade(start);
      a.play().catch(() => {
        /* blocked: the reel plays on its own clock, silent */
      });
      setP("playing");
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    const pause = () => {
      clock = { t: current(), at: now(), running: false };
      a.pause();
      cancelAnimationFrame(raf);
      draw(clock.t, true);
      setP("paused");
    };
    const seek = (time: number) => {
      const to = Math.max(0, Math.min(duration, time));
      if (phase === "playing" && to < duration) return play(to);
      clock = { t: to, at: now(), running: false };
      try {
        a.currentTime = to;
      } catch {
        /* ignore */
      }
      draw(to, true);
      if (phase === "ended" && to < duration) setP("paused");
    };
    ctl.current = {
      ready: (f) => {
        frame = f;
        f(0);
        play(0);
      },
      toggle: () => (phase === "playing" ? pause() : phase === "ended" ? play(0) : phase === "paused" ? play() : undefined),
      replay: () => play(0),
      seek,
      nudge: (d) => seek(current() + d),
      mute: (m) => {
        a.muted = m;
      },
    };
    return () => {
      cancelAnimationFrame(raf);
      a.pause();
      ctl.current = null;
    };
  }, [doc.fadeOut, duration, track]);

  const phase = phaseNow;
  const onReady = useCallback((frame: (t: number) => void) => ctl.current?.ready(frame), []);
  useEffect(() => {
    ctl.current?.mute(muted);
  }, [muted]);

  const toggle = () => ctl.current?.toggle();
  const play = () => ctl.current?.replay();
  const seek = (time: number) => ctl.current?.seek(time);
  const toggleFull = () => {
    const host = boxRef.current?.parentElement;
    if (!host) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void host.requestFullscreen?.();
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === "INPUT" && e.key !== " ") return;
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      toggle();
    } else if (e.key === "ArrowRight") ctl.current?.nudge(5);
    else if (e.key === "ArrowLeft") ctl.current?.nudge(-5);
    else if (e.key === "m") setMuted((m) => !m);
    else if (e.key === "f") toggleFull();
  };

  const chapter = [...timing.chapters].reverse().find((ch) => t >= ch.t - 0.01);
  const loading = phase === "loading";

  return (
    <div className={p.player} onKeyDown={onKey} data-ended={phase === "ended"}>
      <div ref={boxRef} className={p.screen} onClick={loading ? undefined : toggle}>
        {scale > 0 ? (
          <div className={p.stageWrap} style={{ width: W * scale, height: 1080 * scale }}>
            <ReelStage doc={doc} track={track} scale={scale} reducedMotion={rm} onReady={onReady} />
          </div>
        ) : null}
        {loading ? (
          <div className={p.loading} role="status">
            <span className={p.spinner} aria-hidden />
            {labels.loading}
          </div>
        ) : null}
        {phase === "ended" ? (
          <div className={p.endActions} onClick={(e) => e.stopPropagation()}>
            <a className={`${p.endLink} ${p.endPrimary}`} href={(doc.cta ?? DEFAULT_CTA).href} style={{ background: doc.accent }}>
              {(doc.cta ?? DEFAULT_CTA).label} →
            </a>
            {(doc.cta ?? DEFAULT_CTA).href !== labels.talkHref ? (
              <a className={p.endLink} href={labels.talkHref}>
                {labels.talk}
              </a>
            ) : null}
            <button type="button" className={p.endLink} onClick={() => play()}>
              ↺ {labels.replay}
            </button>
          </div>
        ) : null}
      </div>
      <div className={p.bar}>
        <button type="button" className={p.btn} onClick={toggle} disabled={loading} aria-label={phase === "playing" ? labels.pause : phase === "ended" ? labels.replay : labels.play}>
          {phase === "playing" ? (
            <svg viewBox="0 0 24 24" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
          )}
        </button>
        <span className={p.time}>
          {fmt(t)} / {fmt(duration)}
        </span>
        <div className={p.track}>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={t}
            disabled={loading}
            aria-label={labels.progress}
            aria-valuetext={`${fmt(t)}${chapter ? `, ${chapter.label}` : ""}`}
            onChange={(e) => seek(Number(e.target.value))}
            className={p.range}
            style={{ ["--p" as string]: `${(t / duration) * 100}%`, ["--accent" as string]: doc.accent }}
          />
          {timing.chapters.slice(1).map((ch) => (
            <span key={ch.label} className={p.tick} style={{ left: `${(ch.t / duration) * 100}%` }} aria-hidden />
          ))}
        </div>
        <span className={p.chapter}>{chapter?.label}</span>
        <button type="button" className={p.btn} onClick={() => setMuted((m) => !m)} aria-label={muted ? labels.unmute : labels.mute} aria-pressed={muted}>
          {muted ? (
            <svg viewBox="0 0 24 24" aria-hidden><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="m16 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          )}
        </button>
        <button type="button" className={p.btn} onClick={toggleFull} aria-label={full ? labels.exitFullscreen : labels.fullscreen}>
          <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {full ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
          </svg>
        </button>
      </div>
      <p className={p.credit}>
        {labels.music}: {[track.title, track.artist].filter(Boolean).join(" · ")}
        {track.source ? (
          <>
            {track.title || track.artist ? " · " : ""}
            {track.sourceUrl ? (
              <a href={track.sourceUrl} target="_blank" rel="noopener">
                {track.source}
              </a>
            ) : (
              track.source
            )}
          </>
        ) : null}
      </p>
    </div>
  );
}

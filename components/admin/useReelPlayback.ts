"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { beatTime, type ReelTrack } from "@/lib/reel/tracks";
import type { ReelDoc } from "@/lib/reel/types";

// Playback for the admin's previews: one clock that the music leads while it plays, the
// stage's frame function, play / pause / seek and an optional loop over a stretch.

export function useReelPlayback(doc: ReelDoc, track: ReelTrack) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frame = useRef<((t: number) => void) | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const clock = useRef({ t: 0, at: 0 });
  const raf = useRef(0);
  const loop = useRef<[number, number] | null>(null);
  const duration = beatTime(track, doc.end);

  const draw = useCallback((time: number) => {
    frame.current?.(time);
    setT(time);
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    audio.current?.pause();
    setPlaying(false);
  }, []);

  const seek = useCallback(
    (time: number) => {
      stop();
      const to = Math.max(0, Math.min(duration, time));
      clock.current = { t: to, at: 0 };
      draw(to);
    },
    [draw, duration, stop],
  );

  /** Plays from `from`; with `range`, plays that stretch over and over. */
  const play = useCallback(
    (from: number, range?: [number, number] | null) => {
      stop();
      loop.current = range ?? null;
      let a = audio.current;
      if (!a || !a.src.endsWith(track.src)) {
        a = new Audio(track.src);
        a.preload = "auto";
        audio.current = a;
      }
      const start = from >= duration - 0.05 ? 0 : from;
      const fadeAt = doc.fadeOut ? [beatTime(track, doc.fadeOut[0]), beatTime(track, doc.fadeOut[1])] : null;
      a.currentTime = start;
      void a.play().catch(() => {});
      clock.current = { t: start, at: performance.now() / 1000 };
      setPlaying(true);
      const tick = () => {
        let time = clock.current.t + (performance.now() / 1000 - clock.current.at);
        if (a && !a.paused && a.readyState >= 3 && Math.abs(a.currentTime - time) < 0.25) {
          time = a.currentTime;
          clock.current = { t: time, at: performance.now() / 1000 };
        }
        const range = loop.current;
        if (range && time >= range[1]) {
          time = range[0];
          clock.current = { t: time, at: performance.now() / 1000 };
          if (a) a.currentTime = time;
        }
        if (a && fadeAt) a.volume = time <= fadeAt[0] ? 1 : time >= fadeAt[1] ? 0 : 1 - (time - fadeAt[0]) / (fadeAt[1] - fadeAt[0]);
        if (time >= duration) {
          clock.current = { t: duration, at: 0 };
          draw(duration);
          stop();
          return;
        }
        draw(time);
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    },
    [doc.fadeOut, draw, duration, stop, track],
  );

  useEffect(() => stop, [stop]);

  const onReady = useCallback((f: (t: number) => void) => {
    frame.current = f;
    f(clock.current.t);
  }, []);

  return { t, playing, duration, play, stop, seek, onReady };
}

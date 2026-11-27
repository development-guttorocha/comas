"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { ReelDoc } from "@/lib/reel/types";
import { beatLength, beatTime, type ReelTrack } from "@/lib/reel/tracks";
import { MOTION, clamp01, hash, show, type Ctx, type El } from "./motion";
import { applyTransition, rest } from "./transitions";
import { hasPicture, type ReelDir, type ReelEnter } from "@/lib/reel/types";
import gsap from "gsap";
import { SceneMarkup, complete } from "./scenes";
import { TIMELINES } from "./timelines";
import { DEFAULT_CTA } from "@/lib/reel/params";
import s from "./reel.module.css";

export interface ReelTiming {
  /** reel length, in seconds */
  duration: number;
  cover: number;
  chapters: { label: string; t: number }[];
}

/** Scene times in seconds, from the reel's beats. */
export function reelTiming(doc: ReelDoc, track: ReelTrack): ReelTiming {
  const duration = beatTime(track, doc.end);
  return {
    duration,
    cover: doc.cover === undefined ? 0 : beatTime(track, doc.cover),
    chapters: doc.scenes.filter((sc) => sc.chapter).map((sc) => ({ label: sc.chapter!, t: sc.at === 0 ? 0 : beatTime(track, sc.at) })),
  };
}

interface SceneDef {
  index: number;
  id: string;
  start: number;
  end: number;
  enter: ReelEnter;
  dir?: ReelDir;
  enterDur: number;
}

function grainTile() {
  const size = 256;
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = hash(i + 7919) & 255;
    const c = v > 127 ? 255 : 0;
    img.data[i * 4] = c;
    img.data[i * 4 + 1] = c;
    img.data[i * 4 + 2] = c;
    img.data[i * 4 + 3] = Math.round((Math.abs(v - 127.5) / 127.5) * 9);
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL("image/png");
}

export default function ReelStage({
  doc,
  track,
  scale,
  reducedMotion,
  onReady,
}: {
  doc: ReelDoc;
  track: ReelTrack;
  /** stage pixels → screen pixels */
  scale: number;
  reducedMotion: boolean;
  /** called once, with the frame function, when fonts and images are ready */
  onReady: (frame: (t: number) => void) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<(t: number) => void>(() => {});
  const lastT = useRef(0);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const defs = useMemo<SceneDef[]>(() => {
    const beat = beatLength(track);
    return doc.scenes.map((sc, i) => {
      const next = doc.scenes[i + 1];
      const prev = doc.scenes[i - 1];
      // two scenes of type on black never dissolve into each other (the words would overlap):
      // the cut lands dry on the beat, right after the old words have left
      const enter: ReelEnter = sc.enter === "fade" && prev && !hasPicture(sc) && !hasPicture(prev) ? "cut" : sc.enter ?? "cut";
      return {
        index: i,
        id: sc.id,
        start: sc.at === 0 ? 0 : beatTime(track, sc.at),
        end: beatTime(track, next ? next.at : doc.end),
        enter,
        dir: sc.enterDir,
        enterDur: enter === "cut" ? 0 : (sc.enterBeats ?? 1) * beat,
      };
    });
  }, [doc, track]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const map = new Map<string, El>();
    root.querySelectorAll<El>("[data-k]").forEach((el) => map.set(el.getAttribute("data-k")!, el));
    const c: Ctx = { g: (k) => map.get(k), rm: reducedMotion, beat: beatLength(track), m: MOTION[doc.motion ?? "energetic"], lang: doc.lang ?? "pt" };
    const ambient = c.g("ambient");
    const flash = c.g("flash");
    const duration = beatTime(track, doc.end);
    const grain = c.g("grain");
    // GSAP-choreographed scenes: one paused timeline each, seeked by the clock below
    const timelines = new Map<string, gsap.core.Timeline>();
    // Build with every scene displayed: GSAP measures a hidden element by moving it out of
    // the page and back, and puts it back after its next *element*, which reorders text
    // (a mark before its label, spaces between words). The frame below hides them again,
    // before the browser paints.
    defs.forEach((d) => {
      const sec = c.g(`s-${d.id}`);
      if (sec) sec.style.display = "";
    });
    const gctx = gsap.context(() => {
      doc.scenes.forEach((sc, i) => {
        const build = TIMELINES[sc.kind];
        const el = c.g(`s-${sc.id}`);
        if (!build || !(el instanceof HTMLElement)) return;
        const dur = defs[i].end - defs[i].start;
        const tl = build(el, complete(sc), c, dur);
        if (!tl) return;
        // type on black leaves before the next scene: it accelerates up and out, finishing a
        // beat before the cut (or just before a transition that starts on it)
        // the backdrop drifts closer through the whole scene (ambient life)
        const bd = c.g(`${sc.id}-bd`);
        if (bd && !c.rm) tl.fromTo(bd, { scale: 1.04 }, { scale: 1.14, duration: dur, ease: "none" }, 0);
        const nextDef = defs[i + 1];
        const cam = c.g(`${sc.id}-cam`);
        if (nextDef && cam && !hasPicture(sc)) {
          const gap = nextDef.enterDur > 0 ? 0 : Math.min(c.beat, dur * 0.1);
          const at = Math.max(dur * 0.6, dur - gap - 0.25);
          tl.to(cam, c.rm ? { opacity: 0, duration: 0.2, ease: "none" } : { opacity: 0, y: -40, duration: 0.25, ease: "power3.in" }, at);
        }
        timelines.set(sc.id, tl);
      });
    }, root);
    frameRef.current = (raw: number) => {
      lastT.current = raw;
      const t = Math.max(0, Math.min(raw, duration));
      if (flash) {
        flash.style.opacity = "0";
        flash.style.clipPath = "none";
      }
      for (let i = 0; i < defs.length; i++) {
        const d = defs[i];
        const next = defs[i + 1];
        // a scene stays until the next one has finished arriving over it
        const visible = t >= d.start && (!next || t < next.start + next.enterDur);
        show(c, `s-${d.id}`, visible);
        if (!visible) continue;
        rest(c.g(`s-${d.id}`));
        // events on: the counters write their numbers from onUpdate
        timelines.get(d.id)?.time(Math.max(0, t - d.start), false);
      }
      // the transition in progress moves both scenes: the one arriving and the one leaving
      for (let i = 1; i < defs.length; i++) {
        const d = defs[i];
        if (d.enterDur <= 0 || t < d.start || t >= d.start + d.enterDur) continue;
        applyTransition(d.enter, d.dir, clamp01((t - d.start) / d.enterDur), c.g(`s-${d.id}`), c.g(`s-${defs[i - 1].id}`), { rm: c.rm, m: c.m, flash });
      }
      // ambient layer: a glow in the case colour drifting slowly, a pure function of t
      if (ambient) {
        const x = 50 + 28 * Math.sin(t * 0.11) + 8 * Math.sin(t * 0.37);
        const y = 45 + 20 * Math.cos(t * 0.09) + 6 * Math.sin(t * 0.29);
        ambient.style.backgroundPosition = `${x.toFixed(2)}% ${y.toFixed(2)}%`;
        ambient.style.opacity = c.rm ? "0" : String(c.m.ambient);
      }
      if (grain) {
        const f = c.rm ? 0 : Math.floor(t * 24);
        grain.style.backgroundPosition = `-${hash(2 * f + 1) % 320}px -${hash(2 * f + 2) % 320}px`;
      }
    };
    // draw the current frame right away: it hides the scenes shown for the build, and an
    // edited reel (the admin preview) keeps the frame it was showing
    frameRef.current(lastT.current);
    // reverts the SplitText splits and inline styles before the next build or unmount
    return () => gctx.revert();
  }, [defs, doc, track, reducedMotion]);

  useEffect(() => {
    const grain = rootRef.current?.querySelector<HTMLElement>('[data-k="grain"]');
    const url = grainTile();
    if (grain && url) grain.style.backgroundImage = `url(${url})`;
  }, []);

  // ready = fonts loaded + every stage image decoded (8 s cap)
  useEffect(() => {
    let alive = true;
    const imgs = Array.from(rootRef.current?.querySelectorAll("img") ?? []).map((img) => img.decode().catch(() => {}));
    const cap = new Promise((r) => window.setTimeout(r, 8000));
    Promise.race([Promise.all([document.fonts.ready, ...imgs]), cap]).then(() => {
      if (!alive) return;
      onReadyRef.current((t) => frameRef.current(t));
    });
    return () => {
      alive = false;
    };
  }, []);

  const aspect = doc.aspect ?? "16:9";

  return (
    <div ref={rootRef} className={s.stage} data-aspect={aspect} style={{ transform: `scale(${scale})` }} aria-hidden>
      {doc.scenes.map((scene) => (
        <SceneMarkup key={scene.id} scene={scene} accent={doc.accent} cta={(doc.cta ?? DEFAULT_CTA).label} lang={doc.lang ?? "pt"} prepared={doc.prepared} aspect={aspect} />
      ))}
      <div data-k="flash" className={s.flash} style={{ background: doc.accent }} />
      <div data-k="ambient" className={s.ambient} style={{ ["--accent" as string]: doc.accent }} />
      <div data-k="grain" className={s.grain} />
    </div>
  );
}

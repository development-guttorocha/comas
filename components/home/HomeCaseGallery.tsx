"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { HomeFeaturedCase } from "@/lib/homeCaseHighlights";
import type { SiteLocale } from "@/lib/siteLocale";
import type { BeltMotion } from "@/lib/homeSettingsModel";
import { beltRuns, FINAL_OFFSET, frontTile, SLOTS } from "@/lib/homeBelt";
import { getCaseHref } from "@/lib/cases";
import { createConveyor, createNoise } from "./webgl/conveyor";
import { loadCover, localCovers } from "./homeCovers";
import styles from "./HomeCasesSection.module.css";

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const range = (v: number, from: number, to: number) => clamp((v - from) / (to - from));
const smooth = (v: number) => v * v * (3 - 2 * v);

/** Shakuro's conveyor, pinned and driven by the page scroll as in the reference:
 * it turns, grows until it lies flat, and its flat tiles hand over to the case
 * column, which keeps travelling up over the fixed "cases" word. */
export default function HomeCaseGallery({ featured, locale, belt }: { featured: HomeFeaturedCase[]; locale: SiteLocale; belt: BeltMotion }) {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const grain = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const { turns, speed } = belt;
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  // Mobile shows the case panels only (the track is hidden by CSS), so WebGL never starts there.
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const desktop = matchMedia("(min-width: 768px)");
    const update = () => setEnabled(desktop.matches);
    update(); desktop.addEventListener("change", update);
    return () => desktop.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const trackEl = track.current, stageEl = stage.current, surface = canvas.current, noiseCanvas = grain.current;
    const section = trackEl?.parentElement;
    if (!enabled || !trackEl || !stageEl || !surface || !noiseCanvas || !section || !featured.length) return;
    let cancelled = false, frame = 0, visible = false;
    let conveyor: ReturnType<typeof createConveyor> | null = null;
    let tile = frontTile(1, 1);
    const controller = new AbortController();
    const signal = controller.signal;
    const motion = { offset: FINAL_OFFSET, velocity: 0, present: 0, targetPresent: 0, pointerX: 0, pointerY: 0, parallaxX: 0, parallaxY: 0 };
    // Cases run downwards on the flat belt (slot 0, 7, 6…), the same order as the panel column.
    const projects = Array.from({length: SLOTS}, (_,index) => {
      const record = featured[(SLOTS - index) % SLOTS % featured.length];
      return { title: record.title, url: getCaseHref(record.slug,locale), image: record.heroImage || localCovers[record.slug], focus: record.heroImageFocus, record };
    });
    const noise = createNoise(noiseCanvas);
    const resize = () => {
      const box = surface.getBoundingClientRect();
      conveyor?.resize(box.width,box.height); noise.resize();
      // The section is as long as the turns need (lib/homeBelt.ts).
      const runs = beltRuns({ turns, speed }, stageEl.clientWidth, stageEl.clientHeight);
      tile = runs.tile;
      trackEl.style.height = `${runs.sectionHeight}px`;
      // The column is the width of a flat tile and is pulled up so panel 01 lands on it.
      section.style.setProperty("--panel-w", tile.w + "px");
      section.style.setProperty("--pull", (stageEl.clientHeight - tile.top) + "px");
    };
    const apply = () => {
      const H = stageEl.clientHeight, D = trackEl.offsetHeight - H, pull = H - tile.top;
      const scrolled = -trackEl.getBoundingClientRect().top, s = clamp(scrolled, 0, D);
      // The Figma lift over "+30" only holds while entering; pinned, the belt settles
      // centred so it turns in front of the "cases" word at the foot of the screen.
      stageEl.style.setProperty("--enter", String(1 - smooth(range(scrolled, -H, 0))));
      const flat = D - pull, growFrom = flat - H;
      // While it turns freely, `speed` tiles per tile-height of scroll from the moment it comes into view;
      // from the grow on (and once flat) it moves exactly with the page, so the column takes over in step.
      const left = D - Math.min(scrolled, D), grow = pull + H;
      motion.offset = FINAL_OFFSET + (Math.min(left, grow) + Math.max(0, left - grow) * speed) / tile.h;
      motion.present = smooth(range(s, growFrom, flat));
      section.style.setProperty("--reveal", String(range(s, flat, flat + pull * .6)));
    };
    const render = () => {
      frame = 0;
      if (cancelled) return;
      apply();
      motion.parallaxX += (motion.pointerX - motion.parallaxX) * .08;
      motion.parallaxY += (motion.pointerY - motion.parallaxY) * .08;
      if (visible && !document.hidden) { noise.draw(performance.now()); conveyor?.draw(motion); frame = requestAnimationFrame(render); }
    };
    const start = () => { if (!frame && !cancelled) frame = requestAnimationFrame(render); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; start(); },{threshold:0});
    observer.observe(trackEl);
    const resizer = new ResizeObserver(()=>{resize();start();}); resizer.observe(stageEl);
    document.addEventListener("visibilitychange",start,{signal});
    addEventListener("scroll",start,{passive:true,signal});
    const coordinates = (event: PointerEvent | MouseEvent) => {
      const box=surface.getBoundingClientRect(); return {x:event.clientX-box.left,y:event.clientY-box.top};
    };
    stageEl.addEventListener("pointermove",event=>{
      const p=coordinates(event);
      motion.pointerX=p.x/stageEl.clientWidth*2-1;
      motion.pointerY=p.y/surface.clientHeight*2-1;
      if (conveyor && motion.present < 1) stageEl.style.cursor=conveyor.pick(p.x,p.y,motion)>=0?"pointer":"";
    },{signal});
    stageEl.addEventListener("pointerleave",()=>{motion.pointerX=motion.pointerY=0;},{signal});
    stageEl.addEventListener("click",event=>{
      if (!conveyor || motion.present >= 1) return;
      const p=coordinates(event),slot=conveyor.pick(p.x,p.y,motion);
      if (slot>=0) router.push(projects[slot].url);
    },{signal});
    surface.addEventListener("webglcontextlost",event=>{event.preventDefault();setStatus("fallback");},{signal});
    Promise.all(projects.map(async p=>await loadCover(p.image) ?? await loadCover(localCovers[p.record.slug]))).then(images=>{
      if (cancelled) return;
      try { conveyor=createConveyor(surface,images,projects);resize();setStatus("ready");start(); }
      catch(error) {setStatus("fallback");console.warn("Case gallery:",error);}
    });
    resize(); start();
    return ()=>{
      cancelled=true;controller.abort();trackEl.style.height="";cancelAnimationFrame(frame);observer.disconnect();resizer.disconnect();
      conveyor?.dispose();
      noise.dispose();
    };
  },[featured,locale,router,enabled,turns,speed]);

  return <div ref={track} className={styles.track}>
    {/* Back layer: gradient and grain, below the fixed "cases" word. */}
    <div className={styles.backdrop} aria-hidden="true"><canvas ref={grain} className={styles.noise} /></div>
    {/* Front layer: the belt passes over the word. */}
    <div ref={stage} className={styles.stage} data-status={status}>
      {status === "loading" ? <div className={styles.loader} role="status">
        <span className="sr-only">{locale === "en" ? "Loading cases" : "Carregando cases"}</span>
      </div> : null}
      <canvas ref={canvas} className={styles.conveyor} aria-hidden="true" />
    </div>
  </div>;
}

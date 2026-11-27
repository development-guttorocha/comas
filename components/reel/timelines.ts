import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import type {
  CardsScene,
  ImageFx,
  ImgEnter,
  ImgMotion,
  CompareScene,
  DeltaScene,
  EndScene,
  FlowScene,
  ImageScene,
  ListScene,
  MetricsScene,
  NumberScene,
  QuoteScene,
  ReelCam,
  ReelScene,
  RoleScene,
  ScreensScene,
  TitleScene,
} from "@/lib/reel/types";
import { sceneShots } from "@/lib/reel/screens";

/** Shots that come from boards (not written by hand), whose camera can follow the frame. */
const sceneShotsFromBoards = (scene: ScreensScene) => !scene.shots?.length;
import { H, W, type Ctx } from "./motion";
import { countWords, decimalsOf, formatNumber, splitWords } from "./scenes";
import s from "./reel.module.css";

// Every scene choreographed with GSAP. Each builder returns a *paused* timeline that spans
// the whole scene; the stage seeks it to the scene's local time on every frame
// (tl.time(lt)), so a frame is still a pure function of t: pausing, scrubbing and replaying
// draw exactly the same thing. Only transforms, opacity, clip-path and SVG strokes move
// (gsap-performance), nothing reads a clock, and nothing is random.
//
// Every scene has three layers (motion-design skill): the primary action the eye follows,
// secondary motion that answers it (a tilt that settles, letters after their word, a card's
// content after the card), and ambient life (a camera that breathes, a photo that drifts).

gsap.registerPlugin(SplitText);

export type TimelineBuilder = (el: HTMLElement, scene: ReelScene, c: Ctx, dur: number) => gsap.core.Timeline | null;

// ── helpers ──────────────────────────────────────────────────────────────────

const INK = "#f8f8f5";
const q = <T extends Element = HTMLElement>(el: ParentNode, sel: string) => el.querySelector<T & HTMLElement>(sel);
const qa = <T extends Element = HTMLElement>(el: ParentNode, sel: string) => Array.from(el.querySelectorAll<T & HTMLElement>(sel));
const key = (el: ParentNode, k: string) => q(el, `[data-k="${k}"]`);
const keys = (el: ParentNode, prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => key(el, `${prefix}-${i}`)).filter((x): x is HTMLElement => !!x);

function timeline(c: Ctx, dur: number) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: c.m.gsapEase, duration: c.m.rise } });
  // the timeline spans the whole scene, so seeking past the last tween holds the end state
  tl.set({}, {}, Math.max(0.01, dur));
  return tl;
}

/** Words rise through their masks with a small tilt that settles; in reduced motion, they fade. */
function wordsIn(tl: gsap.core.Timeline, c: Ctx, words: HTMLElement[], at: number | ((i: number) => number), tilt = 4) {
  words.forEach((w, i) => {
    const t = typeof at === "function" ? at(i) : at + i * 0.07;
    // y: 0 clears the CSS start position (translate 112%), which GSAP would otherwise keep as y
    if (c.rm) tl.fromTo(w, { opacity: 0, y: 0, yPercent: 0 }, { opacity: 1, duration: 0.4, ease: "none" }, t);
    else tl.fromTo(w, { y: 0, yPercent: 118, rotation: tilt * c.m.drift }, { y: 0, yPercent: 0, rotation: 0 }, t);
  });
}

/** Words leave upward, accelerating, a little faster than they came. */
function wordsOut(tl: gsap.core.Timeline, c: Ctx, words: HTMLElement[], at: number) {
  if (!words.length) return;
  tl.to(words, c.rm ? { opacity: 0, duration: 0.3, ease: "none" } : { yPercent: -118, duration: c.m.rise * 0.45, ease: "power3.in", stagger: 0.03 }, at);
}

/** Fade and rise, with the reel's easing. */
function fadeIn(tl: gsap.core.Timeline, c: Ctx, el: Element | null | Element[], at: number, y = 28, stagger = 0) {
  if (!el || (Array.isArray(el) && !el.length)) return;
  tl.fromTo(el, { opacity: 0, y: c.rm ? 0 : y }, { opacity: 1, y: 0, duration: c.m.rise * 1.1, stagger }, at);
}

/** The small label above a heading slides in from the left. */
function eyebrowIn(tl: gsap.core.Timeline, c: Ctx, el: HTMLElement | null, at = 0.05) {
  if (el) tl.fromTo(el, { opacity: 0, x: c.rm ? 0 : -24 }, { opacity: 1, x: 0, duration: c.m.rise * 1.1 }, at);
}

/** A number written into `el` as it counts, keeping what surrounds it. */
function countUp(tl: gsap.core.Timeline, c: Ctx, el: HTMLElement | null, to: number, at: number, dur: number, format = (v: number) => formatNumber(Math.round(v), 0, c.lang)) {
  if (!el) return;
  const box = { v: 0 };
  el.textContent = format(0);
  tl.to(box, { v: to, duration: dur, ease: "power3.out", onUpdate: () => void (el.textContent = format(box.v)) }, at);
}

/** Camera position (zoom s centred on x, y) as GSAP transform values, origin top-left. */
const cam = ([sc, x, y]: ReelCam) => ({ x: W / 2 - x * sc, y: H / 2 - y * sc, scale: sc });

/** Slow camera breath over the whole scene: the ambient layer. */
function breathe(tl: gsap.core.Timeline, c: Ctx, el: HTMLElement | null, dur: number, amount: number) {
  if (!el || c.rm) return;
  tl.fromTo(el, { scale: 1 }, { scale: 1 + amount * c.m.drift, duration: dur, ease: "sine.inOut" }, 0);
}

// ── images: how each one enters and moves ────────────────────────────────────

const SPEED = { slow: { enter: 1.5, amp: 0.6 }, normal: { enter: 1, amp: 1 }, fast: { enter: 0.6, amp: 1.4 } } as const;

/**
 * An image's entry (on its wrapper) and its motion during the scene (on the picture, inside
 * its viewport), aimed at its focus point. `def` is what a scene does when nothing is chosen.
 */
function imageFx(tl: gsap.core.Timeline, c: Ctx, el: HTMLElement, k: string, fx: ImageFx, dur: number, def: { enter: ImgEnter; motion: ImgMotion }) {
  const wrap = key(el, k);
  const pic = key(el, `${k}-pic`);
  if (!wrap || !pic) return;
  const sp = SPEED[fx.imgSpeed ?? "normal"];
  const enterDur = c.m.rise * 1.6 * sp.enter;
  const focus = fx.imgFocus ?? "50% 50%";
  const enter = c.rm ? (fx.imgEnter === "none" ? "none" : "fade") : fx.imgEnter ?? def.enter;
  const motion = c.rm ? "still" : fx.imgMotion ?? def.motion;
  const full = "inset(0% 0% 0% 0%)";
  switch (enter) {
    case "fade":
      tl.fromTo(wrap, { opacity: 0 }, { opacity: 1, duration: enterDur * 0.8, ease: "none" }, 0);
      break;
    case "rise":
      tl.fromTo(wrap, { clipPath: "inset(100% 0% 0% 0%)", y: 60 }, { clipPath: full, y: 0, duration: enterDur, ease: "expo.out" }, 0);
      break;
    case "side":
      tl.fromTo(wrap, { clipPath: "inset(0% 0% 0% 100%)", x: 120 }, { clipPath: full, x: 0, duration: enterDur, ease: "expo.out" }, 0);
      break;
    case "circle":
      tl.fromTo(wrap, { clipPath: `circle(0% at ${focus})` }, { clipPath: `circle(150% at ${focus})`, duration: enterDur * 1.2, ease: "power3.inOut" }, 0);
      break;
    case "crop":
      tl.fromTo(wrap, { clipPath: "inset(10% 10% 10% 10% round 32px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: enterDur, ease: "expo.out" }, 0);
      break;
    case "far":
      tl.fromTo(wrap, { scale: 0.55, opacity: 0 }, { scale: 1, opacity: 1, duration: enterDur, ease: c.m.gsapEase }, 0);
      break;
  }
  gsap.set(pic, { transformOrigin: focus });
  const amp = sp.amp;
  switch (motion) {
    case "in":
      tl.fromTo(pic, { scale: 1 }, { scale: 1 + 0.15 * amp, duration: dur, ease: "sine.inOut" }, 0);
      break;
    case "out":
      tl.fromTo(pic, { scale: 1 + 0.15 * amp }, { scale: 1, duration: dur, ease: "power1.out" }, 0);
      break;
    case "panRight":
      tl.fromTo(pic, { scale: 1.16, xPercent: 5 * amp }, { scale: 1.16, xPercent: -5 * amp, duration: dur, ease: "sine.inOut" }, 0);
      break;
    case "panLeft":
      tl.fromTo(pic, { scale: 1.16, xPercent: -5 * amp }, { scale: 1.16, xPercent: 5 * amp, duration: dur, ease: "sine.inOut" }, 0);
      break;
    case "scroll":
      // a long screenshot travels from its top to its bottom
      tl.fromTo(pic, { objectPosition: "50% 0%" }, { objectPosition: "50% 100%", duration: dur * 0.85, ease: "sine.inOut" }, dur * 0.08);
      break;
    case "focus":
      // the camera goes to the point that matters and stays there
      tl.fromTo(pic, { scale: 1 }, { scale: 1.6 + 0.3 * (amp - 1), duration: Math.min(dur * 0.6, 3.2), ease: "power3.inOut" }, enterDur * 0.6);
      break;
  }
}

// ── headlines split by letter (title and end) ────────────────────────────────

/** Lines written into an element React leaves empty (SplitText rewrites it). */
function writeLines(host: HTMLElement, lines: string[], accent: string) {
  host.replaceChildren(
    ...splitWords(lines).map((line) => {
      const mask = document.createElement("span");
      mask.className = s.gLine;
      const inner = document.createElement("span");
      inner.className = s.gInner;
      line.forEach((w, i) => {
        const word = document.createElement("span");
        word.textContent = w.w;
        if (w.accent) {
          word.className = s.gAccent;
          word.dataset.accent = accent;
        }
        // punctuation after the highlight stays in the text colour but inside the word,
        // so SplitText keeps it with its word (and the beat count stays right)
        if (w.tail) {
          const tail = document.createElement("span");
          tail.className = s.gTail;
          tail.textContent = w.tail;
          word.append(tail);
        }
        inner.append(word);
        if (i < line.length - 1) inner.append(" ");
      });
      mask.append(inner);
      return mask;
    }),
  );
}

/**
 * Words rise through their line's mask on their beats, tilting and settling; highlighted
 * words cascade letter by letter into the case colour; with `out`, they leave upward.
 */
function splitHeadline(tl: gsap.core.Timeline, c: Ctx, host: HTMLElement, lines: string[], start: number, step: number, out?: number) {
  const accent = host.dataset.accent || "#fff";
  writeLines(host, lines, accent);
  const split = SplitText.create(qa(host, `.${s.gInner}`), { type: "words,chars", tag: "span", aria: "none", wordsClass: s.gWord, charsClass: s.gChar });
  const words = split.words as HTMLElement[];
  words.forEach((word, i) => {
    const at = start + i * step;
    wordsIn(tl, c, [word], at, 5);
    if (c.rm || !word.closest(`.${s.gAccent}`)) return;
    const chars = qa(word, `.${s.gChar}`).filter((ch) => !ch.closest(`.${s.gTail}`));
    tl.fromTo(chars, { yPercent: 55, opacity: 0 }, { yPercent: 0, opacity: 1, duration: c.m.rise * 0.8, stagger: 0.028 }, at + 0.06);
    tl.fromTo(chars, { color: INK }, { color: accent, duration: 0.5, stagger: 0.035, ease: "power1.inOut" }, at + c.m.rise * 0.4);
  });
  if (out !== undefined) wordsOut(tl, c, words, out);
  return words;
}

// ── scenes ───────────────────────────────────────────────────────────────────

/** Title: words on the beat, the highlight in letters, the photo pulling back behind. */
const title: TimelineBuilder = (el, raw, c, dur) => {
  const scene = raw as TitleScene;
  const host = q(el, "[data-gsap=title]");
  if (!host) return null;
  const b = (n: number) => n * c.beat;
  const tl = timeline(c, dur);
  const out = b(scene.out ?? Math.max(2, dur / c.beat - 1.5));
  const eyebrow = key(el, `${scene.id}-eb`);
  eyebrowIn(tl, c, eyebrow);
  if (eyebrow) tl.to(eyebrow, { opacity: 0, duration: 0.3, ease: "power2.in" }, out);
  // the first word is on screen with the cut: no empty frame
  splitHeadline(tl, c, host, scene.lines ?? [], Math.min(b(scene.wordsAt ?? 1), 0.1), b(scene.step ?? 1), out);
  if (scene.image) imageFx(tl, c, el, `${scene.id}-img`, { ...scene, imgFocus: scene.imgFocus ?? scene.imageFocus }, dur, { enter: "none", motion: "out" });
  return tl;
};

/** Flow: each line draws itself to the next step, the step pops in, the last one pulses. */
const flow: TimelineBuilder = (el, raw, c, dur) => {
  const scene = raw as FlowScene;
  const id = scene.id;
  const b = (n: number) => n * c.beat;
  const tl = timeline(c, dur);
  eyebrowIn(tl, c, key(el, `${id}-eb`));
  wordsIn(tl, c, keys(el, `${id}-h`, countWords([scene.heading])), b(0.25));
  const start = b(scene.nodesAt ?? 2);
  const step = b(scene.step ?? 2);
  scene.nodes.forEach((node, i) => {
    const at = start + i * step;
    const line = key(el, `${id}-ln-${i}`);
    if (line) {
      const vertical = line.classList.contains(s.flowLineV);
      const from = vertical ? { scaleY: 0 } : { scaleX: 0 };
      const to = vertical ? { scaleY: 1 } : { scaleX: 1 };
      tl.fromTo(line, from, { ...to, duration: Math.min(step * 0.7, 0.8), ease: "power2.inOut" }, at - Math.min(step * 0.7, 0.8));
    }
    const n = key(el, `${id}-n-${i}`);
    if (!n) return;
    if (c.rm) {
      tl.fromTo(n, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "none" }, at);
      return;
    }
    tl.fromTo(n, { opacity: 0, y: 40, scale: 0.7 }, { opacity: 1, y: 0, scale: 1, duration: c.m.rise, ease: "back.out(1.6)" }, at);
    // the title and detail under the circle arrive a beat later (secondary)
    fadeIn(tl, c, qa(n, "p"), at + 0.12, 12, 0.06);
    if (node.accent) tl.to(q(n, `.${s.flowCircle}`), { scale: 1.1, duration: 0.25, ease: "power2.out", yoyo: true, repeat: 1 }, at + c.m.rise);
  });
  fadeIn(tl, c, key(el, `${id}-cap`), b(scene.captionAt ?? scene.nodes.length * (scene.step ?? 2) + 2));
  breathe(tl, c, key(el, `${id}-cam`), dur, 0.05);
  return tl;
};

/** Number: lands big and counts up; the bars grow one by one, counting their share. */
const number: TimelineBuilder = (el, raw, c, dur) => {
  const scene = raw as NumberScene;
  const id = scene.id;
  const b = (n: number) => n * c.beat;
  const tl = timeline(c, dur);
  eyebrowIn(tl, c, key(el, `${id}-eb`));
  const at = 0.05;
  const num = key(el, `${id}-num`);
  if (num) tl.fromTo(num, { opacity: 0, scale: c.rm ? 1 : 1.25, transformOrigin: "0% 60%" }, { opacity: 1, scale: 1, duration: c.m.rise * 1.2 }, at);
  countUp(tl, c, key(el, `${id}-val`), scene.value, at, b(scene.countBeats ?? 4));
  fadeIn(tl, c, key(el, `${id}-lb`), at + 0.4);
  const barsAt = b(scene.barsAt ?? 6);
  fadeIn(tl, c, key(el, `${id}-bt`), barsAt - b(1), 18);
  (scene.bars ?? []).forEach((bar, i) => {
    const t = barsAt + i * b(scene.step ?? 1);
    const row = key(el, `${id}-b-${i}`);
    fadeIn(tl, c, row, t, 24);
    const fill = key(el, `${id}-bf-${i}`);
    if (fill) tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power3.out" }, t + 0.1);
    if (row) countUp(tl, c, q(row, `.${s.barValue}`), bar.value, t + 0.1, 0.9, (v) => `${Math.round(v)}%`);
  });
  fadeIn(tl, c, key(el, `${id}-src`), barsAt, 0);
  return tl;
};

/** List: each item rises through its mask and its mark turns into place; the picture drifts. */
const list: TimelineBuilder = (el, raw, c, dur) => {
  const scene = raw as ListScene;
  const id = scene.id;
  const b = (n: number) => n * c.beat;
  const tl = timeline(c, dur);
  eyebrowIn(tl, c, key(el, `${id}-eb`));
  fadeIn(tl, c, key(el, `${id}-h`), 0.05);
  const start = b(scene.itemsAt ?? 4);
  scene.items.forEach((_, i) => {
    const item = key(el, `${id}-i-${i}`);
    if (!item) return;
    const at = start + i * b(scene.step ?? 1);
    if (c.rm) {
      tl.fromTo(item, { opacity: 0, y: 0, yPercent: 0 }, { opacity: 1, duration: 0.4, ease: "none" }, at);
      return;
    }
    tl.fromTo(item, { y: 0, yPercent: 112 }, { y: 0, yPercent: 0 }, at);
    const mark = q(item, `.${s.listMark}`);
    if (mark) tl.fromTo(mark, { rotation: -120, scale: 0.4 }, { rotation: 0, scale: 1, duration: c.m.rise * 1.1, ease: "back.out(2)" }, at + 0.08);
  });
  if (scene.image) imageFx(tl, c, el, `${id}-img`, { ...scene, imgFocus: scene.imgFocus ?? "50% 0%" }, dur, { enter: "rise", motion: "in" });
  return tl;
};

/** Cards: tilt up in 3D and settle; each card's number, title and text follow it in. */
const cards: TimelineBuilder = (el, raw, c, dur) => {
  const scene = raw as CardsScene;
  const id = scene.id;
  const b = (n: number) => n * c.beat;
  const tl = timeline(c, dur);
  eyebrowIn(tl, c, key(el, `${id}-eb`));
  wordsIn(tl, c, keys(el, `${id}-h`, countWords([scene.heading])), b(0.25));
  const start = b(scene.cardsAt ?? 1);
  scene.cards.forEach((_, i) => {
    const card = key(el, `${id}-c-${i}`);
    if (!card) return;
    const at = start + i * b(scene.step ?? 2);
    if (c.rm) {
      tl.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "none" }, at);
      return;
    }
    tl.fromTo(
      card,
      { opacity: 0, y: 120, rotationX: 22, scale: 0.9, transformPerspective: 1400, transformOrigin: "50% 100%" },
      { opacity: 1, y: 0, rotationX: 0, scale: 1, duration: c.m.rise * 1.15 },
      at,
    );
    fadeIn(tl, c, Array.from(card.children), at + 0.15, 16, 0.06);
    // one card in focus: the ones before step back while it arrives
    const before = keys(el, `${id}-c`, i);
    if (before.length) tl.to(before, { opacity: 0.32, scale: 0.97, duration: 0.4, ease: "power2.out" }, at);
  });
  // then all of them together, as the summary
  const all = keys(el, `${id}-c`, scene.cards.length);
  const last = start + (scene.cards.length - 1) * b(scene.step ?? 2);
  if (all.length > 1) tl.to(all, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" }, Math.min(last + b(2), dur * 0.85));
  return tl;
};

/** Screens: cuts between boards (each slides in), the camera travels to the chosen screen. */
const screens: TimelineBuilder = (el, raw, c, dur) => {
  const scene = raw as ScreensScene;
  const id = scene.id;
  const b = (n: number) => n * c.beat;
  const tl = timeline(c, dur);
  const view = key(el, `${id}-view`);
  const shots = sceneShots(scene, dur / c.beat);
  if (!view || !shots.length) return tl;
  const boards = qa(view, "[data-k]").filter((x) => x.dataset.k?.startsWith(`${id}-bd-`));
  const boardOf = (src: string) => boards.find((x) => x.dataset.src === src);
  gsap.set(view, { transformOrigin: "0 0" });
  tl.set(boards, { autoAlpha: 0 }, 0);
  // A board in a frame of its own size (prepared screens) is narrower than the stage: the camera
  // aims at the same spot of the frame, kept inside it so it never looks past the screen.
  let current: HTMLElement | undefined;
  const aim = ([sc, x, y]: ReelCam): ReelCam => {
    if (!current || !current.style.width) return [sc, x, y];
    const L = parseFloat(current.style.left), T = parseFloat(current.style.top), Wd = parseFloat(current.style.width), Ht = parseFloat(current.style.height);
    const fit = (v: number, lo: number, len: number, half: number) => (len <= half * 2 ? lo + len / 2 : Math.min(lo + len - half, Math.max(lo + half, v)));
    const nx = L + (x / W) * Wd;
    const ny = T + ((y - 70) / 940) * Ht;
    return [sc, fit(nx, L, Wd, W / 2 / sc), fit(ny, T, Ht, H / 2 / sc)];
  };
  shots.forEach((rawShot, i) => {
    if (rawShot.src) current = boardOf(rawShot.src);
    const shot = { ...rawShot, cam: sceneShotsFromBoards(scene) && rawShot.cam[0] > 1.1 ? aim(rawShot.cam) : rawShot.cam };
    const at = b(shot.at);
    const next = shots[i + 1];
    const until = next ? b(next.at) : dur;
    if (shot.src) {
      const board = boardOf(shot.src);
      tl.set(boards, { autoAlpha: 0 }, at);
      // the blurred surround follows the board on screen
      const auras = qa(el, "[data-k]").filter((x) => x.dataset.k?.startsWith(`${id}-au-`));
      if (auras.length && board) {
        tl.set(auras, { autoAlpha: 0 }, at);
        tl.set(auras[boards.indexOf(board)] ?? [], { autoAlpha: 1 }, at);
      }
      if (board) {
        tl.set(board, { autoAlpha: 1 }, at);
        if (i > 0 && !c.rm) tl.fromTo(board, { xPercent: 6 }, { xPercent: 0, duration: 0.45, ease: "expo.out" }, at);
      }
      tl.set(view, c.rm ? { x: 0, y: 0, scale: 1 } : cam(shot.cam), at);
    } else if (!c.rm) {
      // the camera travels to the screen, then keeps breathing until the next cut
      const move = Math.min(b(1.5), until - at);
      tl.to(view, { ...cam(shot.cam), duration: move, ease: "expo.inOut" }, at);
      tl.to(view, { scale: shot.cam[0] * (1 + 0.03 * c.m.drift), x: W / 2 - shot.cam[1] * shot.cam[0] * (1 + 0.03 * c.m.drift), y: H / 2 - shot.cam[2] * shot.cam[0] * (1 + 0.03 * c.m.drift), duration: Math.max(0.01, until - at - move), ease: "none" }, at + move);
    }
  });
  // The sheet: under the title it sits lower and smaller; once the title leaves it centres;
  // when the camera goes close to a screen, the sheet grows with it and fills the stage.
  const sheet = key(el, `${id}-sheet`);
  const moves = shots.filter((x) => !x.src).map((x) => b(x.at));
  const titleOut = scene.title ? (scene.titleOut !== undefined ? b(scene.titleOut) : moves[0]) : 0;
  if (sheet) sheetStates(tl, c, sheet, shots, b, dur, scene.title ? titleOut ?? dur : 0);
  if (scene.title) {
    const words = keys(el, `${id}-t`, countWords([scene.title]));
    wordsIn(tl, c, words, b(0.25));
    if (titleOut !== undefined && titleOut < dur) wordsOut(tl, c, words, titleOut);
  }
  return tl;
};

type Sheet = { scale: number; y: number; borderRadius: number };
const SHEET = {
  titled: { scale: 0.8, y: 74, borderRadius: 44 },
  centred: { scale: 0.88, y: 0, borderRadius: 44 },
  full: { scale: 1, y: 0, borderRadius: 0 },
} satisfies Record<string, Sheet>;

/** The sheet's states over the scene, each tween from the state before (seeking stays exact). */
function sheetStates(tl: gsap.core.Timeline, c: Ctx, sheet: HTMLElement, shots: ScreensScene["shots"], b: (n: number) => number, dur: number, titleUntil: number) {
  const rest = (t: number) => (t < titleUntil ? SHEET.titled : SHEET.centred);
  const events: { at: number; to: Sheet; len: number }[] = [];
  shots.forEach((shot, i) => {
    const at = b(shot.at);
    const until = shots[i + 1] ? b(shots[i + 1].at) : dur;
    if (shot.src) {
      if (i > 0) events.push({ at, to: rest(at), len: 0.45 });
    } else events.push({ at, to: SHEET.full, len: Math.min(b(1.5), until - at) });
  });
  if (titleUntil > 0 && titleUntil < dur && !events.some((e) => Math.abs(e.at - titleUntil) < 0.05)) events.push({ at: titleUntil, to: SHEET.centred, len: 0.8 });
  events.sort((x, y) => x.at - y.at);
  gsap.set(sheet, { transformOrigin: "50% 50%" });
  let from: Sheet = rest(0);
  tl.fromTo(sheet, { ...from, y: from.y + (c.rm ? 0 : 60), opacity: 0 }, { ...from, opacity: 1, duration: c.rm ? 0.3 : c.m.rise * 1.2, ease: "expo.out" }, 0);
  events.forEach((e) => {
    if (c.rm) tl.set(sheet, e.to, e.at);
    else tl.fromTo(sheet, { ...from }, { ...e.to, duration: e.len, ease: "expo.inOut", immediateRender: false }, e.at);
    from = e.to;
  });
}

/** Compare: a curtain reveals the after, its edge in the case colour; labels trade places. */
const compare: TimelineBuilder = (el, raw, c, dur) => {
  const scene = raw as CompareScene;
  const id = scene.id;
  const b = (n: number) => n * c.beat;
  const tl = timeline(c, dur);
  const wipe = b(scene.wipeAt);
  const len = b(1.5);
  const after = key(el, `${id}-after`);
  const edge = key(el, `${id}-div`);
  const lb0 = key(el, `${id}-lb0`);
  const lb1 = key(el, `${id}-lb1`);
  if (lb0) {
    tl.fromTo(lb0, { opacity: 0, y: c.rm ? 0 : 16 }, { opacity: 1, y: 0, duration: 0.6 }, 0.2);
    tl.to(lb0, { opacity: 0, x: c.rm ? 0 : -20, duration: 0.3, ease: "power2.in" }, wipe);
  }
  if (after) {
    if (c.rm) tl.fromTo(after, { opacity: 0, clipPath: "inset(0% 0% 0% 0%)" }, { opacity: 1, duration: 0.6, ease: "none" }, wipe);
    else tl.fromTo(after, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: len, ease: "power4.inOut" }, wipe);
  }
  if (edge && !c.rm) {
    tl.fromTo(edge, { x: 0, opacity: 1 }, { x: el.offsetWidth || W, duration: len, ease: "power4.inOut" }, wipe);
    tl.set(edge, { opacity: 0 }, wipe + len);
  }
  const sheet = key(el, `${id}-sheet`);
  if (sheet) tl.fromTo(sheet, { scale: 0.88, y: c.rm ? 0 : 60, opacity: 0, transformOrigin: "50% 50%" }, { scale: 0.88, y: 0, opacity: 1, duration: c.rm ? 0.3 : c.m.rise * 1.2, ease: "expo.out" }, 0);
  const au1 = key(el, `${id}-au1`);
  if (au1) tl.fromTo(au1, { opacity: 0 }, { opacity: 1, duration: len, ease: "power2.inOut" }, wipe);
  if (lb1) tl.fromTo(lb1, { opacity: 0, scale: c.rm ? 1 : 0.6 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, wipe + len);
  breathe(tl, c, key(el, `${id}-cam`), dur, 0.04);
  return tl;
};

/** Metrics: the headline figure lands and counts; the rings fill as their numbers count. */
const metrics: TimelineBuilder = (el, raw, c, dur) => {
  const scene = raw as MetricsScene;
  const id = scene.id;
  const b = (n: number) => n * c.beat;
  const tl = timeline(c, dur);
  const v = key(el, `${id}-v`);
  if (v) {
    tl.fromTo(v, { opacity: 0, scale: c.rm ? 1 : 1.35, transformOrigin: "0% 60%" }, { opacity: 1, scale: 1, duration: c.m.rise * 1.1 }, 0.05);
    // "5,2M → 17,8M": the before stays, the after counts up from it
    const pair = /^(.*?)(\d+(?:[.,]\d+)?)(\D*?)(\s*(?:→|->)\s*)(\D*?)(\d+(?:[.,]\d+)?)(.*)$/.exec(scene.value);
    // "+99%": count the number, keep what surrounds it
    const m = /^(\D*)(\d+(?:[.,]\d+)?)(.*)$/.exec(scene.value);
    // the separator the reel's language reads (English texts already say 5.2)
    const sep = c.lang === "en" ? "." : ",";
    // a separator before exactly three digits groups thousands (1.200, 1,200); any other is the decimal one
    const n = (x: string) => Number(/[.,]\d{3}$/.test(x) ? x.replace(/[.,]/g, "") : x.replace(",", "."));
    const dec = (x: string) => (/[.,]\d{1,2}$/.test(x) ? 1 : 0);
    if (pair) {
      const [, pre, a, aU, arrow, bPre, bNum, rest] = pair;
      const head = `${pre}${a}${aU}${arrow}${bPre}`;
      v.textContent = `${head}${a}${rest}`;
      const box = { v: n(a) };
      tl.to(box, { v: n(bNum), duration: b(3), ease: "power3.out", onUpdate: () => void (v.textContent = `${head}${box.v.toFixed(dec(bNum)).replace(".", sep)}${rest}`) }, c.m.rise * 0.6);
    } else if (m) {
      const decimals = /[.,]\d{1,2}$/.test(m[2]) ? 1 : 0;
      countUp(tl, c, v, n(m[2]), 0.05, b(3), (x) => `${m[1]}${decimals ? x.toFixed(decimals).replace(".", sep) : /[.,]/.test(m[2]) ? formatNumber(Math.round(x), 0, c.lang) : Math.round(x)}${m[3]}`);
    }
  }
  wordsIn(tl, c, keys(el, `${id}-l`, countWords(scene.label.split("\n"))), b(1));
  const start = b(scene.gaugesAt ?? 4);
  scene.gauges.forEach((g, i) => {
    const at = start + i * b(scene.step ?? 2);
    fadeIn(tl, c, key(el, `${id}-g-${i}`), at, 40);
    const ring = key(el, `${id}-ring-${i}`);
    if (ring) {
      const full = Number(ring.getAttribute("stroke-dasharray")) || 0;
      tl.fromTo(ring, { attr: { "stroke-dashoffset": full } }, { attr: { "stroke-dashoffset": full * (1 - g.value / 100) }, duration: 1.5, ease: "power3.out" }, at + 0.1);
    }
    countUp(tl, c, key(el, `${id}-gv-${i}`), g.value, at + 0.1, 1.5);
  });
  fadeIn(tl, c, key(el, `${id}-note`), start, 0);
  return tl;
};

/** Image: a rounded crop opens to the full picture, then the camera moves slowly. */
const image: TimelineBuilder = (el, raw, c, dur) => {
  const scene = raw as ImageScene;
  const id = scene.id;
  const b = (n: number) => n * c.beat;
  const tl = timeline(c, dur);
  // with any image setting (or without the old camera path), the image controls lead;
  // reels made before them keep their camera from → to
  const legacy = !scene.imgEnter && !scene.imgMotion && !scene.imgFrame && (scene.from || scene.to);
  const pic = key(el, `${id}-img`);
  if (!legacy) imageFx(tl, c, el, `${id}-img`, scene, dur, { enter: "crop", motion: "in" });
  else if (pic) {
    const from = scene.from ?? [1, W / 2, H / 2];
    const to = scene.to ?? from;
    const target = key(el, `${id}-img-pic`) ?? pic;
    if (!c.rm) tl.fromTo(pic, { clipPath: "inset(10% 10% 10% 10% round 32px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: c.m.rise * 1.6, ease: "expo.out" }, 0);
    if (scene.fit === "split") {
      if (!c.rm) tl.fromTo(target, { scale: from[0] }, { scale: to[0], duration: dur, ease: "sine.inOut" }, 0);
    } else {
      gsap.set(target, { transformOrigin: "0 0" });
      if (c.rm) tl.set(target, { x: 0, y: 0, scale: 1 }, 0);
      else tl.fromTo(target, cam(from), { ...cam(to), duration: dur, ease: "sine.inOut" }, 0);
    }
  }
  const tt = b(scene.textAt ?? 1);
  eyebrowIn(tl, c, key(el, `${id}-eb`), Math.max(0, tt - 0.3));
  if (scene.lines?.length) wordsIn(tl, c, keys(el, `${id}-w`, countWords(scene.lines)), (i) => tt + i * b(0.5));
  fadeIn(tl, c, key(el, `${id}-body`), tt + b(2));
  return tl;
};

/** Quote: the quotation mark lands first, the words follow at reading pace, then who said it. */
const quote: TimelineBuilder = (el, raw, c, dur) => {
  const scene = raw as QuoteScene;
  const id = scene.id;
  const b = (n: number) => n * c.beat;
  const tl = timeline(c, dur);
  const mark = key(el, `${id}-mark`);
  if (mark) tl.fromTo(mark, { opacity: 0, scale: c.rm ? 1 : 0.4, rotation: c.rm ? 0 : -14 }, { opacity: 1, scale: 1, rotation: 0, duration: c.m.rise * 1.2, ease: c.rm ? "none" : "back.out(1.7)" }, 0.05);
  const words = keys(el, `${id}-q`, countWords(scene.quote.split("\n")));
  const start = Math.min(b(scene.quoteAt ?? 1), 0.25);
  // every word in by the middle of the scene, never slower than half a beat each
  const step = Math.min(b(0.5), (dur * 0.5 - start) / Math.max(1, words.length));
  wordsIn(tl, c, words, (i) => start + i * Math.max(0.04, step), 3);
  fadeIn(tl, c, key(el, `${id}-by`), start + words.length * Math.max(0.04, step) + 0.25, 20);
  breathe(tl, c, key(el, `${id}-cam`), dur, 0.03);
  return tl;
};

/** Role: the claim, then each fact: its line draws, the label shows, the value rises. */
const role: TimelineBuilder = (el, raw, c, dur) => {
  const scene = raw as RoleScene;
  const id = scene.id;
  const b = (n: number) => n * c.beat;
  const tl = timeline(c, dur);
  eyebrowIn(tl, c, key(el, `${id}-eb`));
  wordsIn(tl, c, keys(el, `${id}-h`, countWords(scene.heading.split("\n"))), b(0.25));
  const start = b(scene.factsAt ?? 2);
  scene.facts.forEach((_, i) => {
    const at = start + i * b(scene.step ?? 1);
    const line = key(el, `${id}-ln-${i}`);
    if (line) tl.fromTo(line, { scaleX: c.rm ? 1 : 0 }, { scaleX: 1, duration: 0.7, ease: "power2.inOut" }, at);
    fadeIn(tl, c, key(el, `${id}-fl-${i}`), at + 0.1, 10);
    const value = key(el, `${id}-fv-${i}`);
    if (!value) return;
    if (c.rm) tl.fromTo(value, { opacity: 0, y: 0, yPercent: 0 }, { opacity: 1, duration: 0.4, ease: "none" }, at + 0.15);
    else tl.fromTo(value, { y: 0, yPercent: 112 }, { y: 0, yPercent: 0 }, at + 0.15);
  });
  breathe(tl, c, key(el, `${id}-cam`), dur, 0.03);
  return tl;
};

/** Delta: the old number shows, gets struck out; an arrow draws and the new one counts up from it. */
const delta: TimelineBuilder = (el, raw, c, dur) => {
  const scene = raw as DeltaScene;
  const id = scene.id;
  const b = (n: number) => n * c.beat;
  const tl = timeline(c, dur);
  eyebrowIn(tl, c, key(el, `${id}-eb`));
  wordsIn(tl, c, keys(el, `${id}-l`, countWords(scene.label.split("\n"))), b(0.25));
  const before = key(el, `${id}-b`);
  fadeIn(tl, c, before, b(0.75), 30);
  const change = Math.max(b(1.5), b(scene.changeAt ?? 2));
  const strike = key(el, `${id}-strike`);
  if (strike) tl.fromTo(strike, { scaleX: 0 }, { scaleX: 1, duration: c.rm ? 0.01 : 0.5, ease: "power3.inOut" }, change);
  if (before) tl.to(before, { opacity: 0.6, duration: 0.5, ease: "power1.inOut" }, change);
  const arrow = key(el, `${id}-arrow`);
  if (arrow) {
    tl.set(arrow, { opacity: 1 }, change + 0.2);
    tl.fromTo(q(arrow, "path"), { attr: { "stroke-dashoffset": c.rm ? 0 : 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.6, ease: "power2.inOut" }, change + 0.2);
  }
  const after = key(el, `${id}-a`);
  if (after) tl.fromTo(after, { opacity: 0, x: c.rm ? 0 : -48 }, { opacity: 1, x: 0, duration: c.m.rise * 1.2 }, change + 0.45);
  const value = key(el, `${id}-av`);
  if (value) {
    const dec = decimalsOf(scene.before.value, scene.after.value);
    const box = { v: scene.before.value };
    value.textContent = formatNumber(box.v, dec, c.lang);
    tl.to(box, { v: scene.after.value, duration: b(3), ease: "power3.out", onUpdate: () => void (value.textContent = formatNumber(box.v, dec, c.lang)) }, change + 0.45);
  }
  fadeIn(tl, c, key(el, `${id}-note`), change + b(1), 0);
  return tl;
};

/** End: the closing lines like the opening; then who and when, then the signature. */
const end: TimelineBuilder = (el, raw, c, dur) => {
  const scene = raw as EndScene;
  const id = scene.id;
  const b = (n: number) => n * c.beat;
  const tl = timeline(c, dur);
  const host = q(el, "[data-gsap=title]");
  if (host) splitHeadline(tl, c, host, scene.lines ?? [], b(0.25), b(0.5));
  fadeIn(tl, c, key(el, `${id}-meta`), b(3));
  const cta = key(el, `${id}-cta`);
  if (cta) tl.fromTo(cta, { opacity: 0, scale: c.rm ? 1 : 0.8, y: c.rm ? 0 : 20 }, { opacity: 1, scale: 1, y: 0, duration: c.m.rise, ease: "back.out(1.8)" }, b(3.5));
  fadeIn(tl, c, key(el, `${id}-sig`), b(4), 0);
  return tl;
};

export const TIMELINES: Record<ReelScene["kind"], TimelineBuilder> = { title, flow, number, list, cards, screens, compare, metrics, image, quote, role, delta, end };

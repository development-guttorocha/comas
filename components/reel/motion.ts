// Reel motion foundations: easing, the motion personalities, scene entrances and the
// drawing context. The scenes themselves move with GSAP timelines (timelines.ts), seeked
// from t, so a frame is still a pure function of t: no CSS animations, timers or
// Math.random on the stage, and scrubbing, pausing and replaying draw the same frame.

export const W = 1920;
export const H = 1080;
export const STAGE_SIZE = {
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
} as const;

// ── easing ───────────────────────────────────────────────────────────────────
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** 0 → 1 progress between a and b */
export const prog = (t: number, a: number, b: number) => (b <= a ? (t >= a ? 1 : 0) : clamp01((t - a) / (b - a)));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** fast → slow (entrances) */
export const outExpo = (p: number) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
export const outCubic = (p: number) => 1 - Math.pow(1 - p, 3);
export const inCubic = (p: number) => p * p * p;
export const inOutCubic = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
export const inOutQuart = (p: number) => (p < 0.5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2);
export const inOutExpo = (p: number) =>
  p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2;
export const outBack = (p: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};

/** cubic-bezier(x1, y1, x2, y2) as an easing of p (Newton steps on x, then y). */
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const a = (a1: number, a2: number) => 1 - 3 * a2 + 3 * a1;
  const b = (a1: number, a2: number) => 3 * a2 - 6 * a1;
  const c = (a1: number) => 3 * a1;
  const at = (t: number, a1: number, a2: number) => ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t;
  const slope = (t: number, a1: number, a2: number) => 3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1);
  return (p: number) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let t = p;
    for (let i = 0; i < 6; i++) {
      const s = slope(t, x1, x2);
      if (Math.abs(s) < 1e-6) break;
      t -= (at(t, x1, x2) - p) / s;
    }
    return at(clamp01(t), y1, y2);
  };
}

// ── motion personality ───────────────────────────────────────────────────────
// One archetype per reel (motion-design skill): it sets the signature easing, the duration
// palette, how far the camera breathes and how strong the scene entrances are. Entrances
// decelerate, exits accelerate; exits are a little shorter than entrances.

export type Personality = "energetic" | "premium" | "corporate" | "playful";
export interface MotionProfile {
  /** how long a word or element takes to arrive, in seconds */
  rise: number;
  /** signature entrance easing */
  ease: (p: number) => number;
  /** fades and small moves, as a factor of their default length */
  pace: number;
  /** zoom entrances start this much larger */
  enterZoom: number;
  /** slow camera moves inside a scene, as a factor (ambient life) */
  drift: number;
  /** strength of the ambient glow behind dark scenes */
  ambient: number;
  /** the same signature easing, as a GSAP ease (for the GSAP-choreographed scenes) */
  gsapEase: string;
}
export const MOTION: Record<Personality, MotionProfile> = {
  energetic: { rise: 0.7, ease: outExpo, pace: 1, enterZoom: 1.4, drift: 1, ambient: 0.12, gsapEase: "expo.out" },
  premium: { rise: 1.0, ease: bezier(0.4, 0, 0.2, 1), pace: 1.35, enterZoom: 1.08, drift: 0.5, ambient: 0.08, gsapEase: "power3.out" },
  corporate: { rise: 0.6, ease: bezier(0.2, 0, 0, 1), pace: 0.9, enterZoom: 1.15, drift: 0.6, ambient: 0.06, gsapEase: "power4.out" },
  playful: { rise: 0.55, ease: outBack, pace: 0.85, enterZoom: 1.3, drift: 1.1, ambient: 0.14, gsapEase: "back.out(1.8)" },
};
export const PERSONALITY_LABEL: Record<Personality, string> = {
  energetic: "Energética",
  premium: "Premium",
  corporate: "Corporativa",
  playful: "Lúdica",
};

/** murmur-style integer hash: all randomness on the stage comes from here */
export function hash(n: number) {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// ── drawing context ──────────────────────────────────────────────────────────
export type El = HTMLElement | SVGElement;
export interface Ctx {
  /** the element with data-k="key" */
  g: (k: string) => El | undefined;
  /** reduced motion: moves, zooms and wipes become fades */
  rm: boolean;
  /** length of one beat, in seconds */
  beat: number;
  /** the reel's motion personality */
  m: MotionProfile;
  /** language of the numbers on screen (5,2 in Portuguese, 5.2 in English) */
  lang: "pt" | "en";
}

export function show(c: Ctx, k: string, on: boolean) {
  const el = c.g(k);
  if (!el) return;
  const d = on ? "" : "none";
  if (el.style.display !== d) el.style.display = d;
}

import gsap from "gsap";
import type { ReelDir, ReelEnter } from "@/lib/reel/types";
import type { El, MotionProfile } from "./motion";

// Scene transitions: each one moves BOTH scenes, the one leaving and the one arriving, as a
// pure function of the transition's progress p (0 → 1), so scrubbing draws the same frame.
// Curves come from GSAP's ease library; only transform, opacity, clip-path and mask move.

export const TRANSITIONS: { value: ReelEnter; label: string; hint: string; directional?: boolean }[] = [
  { value: "cut", label: "Corte seco", hint: "Troca exatamente na batida." },
  { value: "fade", label: "Fade", hint: "Uma cena se dissolve na outra." },
  { value: "push", label: "Empurrar", hint: "A nova cena empurra a anterior para fora.", directional: true },
  { value: "wipe", label: "Cortina", hint: "A nova cena se revela de um lado.", directional: true },
  { value: "iris", label: "Íris", hint: "Um círculo se abre no centro." },
  { value: "zoom", label: "Zoom", hint: "A nova cena chega de perto e assenta." },
  { value: "zoomThrough", label: "Zoom através", hint: "A câmera mergulha na cena e sai na próxima." },
  { value: "blinds", label: "Persianas", hint: "Faixas diagonais revelam a nova cena." },
  { value: "flash", label: "Flash", hint: "Um clarão na cor do case marca o corte." },
  { value: "curtain", label: "Cortina do case", hint: "Uma cortina na cor do case passa pela tela e troca a cena (a transição dos drops)." },
];
export const DIRECTIONS: { value: ReelDir; label: string }[] = [
  { value: "right", label: "Da direita" },
  { value: "left", label: "Da esquerda" },
  { value: "up", label: "De baixo" },
  { value: "down", label: "De cima" },
];
export const transitionLabel = (v?: ReelEnter) => TRANSITIONS.find((t) => t.value === (v === "slide" ? "push" : v ?? "cut"))?.label ?? "Corte seco";

const inOut = gsap.parseEase("power3.inOut");
const easeIn = gsap.parseEase("power2.in");
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const span = (p: number, a: number, b: number) => clamp((p - a) / (b - a));

function set(el: El | undefined, prop: string, value: string) {
  if (!el) return;
  const st = el.style as unknown as Record<string, string>;
  if (st[prop] !== value) st[prop] = value;
}
function setMask(el: El | undefined, value: string) {
  if (!el) return;
  el.style.setProperty("mask-image", value);
  el.style.setProperty("-webkit-mask-image", value);
}

/** A scene at rest: no transition styles. */
export function rest(el: El | undefined) {
  set(el, "transform", "none");
  set(el, "opacity", "1");
  set(el, "clipPath", "none");
  set(el, "transformOrigin", "50% 50%");
  if (el && el.style.getPropertyValue("mask-image")) setMask(el, "");
}

/** Where the new scene comes from, as a unit vector in percent of the stage. */
const vector = (dir: ReelDir = "right") => ({ right: [100, 0], left: [-100, 0], up: [0, 100], down: [0, -100] })[dir];

export function applyTransition(
  kind: ReelEnter,
  dir: ReelDir | undefined,
  p: number,
  incoming: El | undefined,
  outgoing: El | undefined,
  { rm, m, flash }: { rm: boolean; m: MotionProfile; flash?: El },
) {
  const k: ReelEnter = rm && kind !== "cut" ? "fade" : kind === "slide" ? "push" : kind;
  const e = inOut(clamp(p));
  switch (k) {
    case "cut":
      return;
    case "fade":
      set(incoming, "opacity", e.toFixed(4));
      return;
    case "push": {
      const [x, y] = vector(dir);
      set(incoming, "transform", `translate(${(x * (1 - e)).toFixed(2)}%, ${(y * (1 - e)).toFixed(2)}%)`);
      set(outgoing, "transform", `translate(${(-x * e).toFixed(2)}%, ${(-y * e).toFixed(2)}%)`);
      return;
    }
    case "wipe": {
      const r = ((1 - e) * 100).toFixed(2);
      const inset = { right: `inset(0 0 0 ${r}%)`, left: `inset(0 ${r}% 0 0)`, up: `inset(${r}% 0 0 0)`, down: `inset(0 0 ${r}% 0)` }[dir ?? "right"];
      set(incoming, "clipPath", inset);
      // the scene underneath slides a little the other way (parallax)
      const [x, y] = vector(dir);
      set(outgoing, "transform", `translate(${(-x * 0.12 * e).toFixed(2)}%, ${(-y * 0.12 * e).toFixed(2)}%)`);
      return;
    }
    case "iris":
      set(incoming, "clipPath", `circle(${(e * 76).toFixed(2)}% at 50% 50%)`);
      set(outgoing, "transform", `scale(${(1 + 0.06 * e).toFixed(4)})`);
      return;
    case "zoom": {
      const q = clamp(p);
      set(incoming, "transform", `scale(${(m.enterZoom - (m.enterZoom - 1) * m.ease(q)).toFixed(4)})`);
      set(incoming, "opacity", String(Math.min(1, q * 2.5)));
      return;
    }
    case "zoomThrough": {
      // the camera dives into the old scene, then arrives in the new one
      const dive = easeIn(span(p, 0, 0.55));
      set(outgoing, "transform", `scale(${(1 + 0.8 * dive).toFixed(4)})`);
      set(outgoing, "opacity", (1 - span(p, 0.3, 0.55)).toFixed(4));
      const arrive = m.ease(span(p, 0.4, 1));
      set(incoming, "transform", `scale(${(0.82 + 0.18 * arrive).toFixed(4)})`);
      set(incoming, "opacity", span(p, 0.4, 0.65).toFixed(4));
      return;
    }
    case "blinds": {
      const w = (e * 96).toFixed(2);
      setMask(incoming, `repeating-linear-gradient(-45deg, #000 0 ${w}px, transparent ${w}px 96px)`);
      return;
    }
    case "curtain": {
      // a panel in the case colour sweeps across; the scenes swap while it covers the screen
      const q = clamp(p);
      const e2 = gsap.parseEase("power4.inOut")(q);
      set(flash, "opacity", q > 0 && q < 1 ? "1" : "0");
      set(flash, "clipPath", q < 0.5 ? `inset(0 ${(100 - e2 * 200).toFixed(2)}% 0 0)` : `inset(0 0 0 ${((e2 - 0.5) * 200).toFixed(2)}%)`);
      set(incoming, "opacity", q < 0.5 ? "0" : "1");
      set(outgoing, "opacity", q < 0.5 ? "1" : "0");
      return;
    }
    case "flash": {
      // a quick burst in the case colour; the cut happens at its peak
      const peak = 0.15;
      const glow = p < peak ? p / peak : 1 - (p - peak) / (1 - peak);
      set(flash, "opacity", (clamp(glow) * 0.92).toFixed(4));
      set(incoming, "opacity", p < peak ? "0" : "1");
      set(incoming, "transform", `scale(${(1.06 - 0.06 * m.ease(span(p, peak, 1))).toFixed(4)})`);
      set(outgoing, "opacity", p < peak ? "1" : "0");
      return;
    }
  }
}

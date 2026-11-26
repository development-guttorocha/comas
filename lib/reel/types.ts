// A case reel, as stored in content/cases/<slug>/reel.json. It is data only: scene kinds
// come from a fixed library (components/reel/scenes.tsx) and every time is in beats of
// the track, so the cuts always land on the music.
//
// Times: a scene's `at` is the beat it starts on; every other time inside a scene is in
// beats from that start. Text in `lines` may mark accent words as *word*.

/** How a scene arrives over the previous one (components/reel/transitions.ts). "slide" is the old name of "push". */
export type ReelEnter = "cut" | "fade" | "push" | "wipe" | "iris" | "zoom" | "zoomThrough" | "blinds" | "flash" | "curtain" | "slide";
/** Where a directional transition comes from. */
export type ReelDir = "right" | "left" | "up" | "down";

/** A camera position: zoom `s` centred on (x, y), in stage pixels (1920 × 1080). */
export type ReelCam = [s: number, x: number, y: number];

interface SceneBase {
  id: string;
  at: number;
  enter?: ReelEnter;
  /** where a directional transition (push, wipe) comes from; right when absent */
  enterDir?: ReelDir;
  /** beats the entrance takes (default 1) */
  enterBeats?: number;
  /** a chapter in the player's progress bar starts here */
  chapter?: string;
  /** a product image dimmed behind a scene of type (the work stays on screen); not on picture scenes */
  backdrop?: string;
  /** where the backdrop aims, "x% y%" */
  backdropFocus?: string;
}

/** How an image appears and moves (components/reel/timelines.ts, imageFx). All optional. */
export type ImgEnter = "none" | "rise" | "side" | "circle" | "crop" | "far" | "fade";
export type ImgMotion = "still" | "in" | "out" | "panRight" | "panLeft" | "scroll" | "focus";
export type ImgFrame = "none" | "phone" | "browser" | "card";
export interface ImageFx {
  imgEnter?: ImgEnter;
  imgMotion?: ImgMotion;
  /** where the camera aims, "x% y%" */
  imgFocus?: string;
  imgFrame?: ImgFrame;
  imgSpeed?: "slow" | "normal" | "fast";
}

export interface TitleScene extends SceneBase, ImageFx {
  kind: "title";
  eyebrow?: string;
  lines: string[];
  /** beat of the first word, then one word every `step` beats */
  wordsAt?: number;
  step?: number;
  /** words leave at this beat (default: a little before the scene ends) */
  out?: number;
  /** full-bleed photo behind the words, darkened */
  image?: string;
  imageFocus?: string;
}

export interface FlowScene extends SceneBase {
  kind: "flow";
  eyebrow?: string;
  heading: string;
  nodes: { title: string; body?: string; accent?: boolean }[];
  /** true: the circles hold a mark instead of 01, 02… (when the order says nothing) */
  marks?: boolean;
  nodesAt?: number;
  step?: number;
  caption?: string;
  captionAt?: number;
}

export interface NumberScene extends SceneBase {
  kind: "number";
  eyebrow?: string;
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  /** beats the count takes */
  countBeats?: number;
  barsTitle?: string;
  bars?: { label: string; value: number }[];
  barsAt?: number;
  step?: number;
  source?: string;
}

export interface ListScene extends SceneBase, ImageFx {
  kind: "list";
  eyebrow?: string;
  heading: string;
  items: string[];
  itemsAt?: number;
  step?: number;
  /** tall image on the right that scrolls slowly, like a recording */
  image?: string;
}

export interface CardsScene extends SceneBase {
  kind: "cards";
  eyebrow?: string;
  heading: string;
  cards: { title: string; body: string }[];
  /** true: each card shows 01, 02… (only when the order matters) */
  numbered?: boolean;
  cardsAt?: number;
  step?: number;
}

export interface ScreensScene extends SceneBase {
  kind: "screens";
  /** title over the first shots, leaves at `titleOut` */
  title?: string;
  titleOut?: number;
  /** each shot cuts to its board (if it names one) and moves the camera there on its beat */
  shots: { at: number; src?: string; cam: ReelCam }[];
  /** simpler than shots: boards and which screen to bring close; used while shots is empty */
  boards?: { src: string; focus: "left" | "center" | "right" }[];
}

export interface CompareScene extends SceneBase {
  kind: "compare";
  before: { src: string; label: string };
  after: { src: string; label: string };
  /** the "after" image wipes in on this beat */
  wipeAt: number;
}

export interface MetricsScene extends SceneBase {
  kind: "metrics";
  value: string;
  label: string;
  gauges: { value: number; prefix?: string; suffix?: string; label: string }[];
  gaugesAt?: number;
  step?: number;
  note?: string;
}

export interface ImageScene extends SceneBase, ImageFx {
  kind: "image";
  src: string;
  /** "cover" fills the stage; "contain" sits on the dark ground; "split" puts text on the right */
  fit?: "cover" | "contain" | "split";
  from?: ReelCam;
  to?: ReelCam;
  eyebrow?: string;
  lines?: string[];
  body?: string;
  textAt?: number;
}

export interface EndScene extends SceneBase {
  kind: "end";
  lines: string[];
  meta?: string;
  signature?: string;
}

/** A testimonial: someone else's words about the work, with who said it. */
export interface QuoteScene extends SceneBase {
  kind: "quote";
  /** the quote itself; *stars* mark the words that matter */
  quote: string;
  author: string;
  /** role and company of who said it */
  role?: string;
  /** small round photo of who said it */
  photo?: string;
  /** beat the first word arrives (default 1) */
  quoteAt?: number;
}

/** The author's part in the case, as a few plain facts (role, team, time, scope). */
export interface RoleScene extends SceneBase {
  kind: "role";
  eyebrow?: string;
  heading: string;
  facts: { label: string; value: string }[];
  factsAt?: number;
  step?: number;
}

/** A number before and after: the old value stays, the new one counts up from it. */
export interface DeltaScene extends SceneBase {
  kind: "delta";
  eyebrow?: string;
  /** what the numbers measure; *stars* mark the word that matters */
  label: string;
  before: { value: number; caption?: string };
  after: { value: number; caption?: string };
  prefix?: string;
  suffix?: string;
  /** beat the change starts (default 2) */
  changeAt?: number;
  note?: string;
}

export type ReelScene =
  | TitleScene
  | FlowScene
  | NumberScene
  | ListScene
  | CardsScene
  | ScreensScene
  | CompareScene
  | MetricsScene
  | ImageScene
  | QuoteScene
  | RoleScene
  | DeltaScene
  | EndScene;

/** How the case page shows the video, chosen in the admin's Vídeo tab. */
export const REEL_DISPLAYS = [
  { id: "destaque", label: "Destaque", hint: "Uma frase centralizada com o vídeo embaixo (o bloco Frase), antes do texto do case." },
  { id: "capa", label: "Na capa", hint: "A capa do case vira o vídeo: um botão de play discreto junto do título." },
  { id: "cartao", label: "Cartão flutuante", hint: "Uma miniatura flutuante no canto da tela, depois da capa. Dá para fechar." },
  { id: "texto", label: "Título + caixa", hint: "O bloco Título + caixa, com o vídeo na caixa, antes do texto do case." },
  { id: "botao", label: "Botão flutuante", hint: "Um botão flutuante no canto da tela, depois da capa. Dá para fechar." },
] as const;
export type ReelDisplay = (typeof REEL_DISPLAYS)[number]["id"];
const DISPLAY_IDS = new Set<string>(REEL_DISPLAYS.map((d) => d.id));

/** Images prepared for the video (PhotoCraft, lib/reel/imagePrep.ts): margins trimmed, the blurred surround. */
export type ReelPrepared = Record<string, { board?: string; aura?: string; w?: number; h?: number; mockup?: "phone" | "browser" }>;

export interface ReelDoc {
  /** set when the reel is loaded, never stored: prepared copies of its screen images */
  prepared?: ReelPrepared;
  /** id in lib/reel/tracks.ts */
  track: string;
  /** the reel ends on this beat and holds its last frame */
  end: number;
  /** the music fades out between these beats */
  fadeOut?: [number, number];
  /** beat shown on the player's cover */
  cover?: number;
  accent: string;
  /** short line under the cover's play button */
  title: string;
  /** kept in the admin but not shown on the site */
  draft?: boolean;
  /** what the video asks at the end: a button on the end card and on the player when it ends */
  cta?: { label: string; href: string };
  /** motion personality (components/reel/motion.ts); energetic when absent */
  motion?: "energetic" | "premium" | "corporate" | "playful";
  /** where the case page shows it (REEL_DISPLAYS); "destaque" when absent */
  display?: ReelDisplay;
  scenes: ReelScene[];
  /** set when the reel is shown translated (lib/reel/translate.ts); never stored */
  lang?: "pt" | "en";
}

const KINDS = new Set(["title", "flow", "number", "list", "cards", "screens", "compare", "metrics", "image", "quote", "role", "delta", "end"]);

/** Light check of a reel file: a bad reel hides the player instead of breaking the case. */
export function parseReel(raw: unknown): ReelDoc | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<ReelDoc>;
  if (typeof r.track !== "string" || typeof r.end !== "number" || !Array.isArray(r.scenes) || r.scenes.length === 0) return null;
  let last = -Infinity;
  for (const s of r.scenes) {
    if (!s || typeof s !== "object" || typeof s.id !== "string" || typeof s.at !== "number" || !KINDS.has(s.kind)) return null;
    if (s.at < last) return null;
    last = s.at;
  }
  return {
    track: r.track,
    end: r.end,
    fadeOut: r.fadeOut,
    cover: r.cover,
    accent: typeof r.accent === "string" ? r.accent : "#ffffff",
    title: typeof r.title === "string" ? r.title : "",
    ...(r.draft === true ? { draft: true } : {}),
    ...(r.cta && typeof r.cta === "object" && typeof r.cta.label === "string" && typeof r.cta.href === "string" ? { cta: { label: r.cta.label, href: r.cta.href } } : {}),
    ...(["energetic", "premium", "corporate", "playful"].includes(r.motion as string) ? { motion: r.motion } : {}),
    ...(DISPLAY_IDS.has(r.display as string) && r.display !== "destaque" ? { display: r.display as ReelDisplay } : {}),
    scenes: r.scenes as ReelScene[],
  };
}

/** A scene with a picture on screen (photo, screens, before/after); the others are type on black. */
export const hasPicture = (scene: ReelScene) =>
  scene.kind === "image" || scene.kind === "screens" || scene.kind === "compare" || ((scene.kind === "title" || scene.kind === "list") && !!scene.image);

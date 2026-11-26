import type { ReelDoc, ReelScene } from "@/lib/reel/types";
import { beatLength, type ReelTrack } from "@/lib/reel/tracks";

// Automatic timing: a scene's length is what the editor and the AI choose (in beats, on
// whole bars); where it starts follows from the order. Reordering, removing or resizing
// a scene re-lays the reel on the music, so nobody types beat numbers by hand.

export const BAR = 4;
/** the shortest and longest scene, in beats */
export const MIN_BEATS = 4;
export const MAX_BEATS = 32;
/** the music fades over the last two bars */
const FADE_BEATS = 8;

/** Beats the served music file can hold (the reel must end before it does). */
export const trackBeats = (track: ReelTrack) => Math.floor((track.length - track.t0) / beatLength(track));

const snap = (beats: number) => Math.min(MAX_BEATS, Math.max(MIN_BEATS, Math.round(beats / BAR) * BAR));

/** Each scene's length in beats, from the gaps between their starts. */
export function sceneLengths(doc: ReelDoc): number[] {
  const scenes = [...doc.scenes].sort((a, b) => a.at - b.at);
  return scenes.map((s, i) => (scenes[i + 1]?.at ?? doc.end) - s.at);
}

/** Lays scenes one after another with the given lengths; the reel ends with the last one. */
export function layOut(doc: ReelDoc, scenes: ReelScene[], lengths: number[]): ReelDoc {
  let at = 0;
  const placed = scenes.map((s, i) => {
    const scene = { ...s, at };
    at += snap(lengths[i] ?? 8);
    return scene;
  });
  const end = at;
  // the cover shows the opening, two bars in
  const cover = Math.min(doc.cover ?? 8, Math.max(0, (placed[1]?.at ?? end) - 1));
  return { ...doc, scenes: placed, end, fadeOut: [Math.max(0, end - FADE_BEATS), end], cover };
}

/** The same reel, with every scene snapped to whole bars and laid end to end. */
export function relayout(doc: ReelDoc): ReelDoc {
  const scenes = [...doc.scenes].sort((a, b) => a.at - b.at);
  return layOut(doc, scenes, sceneLengths(doc));
}

export function moveScene(doc: ReelDoc, from: number, to: number): ReelDoc {
  const scenes = [...doc.scenes].sort((a, b) => a.at - b.at);
  const lengths = sceneLengths(doc);
  const [s] = scenes.splice(from, 1);
  const [l] = lengths.splice(from, 1);
  scenes.splice(to, 0, s);
  lengths.splice(to, 0, l);
  return layOut(doc, scenes, lengths);
}

export function resizeScene(doc: ReelDoc, index: number, beats: number): ReelDoc {
  const scenes = [...doc.scenes].sort((a, b) => a.at - b.at);
  const lengths = sceneLengths(doc);
  lengths[index] = beats;
  return layOut(doc, scenes, lengths);
}

export function removeScene(doc: ReelDoc, index: number): ReelDoc {
  const scenes = [...doc.scenes].sort((a, b) => a.at - b.at);
  const lengths = sceneLengths(doc);
  scenes.splice(index, 1);
  lengths.splice(index, 1);
  return layOut(doc, scenes, lengths);
}

export function insertScene(doc: ReelDoc, index: number, scene: ReelScene, beats = 8): ReelDoc {
  const scenes = [...doc.scenes].sort((a, b) => a.at - b.at);
  const lengths = sceneLengths(doc);
  scenes.splice(index, 0, scene);
  lengths.splice(index, 0, beats);
  return layOut(doc, scenes, lengths);
}

/** A sensible length for a new scene of this kind. */
export const defaultBeats: Record<ReelScene["kind"], number> = {
  title: 12, flow: 16, number: 16, list: 16, cards: 12, screens: 16, compare: 8, metrics: 12, image: 12, quote: 12, role: 12, delta: 12, end: 16,
};

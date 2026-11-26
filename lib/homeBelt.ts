import type { BeltMotion } from "./homeSettingsModel";

/** The Home belt's geometry (components/home/webgl/conveyor.js), shared by the Home and the admin. */
export const SLOTS = 8;
// Belt geometry from conveyor.js (scaled by 0.79 in the vertex shader).
const TILE_HALF_W = (11.6 + Math.PI * 2.04) / SLOTS * 2 / 3 * .79;
const TILE_HALF_H = (11.6 + Math.PI * 2.04) / SLOTS / 2 * .79;
const FRONT_Z = 1.02 * .79;
// Puts the centre of slot 0 (the first case) on the middle of the front run.
export const FINAL_OFFSET = -(SLOTS * 2.9 / (11.6 + Math.PI * 2.04)) + .5;

/** Front tile of the flat belt (present = 1), in stage pixels. */
export function frontTile(width: number, height: number) {
  const zoom = Math.max(1, .9 * height / width), aspect = width / height;
  const k = 1.122 * 3.2708526 / (6.2 * zoom - FRONT_Z);
  const w = TILE_HALF_W * k / aspect * width, h = TILE_HALF_H * k * height;
  return { w, h, top: (1 - (-.1 * k + .2)) / 2 * height - h / 2 };
}

/**
 * How tall the belt's section is for these turns: the grow-and-flatten run keeps the page's pace, and the
 * free run before it (entering the screen included) turns `speed` tiles per tile of scroll.
 */
export function beltRuns({ turns, speed }: BeltMotion, width: number, height: number) {
  const tile = frontTile(width, height);
  const grow = 2 * height - tile.top;
  const free = Math.max(0, (turns * SLOTS * tile.h - grow) / speed - height);
  return { tile, grow, free, sectionHeight: height + grow + free };
}

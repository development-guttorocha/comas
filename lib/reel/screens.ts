import type { ReelCam, ScreensScene } from "@/lib/reel/types";

// Screens scenes can be written as boards (an image + which screen to bring close) instead of
// camera shots: the shots then follow from the scene's length, so resizing the scene or
// changing a board never leaves a camera pointing at the wrong place.

export type Board = { src: string; focus: "left" | "center" | "right" };
type Shot = ScreensScene["shots"][number];

/** Where the three phones of a board sit, in stage pixels. */
export const FOCUS_X = { left: 488, center: 960, right: 1413 } as const;

export function shotsFromBoards(boards: Board[], beats: number, withTitle: boolean): Shot[] {
  const list = boards.filter((b) => b.src);
  if (!list.length) return [];
  const per = beats / list.length;
  return list.flatMap((b, i) => {
    const at = Math.round(i * per);
    const wide: ReelCam = i === 0 && withTitle ? [0.86, 960, 470] : [1.05, 960, 540];
    return [
      { at, src: b.src, cam: wide },
      { at: Math.round(at + Math.max(1, per / 2)), cam: [1.75, FOCUS_X[b.focus] ?? 960, 430] as ReelCam },
    ];
  });
}

/** The shots a screens scene plays: its own, or the ones its boards give for this length. */
export function sceneShots(scene: ScreensScene, beats: number): Shot[] {
  if (scene.shots?.length) return scene.shots;
  return shotsFromBoards(scene.boards ?? [], beats, Boolean(scene.title));
}

// Music the reels are cut to. Each track is measured once, automatically, when it is added
// in the admin (lib/reel/analyze.ts): tempo, the first kick and the song's parts, so scenes
// are written in beats and every cut lands on the music. The library lives in
// content/reel-tracks.json (lib/reel/trackStore.ts reads and writes it).
//
// "Bull" (Next Route), measured on the original mp3: 128.2 BPM, 4/4, first kick at
// 0.23 s (linear fit over the kicks of the whole file). The served file is the first
// 76.4 s, cut sample-exact, so its timeline matches the measurement.
//   B0    0:00.2  intro, kick only
//   B32   0:15.2  build: bass comes in
//   B64   0:30.2  DROP 1
//   B92   0:43.3  one-bar breath, then the drop again (B96)
//   B124  0:58.3  one-bar breath, then the drop again (B128)
//   B156  1:13.2  the drop lets go; B160 is the breakdown

export interface ReelTrack {
  id: string;
  src: string;
  title: string;
  artist: string;
  bpm: number;
  /** time of beat 0, in seconds */
  t0: number;
  /** length of the served file, in seconds */
  length: number;
  /** where the music changes, in beats: the admin timeline shows them so cuts can land there */
  sections: { beat: number; label: string; tone: "calm" | "build" | "drop" | "break" }[];
  /** false: no steady beat was found; "beats" are half seconds and cuts follow the energy */
  steady?: boolean;
  /** where the song came from, when not uploaded by hand (e.g. "YouTube Audio Library") */
  source?: string;
  /** link the credit points to, when the source asks for one (Free To Use) */
  sourceUrl?: string;
}

export const beatLength = (track: ReelTrack) => 60 / track.bpm;
/** time of beat n, in seconds */
export const beatTime = (track: ReelTrack, n: number) => track.t0 + n * beatLength(track);

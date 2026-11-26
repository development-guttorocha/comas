import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { analyzeMusic } from "@/lib/reel/analyze";
import { cutToAac, decodeMono } from "@/lib/reel/audioFile";
import type { ReelTrack } from "@/lib/reel/tracks";

// The music library: content/reel-tracks.json, with the files in public/reel/tracks/.

const FILE = path.join(process.cwd(), "content", "reel-tracks.json");
const DIR = path.join(process.cwd(), "public", "reel", "tracks");
/** A video uses at most this much music; the file keeps only it. */
const KEEP_SECONDS = 95;
const MAX_UPLOAD = 40 * 1024 * 1024;

export async function getReelTracks(): Promise<ReelTrack[]> {
  try {
    const list = JSON.parse(await readFile(FILE, "utf8"));
    return Array.isArray(list) ? (list as ReelTrack[]) : [];
  } catch {
    return [];
  }
}

export async function getReelTrack(id: string | undefined): Promise<ReelTrack | undefined> {
  const list = await getReelTracks();
  return list.find((t) => t.id === id) ?? list[0];
}

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "musica";

/** Title and artist from a file name like "bull-by-next-route.mp3" or "Artist - Title.mp3". */
function namesFrom(file: string) {
  const base = path.basename(file, path.extname(file)).replace(/[_]+/g, " ").trim();
  const dash = base.split(/\s+-\s+/);
  if (dash.length === 2) return { artist: dash[0], title: dash[1] };
  const by = base.split(/[-\s]by[-\s]/i);
  const pretty = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
  if (by.length === 2) return { title: pretty(by[0]), artist: pretty(by[1]) };
  return { title: pretty(base), artist: "" };
}

/** Adds a song: measures it, keeps its first ~95 s (cut on a bar) as AAC, and lists it. */
export async function addReelTrack(file: File, names: { title?: string; artist?: string }): Promise<ReelTrack> {
  if (file.size > MAX_UPLOAD) throw new Error("Arquivo grande demais (máximo 40 MB).");
  if (!/^audio\//.test(file.type) && !/\.(mp3|m4a|aac|wav|aif|aiff|flac|ogg)$/i.test(file.name)) throw new Error("Envie um arquivo de áudio (MP3, M4A ou WAV).");
  return addTrackFromBytes(Buffer.from(await file.arrayBuffer()), file.name, names);
}

/** Measures a song, keeps its first ~95 s (cut on a bar) as AAC, and lists it. */
export async function addTrackFromBytes(bytes: Buffer, fileName: string, names: { title?: string; artist?: string; source?: string; sourceUrl?: string }): Promise<ReelTrack> {
  const work = await mkdtemp(path.join(tmpdir(), "reel-track-"));
  try {
    const file = { name: fileName };
    const input = path.join(work, `in${path.extname(fileName) || ".mp3"}`);
    await writeFile(input, bytes);
    const { pcm, rate } = await decodeMono(input, work);
    const duration = pcm.length / rate;
    if (duration < 20) throw new Error("A música precisa ter pelo menos 20 segundos.");
    const analysis = analyzeMusic(pcm, rate);
    // keep whole bars, so the end of the file falls on the music
    const unit = analysis.steady ? (4 * 60) / analysis.bpm : 2;
    const keep = Math.min(duration, analysis.t0 + Math.floor((Math.min(duration, KEEP_SECONDS) - analysis.t0) / unit) * unit);
    const guess = namesFrom(file.name);
    const title = names.title?.trim() || guess.title;
    const artist = names.artist?.trim() || guess.artist;
    const list = await getReelTracks();
    let id = slugify(`${title} ${artist}`);
    while (list.some((t) => t.id === id)) id = `${id}-2`;
    const length = await cutToAac(input, work, keep, path.join(DIR, `${id}.m4a`));
    const keptBeats = (length - analysis.t0) / (60 / analysis.bpm);
    const track: ReelTrack = {
      id,
      src: `/reel/tracks/${id}.m4a`,
      title,
      artist,
      bpm: analysis.bpm,
      t0: analysis.t0,
      length: Math.round(length * 100) / 100,
      steady: analysis.steady,
      ...(names.source ? { source: names.source } : {}),
      ...(names.sourceUrl ? { sourceUrl: names.sourceUrl } : {}),
      sections: analysis.sections.filter((s) => s.beat < keptBeats),
    };
    await writeFile(FILE, `${JSON.stringify([...list, track], null, 2)}\n`);
    return track;
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

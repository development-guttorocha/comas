import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { addTrackFromBytes } from "@/lib/reel/trackStore";
import type { ReelTrack } from "@/lib/reel/tracks";

// Songs from the YouTube Audio Library, through an unofficial community list
// (github.com/ThibaultJanBeyer/YouTube-Free-Audio-Library-API): file names and Google Drive
// ids only, no genre, mood, duration or licence. A song is searched by name, previewed from
// Drive, and on "add" it is downloaded once and analysed like an upload, so the site never
// depends on someone else's Drive. Licences vary per track (some ask for credit, use outside
// YouTube is not covered by the list): the admin says so, and each track keeps its source.

export const LIBRARY_SOURCE = "YouTube Audio Library";
const LIST_URL = "https://thibaultjanbeyer.github.io/YouTube-Free-Audio-Library-API/api.json";
const CACHE = path.join(process.cwd(), ".admin", "youtube-audio-library.json");
const CACHE_DAYS = 7;
const MAX_BYTES = 40 * 1024 * 1024;

export interface LibrarySong {
  id: string;
  title: string;
}

const pretty = (name: string) =>
  name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/\(\d+\)$/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

let memory: LibrarySong[] | null = null;

/** The whole list, from memory, the local cache (7 days) or the community endpoint. */
async function songs(): Promise<LibrarySong[]> {
  if (memory) return memory;
  let raw: { all?: { id: string; name: string; mimeType?: string }[] } | null = null;
  try {
    const info = await stat(CACHE);
    if (Date.now() - info.mtimeMs < CACHE_DAYS * 86_400_000) raw = JSON.parse(await readFile(CACHE, "utf8"));
  } catch {
    /* no cache yet */
  }
  if (!raw) {
    const response = await fetch(LIST_URL, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error("Não consegui abrir a lista da biblioteca de áudio do YouTube agora. Tente de novo em instantes.");
    raw = await response.json();
    await mkdir(path.dirname(CACHE), { recursive: true });
    await writeFile(CACHE, JSON.stringify(raw));
  }
  // one entry per song: the list repeats some files as "Name(1).mp3"
  const seen = new Set<string>();
  memory = (raw?.all ?? [])
    .filter((x) => x && typeof x.id === "string" && /audio/.test(x.mimeType ?? "audio"))
    .map((x) => ({ id: x.id, title: pretty(x.name) }))
    .filter((x) => {
      const k = fold(x.title);
      if (!x.title || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.title.localeCompare(b.title));
  return memory;
}

/** Songs whose name has every word of the query (all of them without one), a page at a time. */
export async function searchLibrary(query: string, offset = 0, limit = 40): Promise<{ songs: LibrarySong[]; total: number; next: number | null }> {
  const list = await songs();
  const words = fold(query).split(/\s+/).filter(Boolean);
  const found = words.length ? list.filter((s) => words.every((w) => fold(s.title).includes(w))) : list;
  const start = Math.max(0, offset);
  return { songs: found.slice(start, start + limit), total: found.length, next: start + limit < found.length ? start + limit : null };
}

/** Address the admin plays for a preview: relayed from Google Drive (see the preview route). */
export const previewUrl = (id: string) => `/api/admin/reel-tracks/library/preview?id=${encodeURIComponent(id)}`;

/** Downloads a song from the list and adds it to the music library, analysed and trimmed. */
export async function addFromLibrary(id: string): Promise<ReelTrack> {
  const song = (await songs()).find((s) => s.id === id);
  if (!song) throw new Error("Essa música não está na biblioteca.");
  const response = await fetch(`https://docs.google.com/uc?export=download&id=${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(120_000), redirect: "follow" });
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !/audio|octet-stream/.test(type)) throw new Error("Não consegui baixar essa música agora (o arquivo pode ter saído do ar). Escolha outra.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_BYTES) throw new Error("Essa música é grande demais para baixar.");
  return addTrackFromBytes(bytes, `${song.title}.mp3`, { title: song.title, artist: "", source: LIBRARY_SOURCE });
}

import { addTrackFromBytes } from "@/lib/reel/trackStore";
import type { ReelTrack } from "@/lib/reel/tracks";

// Songs from Free To Use (freetouse.com), through their public API (no key): search by words,
// filter by genre or mood, hear the MP3, and on "add" download it once and analyse it like an
// upload. Premium tracks are left out: they need a paid licence. The free licence asks for a
// credit with the track, the artist and a link; the player's music line carries it.

export const FREE_TO_USE_SOURCE = "Free To Use";
export const FREE_TO_USE_URL = "https://freetouse.com/music";
const API = "https://api.freetouse.com/v3";
const MAX_BYTES = 40 * 1024 * 1024;
export const PAGE = 40;

type ApiTrack = {
  id: string;
  title: string;
  duration?: number;
  genre?: string | null;
  is_premium?: boolean;
  artists?: [number, { id: string; name: string }][];
  categories?: [number, { id: string; name: string }][];
  files?: { mp3?: string };
};
type ApiList<T> = { ok: boolean; data: T[]; pagination?: { count?: number }; error?: string };

export interface FreeSong {
  id: string;
  title: string;
  artist: string;
  /** "2:22 · Folk · Emotional" */
  meta: string;
  preview: string;
}
export interface FreeCategory {
  id: string;
  name: string;
  type: "Genre" | "Mood";
}

async function get<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: { Accept: "application/json" } }).catch(() => null);
  const data = response?.ok ? ((await response.json().catch(() => null)) as T & { ok?: boolean } | null) : null;
  if (!data || data.ok === false) throw new Error("A Free To Use não respondeu agora. Use a biblioteca do YouTube ou tente de novo em instantes.");
  return data;
}

const artistOf = (t: ApiTrack) => (t.artists ?? []).map(([, a]) => a?.name).filter(Boolean).join(", ");
const clock = (s = 0) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const song = (t: ApiTrack): FreeSong => ({
  id: t.id,
  title: t.title,
  artist: artistOf(t),
  meta: [clock(t.duration), t.genre, ...(t.categories ?? []).slice(0, 2).map(([, c]) => c?.name)].filter(Boolean).join(" · "),
  preview: t.files?.mp3 ?? "",
});

let categoryCache: { at: number; list: FreeCategory[] } | null = null;
/** Genres and moods to filter by (the API also has video themes, which are left out). */
export async function freeCategories(): Promise<FreeCategory[]> {
  if (categoryCache && Date.now() - categoryCache.at < 86_400_000) return categoryCache.list;
  const data = await get<ApiList<{ id: string; name: string; type: string }>>(`${API}/music/categories/all?limit=200&order=name&sort=asc`);
  const list = data.data.filter((c) => c.type === "Genre" || c.type === "Mood").map((c) => ({ id: c.id, name: c.name, type: c.type as FreeCategory["type"] }));
  categoryCache = { at: Date.now(), list };
  return list;
}

/**
 * Songs by words (titles, tags, categories, artists) or in one genre/mood, most played first.
 * Premium tracks are dropped after the fact, so a page can hold a few less than PAGE.
 */
export async function searchFree({ query = "", category = "", offset = 0 }: { query?: string; category?: string; offset?: number }) {
  const params = `limit=${PAGE}&offset=${Math.max(0, offset)}&order=plays&sort=desc`;
  const url = category
    ? `${API}/music/categories/${encodeURIComponent(category)}/tracks?${params}`
    : query.trim()
      ? `${API}/music/tracks/search?query=${encodeURIComponent(query.trim())}&${params}`
      : `${API}/music/tracks/all?${params}`;
  const data = await get<ApiList<ApiTrack>>(url);
  let list = data.data.filter((t) => t && t.files?.mp3 && !t.is_premium);
  // a genre/mood plus words: keep the tracks whose names or artists have every word
  if (category && query.trim()) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    list = list.filter((t) => words.every((w) => `${t.title} ${artistOf(t)} ${t.genre ?? ""}`.toLowerCase().includes(w)));
  }
  const total = data.pagination?.count ?? list.length;
  return { songs: list.map(song), total, next: offset + PAGE < total ? offset + PAGE : null };
}

/** Downloads a Free To Use song and adds it to the music library, analysed and trimmed. */
export async function addFromFreeToUse(id: string): Promise<ReelTrack> {
  const { data: track } = await get<{ ok: boolean; data: ApiTrack | null }>(`${API}/music/tracks/${encodeURIComponent(id)}`);
  if (!track?.files?.mp3) throw new Error("Essa música não está mais na Free To Use.");
  if (track.is_premium) throw new Error("Essa música é premium na Free To Use (precisa de licença paga). Escolha outra.");
  const response = await fetch(track.files.mp3, { signal: AbortSignal.timeout(120_000) }).catch(() => null);
  if (!response?.ok) throw new Error("Não consegui baixar essa música agora. Tente de novo ou escolha outra.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_BYTES) throw new Error("Essa música é grande demais para baixar.");
  return addTrackFromBytes(bytes, `${track.title}.mp3`, { title: track.title, artist: artistOf(track), source: FREE_TO_USE_SOURCE, sourceUrl: FREE_TO_USE_URL });
}

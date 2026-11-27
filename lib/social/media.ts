import { promises as fs } from "node:fs";
import path from "node:path";
import { del, list, put } from "@vercel/blob";
import sharp from "sharp";
import { hydrateRuntimeKeys } from "@/lib/admin/apiKeys";
import { getSupabaseConfig, supabaseHeaders } from "@/lib/supabase";
import { listSocialState } from "./store";
import type { SocialPost } from "./types";

export type SocialMediaItem = {
  url: string;
  name: string;
  size: number;
  kind: "image" | "video";
  width?: number;
  height?: number;
  folder: string;
  modified: string;
  source: "blob" | "supabase" | "local" | "post";
  usedIn: string[];
};

type StoredMediaRecord = {
  url: string;
  name: string;
  size: number;
  kind: "image" | "video";
  width?: number;
  height?: number;
  folder: string;
  modified: string;
  storagePath?: string;
};

const LOCAL_PUBLIC_DIR = path.join(process.cwd(), "public", "social-media");
const LOCAL_INDEX_FILE = path.join(process.cwd(), ".social-studio", "media.json");
const SUPABASE_BUCKET = "social-media";
const SETTINGS_ID = "media_library";
const TIMEOUT_MS = 10_000;

const isVideoName = (name: string) => /\.(mp4|webm|mov)(\?|$)/i.test(name);

function cleanFileName(raw: string): string {
  const ext = path.extname(raw).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".webp";
  const base =
    path
      .basename(raw, path.extname(raw))
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "midia";
  return `${base}${ext}`;
}

function collectPostImageUrls(posts: SocialPost[]): Map<string, string[]> {
  const usage = new Map<string, Set<string>>();
  const add = (url: unknown, title: string) => {
    if (typeof url !== "string") return;
    const trimmed = url.trim();
    if (!trimmed) return;
    const set = usage.get(trimmed) ?? new Set<string>();
    set.add(title || "Sem título");
    usage.set(trimmed, set);
  };

  for (const post of posts) {
    for (const slide of post.slides ?? []) {
      add(slide.imageUrl, post.title);
    }
    for (const block of post.studioDoc?.blocks ?? []) {
      const props = block.props ?? {};
      add(props.imageUrl, post.title);
      add(props.url, post.title);
      if (typeof props.items === "string") {
        try {
          const parsed = JSON.parse(props.items) as Array<{ src?: string }>;
          if (Array.isArray(parsed)) parsed.forEach(i => add(i?.src, post.title));
        } catch { /* ignore */ }
      }
    }
    for (const slide of post.studioDoc?.canvas?.slides ?? []) {
      add(slide.content?.image, post.title);
      for (const el of slide.elements ?? []) {
        if (el.type === "image") add(el.src, post.title);
      }
    }
    for (const scene of post.reel?.scenes ?? []) {
      if ("src" in scene) add((scene as { src?: string }).src, post.title);
    }
  }

  const out = new Map<string, string[]>();
  for (const [url, titles] of usage) out.set(url, [...titles]);
  return out;
}

async function readLocalCatalog(): Promise<StoredMediaRecord[]> {
  try {
    const raw = await fs.readFile(LOCAL_INDEX_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoredMediaRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalCatalog(records: StoredMediaRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_INDEX_FILE), { recursive: true });
  await fs.writeFile(LOCAL_INDEX_FILE, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

async function readSupabaseCatalog(): Promise<StoredMediaRecord[] | null> {
  const sb = getSupabaseConfig();
  if (!sb) return null;
  try {
    const res = await fetch(`${sb.url}/rest/v1/social_settings?id=eq.${SETTINGS_ID}&select=theme`, {
      headers: supabaseHeaders(sb.key),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ theme?: { items?: StoredMediaRecord[] } }>;
    return Array.isArray(rows[0]?.theme?.items) ? rows[0]!.theme!.items! : [];
  } catch {
    return null;
  }
}

async function writeSupabaseCatalog(items: StoredMediaRecord[]): Promise<boolean> {
  const sb = getSupabaseConfig();
  if (!sb) return false;
  try {
    const res = await fetch(`${sb.url}/rest/v1/social_settings`, {
      method: "POST",
      headers: supabaseHeaders(sb.key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({ id: SETTINGS_ID, theme: { items }, updated_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function tryUploadSupabaseBucket(
  storagePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string | null> {
  const sb = getSupabaseConfig();
  if (!sb) return null;
  try {
    const authHeaders: Record<string, string> = { apikey: sb.key };
    if (sb.key.startsWith("eyJ")) authHeaders.Authorization = `Bearer ${sb.key}`;

    // Ensure public bucket exists (idempotent)
    await fetch(`${sb.url}/storage/v1/bucket`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ id: SUPABASE_BUCKET, name: SUPABASE_BUCKET, public: true }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch(() => {});

    const up = await fetch(`${sb.url}/storage/v1/object/${SUPABASE_BUCKET}/${storagePath}`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": contentType, "x-upsert": "true" },
      body: new Uint8Array(buffer),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!up.ok) return null;
    return `${sb.url}/storage/v1/object/public/${SUPABASE_BUCKET}/${storagePath}`;
  } catch {
    return null;
  }
}

/** Lists all social media files across Blob, Supabase/local catalog, and post references. */
export async function listSocialMedia(): Promise<SocialMediaItem[]> {
  await hydrateRuntimeKeys();
  const state = await listSocialState().catch(() => ({ posts: [] as SocialPost[] }));
  const usage = collectPostImageUrls(state.posts);

  const byUrl = new Map<string, SocialMediaItem>();

  // 1. Vercel Blob (social-media/ + muapi/)
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    for (const prefix of ["social-media/", "muapi/"]) {
      try {
        const listed = await list({ prefix, limit: 250 });
        for (const blob of listed.blobs) {
          const name = path.basename(blob.pathname);
          byUrl.set(blob.url, {
            url: blob.url,
            name,
            size: blob.size,
            kind: isVideoName(name) ? "video" : "image",
            folder: prefix.startsWith("muapi") ? "ia-muapi" : blob.pathname.split("/")[1] || "geral",
            modified: blob.uploadedAt.toISOString(),
            source: "blob",
            usedIn: usage.get(blob.url) ?? [],
          });
        }
      } catch { /* ignore */ }
    }
  }

  // 2. Supabase catalog or local catalog
  const sbCatalog = await readSupabaseCatalog();
  const catalog = sbCatalog ?? (await readLocalCatalog());
  for (const item of catalog) {
    if (!byUrl.has(item.url)) {
      byUrl.set(item.url, {
        url: item.url,
        name: item.name,
        size: item.size,
        kind: item.kind,
        width: item.width,
        height: item.height,
        folder: item.folder || "geral",
        modified: item.modified,
        source: sbCatalog ? "supabase" : "local",
        usedIn: usage.get(item.url) ?? [],
      });
    }
  }

  // 3. Local public/social-media scan (in dev or self-hosted)
  try {
    const entries = await fs.readdir(LOCAL_PUBLIC_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const url = `/social-media/${entry.name}`;
      if (byUrl.has(url)) continue;
      const stat = await fs.stat(path.join(LOCAL_PUBLIC_DIR, entry.name));
      byUrl.set(url, {
        url,
        name: entry.name,
        size: stat.size,
        kind: isVideoName(entry.name) ? "video" : "image",
        folder: "uploads",
        modified: stat.mtime.toISOString(),
        source: "local",
        usedIn: usage.get(url) ?? [],
      });
    }
  } catch { /* directory may not exist yet */ }

  // 4. External/inline media referenced inside posts (e.g. MuAPI or pasted images)
  for (const [url, titles] of usage) {
    if (byUrl.has(url)) continue;
    const isData = url.startsWith("data:");
    const name = isData
      ? `imagem-embutida-${url.slice(-6).replace(/[^a-zA-Z0-9]/g, "")}.webp`
      : cleanFileName(url.split("?")[0]?.split("/").pop() || "midia.jpg");
    byUrl.set(url, {
      url,
      name,
      size: isData ? Math.round((url.length * 3) / 4) : 0,
      kind: isVideoName(name) || url.startsWith("data:video/") ? "video" : "image",
      folder: isData ? "ia" : "posts",
      modified: new Date(0).toISOString(),
      source: "post",
      usedIn: titles,
    });
  }

  return [...byUrl.values()].sort((a, b) => b.modified.localeCompare(a.modified));
}

/** Saves an uploaded image or video and returns its ready-to-use URL + metadata. */
export async function uploadSocialMedia(file: File, folder = "estudio"): Promise<SocialMediaItem> {
  await hydrateRuntimeKeys();
  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const video = isVideoName(file.name) || file.type.startsWith("video/");
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "") || "estudio";
  const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  let finalBuffer: Buffer = rawBuffer;
  let contentType = file.type || (video ? "video/mp4" : "image/webp");
  let finalName = cleanFileName(file.name);
  let width: number | undefined;
  let height: number | undefined;

  if (!video && !/\.svg$|\.gif$/i.test(finalName)) {
    try {
      const meta = await sharp(rawBuffer).rotate().metadata();
      const resized = sharp(rawBuffer)
        .rotate()
        .resize({ width: 1600, height: 2000, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84 });
      const out = await resized.toBuffer({ resolveWithObject: true });
      finalBuffer = out.data;
      width = out.info.width || meta.width;
      height = out.info.height || meta.height;
      contentType = "image/webp";
      finalName = `${path.basename(finalName, path.extname(finalName))}.webp`;
    } catch {
      // Keep original bytes if sharp cannot decode (e.g. exotic format)
    }
  }

  const now = new Date().toISOString();

  // Tier 1: Vercel Blob
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    const uploaded = await put(`social-media/${safeFolder}/${stamp}-${finalName}`, finalBuffer, {
      access: "public",
      contentType,
    });
    return {
      url: uploaded.url,
      name: finalName,
      size: finalBuffer.byteLength,
      kind: video ? "video" : "image",
      width,
      height,
      folder: safeFolder,
      modified: now,
      source: "blob",
      usedIn: [],
    };
  }

  // Tier 2: Supabase (Storage bucket -> fallback compressed inline data URL in social_settings)
  if (getSupabaseConfig()) {
    const storagePath = `${safeFolder}/${stamp}-${finalName}`;
    let url = await tryUploadSupabaseBucket(storagePath, finalBuffer, contentType);
    if (!url) {
      if (video && finalBuffer.byteLength > 3 * 1024 * 1024) {
        throw new Error(
          "Para vídeos grandes na nuvem, configure BLOB_READ_WRITE_TOKEN nas variáveis da Vercel ou habilite o Supabase Storage.",
        );
      }
      url = `data:${contentType};base64,${finalBuffer.toString("base64")}`;
    }
    const existing = (await readSupabaseCatalog()) ?? [];
    const record: StoredMediaRecord = {
      url,
      name: finalName,
      size: finalBuffer.byteLength,
      kind: video ? "video" : "image",
      width,
      height,
      folder: safeFolder,
      modified: now,
      storagePath,
    };
    await writeSupabaseCatalog([record, ...existing.filter(i => i.url !== url)].slice(0, 200));
    return { ...record, source: "supabase", usedIn: [] };
  }

  // Tier 3: Local filesystem (`public/social-media/` + `.social-studio/media.json`)
  await fs.mkdir(LOCAL_PUBLIC_DIR, { recursive: true });
  const storedFile = `${stamp}-${finalName}`;
  await fs.writeFile(path.join(LOCAL_PUBLIC_DIR, storedFile), finalBuffer);
  const url = `/social-media/${storedFile}`;
  const existing = await readLocalCatalog();
  const record: StoredMediaRecord = {
    url,
    name: finalName,
    size: finalBuffer.byteLength,
    kind: video ? "video" : "image",
    width,
    height,
    folder: safeFolder,
    modified: now,
  };
  await writeLocalCatalog([record, ...existing.filter(i => i.url !== url)]);
  return { ...record, source: "local", usedIn: [] };
}

/** Registers a newly generated AI image URL in the social media catalog so it appears in /admin/midia immediately. */
export async function registerGeneratedMedia(url: string, name = "arte-ia.webp", folder = "ia"): Promise<void> {
  if (!url || url.includes(".public.blob.vercel-storage.com")) return;
  const record: StoredMediaRecord = {
    url,
    name: cleanFileName(name),
    size: url.startsWith("data:") ? Math.round((url.length * 3) / 4) : 0,
    kind: "image",
    folder,
    modified: new Date().toISOString(),
  };
  if (getSupabaseConfig()) {
    const existing = (await readSupabaseCatalog()) ?? [];
    await writeSupabaseCatalog([record, ...existing.filter(i => i.url !== url)].slice(0, 200));
  } else {
    const existing = await readLocalCatalog();
    await writeLocalCatalog([record, ...existing.filter(i => i.url !== url)]);
  }
}

/** Removes media files from Blob, Supabase catalog/bucket, and local public folder. */
export async function deleteSocialMedia(urls: string[]): Promise<number> {
  await hydrateRuntimeKeys();
  const target = new Set(urls.filter(Boolean));
  if (!target.size) return 0;

  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    const blobUrls = [...target].filter(u => /^https?:\/\/.*blob\.vercel-storage\.com/i.test(u));
    if (blobUrls.length) await del(blobUrls).catch(() => {});
  }

  const sb = getSupabaseConfig();
  if (sb) {
    const existing = (await readSupabaseCatalog()) ?? [];
    const removed = existing.filter(i => target.has(i.url));
    for (const item of removed) {
      if (item.storagePath) {
        const authHeaders: Record<string, string> = { apikey: sb.key };
        if (sb.key.startsWith("eyJ")) authHeaders.Authorization = `Bearer ${sb.key}`;
        await fetch(`${sb.url}/storage/v1/object/${SUPABASE_BUCKET}/${item.storagePath}`, {
          method: "DELETE",
          headers: authHeaders,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        }).catch(() => {});
      }
    }
    await writeSupabaseCatalog(existing.filter(i => !target.has(i.url)));
  }

  const localCatalog = await readLocalCatalog();
  if (localCatalog.length) {
    await writeLocalCatalog(localCatalog.filter(i => !target.has(i.url)));
  }

  for (const url of target) {
    if (url.startsWith("/social-media/")) {
      const name = path.basename(url);
      await fs.unlink(path.join(LOCAL_PUBLIC_DIR, name)).catch(() => {});
    }
  }

  return target.size;
}

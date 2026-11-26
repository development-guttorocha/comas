import { promises as fs } from "node:fs";
import path from "node:path";
import { getSupabaseConfig, supabaseHeaders } from "@/lib/supabase";
import { DEFAULT_SOCIAL_THEME, STARTER_POSTS } from "./presets";
import type { SocialPost, SocialTheme } from "./types";

export type StorageStatus = "supabase" | "supabase_missing_table" | "local";

const LOCAL_DIR = path.join(process.cwd(), ".social-studio");
const POSTS_FILE = path.join(LOCAL_DIR, "posts.json");
const THEME_FILE = path.join(LOCAL_DIR, "theme.json");
const TIMEOUT_MS = 8_000;

type SupabasePostRow = {
  id: string;
  title: string;
  format: SocialPost["format"];
  status: SocialPost["status"];
  slides: SocialPost["slides"];
  caption: string;
  source_idea?: string | null;
  created_at: string;
  updated_at: string;
};

function fromRow(row: SupabasePostRow): SocialPost {
  return {
    id: row.id,
    title: row.title,
    format: row.format,
    status: row.status,
    slides: Array.isArray(row.slides) ? row.slides : [],
    caption: row.caption ?? "",
    sourceIdea: row.source_idea ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(post: SocialPost): SupabasePostRow {
  return {
    id: post.id,
    title: post.title,
    format: post.format,
    status: post.status,
    slides: post.slides,
    caption: post.caption,
    source_idea: post.sourceIdea ?? null,
    created_at: post.createdAt,
    updated_at: post.updatedAt,
  };
}

async function readLocalPosts(): Promise<SocialPost[]> {
  try {
    const raw = await fs.readFile(POSTS_FILE, "utf8");
    const parsed = JSON.parse(raw) as SocialPost[];
    return Array.isArray(parsed) && parsed.length ? parsed : STARTER_POSTS;
  } catch {
    return STARTER_POSTS;
  }
}

async function writeLocalPosts(posts: SocialPost[]): Promise<void> {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(POSTS_FILE, `${JSON.stringify(posts, null, 2)}\n`, "utf8");
}

async function readLocalTheme(): Promise<SocialTheme> {
  try {
    const raw = await fs.readFile(THEME_FILE, "utf8");
    return { ...DEFAULT_SOCIAL_THEME, ...(JSON.parse(raw) as Partial<SocialTheme>) };
  } catch {
    return DEFAULT_SOCIAL_THEME;
  }
}

async function writeLocalTheme(theme: SocialTheme): Promise<void> {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(THEME_FILE, `${JSON.stringify(theme, null, 2)}\n`, "utf8");
}

export async function listSocialState(): Promise<{
  posts: SocialPost[];
  theme: SocialTheme;
  storage: StorageStatus;
}> {
  const sb = getSupabaseConfig();
  if (!sb) {
    const [posts, theme] = await Promise.all([readLocalPosts(), readLocalTheme()]);
    return { posts, theme, storage: "local" };
  }

  try {
    const [postsRes, themeRes] = await Promise.all([
      fetch(`${sb.url}/rest/v1/social_posts?select=*&order=updated_at.desc`, {
        headers: supabaseHeaders(sb.key),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }),
      fetch(`${sb.url}/rest/v1/social_settings?id=eq.default&select=theme`, {
        headers: supabaseHeaders(sb.key),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }),
    ]);

    if (postsRes.status === 404 || themeRes.status === 404) {
      return { posts: STARTER_POSTS, theme: DEFAULT_SOCIAL_THEME, storage: "supabase_missing_table" };
    }

    if (!postsRes.ok) {
      const text = await postsRes.text().catch(() => "");
      if (text.includes("does not exist") || text.includes("PGRST205")) {
        return { posts: STARTER_POSTS, theme: DEFAULT_SOCIAL_THEME, storage: "supabase_missing_table" };
      }
      throw new Error(`Supabase error ${postsRes.status}: ${text}`);
    }

    const rows = (await postsRes.json()) as SupabasePostRow[];
    let posts = rows.map(fromRow);

    // Seed starter examples on first run when table is empty
    if (posts.length === 0) {
      await fetch(`${sb.url}/rest/v1/social_posts`, {
        method: "POST",
        headers: supabaseHeaders(sb.key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify(STARTER_POSTS.map(toRow)),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }).catch(() => {});
      posts = STARTER_POSTS;
    }

    let theme = DEFAULT_SOCIAL_THEME;
    if (themeRes.ok) {
      const themeRows = (await themeRes.json()) as Array<{ theme?: Partial<SocialTheme> }>;
      if (themeRows[0]?.theme) {
        theme = {
          ...DEFAULT_SOCIAL_THEME,
          ...themeRows[0].theme,
          palette: { ...DEFAULT_SOCIAL_THEME.palette, ...themeRows[0].theme.palette },
        };
      }
    }

    return { posts, theme, storage: "supabase" };
  } catch {
    const [posts, theme] = await Promise.all([readLocalPosts(), readLocalTheme()]);
    return { posts, theme, storage: "supabase_missing_table" };
  }
}

export async function saveSocialPost(post: SocialPost): Promise<{ post: SocialPost; storage: StorageStatus }> {
  const now = new Date().toISOString();
  const next: SocialPost = {
    ...post,
    createdAt: post.createdAt || now,
    updatedAt: now,
  };

  const sb = getSupabaseConfig();
  if (!sb) {
    const posts = await readLocalPosts();
    const idx = posts.findIndex(p => p.id === next.id);
    if (idx >= 0) posts[idx] = next;
    else posts.unshift(next);
    await writeLocalPosts(posts);
    return { post: next, storage: "local" };
  }

  const res = await fetch(`${sb.url}/rest/v1/social_posts`, {
    method: "POST",
    headers: supabaseHeaders(sb.key, { Prefer: "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify(toRow(next)),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Erro ao salvar no Supabase (${res.status}): ${text}`);
  }

  const rows = (await res.json()) as SupabasePostRow[];
  return { post: rows[0] ? fromRow(rows[0]) : next, storage: "supabase" };
}

export async function deleteSocialPost(id: string): Promise<void> {
  const sb = getSupabaseConfig();
  if (!sb) {
    const posts = await readLocalPosts();
    await writeLocalPosts(posts.filter(p => p.id !== id));
    return;
  }

  const res = await fetch(`${sb.url}/rest/v1/social_posts?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: supabaseHeaders(sb.key),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Erro ao excluir no Supabase (${res.status}): ${text}`);
  }
}

export async function saveSocialTheme(theme: SocialTheme): Promise<SocialTheme> {
  const sb = getSupabaseConfig();
  if (!sb) {
    await writeLocalTheme(theme);
    return theme;
  }

  const res = await fetch(`${sb.url}/rest/v1/social_settings`, {
    method: "POST",
    headers: supabaseHeaders(sb.key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ id: "default", theme, updated_at: new Date().toISOString() }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Erro ao salvar tema no Supabase (${res.status}): ${text}`);
  }

  return theme;
}

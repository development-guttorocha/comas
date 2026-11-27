import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getEnvAllowedEmails } from "@/lib/social/auth";
import { FEEDBACK_CATEGORIES, type CreatorFeedbackItem, type FeedbackCategory } from "./feedbackTypes";

export { FEEDBACK_CATEGORIES, type CreatorFeedbackItem, type FeedbackCategory };

const TIMEOUT_MS = 12_000;
const SETTINGS_ID = "creator_feedback";
const DEFAULT_AUTH_FROM = "Comas <acesso@guttorocha.com.br>";
const FALLBACK_RESEND_FROM = "Comas <onboarding@resend.dev>";

function localPath(): string {
  return path.join(process.cwd(), ".data", "creator-feedback.json");
}

function getSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

function supabaseHeaders(key: string, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return "";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function readLocalFeedback(): Promise<CreatorFeedbackItem[]> {
  try {
    const raw = await readFile(localPath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CreatorFeedbackItem[]) : [];
  } catch {
    return [];
  }
}

async function writeLocalFeedback(items: CreatorFeedbackItem[]): Promise<void> {
  const file = localPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(items, null, 2), "utf8");
}

export async function listCreatorFeedback(): Promise<CreatorFeedbackItem[]> {
  const sb = getSupabaseConfig();
  if (!sb) return readLocalFeedback();

  try {
    const res = await fetch(
      `${sb.url}/rest/v1/social_settings?id=eq.${SETTINGS_ID}&select=theme`,
      { headers: supabaseHeaders(sb.key), cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ theme?: { items?: CreatorFeedbackItem[] } }>;
    const items = rows[0]?.theme?.items;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

async function saveCreatorFeedbackList(items: CreatorFeedbackItem[]): Promise<void> {
  const trimmed = items.slice(0, 100);
  const sb = getSupabaseConfig();
  if (!sb) {
    await writeLocalFeedback(trimmed);
    return;
  }

  const res = await fetch(`${sb.url}/rest/v1/social_settings`, {
    method: "POST",
    headers: supabaseHeaders(sb.key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({
      id: SETTINGS_ID,
      theme: { items: trimmed },
      updated_at: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Erro ao salvar feedback no Supabase (${res.status}): ${text}`);
  }
}

async function sendFeedbackEmail(item: CreatorFeedbackItem): Promise<boolean> {
  const apiKey = firstNonEmpty(process.env.RESEND_API_KEY);
  const to = firstNonEmpty(process.env.CREATOR_FEEDBACK_EMAIL, getEnvAllowedEmails()[0]);
  if (!apiKey || !to) return false;

  const cat = FEEDBACK_CATEGORIES.find(c => c.id === item.category) ?? FEEDBACK_CATEGORIES[0]!;
  const stars = item.rating ? `${"★".repeat(item.rating)}${"☆".repeat(5 - item.rating)} (${item.rating}/5)` : "Sem nota";
  const subject = `[Comas · Feedback] ${cat.emoji} ${cat.label}${item.rating ? ` · ${item.rating}/5` : ""}`;
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#181926;line-height:1.6">
      <h2 style="margin:0 0 8px;font-size:18px">${cat.emoji} Nova mensagem na plataforma Comas</h2>
      <p style="margin:0 0 16px;color:#5a607a;font-size:13px">
        <strong>De:</strong> ${escapeHtml(item.senderEmail || "Usuário autenticado")}<br/>
        <strong>Categoria:</strong> ${escapeHtml(cat.label)}<br/>
        <strong>Avaliação:</strong> ${escapeHtml(stars)}<br/>
        <strong>Página:</strong> ${escapeHtml(item.page || "/admin")}
      </p>
      <div style="padding:16px;border-radius:12px;background:#f5f6fa;border:1px solid #e4e6f0;white-space:pre-wrap;font-size:15px">${escapeHtml(item.message)}</div>
    </div>
  `;

  const explicitFrom = firstNonEmpty(process.env.AUTH_FROM, process.env.LEADS_FROM);
  const primaryFrom = explicitFrom || DEFAULT_AUTH_FROM;

  const post = (from: string) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        ...(item.senderEmail && item.senderEmail.includes("@") ? { reply_to: item.senderEmail } : {}),
        subject,
        html,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

  try {
    let res = await post(primaryFrom);
    if (!res.ok && !explicitFrom && res.status === 403) {
      const errText = await res.text().catch(() => "");
      if (/domain is not verified/i.test(errText)) {
        res = await post(FALLBACK_RESEND_FROM);
      }
    }
    return res.ok;
  } catch {
    return false;
  }
}

export async function submitCreatorFeedback(input: {
  category?: unknown;
  rating?: unknown;
  message?: unknown;
  page?: unknown;
  senderEmail?: string;
}): Promise<{ item: CreatorFeedbackItem; emailed: boolean }> {
  const validCategories = new Set<FeedbackCategory>(["suggestion", "help", "bug", "praise"]);
  const category: FeedbackCategory =
    typeof input.category === "string" && validCategories.has(input.category as FeedbackCategory)
      ? (input.category as FeedbackCategory)
      : "suggestion";

  const rawRating = typeof input.rating === "number" ? Math.round(input.rating) : null;
  const rating = rawRating !== null && rawRating >= 1 && rawRating <= 5 ? rawRating : null;

  const message = typeof input.message === "string" ? input.message.trim().slice(0, 2000) : "";
  if (message.length < 3) {
    throw new Error("Escreva uma mensagem um pouco maior antes de enviar.");
  }

  const page = typeof input.page === "string" ? input.page.trim().slice(0, 160) : "/admin";
  const senderEmail = (input.senderEmail ?? "").trim().slice(0, 200);

  const item: CreatorFeedbackItem = {
    id: `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    category,
    rating,
    message,
    page,
    senderEmail,
    createdAt: new Date().toISOString(),
    emailed: false,
  };

  item.emailed = await sendFeedbackEmail(item);
  const existing = await listCreatorFeedback();
  await saveCreatorFeedbackList([item, ...existing]);

  return { item, emailed: item.emailed };
}

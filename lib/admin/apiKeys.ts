import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { head, list, put } from "@vercel/blob";
import { OPENAI_KEY_EXPIRES } from "@/lib/admin/keyExpiry";
import { REASONING_LEVELS } from "@/lib/admin/reasoningLevels";
import { getSupabaseConfig, probeSupabaseSchema, supabaseHeaders } from "@/lib/supabase";

/**
 * API keys managed from /admin/chaves in Comas.
 * - Locally: reads/writes `.env.local` and `.admin/api-keys.json`.
 * - In production (Vercel): encrypts values with AES-256-GCM and persists them in
 *   Supabase (`social_settings` id = "api_keys") or Vercel Blob, hydrating `process.env` at runtime.
 */

export type KeyProvider = {
  id: string;
  label: string;
  env: string;
  /** Where to create or renew the key. */
  console?: string;
  /** How the admin checks that the key still works; absent when the provider has no simple check. */
  test?: "openai" | "anthropic" | "deepseek" | "gemini" | "muapi" | "supabase";
  kind?: "ai" | "service" | "url";
  preset?: boolean;
};

export const PRESET_PROVIDERS: KeyProvider[] = [
  { id: "openai", label: "ChatGPT (OpenAI)", env: "OPENAI_API_KEY", console: "https://platform.openai.com/api-keys", test: "openai", preset: true },
  { id: "anthropic", label: "Claude (Anthropic)", env: "ANTHROPIC_API_KEY", console: "https://console.anthropic.com/settings/keys", test: "anthropic", preset: true },
  { id: "deepseek", label: "DeepSeek", env: "DEEPSEEK_API_KEY", console: "https://platform.deepseek.com/api_keys", test: "deepseek", preset: true },
  { id: "antigravity", label: "Antigravity (Gemini)", env: "GEMINI_API_KEY", console: "https://aistudio.google.com/apikey", test: "gemini", preset: true },
  { id: "muapi", label: "MuAPI (Imagens, Vídeos e Áudio)", env: "MUAPI_API_KEY", console: "https://muapi.ai/dashboard", test: "muapi", preset: true },
  { id: "higgsfield", label: "Higgsfield", env: "HIGGSFIELD_API_KEY", console: "https://cloud.higgsfield.ai/api-keys", preset: true },
  { id: "resend", label: "Resend (E-mail de login OTP)", env: "RESEND_API_KEY", console: "https://resend.com/api-keys", preset: true, kind: "service" },
  { id: "supabase-url", label: "Supabase (URL do projeto)", env: "SUPABASE_URL", console: "https://supabase.com/dashboard/projects", preset: true, kind: "url" },
  { id: "supabase-key", label: "Supabase (Secret / Service Role Key)", env: "SUPABASE_SERVICE_ROLE_KEY", console: "https://supabase.com/dashboard/projects", test: "supabase", preset: true, kind: "service" },
];

type Meta = { expires?: string; notes?: string; model?: string; reasoning?: string };

type Store = {
  custom: KeyProvider[];
  meta: Record<string, Meta>;
  values?: Record<string, string | null>;
};

type CloudPayload = {
  version: 1;
  custom: KeyProvider[];
  meta: Record<string, Meta>;
  encryptedValues?: string;
};

export type KeyRow = KeyProvider & Meta & { set: boolean; masked: string; modelEnv: string; reasoningEnv: string };

/** Snapshot platform environment variables before runtime overrides so removals fall back cleanly. */
const PLATFORM_ENV: Record<string, string | undefined> = { ...process.env };

/** The variable that holds the chosen model: OPENAI_API_KEY → OPENAI_MODEL. */
const envBase = (env: string) => env.replace(/_(API_)?(KEY|TOKEN|SECRET)$/, "");
export const modelEnvFor = (env: string) => `${envBase(env)}_MODEL`;
/** OPENAI_API_KEY → OPENAI_REASONING. */
export const reasoningEnvFor = (env: string) => `${envBase(env)}_REASONING`;

const root = process.cwd();
const ENV_FILE = path.join(root, ".env.local");
const STORE_FILE = path.join(root, ".admin", "api-keys.json");
const BLOB_PATH = "comas-admin/api-keys.enc.json";
const TIMEOUT_MS = 8_000;
const HYDRATE_TTL_MS = 15_000;
export const ENV_NAME = /^[A-Z][A-Z0-9_]{1,63}$/;

let lastHydratedAt = 0;

function getEncryptionSecret(): string {
  for (const candidate of [
    PLATFORM_ENV.AUTH_SECRET,
    process.env.AUTH_SECRET,
    PLATFORM_ENV.RESEND_API_KEY,
    process.env.RESEND_API_KEY,
    PLATFORM_ENV.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    PLATFORM_ENV.BLOB_READ_WRITE_TOKEN,
    process.env.BLOB_READ_WRITE_TOKEN,
  ]) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function encryptValues(values: Record<string, string | null>): string {
  const secret = getEncryptionSecret();
  if (!secret) {
    throw new Error("Defina AUTH_SECRET ou RESEND_API_KEY para criptografar as chaves na nuvem.");
  }
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(values), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptValues(token: string | undefined): Record<string, string | null> {
  if (!token) return {};
  const secret = getEncryptionSecret();
  if (!secret) return {};
  const parts = token.split(".");
  if (parts.length !== 3) return {};
  try {
    const [ivB64, tagB64, dataB64] = parts as [string, string, string];
    const key = createHash("sha256").update(secret).digest();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ]);
    const parsed = JSON.parse(decrypted.toString("utf8")) as Record<string, string | null>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function readSupabaseStore(): Promise<Store | null> {
  const sb = getSupabaseConfig();
  if (!sb) return null;
  try {
    const res = await fetch(`${sb.url}/rest/v1/social_settings?id=eq.api_keys&select=theme`, {
      headers: supabaseHeaders(sb.key),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ theme?: CloudPayload }>;
    const payload = rows[0]?.theme;
    if (!payload) return { custom: [], meta: {}, values: {} };
    return {
      custom: Array.isArray(payload.custom) ? payload.custom : [],
      meta: payload.meta && typeof payload.meta === "object" ? payload.meta : {},
      values: decryptValues(payload.encryptedValues),
    };
  } catch {
    return null;
  }
}

async function writeSupabaseStore(store: Store): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseConfig();
  if (!sb) return { ok: false };
  const payload: CloudPayload = {
    version: 1,
    custom: store.custom,
    meta: store.meta,
    encryptedValues: encryptValues(store.values ?? {}),
  };
  try {
    const res = await fetch(`${sb.url}/rest/v1/social_settings`, {
      method: "POST",
      headers: supabaseHeaders(sb.key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({ id: "api_keys", theme: payload, updated_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return { ok: true };
    const text = await res.text().catch(() => "");
    if (res.status === 404 || /PGRST205|does not exist|could not find the table/i.test(text)) {
      return {
        ok: false,
        error:
          "Supabase conectado, mas a tabela social_settings ainda não existe. Rode o SQL de supabase/social_studio.sql no SQL Editor do Supabase.",
      };
    }
    if (res.status === 401 || res.status === 403 || /42501|PGRST301/i.test(text)) {
      return {
        ok: false,
        error:
          "Supabase recusou a gravação (401/403). Confira se SUPABASE_SERVICE_ROLE_KEY usa a chave service_role / Secret Key (não a anon/publishable) e rode o SQL completo de supabase/social_studio.sql.",
      };
    }
    return { ok: false, error: `Erro ao gravar no Supabase (${res.status}): ${text.slice(0, 180)}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `Falha de conexão com o Supabase: ${err.message}` : "Falha de conexão com o Supabase.",
    };
  }
}

async function readBlobStore(): Promise<Store | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) return null;
  try {
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
    const item = blobs.find(b => b.pathname === BLOB_PATH) ?? blobs[0];
    if (!item) return { custom: [], meta: {}, values: {} };
    const info = await head(item.url);
    const res = await fetch(info.downloadUrl || item.url, { cache: "no-store" });
    if (!res.ok) return null;
    const payload = (await res.json()) as CloudPayload;
    return {
      custom: Array.isArray(payload.custom) ? payload.custom : [],
      meta: payload.meta && typeof payload.meta === "object" ? payload.meta : {},
      values: decryptValues(payload.encryptedValues),
    };
  } catch {
    return null;
  }
}

async function writeBlobStore(store: Store): Promise<boolean> {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) return false;
  try {
    const payload: CloudPayload = {
      version: 1,
      custom: store.custom,
      meta: store.meta,
      encryptedValues: encryptValues(store.values ?? {}),
    };
    await put(BLOB_PATH, JSON.stringify(payload), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return true;
  } catch {
    return false;
  }
}

async function readLocalStore(): Promise<Store> {
  try {
    const data = JSON.parse(await fs.readFile(STORE_FILE, "utf8")) as Partial<Store>;
    return { custom: data.custom ?? [], meta: data.meta ?? {}, values: data.values ?? {} };
  } catch {
    return { custom: [], meta: {}, values: {} };
  }
}

async function writeLocalStore(store: Store): Promise<boolean> {
  try {
    const { custom, meta } = store;
    await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
    await fs.writeFile(STORE_FILE, `${JSON.stringify({ custom, meta }, null, 2)}\n`, { mode: 0o600 });
    return true;
  } catch {
    return false;
  }
}

const readEnvFile = () => fs.readFile(ENV_FILE, "utf8").catch(() => "");

function parseEnv(text: string) {
  const values: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2]!.trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    values[m[1]!] = v;
  }
  return values;
}

async function writeLocalEnvVar(name: string, value: string | null): Promise<boolean> {
  try {
    const lines = (await readEnvFile()).split("\n");
    const at = lines.findIndex(line => new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`).test(line));
    const entry = value === null ? null : `${name}=${/[\s#"'$]/.test(value) ? JSON.stringify(value) : value}`;
    if (at >= 0) {
      if (entry === null) lines.splice(at, 1);
      else lines[at] = entry;
    } else if (entry !== null) {
      if (lines.length && lines[lines.length - 1] === "") lines.splice(lines.length - 1, 0, entry);
      else lines.push(entry);
    }
    await fs.writeFile(ENV_FILE, lines.join("\n").replace(/\n*$/, "\n"), { mode: 0o600 });
    return true;
  } catch {
    return false;
  }
}

function applyRuntimeVar(name: string, value: string | null | undefined) {
  if (value === null) {
    if (PLATFORM_ENV[name] !== undefined) process.env[name] = PLATFORM_ENV[name];
    else delete process.env[name];
  } else if (typeof value === "string" && value.trim()) {
    process.env[name] = value.trim();
  }
}

async function readCombinedState(): Promise<{ store: Store; localEnv: Record<string, string> }> {
  const [cloud, local, localEnv] = await Promise.all([
    readSupabaseStore().then(s => s ?? readBlobStore()),
    readLocalStore(),
    readEnvFile().then(parseEnv),
  ]);

  const customMap = new Map<string, KeyProvider>();
  for (const item of [...local.custom, ...(cloud?.custom ?? [])]) {
    customMap.set(item.id, item);
  }

  const meta: Record<string, Meta> = { ...local.meta, ...(cloud?.meta ?? {}) };
  const values: Record<string, string | null> = { ...(local.values ?? {}), ...(cloud?.values ?? {}) };

  return {
    store: { custom: [...customMap.values()], meta, values },
    localEnv,
  };
}

async function persistCombinedStore(store: Store, envUpdates: Array<[string, string | null]>): Promise<void> {
  for (const [name, value] of envUpdates) {
    applyRuntimeVar(name, value);
  }

  let savedLocal = false;
  if (!process.env.VERCEL) {
    for (const [name, value] of envUpdates) {
      const ok = await writeLocalEnvVar(name, value);
      if (ok) savedLocal = true;
    }
    const storeOk = await writeLocalStore(store);
    savedLocal = savedLocal || storeOk;
  }

  const sbResult = await writeSupabaseStore(store);
  const savedBlob = sbResult.ok ? false : await writeBlobStore(store);

  lastHydratedAt = Date.now();

  if (!savedLocal && !sbResult.ok && !savedBlob) {
    throw new Error(
      sbResult.error ||
        "Para salvar chaves no ambiente publicado (Vercel), configure SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (com a tabela social_settings) ou BLOB_READ_WRITE_TOKEN nas variáveis da Vercel.",
    );
  }
}

/** Loads cloud/local saved keys and models into `process.env` so AI & media routes use them immediately. */
export async function hydrateRuntimeKeys(force = false): Promise<void> {
  if (!force && Date.now() - lastHydratedAt < HYDRATE_TTL_MS) return;
  const { store, localEnv } = await readCombinedState();
  for (const [k, v] of Object.entries(localEnv)) {
    if (v) process.env[k] = v;
  }
  for (const [k, v] of Object.entries(store.values ?? {})) {
    applyRuntimeVar(k, v);
  }
  const providers = [...PRESET_PROVIDERS, ...store.custom];
  for (const p of providers) {
    const m = store.meta[p.id];
    if (!m) continue;
    if (m.model) process.env[modelEnvFor(p.env)] = m.model;
    if (m.reasoning) process.env[reasoningEnvFor(p.env)] = m.reasoning;
  }
  lastHydratedAt = Date.now();
}

const mask = (v: string) => (v.length <= 8 ? "••••" : `${v.slice(0, 4)}…${v.slice(-4)}`);

const ENV_FALLBACKS: Record<string, string[]> = {
  SUPABASE_URL: ["NEXT_PUBLIC_SUPABASE_URL"],
  SUPABASE_SERVICE_ROLE_KEY: ["SUPABASE_SECRET_KEY"],
};

function resolveKeyValue(
  envName: string,
  storeValues: Record<string, string | null>,
  localEnv: Record<string, string>,
): string {
  if (envName in storeValues) {
    const v = storeValues[envName];
    if (v === null) return (PLATFORM_ENV[envName] ?? "").trim();
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const direct = (localEnv[envName] || process.env[envName] || PLATFORM_ENV[envName] || "").trim();
  if (direct) return direct;
  for (const alt of ENV_FALLBACKS[envName] ?? []) {
    const altVal = (localEnv[alt] || process.env[alt] || PLATFORM_ENV[alt] || "").trim();
    if (altVal) return altVal;
  }
  return "";
}

export async function listKeys(): Promise<KeyRow[]> {
  const { store, localEnv } = await readCombinedState();
  const storeValues = store.values ?? {};
  return [...PRESET_PROVIDERS, ...store.custom].map(p => {
    const value = resolveKeyValue(p.env, storeValues, localEnv);
    const meta = store.meta[p.id] ?? {};
    const expires = meta.expires ?? (p.id === "openai" ? OPENAI_KEY_EXPIRES : undefined);
    const modelEnv = modelEnvFor(p.env);
    const model = meta.model ?? localEnv[modelEnv] ?? process.env[modelEnv];
    const reasoningEnv = reasoningEnvFor(p.env);
    const reasoning = meta.reasoning ?? localEnv[reasoningEnv] ?? process.env[reasoningEnv];
    const masked = value ? (p.kind === "url" ? value : mask(value)) : "";
    return { ...p, ...meta, model, modelEnv, reasoning, reasoningEnv, expires, set: !!value, masked };
  });
}

async function findProvider(id: string) {
  const { store, localEnv } = await readCombinedState();
  return {
    store,
    localEnv,
    provider: [...PRESET_PROVIDERS, ...store.custom].find(p => p.id === id),
  };
}

export async function saveKey(input: {
  id?: string;
  label?: string;
  env?: string;
  value?: string;
  expires?: string;
  notes?: string;
  model?: string;
  reasoning?: string;
}) {
  const found = await findProvider(input.id ?? "");
  const store: Store = {
    custom: [...found.store.custom],
    meta: { ...found.store.meta },
    values: { ...(found.store.values ?? {}) },
  };
  let provider = found.provider;
  if (!provider) {
    const label = input.label?.trim();
    const env = input.env?.trim().toUpperCase();
    if (!label || !env || !ENV_NAME.test(env)) {
      throw new Error("Dê um nome e uma variável válida (ex.: MINHA_API_KEY).");
    }
    if ([...PRESET_PROVIDERS, ...store.custom].some(p => p.env === env)) {
      throw new Error(`${env} já está na lista.`);
    }
    provider = { id: `custom-${env.toLowerCase()}`, label, env };
    store.custom.push(provider);
  }

  const envUpdates: Array<[string, string | null]> = [];

  if (input.value !== undefined && input.value.trim()) {
    const cleanValue = input.value.trim();
    if (provider.kind === "url") {
      const normalized = cleanValue.replace(/\/+$/, "");
      if (!/^https?:\/\/[^/\s]+/i.test(normalized)) {
        throw new Error("Informe a URL completa do projeto (ex.: https://xxxx.supabase.co).");
      }
      store.values![provider.env] = normalized;
      envUpdates.push([provider.env, normalized]);
    } else {
      store.values![provider.env] = cleanValue;
      envUpdates.push([provider.env, cleanValue]);
    }
  }

  const meta: Meta = { ...store.meta[provider.id] };
  if (input.expires !== undefined) meta.expires = input.expires || undefined;
  if (input.notes !== undefined) meta.notes = input.notes.trim() || undefined;
  if ((provider.kind ?? "ai") === "ai") {
    if (input.model !== undefined) {
      meta.model = input.model.trim() || undefined;
      store.values![modelEnvFor(provider.env)] = meta.model ?? null;
      envUpdates.push([modelEnvFor(provider.env), meta.model ?? null]);
    }
    if (input.reasoning !== undefined) {
      const allowed =
        provider.test && provider.test !== "supabase" && provider.test !== "muapi"
          ? REASONING_LEVELS[provider.test] ?? []
          : [];
      meta.reasoning = allowed.some(l => l.value === input.reasoning) ? input.reasoning : undefined;
      store.values![reasoningEnvFor(provider.env)] = meta.reasoning ?? null;
      envUpdates.push([reasoningEnvFor(provider.env), meta.reasoning ?? null]);
    }
  }

  store.meta[provider.id] = meta;
  await persistCombinedStore(store, envUpdates);
  return provider.id;
}

/** Clears the value; a custom provider also leaves the list. */
export async function removeKey(id: string) {
  const { store: current, provider } = await findProvider(id);
  if (!provider) throw new Error("Chave não encontrada.");
  const store: Store = {
    custom: current.custom.filter(p => p.id !== id),
    meta: { ...current.meta },
    values: { ...(current.values ?? {}) },
  };
  delete store.meta[id];
  store.values![provider.env] = null;
  store.values![modelEnvFor(provider.env)] = null;
  store.values![reasoningEnvFor(provider.env)] = null;

  await persistCombinedStore(store, [
    [provider.env, null],
    [modelEnvFor(provider.env), null],
    [reasoningEnvFor(provider.env), null],
  ]);
}

type AiProviderTest = Exclude<NonNullable<KeyProvider["test"]>, "supabase">;
function parseModels(kind: AiProviderTest, data: unknown): string[] {
  if (kind === "muapi") {
    const arr = Array.isArray(data)
      ? data
      : Array.isArray((data as { models?: unknown[] })?.models)
        ? (data as { models: unknown[] }).models
        : Array.isArray((data as { data?: unknown[] })?.data)
          ? (data as { data: unknown[] }).data
          : [];
    const ids = arr.map(m => {
      const r = (m ?? {}) as Record<string, unknown>;
      return String(r.slug ?? r.endpoint ?? r.id ?? r.name ?? "");
    });
    return [...new Set(ids.filter(Boolean))].sort();
  }
  const d = data as { data?: Array<{ id?: string }>; models?: Array<{ name?: string; supportedGenerationMethods?: string[] }> };
  const ids = kind === "gemini"
    ? (d.models ?? []).filter(m => m.supportedGenerationMethods?.includes("generateContent")).map(m => (m.name ?? "").replace(/^models\//, ""))
    : (d.data ?? []).map(m => m.id ?? "");
  return [...new Set(ids.filter(Boolean))].sort();
}

/** Checks the key and, when it works, returns the models it can use. */
export async function testKey(id: string): Promise<{ ok: boolean; message: string; models?: string[] }> {
  const { store, localEnv, provider } = await findProvider(id);
  if (!provider) throw new Error("Chave não encontrada.");
  const storeValues = store.values ?? {};
  const key = resolveKeyValue(provider.env, storeValues, localEnv);
  if (!key) return { ok: false, message: "Nenhuma chave salva." };
  if (!provider.test) return { ok: false, message: "Sem teste automático para este provedor." };
  if (provider.test === "supabase") {
    const url = resolveKeyValue("SUPABASE_URL", storeValues, localEnv).replace(/\/+$/, "");
    if (!url) return { ok: false, message: "Cadastre também SUPABASE_URL antes de testar." };
    const probe = await probeSupabaseSchema({ url, key });
    return { ok: probe.connected && probe.schemaReady, message: probe.message };
  }
  const request: Record<AiProviderTest, [string, HeadersInit]> = {
    openai: ["https://api.openai.com/v1/models", { Authorization: `Bearer ${key}` }],
    deepseek: ["https://api.deepseek.com/models", { Authorization: `Bearer ${key}` }],
    anthropic: ["https://api.anthropic.com/v1/models", { "x-api-key": key, "anthropic-version": "2023-06-01" }],
    gemini: ["https://generativelanguage.googleapis.com/v1beta/models", { "x-goog-api-key": key }],
    muapi: ["https://api.muapi.ai/api/v1/account/balance", { "x-api-key": key }],
  };
  const [url, headers] = request[provider.test];
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
    if (response.ok) {
      const json = await response.json().catch(() => ({}));
      if (provider.test === "muapi") {
        const bal = (json as Record<string, unknown>)?.balance ?? (json as Record<string, unknown>)?.credits;
        const modelsRes = await fetch("https://api.muapi.ai/api/v1/models", { headers, signal: AbortSignal.timeout(8_000) }).catch(() => null);
        const modelsJson = modelsRes?.ok ? await modelsRes.json().catch(() => ({})) : {};
        return {
          ok: true,
          message: bal !== undefined ? `Chave funcionando · Saldo: ${bal}` : "Chave MuAPI funcionando.",
          models: parseModels("muapi", modelsJson),
        };
      }
      return { ok: true, message: "Chave funcionando.", models: parseModels(provider.test, json) };
    }
    return { ok: false, message: response.status === 401 || response.status === 403 ? "Chave recusada (inválida ou revogada)." : `O provedor respondeu ${response.status}.` };
  } catch {
    return { ok: false, message: "Não foi possível falar com o provedor." };
  }
}

/** Keys whose validity is near or past, for the admin's notices (OpenAI has its own). */
export async function expiringKeys(warnDays = 21) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return (await listKeys()).filter(k => k.id !== "openai" && k.set && k.expires).map(k => {
    const days = Math.round((new Date(`${k.expires}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
    return { ...k, days };
  }).filter(k => k.days <= warnDays);
}

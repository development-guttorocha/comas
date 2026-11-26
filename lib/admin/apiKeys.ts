import { promises as fs } from "node:fs";
import path from "node:path";
import { OPENAI_KEY_EXPIRES } from "@/lib/admin/keyExpiry";
import { REASONING_LEVELS } from "@/lib/admin/reasoningLevels";
import { probeSupabaseSchema } from "@/lib/supabase";

/**
 * Gutto's API keys, managed from the admin on this machine. The value of each key lives in
 * `.env.local` (where the site reads it, never committed); what the admin adds around it —
 * validity, notes, the custom providers — lives in `.admin/api-keys.json`, also out of git.
 */

export type KeyProvider = {
  id: string;
  label: string;
  env: string;
  /** Where to create or renew the key. */
  console?: string;
  /** How the admin checks that the key still works; absent when the provider has no simple check. */
  test?: "openai" | "anthropic" | "deepseek" | "gemini" | "supabase";
  kind?: "ai" | "service" | "url";
  preset?: boolean;
};

export const PRESET_PROVIDERS: KeyProvider[] = [
  { id: "openai", label: "ChatGPT (OpenAI)", env: "OPENAI_API_KEY", console: "https://platform.openai.com/api-keys", test: "openai", preset: true },
  { id: "anthropic", label: "Claude (Anthropic)", env: "ANTHROPIC_API_KEY", console: "https://console.anthropic.com/settings/keys", test: "anthropic", preset: true },
  { id: "deepseek", label: "DeepSeek", env: "DEEPSEEK_API_KEY", console: "https://platform.deepseek.com/api_keys", test: "deepseek", preset: true },
  { id: "antigravity", label: "Antigravity (Gemini)", env: "GEMINI_API_KEY", console: "https://aistudio.google.com/apikey", test: "gemini", preset: true },
  { id: "higgsfield", label: "Higgsfield", env: "HIGGSFIELD_API_KEY", console: "https://cloud.higgsfield.ai/api-keys", preset: true },
  { id: "supabase-url", label: "Supabase (URL do projeto)", env: "SUPABASE_URL", console: "https://supabase.com/dashboard/projects", preset: true, kind: "url" },
  { id: "supabase-key", label: "Supabase (Secret / Service Role Key)", env: "SUPABASE_SERVICE_ROLE_KEY", console: "https://supabase.com/dashboard/projects", test: "supabase", preset: true, kind: "service" },
];

type Meta = { expires?: string; notes?: string; model?: string; reasoning?: string };

type Store = { custom: KeyProvider[]; meta: Record<string, Meta> };

export type KeyRow = KeyProvider & Meta & { set: boolean; masked: string; modelEnv: string; reasoningEnv: string };

/** The variable that holds the chosen model: OPENAI_API_KEY → OPENAI_MODEL. */
const envBase = (env: string) => env.replace(/_(API_)?(KEY|TOKEN|SECRET)$/, "");
export const modelEnvFor = (env: string) => `${envBase(env)}_MODEL`;
/** OPENAI_API_KEY → OPENAI_REASONING. */
export const reasoningEnvFor = (env: string) => `${envBase(env)}_REASONING`;

const root = process.cwd();
const ENV_FILE = path.join(root, ".env.local");
const STORE_FILE = path.join(root, ".admin", "api-keys.json");
export const ENV_NAME = /^[A-Z][A-Z0-9_]{1,63}$/;

async function readStore(): Promise<Store> {
  try {
    const data = JSON.parse(await fs.readFile(STORE_FILE, "utf8")) as Partial<Store>;
    return { custom: data.custom ?? [], meta: data.meta ?? {} };
  } catch { return { custom: [], meta: {} }; }
}

async function writeStore(store: Store) {
  await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
  await fs.writeFile(STORE_FILE, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
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

/** Replaces (or appends, or with `null` removes) one variable, keeping every other line as it was. */
async function writeEnvVar(name: string, value: string | null) {
  const lines = (await readEnvFile()).split("\n");
  const at = lines.findIndex(line => new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`).test(line));
  const entry = value === null ? null : `${name}=${/[\s#"'$]/.test(value) ? JSON.stringify(value) : value}`;
  if (at >= 0) { if (entry === null) lines.splice(at, 1); else lines[at] = entry; }
  else if (entry !== null) { if (lines.length && lines[lines.length - 1] === "") lines.splice(lines.length - 1, 0, entry); else lines.push(entry); }
  await fs.writeFile(ENV_FILE, lines.join("\n").replace(/\n*$/, "\n"), { mode: 0o600 });
  if (value === null) delete process.env[name]; else process.env[name] = value;
}

const mask = (v: string) => (v.length <= 8 ? "••••" : `${v.slice(0, 4)}…${v.slice(-4)}`);

export async function listKeys(): Promise<KeyRow[]> {
  const [store, env] = await Promise.all([readStore(), readEnvFile().then(parseEnv)]);
  return [...PRESET_PROVIDERS, ...store.custom].map(p => {
    const value = env[p.env] ?? process.env[p.env] ?? "";
    const meta = store.meta[p.id] ?? {};
    const expires = meta.expires ?? (p.id === "openai" ? OPENAI_KEY_EXPIRES : undefined);
    const modelEnv = modelEnvFor(p.env);
    const model = env[modelEnv] ?? meta.model;
    const reasoningEnv = reasoningEnvFor(p.env);
    const reasoning = env[reasoningEnv] ?? meta.reasoning;
    const masked = value ? (p.kind === "url" ? value.trim() : mask(value)) : "";
    return { ...p, ...meta, model, modelEnv, reasoning, reasoningEnv, expires, set: !!value.trim(), masked };
  });
}

async function findProvider(id: string) {
  const store = await readStore();
  return { store, provider: [...PRESET_PROVIDERS, ...store.custom].find(p => p.id === id) };
}

export async function saveKey(input: { id?: string; label?: string; env?: string; value?: string; expires?: string; notes?: string; model?: string; reasoning?: string }) {
  const found = await findProvider(input.id ?? "");
  const store = found.store;
  let provider = found.provider;
  if (!provider) {
    const label = input.label?.trim();
    const env = input.env?.trim().toUpperCase();
    if (!label || !env || !ENV_NAME.test(env)) throw new Error("Dê um nome e uma variável válida (ex.: MINHA_API_KEY).");
    if ([...PRESET_PROVIDERS, ...store.custom].some(p => p.env === env)) throw new Error(`${env} já está na lista.`);
    provider = { id: `custom-${env.toLowerCase()}`, label, env };
    store.custom.push(provider);
  }
  if (input.value !== undefined && input.value.trim()) {
    const cleanValue = input.value.trim();
    if (provider.kind === "url") {
      const normalized = cleanValue.replace(/\/+$/, "");
      if (!/^https?:\/\/[^/\s]+/i.test(normalized)) {
        throw new Error("Informe a URL completa do projeto (ex.: https://xxxx.supabase.co).");
      }
      await writeEnvVar(provider.env, normalized);
    } else {
      await writeEnvVar(provider.env, cleanValue);
    }
  }
  const meta: Meta = { ...store.meta[provider.id] };
  if (input.expires !== undefined) meta.expires = input.expires || undefined;
  if (input.notes !== undefined) meta.notes = input.notes.trim() || undefined;
  if ((provider.kind ?? "ai") === "ai") {
    if (input.model !== undefined) {
      meta.model = input.model.trim() || undefined;
      await writeEnvVar(modelEnvFor(provider.env), meta.model ?? null);
    }
    if (input.reasoning !== undefined) {
      const allowed = provider.test && provider.test !== "supabase" ? REASONING_LEVELS[provider.test] ?? [] : [];
      meta.reasoning = allowed.some(l => l.value === input.reasoning) ? input.reasoning : undefined;
      await writeEnvVar(reasoningEnvFor(provider.env), meta.reasoning ?? null);
    }
  }
  store.meta[provider.id] = meta;
  await writeStore(store);
  return provider.id;
}

/** Clears the value; a custom provider also leaves the list. */
export async function removeKey(id: string) {
  const { store, provider } = await findProvider(id);
  if (!provider) throw new Error("Chave não encontrada.");
  await writeEnvVar(provider.env, null);
  await writeEnvVar(modelEnvFor(provider.env), null);
  await writeEnvVar(reasoningEnvFor(provider.env), null);
  delete store.meta[id];
  store.custom = store.custom.filter(p => p.id !== id);
  await writeStore(store);
}

/** One cheap read on the provider's API (the model list), with the key on this machine. */
type AiProviderTest = Exclude<NonNullable<KeyProvider["test"]>, "supabase">;
function parseModels(kind: AiProviderTest, data: unknown): string[] {
  const d = data as { data?: Array<{ id?: string }>; models?: Array<{ name?: string; supportedGenerationMethods?: string[] }> };
  const ids = kind === "gemini"
    ? (d.models ?? []).filter(m => m.supportedGenerationMethods?.includes("generateContent")).map(m => (m.name ?? "").replace(/^models\//, ""))
    : (d.data ?? []).map(m => m.id ?? "");
  return [...new Set(ids.filter(Boolean))].sort();
}

/** Checks the key and, when it works, returns the models it can use. */
export async function testKey(id: string): Promise<{ ok: boolean; message: string; models?: string[] }> {
  const { provider } = await findProvider(id);
  if (!provider) throw new Error("Chave não encontrada.");
  const env = parseEnv(await readEnvFile());
  const key = (env[provider.env] ?? process.env[provider.env] ?? "").trim();
  if (!key) return { ok: false, message: "Nenhuma chave salva." };
  if (!provider.test) return { ok: false, message: "Sem teste automático para este provedor." };
  if (provider.test === "supabase") {
    const url = (env.SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
    if (!url) return { ok: false, message: "Cadastre também SUPABASE_URL antes de testar." };
    const probe = await probeSupabaseSchema({ url, key });
    return { ok: probe.connected && probe.schemaReady, message: probe.message };
  }
  const request: Record<AiProviderTest, [string, HeadersInit]> = {
    openai: ["https://api.openai.com/v1/models", { Authorization: `Bearer ${key}` }],
    deepseek: ["https://api.deepseek.com/models", { Authorization: `Bearer ${key}` }],
    anthropic: ["https://api.anthropic.com/v1/models", { "x-api-key": key, "anthropic-version": "2023-06-01" }],
    gemini: ["https://generativelanguage.googleapis.com/v1beta/models", { "x-goog-api-key": key }],
  };
  const [url, headers] = request[provider.test];
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
    if (response.ok) return { ok: true, message: "Chave funcionando.", models: parseModels(provider.test, await response.json().catch(() => ({}))) };
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

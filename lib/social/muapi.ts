const DEFAULT_BASE_URL = "https://api.muapi.ai";

export type MuapiMediaKind = "image" | "video" | "audio";

export type MuapiModelPreset = {
  slug: string;
  label: string;
  kind: MuapiMediaKind;
  hint: string;
  defaultParams?: Record<string, unknown>;
};

export const MUAPI_PRESETS: MuapiModelPreset[] = [
  {
    slug: "z-image-turbo",
    label: "Z-Image Turbo (Rápido · ~$0.007)",
    kind: "image",
    hint: "Ótimo custo-benefício para ilustrações e fundos editoriais de slides.",
    defaultParams: { width: 1088, height: 1344 },
  },
  {
    slug: "flux-dev-image",
    label: "FLUX Dev (Editorial · Alta textura)",
    kind: "image",
    hint: "Fotografia editorial, objetos sobre mesa, cadernos, livros e texturas.",
    defaultParams: { width: 1088, height: 1344 },
  },
  {
    slug: "gpt-image-2-text-to-image",
    label: "GPT Image 2 (Fidelidade de prompt)",
    kind: "image",
    hint: "Ideal quando a cena exige composição precisa ou tipografia integrada.",
  },
  {
    slug: "seedream-5-0-pro",
    label: "Seedream 5.0 Pro (Artístico)",
    kind: "image",
    hint: "Estilo editorial ilustrado e direção de arte marcante.",
  },
  {
    slug: "grok-imagine-video-1-5-lite",
    label: "Grok Imagine Video 1.5 Lite (Vídeo econômico)",
    kind: "video",
    hint: "Clipes curtos para fundo de Reels (B-roll) com baixo custo.",
    defaultParams: { aspect_ratio: "9:16", duration: 5 },
  },
  {
    slug: "wan-3-0-text-to-video",
    label: "Wan 3.0 Text-to-Video (1080p + Áudio)",
    kind: "video",
    hint: "Gera vídeo com áudio ambiente sincronizado.",
    defaultParams: { aspect_ratio: "9:16", duration: 5 },
  },
  {
    slug: "seedance-2-5-text-to-video",
    label: "Seedance 2.5 (Cinematográfico)",
    kind: "video",
    hint: "Movimento de câmera suave para fundos de vídeo.",
    defaultParams: { aspect_ratio: "9:16", duration: 5 },
  },
];

export type MuapiCost = {
  amount_usd?: number;
  amount_credits?: number;
  refunded?: boolean;
};

export type MuapiJobResponse = {
  requestId: string;
  status: "processing" | "completed" | "failed" | "cancelled" | string;
  outputs: string[];
  cost?: MuapiCost;
  balance?: string | number | null;
  error?: string;
};

function baseUrl(): string {
  return (process.env.MUAPI_BASE_URL ?? DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
}

export function getMuapiKey(): string {
  return (process.env.MUAPI_API_KEY ?? "").trim();
}

export function isMuapiConfigured(): boolean {
  return getMuapiKey().length > 0;
}

function normalizePrediction(raw: Record<string, unknown>, headers?: Headers): MuapiJobResponse {
  const dataObj =
    raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>)
      : raw;

  const requestId = String(
    dataObj.request_id ?? dataObj.id ?? raw.request_id ?? raw.id ?? "",
  );
  const status = String(dataObj.status ?? raw.status ?? "processing");

  const rawOutputs = dataObj.outputs ?? raw.outputs ?? dataObj.output ?? raw.output;
  const outputs = Array.isArray(rawOutputs)
    ? rawOutputs.filter((u): u is string => typeof u === "string" && u.length > 0)
    : typeof rawOutputs === "string" && rawOutputs.length > 0
      ? [rawOutputs]
      : [];

  const costObj = (dataObj.cost ?? raw.cost) as MuapiCost | undefined;
  const headerCost = headers?.get("x-muapi-cost-usd");
  const headerBalance = headers?.get("x-account-balance");

  return {
    requestId,
    status,
    outputs,
    cost: costObj ?? (headerCost ? { amount_usd: Number(headerCost) } : undefined),
    balance: headerBalance ?? null,
    error: typeof dataObj.error === "string" ? dataObj.error : typeof raw.error === "string" ? raw.error : undefined,
  };
}

export async function getMuapiBalance(): Promise<{
  configured: boolean;
  balance?: number | string | null;
  raw?: Record<string, unknown>;
}> {
  const key = getMuapiKey();
  if (!key) return { configured: false };
  const res = await fetch(`${baseUrl()}/api/v1/account/balance`, {
    headers: { "x-api-key": key },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`MuAPI (${res.status}): ${err.slice(0, 180)}`);
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const balance =
    (data.balance as number | string | undefined) ??
    (data.credits as number | string | undefined) ??
    res.headers.get("x-account-balance");
  return { configured: true, balance: balance ?? null, raw: data };
}

export async function submitMuapiJob(input: {
  model: string;
  prompt: string;
  params?: Record<string, unknown>;
}): Promise<MuapiJobResponse> {
  const key = getMuapiKey();
  if (!key) {
    throw new Error("MUAPI_API_KEY não configurada. Adicione na Vercel ou em .env.local.");
  }

  const slug = input.model.trim().replace(/^\/+|\/+$/g, "");
  if (!/^[a-z0-9._-]+$/i.test(slug)) {
    throw new Error("Modelo MuAPI inválido.");
  }

  const preset = MUAPI_PRESETS.find(p => p.slug === slug);
  const payload: Record<string, unknown> = {
    ...(preset?.defaultParams ?? {}),
    ...(input.params ?? {}),
    prompt: input.prompt.trim(),
  };

  const res = await fetch(`${baseUrl()}/api/v1/${slug}`, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`MuAPI recusou a tarefa (${res.status}): ${err.slice(0, 220)}`);
  }

  const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return normalizePrediction(raw, res.headers);
}

export async function getMuapiJobResult(requestId: string): Promise<MuapiJobResponse> {
  const key = getMuapiKey();
  if (!key) {
    throw new Error("MUAPI_API_KEY não configurada.");
  }
  const cleanId = requestId.trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanId)) {
    throw new Error("request_id inválido.");
  }

  const res = await fetch(`${baseUrl()}/api/v1/predictions/${encodeURIComponent(cleanId)}/result`, {
    headers: { "x-api-key": key },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Erro ao consultar resultado MuAPI (${res.status}): ${err.slice(0, 180)}`);
  }

  const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return normalizePrediction(raw, res.headers);
}

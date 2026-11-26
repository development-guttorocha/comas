import { listKeys } from "@/lib/admin/apiKeys";

// DeepSeek for the reels, configured in the admin's Chaves de API: the key, the model
// (deepseek-v4-pro or deepseek-flash) and whether the model thinks before answering.

export interface DeepSeekConfig {
  key: string;
  model: string;
  thinking: boolean;
}

export async function deepSeekConfig(): Promise<DeepSeekConfig> {
  const row = (await listKeys()).find((k) => k.id === "deepseek");
  const key = (process.env.DEEPSEEK_API_KEY ?? "").trim();
  if (!key) throw new Error("Configure a chave da DeepSeek em Chaves de API para gerar o vídeo com IA.");
  return {
    key,
    model: row?.model || process.env.DEEPSEEK_MODEL || "deepseek-v4-pro",
    thinking: (row?.reasoning ?? process.env.DEEPSEEK_REASONING ?? "enabled") !== "disabled",
  };
}

/** One JSON answer from DeepSeek. `effort` applies when thinking is on. */
export async function askJson<T>(cfg: DeepSeekConfig, system: string, user: string, { effort = "high", timeoutMs = 280_000 }: { effort?: "low" | "high"; timeoutMs?: number } = {}): Promise<{ data: T; tokens: number }> {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model: cfg.model,
      ...(cfg.thinking ? { reasoning_effort: effort } : { thinking: { type: "disabled" } }),
      response_format: { type: "json_object" },
      max_tokens: 64000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("A DeepSeek recusou a chave. Confira em Chaves de API.");
    if (response.status === 402) throw new Error("A conta da DeepSeek está sem saldo para a API.");
    throw new Error(`A DeepSeek não respondeu (HTTP ${response.status}). Tente de novo em instantes.`);
  }
  const body = (await response.json()) as { choices?: { message?: { content?: string }; finish_reason?: string }[]; usage?: { total_tokens?: number } };
  const text = body.choices?.[0]?.message?.content ?? "";
  try {
    return { data: JSON.parse(text) as T, tokens: body.usage?.total_tokens ?? 0 };
  } catch {
    throw new Error(body.choices?.[0]?.finish_reason === "length" ? "A resposta da IA ficou longa demais e foi cortada. Tente de novo." : "A IA não devolveu um roteiro válido. Tente de novo.");
  }
}

/** The DeepSeek model that reads images (no thinking: it describes, it doesn't reason long). */
export const visionModel = () => process.env.DEEPSEEK_VISION_MODEL || "deepseek-flash";

export type VisionUsage = { total: number; prompt: number; completion: number };

/** One JSON answer from DeepSeek about one image (plus text). Shared by Imagem → layout and the image captions. */
export async function askVisionJson<T>(
  cfg: DeepSeekConfig,
  system: string,
  image: { data: Buffer; mime: string },
  text: string,
  { maxTokens = 8000, timeoutMs = 240_000, detail = "high" }: { maxTokens?: number; timeoutMs?: number; detail?: "low" | "high" } = {},
): Promise<{ data: T; tokens: number; usage: VisionUsage }> {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model: visionModel(),
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: [
          { type: "image_url", image_url: { url: `data:${image.mime};base64,${image.data.toString("base64")}`, detail } },
          { type: "text", text },
        ] },
      ],
    }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("A DeepSeek recusou a chave. Confira em Chaves de API.");
    if (response.status === 402) throw new Error("A conta da DeepSeek está sem saldo para a API.");
    throw new Error(`A DeepSeek não leu a imagem (HTTP ${response.status}).`);
  }
  const body = (await response.json()) as { choices?: { message?: { content?: string } }[]; usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number } };
  const usage = { total: body.usage?.total_tokens ?? 0, prompt: body.usage?.prompt_tokens ?? 0, completion: body.usage?.completion_tokens ?? 0 };
  try {
    return { data: JSON.parse(body.choices?.[0]?.message?.content ?? "{}") as T, tokens: usage.total, usage };
  } catch {
    throw new Error("A DeepSeek não devolveu um JSON válido sobre a imagem.");
  }
}

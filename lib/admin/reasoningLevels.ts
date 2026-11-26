/** How much each provider lets the model think, in its own API's words. */
export const REASONING_LEVELS: Partial<Record<"openai" | "anthropic" | "deepseek" | "gemini" | "muapi", Array<{ value: string; label: string }>>> = {
  openai: [{ value: "none", label: "Nenhum" }, { value: "minimal", label: "Mínimo" }, { value: "low", label: "Baixo" }, { value: "medium", label: "Médio" }, { value: "high", label: "Alto" }, { value: "xhigh", label: "Máximo" }],
  anthropic: [{ value: "low", label: "Baixo" }, { value: "medium", label: "Médio" }, { value: "high", label: "Alto" }, { value: "max", label: "Máximo" }],
  deepseek: [{ value: "disabled", label: "Desligado" }, { value: "enabled", label: "Ligado" }],
  gemini: [{ value: "minimal", label: "Mínimo" }, { value: "low", label: "Baixo" }, { value: "medium", label: "Médio" }, { value: "high", label: "Alto" }],
};

/**
 * Normaliza `borderClass` vinda do JSON Notion dos embeds de case.
 * `no-border` / `none` remove bordas explícitas (substitui o default do componente).
 */
export function normalizeNotionBorderClass(raw: string): string {
  const t = raw.trim();
  if (t === "no-border" || t === "none") return "";
  return raw.trim();
}

/**
 * Quando a chave `borderClass` não existe no JSON, devolve `{}` — o componente fica **sem**
 * borda por defeito. Quando existe, aplica a normalização (`no-border` / `none` → vazio).
 */
export function embedBorderProps(
  borderClass: string | undefined,
): { borderClass: string } | Record<string, never> {
  if (borderClass === undefined) return {};
  return { borderClass: normalizeNotionBorderClass(borderClass) };
}

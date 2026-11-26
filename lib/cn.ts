/** Junta classes; sem merge de conflitos Tailwind (mantém variantes explícitas nos primitivos). */
export function cn(
  ...parts: Array<string | undefined | false | null>
): string {
  return parts.filter(Boolean).join(" ");
}

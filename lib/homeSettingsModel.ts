/** The Home settings' shape and rules, safe on both sides: `lib/homeSettings.ts` reads the file on the server. */
export type BeltMotion = {
  /** Full turns of the belt from entering the screen to lying flat. */
  turns: number;
  /** Tiles per scroll while it turns freely; 1 keeps the belt moving with the page. */
  speed: number;
};
export type HomeSettings = {
  /** Case slugs on the belt and in the column, first to last; cases left out follow in their usual order. */
  order: string[];
  belt: BeltMotion;
};

export const BELT_LIMITS = { turns: { min: .5, max: 4, step: .25 }, speed: { min: .5, max: 2, step: .1 } } as const;
// One turn at the page's own pace is how the belt was designed.
export const DEFAULT_BELT: BeltMotion = { turns: 1, speed: 1 };

const clamp = (value: unknown, { min, max }: { min: number; max: number }, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

/** Whatever the file holds, a usable value: bad or missing fields fall back to the defaults. */
export function normalizeHomeSettings(raw: unknown): HomeSettings {
  const value = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const belt = (value.belt && typeof value.belt === "object" ? value.belt : {}) as Record<string, unknown>;
  return {
    order: Array.isArray(value.order) ? [...new Set(value.order.filter((slug): slug is string => typeof slug === "string"))] : [],
    belt: { turns: clamp(belt.turns, BELT_LIMITS.turns, DEFAULT_BELT.turns), speed: clamp(belt.speed, BELT_LIMITS.speed, DEFAULT_BELT.speed) },
  };
}

/** Puts the listed slugs first, in that order; the rest keep the order they came in. */
export function orderBySlugs<T extends { slug: string }>(items: T[], order: string[]): T[] {
  const rank = new Map(order.map((slug, i) => [slug, i]));
  return items.map((item, i) => ({ item, i })).sort((a, b) =>
    (rank.get(a.item.slug) ?? order.length + a.i) - (rank.get(b.item.slug) ?? order.length + b.i)).map(({ item }) => item);
}

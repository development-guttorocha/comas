import type { Case } from "@/lib/cases";

/** The case's cover: a file under `public/cases/<slug>/`, or an external URL. */
export function getCaseCoverSrc(c: Pick<Case, "slug" | "heroImage">): string | undefined {
  return c.heroImage?.trim() || undefined;
}

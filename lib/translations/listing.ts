import type { Case } from "@/lib/cases";
import { extractSource, applySnapshot } from "./document";
import { readTranslation } from "./store";

/** Lists only reviewed translations whose Portuguese case properties still match. */
export async function translatedCaseListings(cases: Case[]) {
  const rows = await Promise.all(cases.filter(c => c.slug !== "modelo").map(async c => {
    const snapshot = (await readTranslation(c.slug))?.published;
    if (!snapshot) return null;
    const source = extractSource(c, []);
    const byKey = new Map(snapshot.units.map(u => [u.key, u]));
    if (source.units.some(u => byKey.get(u.key)?.source !== u.source || !byKey.get(u.key)?.target.trim())) return null;
    return applySnapshot(source, { ...snapshot, sourceHash: source.sourceHash }).case;
  }));
  return rows.filter((c): c is Case => c !== null);
}

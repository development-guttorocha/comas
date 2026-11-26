import type { TranslationRecord, TranslationUnit } from "@/lib/translations/document";
import { api } from "./client";

// The English texts Gutto typed in the Tradução tab live with the case's unsaved edits; the case's
// Salvar keeps them as the translation draft, even half done (only "Publicar inglês" asks for all).

export type TranslationEdits = Record<string, string>;
type Source = { slug: string; title: string; sourceHash: string; units: TranslationUnit[] };

/** Every text of the current original: what Gutto typed, else what the last draft or publication had. */
export function translationUnits(source: Source, record: TranslationRecord | null, edits: TranslationEdits) {
  const previous = new Map((record?.draft ?? record?.published)?.units.map(u => [u.key, u.target]) ?? []);
  return source.units.map(unit => ({ key: unit.key, target: edits[unit.key] ?? previous.get(unit.key) ?? "" }));
}

/** Saves the typed texts as the translation draft; returns the record as saved. */
export async function saveTranslationEdits(slug: string, edits: TranslationEdits) {
  const { source, record } = await api<{ source: Source; record: TranslationRecord | null }>(`/api/translations?slug=${slug}`);
  const data = await api<{ record: TranslationRecord }>("/api/translations", {
    method: "POST", body: { slug, action: "save", revision: record?.revision ?? "", units: translationUnits(source, record, edits) },
  });
  return data.record;
}

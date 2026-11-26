import { getAllCases, getCaseBody } from "@/lib/caseContent";
import { extractSource, applySnapshot, validateTargets, type TranslationRecord, type TranslationSource } from "./document";
import { readTranslation, saveTranslation, safeSlug, TranslationConflict } from "./store";
import { TRANSLATION_MODEL, translateUnits } from "./openai";

export async function getTranslationSource(slug: string) {
  safeSlug(slug);
  const data = await getAllCases();
  if (data.source !== "content") throw new Error("Não foi possível ler os cases.");
  const c = data.cases.find(c => c.slug === slug && c.slug !== "modelo");
  if (!c) throw new Error("Case não encontrado.");
  return extractSource(c, await getCaseBody(slug));
}
export async function generateTranslation(slug: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error("Configure OPENAI_API_KEY para gerar a tradução com IA.");
  const source = await getTranslationSource(slug);
  const previous = await readTranslation(slug);
  // A draft of this original with every text filled needs nothing; a half-written one gets the rest.
  if (previous?.draft?.sourceHash === source.sourceHash && previous.draft.units.every(unit => unit.target.trim())) return previous;
  const reusable = new Map((previous?.draft?.units ?? previous?.published?.units ?? []).map(unit => [unit.key, unit]));
  const changed = source.units.filter(unit => {
    const old = reusable.get(unit.key); return !old?.target.trim() || old.source !== unit.source;
  });
  const translated = await translateUnits(changed, `${source.title}\n\n${source.units.map(u => u.source).join("\n")}`);
  const fresh = new Map(translated.map(u => [u.key, u]));
  const units = source.units.map(unit => fresh.get(unit.key) ?? reusable.get(unit.key)!);
  // translateUnits validates all new AI output; reused units can contain approved manual edits.
  validateTargets(source.units, units, "manual");
  // Don't save an outdated draft if the case changed while the model ran.
  if ((await getTranslationSource(slug)).sourceHash !== source.sourceHash) throw new TranslationConflict("O original mudou durante a tradução. Gere novamente.");
  const record: TranslationRecord = {
    ...(previous ?? { schemaVersion: 1, slug, revision: "" }),
    draft: { sourceHash: source.sourceHash, model: TRANSLATION_MODEL, generatedAt: new Date().toISOString(), units },
  };
  return saveTranslation(record, previous?.revision ?? null);
}
/** A draft of the current original from the author's own texts (no model involved). */
function manualDraft(source: TranslationSource, previous: TranslationRecord | null, targets: Array<{ key: string; target: string }>, mode: "manual" | "partial" = "manual") {
  const units = validateTargets(source.units, targets, mode);
  return { sourceHash: source.sourceHash, model: previous?.draft?.model ?? "manual", generatedAt: previous?.draft?.generatedAt ?? new Date().toISOString(), units };
}
export async function editTranslation(slug: string, revision: string, targets: Array<{ key: string; target: string }>) {
  const source = await getTranslationSource(slug);
  const previous = await readTranslation(slug);
  if ((previous?.revision ?? "") !== revision) throw new TranslationConflict("A tradução mudou em outra aba. Recarregue a página.");
  // Manual edits translate the current original, even when the last draft was of an older one. The
  // draft may be half done; only publishing asks for every text.
  return saveTranslation({ ...(previous ?? { schemaVersion: 1, slug, revision: "" }), draft: manualDraft(source, previous, targets, "partial") }, previous?.revision ?? null);
}
export async function publishTranslation(slug: string, revision: string, targets?: Array<{ key: string; target: string }>) {
  const source = await getTranslationSource(slug);
  const previous = await readTranslation(slug);
  if ((previous?.revision ?? "") !== revision) throw new TranslationConflict("A tradução mudou em outra aba. Recarregue a página.");
  const draft = targets ? manualDraft(source, previous, targets) : previous?.draft;
  if (!draft) throw new TranslationConflict("Não há rascunho para publicar.");
  applySnapshot(source, draft);
  return saveTranslation({ ...(previous ?? { schemaVersion: 1, slug, revision: "" }), draft, published: structuredClone(draft) }, previous?.revision ?? null);
}

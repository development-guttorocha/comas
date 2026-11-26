import { readFile } from "node:fs/promises";
import path from "node:path";
import { hashText, validateTargets, type TranslationSnapshot, type TranslationUnit } from "@/lib/translations/document";
import { TRANSLATION_MODEL, translateUnits } from "@/lib/translations/openai";
import { readTranslation, safeSlug, saveTranslation, TranslationConflict } from "@/lib/translations/store";
import { localizedHref } from "@/lib/navLocalePaths";
import { DEFAULT_CTA } from "./params";
import { parseReel, type ReelDoc } from "./types";

// The case video in English. Its texts go through the same translation as the case (Sol, with the
// same voice and glossary), but they keep a snapshot of their own in en.json (`reel`): editing the
// video never takes the English case page down, and the English video shows only while its
// snapshot matches the current reel exactly. Times, images and music stay the Portuguese ones.

/** Fields that hold words someone reads on screen; ids, images, times and names stay as they are. */
const TEXT_KEYS = new Set([
  "eyebrow", "lines", "heading", "title", "body", "caption", "label", "barsTitle", "source", "items",
  "note", "meta", "signature", "quote", "role", "value", "prefix", "suffix", "chapter",
]);
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function mapText(value: unknown, key: string, translate: (key: string, text: string) => string, enabled: boolean): unknown {
  if (typeof value === "string") return enabled ? translate(key, value) : value;
  if (Array.isArray(value)) return value.map((v, i) => mapText(v, `${key}.${i}`, translate, enabled));
  if (!isObject(value)) return value;
  // nested objects (nodes, cards, facts, before/after) choose their own text fields
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapText(v, `${key}.${k}`, translate, TEXT_KEYS.has(k))]));
}

function mapReel(doc: ReelDoc, translate: (key: string, text: string) => string): ReelDoc {
  const cta = doc.cta ?? DEFAULT_CTA;
  return {
    ...doc,
    title: doc.title ? translate("reel.title", doc.title) : doc.title,
    cta: { ...cta, label: translate("reel.cta", cta.label) },
    scenes: doc.scenes.map((scene) => mapText(scene, `reel.${scene.id}`, translate, false) as typeof scene),
  };
}

const translatable = (text: string) => !!text.trim() && !/^https?:\/\//i.test(text.trim());

export function reelUnits(doc: ReelDoc): TranslationUnit[] {
  const units: TranslationUnit[] = [];
  mapReel(doc, (key, source) => {
    if (translatable(source)) units.push({ key, source, target: "" });
    return source;
  });
  return units;
}
export const reelHash = (units: TranslationUnit[]) => hashText(JSON.stringify(units.map(({ key, source }) => [key, source])));

/** Numbers stay exactly as written in the translation; in English they read 5.2 and 1,200. */
const englishNumbers = (text: string) => text.replace(/(\d)([.,])(?=\d)/g, (_, d: string, sep: string) => `${d}${sep === "," ? "." : ","}`);

/** The reel in English, or null when its translation is missing or older than the reel. */
export function applyReelTranslation(doc: ReelDoc, snapshot: TranslationSnapshot | undefined): ReelDoc | null {
  const units = reelUnits(doc);
  if (!snapshot || snapshot.sourceHash !== reelHash(units)) return null;
  const byKey = new Map(snapshot.units.map((u) => [u.key, u]));
  let complete = true;
  const translated = mapReel(doc, (key, text) => {
    if (!translatable(text)) return text;
    const unit = byKey.get(key);
    if (!unit || unit.source !== text || !unit.target.trim()) {
      complete = false;
      return text;
    }
    return englishNumbers(unit.target);
  });
  if (!complete) return null;
  // The button goes to the English page of the same place; places with no English (services)
  // become the English contact page, so a reader of the English site never lands in Portuguese.
  const href = (doc.cta ?? DEFAULT_CTA).href;
  const english = /^\//.test(href) ? localizedHref(href, "en") : href;
  const cta = english.startsWith("/en") || !/^\//.test(english)
    ? { label: translated.cta!.label, href: english }
    : { label: "Let's talk", href: "/en/contato" };
  return { ...translated, cta, lang: "en" };
}

async function readReelFile(slug: string): Promise<ReelDoc | null> {
  try {
    return parseReel(JSON.parse(await readFile(path.join(process.cwd(), "content", "cases", safeSlug(slug), "reel.json"), "utf8")));
  } catch {
    return null;
  }
}

export type ReelTranslationState = "none" | "missing" | "stale" | "ready";
/** none: the case has no reel; missing: never translated; stale: the reel changed since. */
export async function reelTranslationState(slug: string): Promise<ReelTranslationState> {
  const doc = await readReelFile(slug);
  if (!doc) return "none";
  const snapshot = (await readTranslation(slug))?.reel;
  if (!snapshot) return "missing";
  return applyReelTranslation(doc, snapshot) ? "ready" : "stale";
}

const isServiceError = (error: unknown) => /OPENAI_API_KEY|cota|créditos|modelo configurado|HTTP \d+|incompleta/i.test((error as Error)?.message ?? "");

/** A batch that fails a check is retried text by text, reminding Sol that every number stays (0km keeps its 0). */
async function translateBatch(units: TranslationUnit[], context: string) {
  try {
    return await translateUnits(units, context, { wordNumbers: true });
  } catch (error) {
    if (isServiceError(error)) throw error;
  }
  const strict = `${context}\nEvery digit in the source must appear in the translation, unchanged.`;
  const out: TranslationUnit[] = [];
  for (const unit of units) {
    try {
      out.push(...(await translateUnits([unit], strict, { wordNumbers: true })));
    } catch (error) {
      if (isServiceError(error)) throw error;
      throw new Error(`O Sol não conseguiu traduzir “${unit.source.slice(0, 60)}” (${(error as Error).message.replace(/: [\w.-]+$/, "")}).`);
    }
  }
  return out;
}

/** Translates what changed in the reel (texts already in English are kept) and saves it in en.json. */
export async function translateReel(slug: string): Promise<{ translated: number; state: ReelTranslationState }> {
  const doc = await readReelFile(slug);
  if (!doc) return { translated: 0, state: "none" };
  const units = reelUnits(doc);
  const sourceHash = reelHash(units);
  const previous = await readTranslation(slug);
  if (previous?.reel?.sourceHash === sourceHash) return { translated: 0, state: "ready" };
  const reusable = new Map((previous?.reel?.units ?? []).map((u) => [u.key, u]));
  const changed = units.filter((u) => {
    const old = reusable.get(u.key);
    return !old?.target.trim() || old.source !== u.source;
  });
  const context = [
    "On-screen texts of a short motion video that tells a portfolio case study. Each text is a headline, label or caption shown for a few seconds: keep it as short as the source, never longer. *Stars* mark accent words; keep them around the matching English words. \\n is a line break; keep the same number of lines.",
    ...units.map((u) => u.source),
  ].join("\n");
  const fresh = changed.length ? await translateBatch(changed, context) : [];
  const byKey = new Map(fresh.map((u) => [u.key, u]));
  const result = units.map((u) => byKey.get(u.key) ?? reusable.get(u.key)!);
  validateTargets(units, result, "manual");
  // The reel may have been saved again while Sol worked: don't store English for an old version.
  const now = await readReelFile(slug);
  if (!now || reelHash(reelUnits(now)) !== sourceHash) throw new TranslationConflict("O vídeo mudou durante a tradução. Tente de novo.");
  const latest = await readTranslation(slug);
  await saveTranslation(
    { ...(latest ?? { schemaVersion: 1, slug, revision: "" }), reel: { sourceHash, model: TRANSLATION_MODEL, generatedAt: new Date().toISOString(), units: result } },
    latest?.revision ?? null,
  );
  return { translated: fresh.length, state: "ready" };
}

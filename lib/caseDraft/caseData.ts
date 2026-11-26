import type { Case, CaseStat } from "@/lib/cases";
import { enforceSourceValue, type DraftSource } from "./fidelity";

/**
 * The case data (the Dados tab, case.json) the AI fills next to the draft body: the texts of the
 * header, the Home card and the cover. Only empty fields are filled; images, colours, `draft`,
 * `featuredOnSite`, `order` and the editors' own choices stay with Gutto. Pure: the editor uses
 * `mergeCaseData` too.
 */
type TextKey = "title" | "productTag" | "role" | "year" | "summary" | "context" | "challenge" | "outcome" | "learning"
  | "homeTitle" | "homeLabel" | "homeSummary" | "homeNote" | "heroFullBleedEyebrow" | "heroFullBleedTagline" | "heroMegaWord";
export type DraftCaseData = Partial<Pick<Case, TextKey | "tags" | "homeStats">>;
export type DataKey = keyof DraftCaseData;

/** Every field the AI may fill, with its limit in characters and what it is for (for the prompt). */
export const DATA_FIELDS: { key: DataKey; max: number; hint: string }[] = [
  { key: "title", max: 60, hint: "título do case, uma afirmação curta" },
  { key: "productTag", max: 40, hint: "área, aparece acima do título (ex.: \"Liderança, Org Building & People\")" },
  { key: "role", max: 60, hint: "o papel do Gutto no projeto (ex.: \"Design Manager\"), só como a fonte diz" },
  { key: "year", max: 30, hint: "período (ex.: \"2020–2022\"), só se a fonte disser" },
  { key: "summary", max: 280, hint: "resumo do topo do case e das listas: 2 ou 3 frases em primeira pessoa, com o papel, a decisão e o resultado" },
  { key: "context", max: 600, hint: "o cenário antes de o Gutto chegar" },
  { key: "challenge", max: 600, hint: "o problema de negócio real" },
  { key: "outcome", max: 600, hint: "o resultado, com os números da fonte" },
  { key: "learning", max: 400, hint: "o aprendizado, uma frase de princípio tirada do próprio caso" },
  { key: "tags", max: 24, hint: "2 a 4 etiquetas curtas (ex.: \"Liderança\", \"B2B\")" },
  { key: "homeTitle", max: 60, hint: "título do card na Home; vazio usa o título do case, então só preencha se for diferente e melhor" },
  { key: "homeLabel", max: 24, hint: "rótulo acima dos números do card (\"Resultados\" ou \"Entrega\")" },
  { key: "homeSummary", max: 220, hint: "texto do card na Home: 1 ou 2 frases com o que mudou" },
  { key: "homeStats", max: 40, hint: "até 2 números do card: [{\"value\": até 18 caracteres, como na fonte, \"label\": o que mede, \"caption\"?: recorte}]; só números de resultado com fonte" },
  { key: "homeNote", max: 160, hint: "linha pequena abaixo dos números: a fonte ou o recorte" },
  { key: "heroFullBleedEyebrow", max: 40, hint: "rótulo sobre o título na capa em tela cheia" },
  { key: "heroFullBleedTagline", max: 280, hint: "linha abaixo do título na capa em tela cheia" },
  { key: "heroMegaWord", max: 12, hint: "palavra gigante da capa editorial: o nome da empresa, curto, em maiúsculas" },
];
const FIELD = new Map(DATA_FIELDS.map(f => [f.key, f]));

const isEmpty = (value: unknown) => value === undefined || value === null || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && !value.length);

/** The fields of this case Gutto has not filled: the only ones the AI may write. */
export const emptyDataKeys = (c: Partial<Case>): DataKey[] => DATA_FIELDS.map(f => f.key).filter(key => isEmpty(c[key]));

/** Text within `max`, cut at the end of a sentence when it can, otherwise on a whole word. */
function fit(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim().replace(/[ \t]+/g, " ");
  if (!t) return undefined;
  if ([...t].length <= max) return t;
  const head = t.slice(0, max + 1);
  const sentence = head.match(/^[\s\S]*[.!?…](?=\s|$)/)?.[0];
  if (sentence && sentence.length > max * 0.5) return sentence.trim();
  const at = head.lastIndexOf(" ");
  return (at > max * 0.5 ? head.slice(0, at) : t.slice(0, max)).replace(/[\s,;:–-]+$/, "");
}

/**
 * The model's answer read against the fields: only the keys asked, in their type and limit, and only
 * what the source backs (a number not in the source cuts its sentence, a stat with one goes).
 */
export function readCaseData(raw: unknown, keys: DataKey[], source: DraftSource, say: (reason: string) => void): DraftCaseData {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const field = FIELD.get(key)!;
    let value: unknown;
    if (key === "tags") {
      value = Array.isArray(obj.tags) ? [...new Set(obj.tags.map(t => fit(t, field.max)).filter((t): t is string => !!t))].slice(0, 4) : undefined;
    } else if (key === "homeStats") {
      value = Array.isArray(obj.homeStats) ? obj.homeStats.flatMap((s): CaseStat[] => {
        if (!s || typeof s !== "object") return [];
        const r = s as Record<string, unknown>;
        const v = fit(r.value, 18), label = fit(r.label, field.max), caption = fit(r.caption, field.max);
        return v && label && /\d/.test(v) ? [{ value: v, label, ...(caption ? { caption } : {}) }] : [];
      }).slice(0, 2) : undefined;
    } else {
      value = fit(obj[key], field.max);
      if (key === "heroMegaWord" && typeof value === "string") value = /\s/.test(value) ? undefined : value.toUpperCase();
    }
    if (isEmpty(value)) continue;
    const checked = enforceSourceValue(value, key, source, reason => say(`${key}: ${reason}`));
    if (!isEmpty(checked)) out[key] = checked;
  }
  return out as DraftCaseData;
}

/** The draft's data over the case, field by field, only where the case is still empty. */
export function mergeCaseData<T extends Partial<Case>>(current: T, data: DraftCaseData | undefined): T {
  if (!data) return current;
  const next: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(data)) if (FIELD.has(key as DataKey) && isEmpty(next[key]) && !isEmpty(value)) next[key] = value;
  return next as T;
}

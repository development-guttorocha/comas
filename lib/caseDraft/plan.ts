import { COMPONENT_BY_NAME } from "@/lib/admin/componentSchemas";

/**
 * O plano de um rascunho de case: a sequência de seções, o componente de cada bloco, as imagens que
 * ele usa e o porquê. A IA propõe, o Gutto corrige (reordena, troca componente, tira seção) e só então
 * o texto é escrito. Este módulo não toca no disco: serve ao navegador, à rota e aos testes.
 */

/** The two reference cases of content/case-components.md: PicPay (história) and Plenno (produto). */
export type DraftKind = "historia" | "produto";
export const DRAFT_KINDS: { value: DraftKind; label: string }[] = [
  { value: "historia", label: "Liderança, estratégia e negócio (modelo PicPay)" },
  { value: "produto", label: "Produto e design (modelo Plenno)" },
];

/**
 * What the generator may place, in the guide's order. The components marked "evitar" stay out until
 * they have published use; dividers and section markers are placed by the code; video and embeds need
 * an address the material does not give. A test keeps this list in step with RULES.
 */
export const DRAFT_VOCABULARY = [
  "CaseTitleBox", "CaseSectionSplit", "CaseStatement", "CaseChapter", "CaseLightPanel", "text",
  "CaseBigNumber", "CaseStatBand", "CaseIconStats", "CaseIconRatio", "CaseChart", "CasePanel",
  "CaseFlowDiagram", "CaseFlow", "CaseTimeline", "CaseResultsJourney", "CaseApproachCards", "CaseComparison", "CaseBeforeAfter",
  "image", "images", "CaseBento", "CaseScreens", "CaseImageStack", "CaseImageCompare",
  "CasePullQuote", "CaseResultsQuote", "CaseThanksCards",
] as const;
export type DraftType = (typeof DRAFT_VOCABULARY)[number];

const NATIVE_LABELS: Record<string, string> = { text: "Texto (parágrafo ou título)", image: "Imagem", images: "Imagens lado a lado" };
export const draftTypeLabel = (type: string) => NATIVE_LABELS[type] ?? COMPONENT_BY_NAME.get(type)?.label ?? type;
export const isDraftType = (value: unknown): value is DraftType => typeof value === "string" && (DRAFT_VOCABULARY as readonly string[]).includes(value);

/** One block of the plan: what it says (`idea`), with which images, and why this component. */
export type PlanBlock = { component: DraftType; idea: string; images: string[]; why?: string };
export type PlanSection = { label: string; blocks: PlanBlock[] };
export type CasePlan = { kind: DraftKind; sections: PlanSection[] };

const LIMITS = { sections: 8, blocks: 10, images: 8, label: 24, idea: 400, why: 200 };

const text = (value: unknown, max: number) => {
  if (typeof value !== "string") return "";
  const t = value.trim().replace(/\s+/g, " ");
  return t.length <= max ? t : t.slice(0, max).replace(/\s+\S*$/, "");
};
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
/** An image as the model may write it: absolute URL or path; only the case's own files are kept. */
export const imagePath = (value: unknown) => (typeof value === "string" ? value.trim().replace(/^https?:\/\/[^/]+/, "") : "");

/**
 * The plan in its known shape, from the model's answer or from the editor: unknown components,
 * images that are not the case's and empty sections are dropped. Never throws.
 */
export function parsePlan(value: unknown, images: ReadonlySet<string>): CasePlan {
  const raw = record(value) ? value : {};
  const kind: DraftKind = raw.kind === "produto" ? "produto" : "historia";
  const sections = (Array.isArray(raw.sections) ? raw.sections : []).filter(record).slice(0, LIMITS.sections).flatMap((s): PlanSection[] => {
    const blocks = (Array.isArray(s.blocks) ? s.blocks : []).filter(record).slice(0, LIMITS.blocks).flatMap((b): PlanBlock[] => {
      const component = isDraftType(b.component) ? b.component : null;
      if (!component) return [];
      const list = Array.isArray(b.images) ? b.images : typeof b.images === "string" ? [b.images] : [];
      const own = [...new Set(list.map(imagePath).filter(src => images.has(src)))].slice(0, LIMITS.images);
      const why = text(b.why, LIMITS.why);
      return [{ component, idea: text(b.idea, LIMITS.idea), images: own, ...(why ? { why } : {}) }];
    });
    const label = text(s.label, LIMITS.label);
    return blocks.length ? [{ label: label || "Seção", blocks }] : [];
  });
  return { kind, sections };
}

/** A plan line for prompts: "1. O começo — CaseTitleBox: ideia [imagens]". */
export function planToText(plan: CasePlan): string {
  return plan.sections.map((s, i) => [
    `${i + 1}. ${s.label}`,
    ...s.blocks.map((b, j) => `   ${i + 1}.${j + 1} ${b.component} — ${b.idea || "(sem ideia escrita)"}${b.images.length ? ` [imagens: ${b.images.join(", ")}]` : ""}`),
  ].join("\n")).join("\n");
}

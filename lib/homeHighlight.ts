import type { Case, CaseStat } from "@/lib/cases";
import type { SiteLocale } from "@/lib/siteLocale";
import { getRichTextArray, richTextPlain, type NotionBlockNode } from "@/lib/notionBlockTree";
import { parseCaseEmbedJson, tryParseCaseEmbedParagraph } from "@/lib/notionCaseEmbedFromNotion";

/** The highlight of a case card: a label, a line of text, up to two numbers and a note. */
export type CaseHighlight = { label: string; text: string; stats: CaseStat[]; note?: string };

/** Reads the same metric component used by the case, preserving its context and emphasis. */
export function extractHomeHighlight(blocks: NotionBlockNode[], locale: SiteLocale): CaseHighlight | undefined {
  let sectionLabel = "";
  for (const block of blocks) {
    const plain = richTextPlain(getRichTextArray(block));
    const nav = plain.match(/^\s*\[-nav\s*\d+\]\s*(.*?)\s*(?:\[\/\-nav[^\]]*\])?\s*$/i);
    if (nav) sectionLabel = nav[1];
    if (block.type.startsWith("heading")) sectionLabel = plain;
    const embed = tryParseCaseEmbedParagraph(plain) ?? (block.type === "code" ? parseCaseEmbedJson(plain) : null);
    if (embed?.kind === "CaseStatBand" && embed.stats.length) {
      const preferred = [...(embed.emphasizeIndices ?? []), ...embed.stats.map((_, i) => i)];
      const stats = [...new Set(preferred)].map(i => embed.stats[i]).filter(Boolean).slice(0, 2);
      const label = (embed.sectionLabel || (/entrega|delivery/i.test(sectionLabel) ? sectionLabel : ""))
        .replace(/^\/\/\s*/, "").trim() || (locale === "en" ? "Results" : "Resultados");
      return { label, text: embed.intro ?? "", stats, note: embed.attributionNote || embed.editorialSourceNote };
    }
    if (block.children) {
      const nested = extractHomeHighlight(block.children, locale);
      if (nested) return nested;
    }
  }
  return undefined;
}

/**
 * The case's own highlight: the first metric block of the body (root level), else the case's
 * data. `blocks` is null when the body could not be read (or has no reviewed translation).
 */
export function caseHighlight(c: Case, blocks: NotionBlockNode[] | null, locale: SiteLocale): CaseHighlight {
  const kind = c.homeHighlightKind ?? (c.stats.length || c.outcome ? "results" : undefined);
  const kindLabel = kind === "delivery" ? (locale === "en" ? "Delivery" : "Entrega") : kind === "results" ? (locale === "en" ? "Results" : "Resultados") : undefined;
  const found = blocks ? extractHomeHighlight(blocks.map(({ children, ...block }) => { void children; return block; }), locale) : undefined;
  if (found) return { ...found, label: kindLabel ?? found.label };
  return { label: kindLabel ?? (locale === "en" ? "Overview" : "Visão geral"), text: c.outcome || c.summary, stats: c.stats.slice(0, 2), note: c.attributionNote };
}

/** The Home card's own texts and numbers, each one replacing only its part of the highlight. */
export function homeCardHighlight(c: Case, base: CaseHighlight): CaseHighlight {
  const stats = (c.homeStats ?? []).filter(stat => stat.value?.trim() || stat.label?.trim());
  return {
    label: c.homeLabel?.trim() || base.label,
    text: c.homeSummary?.trim() || base.text,
    stats: stats.length ? stats.slice(0, 2) : base.stats,
    note: c.homeNote?.trim() || base.note,
  };
}

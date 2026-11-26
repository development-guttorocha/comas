/**
 * Tipografia de cases — **tokens em camadas** (portfolio, fácil de manter).
 *
 * 1. **Primitivos** (`CASE__*`): escalas base. Alterar aqui propaga para as famílias.
 * 2. **Famílias**: corpo, título, rótulo mono, documento, hero, chrome (UI).
 * 3. **Exports `CASE_*`**: API estável para componentes (nomes históricos).
 *
 * Hierarquia Notion: `heading_1` → `<h2>`, etc.
 */
import { cn } from "@/lib/cn";

// ═══════════════════════════════════════════════════════════════════════════
// PRIMITIVOS (fonte única de verdade para tamanhos/pesos de família)
// ═══════════════════════════════════════════════════════════════════════════

/** Corpo de leitura: `<p>`, listas, antes/depois “surface”. Mesma escala do Sobre. */
const CASE__BODY_CORE = "text-[length:var(--type-body)] font-normal leading-[var(--leading-body)]";

/** Texto secundário (notas, legendas longas, apoio). */
const CASE__SUPPORT_CORE = "text-[14px] leading-[1.75] text-muted md:text-[15px]";

/** Apoio um passo abaixo (footnotes, disclaimers). */
const CASE__FINE = "text-[14px] leading-[1.75] text-muted";

/** Pré-código / tabela corrida (entre corpo e support). */
const CASE__DOC_UI = "text-[14px] leading-relaxed text-ink";

/** Títulos: traço comum. */
const CASE__H_TRACK = "tracking-[-0.04em] text-ink";

/** Rótulo do Sobre (`Kicker` em `components/guide`): pequeno, cinza, sem caixa alta. */
const CASE__KICKER = "text-[length:var(--type-label)] font-semibold leading-[1.5] tracking-[var(--tracking-label)] text-muted";

/** Mono: caixa de ferramentas (tamanho + hábito uppercase). */
const CASE__MONO_9_U = "font-mono text-[14px] uppercase tracking-[0.2em]";
const CASE__MONO_10_U = "font-mono text-[14px] uppercase tracking-[0.2em]";
const CASE__MONO_10_UB = "font-mono text-[14px] font-bold uppercase tracking-[0.2em]";
const CASE__MONO_11_U = "font-mono text-[14px] uppercase tracking-[0.12em]";
const CASE__MONO_12 = "font-mono text-[14px]";
const CASE__MONO_12_RELAX = `${CASE__MONO_12} leading-relaxed`;
const CASE__MONO_14 = "font-mono text-[14px]";

/**
 * Primitivos expostos — raros `cn(...)` / documentação. O fluxo normal é usar `CASE_*` exportados.
 */
export const CASE_PRIMITIVES = {
  bodyCore: CASE__BODY_CORE,
  support: CASE__SUPPORT_CORE,
  fine: CASE__FINE,
  docUi: CASE__DOC_UI,
  headingTrack: CASE__H_TRACK,
  mono9u: CASE__MONO_9_U,
  mono10u: CASE__MONO_10_U,
  mono10ub: CASE__MONO_10_UB,
  mono11u: CASE__MONO_11_U,
  mono12: CASE__MONO_12,
  mono12Relaxed: CASE__MONO_12_RELAX,
  mono14: CASE__MONO_14,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// FAMÍLIA: corpo
// ═══════════════════════════════════════════════════════════════════════════

/** Cinza como no Sobre; só o negrito acende em branco. */
export const CASE_TEXT_BODY = `${CASE__BODY_CORE} text-muted [&_strong]:font-semibold [&_strong]:text-ink`;

/** Coluna “depois” / mesmo corpo sobre surface (hoje idêntico a `CASE_TEXT_BODY`). */
export const CASE_TEXT_BODY_INK = `${CASE__BODY_CORE} text-ink`;

export const CASE_TEXT_BODY_SPACED = `mb-5 ${CASE_TEXT_BODY}`;

export const CASE_TEXT_BODY_PANEL =
  "text-[18px] font-light leading-[1.85] text-[#e8e8e8] md:text-[20px]";

export const CASE_TEXT_SUPPORT = CASE__SUPPORT_CORE;

export const CASE_TEXT_INSET =
  "text-[14px] text-muted max-w-xl leading-relaxed mb-10";

export const CASE_TEXT_LIST_EMPHASIS =
  "text-[16px] font-medium leading-[1.65] text-ink";

export const CASE_TEXT_PREWRAP = `${CASE_TEXT_BODY} whitespace-pre-wrap`;

// ═══════════════════════════════════════════════════════════════════════════
// Antes / Depois — quebra de ritmo: sans grande, sem mono no título da coluna
// ═══════════════════════════════════════════════════════════════════════════

/** Rótulo da coluna (“Antes” / “Depois”). */
export const CASE_TEXT_BEFORE_AFTER_COLUMN_LABEL =
  "font-sans text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.035em] text-ink";

/** Coluna “Depois” — mesmo tamanho, cor de acento. */
export const CASE_TEXT_BEFORE_AFTER_COLUMN_LABEL_EMPHASIS =
  "font-sans text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.035em] text-accent";

/** Kicker opcional (ex. // Comparativo) — sans, não mono. */
export const CASE_TEXT_BEFORE_AFTER_KICKER =
  "text-[clamp(14px,1.15vw,0.9375rem)] font-semibold uppercase tracking-[0.14em] text-ink/45";

/** Título opcional da secção — maior que o H2 editorial padrão. */
export const CASE_TEXT_BEFORE_AFTER_SECTION_HEADING =
  "text-[clamp(2rem,3.5vw,3.5rem)] font-bold leading-[1.12] tracking-[-0.03em] text-ink";

/** Corpo / lead / conteúdo — ampliado face a `CASE_TEXT_BODY`. */
export const CASE_TEXT_BEFORE_AFTER_BODY =
  "text-[clamp(1.1875rem,2.2vw,1.5rem)] font-normal leading-[1.58] text-ink";

export const CASE_TEXT_BEFORE_AFTER_PREWRAP =
  `${CASE_TEXT_BEFORE_AFTER_BODY} whitespace-pre-wrap`;

// ═══════════════════════════════════════════════════════════════════════════
// FAMÍLIA: títulos (escala única; margens só em `CASE_DOC_*`)
// ═══════════════════════════════════════════════════════════════════════════

export const CASE_TEXT_H2 =
  `text-[clamp(32px,4.2vw,64px)] font-bold leading-[1.08] ${CASE__H_TRACK}`;

export const CASE_TEXT_H3 =
  `text-[clamp(24px,2.6vw,36px)] font-bold leading-[1.15] ${CASE__H_TRACK}`;

export const CASE_TEXT_H4 = `text-[17px] font-semibold ${CASE__H_TRACK}`;

export const CASE_TEXT_LEAD =
  "text-[clamp(17px,1.95vw,21px)] font-semibold leading-snug text-ink";

export const CASE_TEXT_H3_COMPACT =
  "text-[16px] font-extrabold tracking-[-0.02em] text-ink md:text-[17px]";

export const CASE_TEXT_CARD_TITLE =
  "text-[clamp(16px,1.5vw,20px)] font-bold leading-snug tracking-[-.02em]";

export const CASE_TEXT_CARD_TITLE_ON_PANEL = "text-on-panel";

export const CASE_TEXT_CARD_BODY_PANEL =
  "text-[15px] font-light leading-[1.75] text-white/85 [&_strong]:font-semibold [&_strong]:text-on-panel";

export const CASE_TEXT_CARD_EYEBROW =
  `mb-3 block ${CASE__MONO_9_U} tracking-[0.25em]`;

export const CASE_TEXT_APPROACH_CARD_TITLE =
  "mb-6 text-[clamp(25px,3vw,48px)] font-extrabold leading-tight tracking-[-0.025em] text-ink uppercase";

export const CASE_DOC_H2 = `mb-6 mt-14 first:mt-0 ${CASE_TEXT_H2}`;

export const CASE_DOC_H3 = `mb-4 mt-10 first:mt-0 ${CASE_TEXT_H3}`;

export const CASE_DOC_H4 = `mb-3 mt-8 first:mt-0 ${CASE_TEXT_H4}`;

// ═══════════════════════════════════════════════════════════════════════════
// Blocos Notion (citação, callout, tarefa)
// ═══════════════════════════════════════════════════════════════════════════

export const CASE_TEXT_BLOCKQUOTE =
  "my-12 text-[clamp(24px,3vw,40px)] font-semibold leading-[1.3] tracking-[-0.03em] text-ink";

export const CASE_TEXT_CALLOUT =
  "my-8 flex gap-4 rounded-[24px] bg-card p-6 text-[18px] leading-[1.7] text-muted md:p-8";

export const CASE_TEXT_TODO_ROW =
  "mb-2 flex items-start gap-3 text-[15px] leading-[1.75] text-muted md:text-[16px]";

export const CASE_TEXT_LINK_ACCENT =
  "text-ink font-bold no-underline";

export const CASE_TEXT_CODE_INLINE =
  "rounded bg-muted/50 px-1 font-mono text-[max(14px,0.9em)] text-ink";

// ═══════════════════════════════════════════════════════════════════════════
// Rótulos `Eyebrow` (variantes = mono + cor/tom; sem duplicar o stack font-mono)
// ═══════════════════════════════════════════════════════════════════════════

export const CASE_EYEBROW_VARIANT_CLASS = {
  strip: `${CASE__MONO_10_UB} text-dim`,
  stripInk: `${CASE__MONO_10_UB} text-ink-muted`,
  meta: `${CASE__MONO_12} uppercase tracking-[0.14em]`,
  metaYear: `${CASE__MONO_12} tracking-[0.08em]`,
  section:
    "font-mono text-[14px] font-medium uppercase tracking-[0.22em] text-dim",
  heroFullBleed: `${CASE__MONO_12} uppercase tracking-[.2em] text-white/75`,
  blockSection40: CASE__KICKER,
  chartTickNumeric:
    "font-mono text-[14px] tabular-nums leading-none text-ink/40",
  chartAxisCategory: `${CASE__MONO_9_U} text-ink/40`,
  blockStatLabel: `${CASE__MONO_9_U} text-ink/45`,
  blockStatCaption: `${CASE__MONO_9_U} leading-[1.5] text-muted`,
  blockColumnMuted: `${CASE__MONO_9_U} text-muted`,
  blockColumnAccent: `${CASE__MONO_9_U} text-accent`,
  blockFigureCaption: `${CASE__MONO_9_U} text-ink/40 md:text-center`,
  blockQuoteLabel: CASE__KICKER,
  navPanelHint: `${CASE__MONO_10_U} text-dim`,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Páginas de case (anotações)
// ═══════════════════════════════════════════════════════════════════════════

export const casePageLeadParagraphClass =
  `mt-4 ${CASE__MONO_12} font-medium uppercase leading-[1.65] tracking-[.18em] text-muted`;

export type CasePageAnnotationTone = "subtle" | "dim";

export function casePageAnnotationClass(
  tone: CasePageAnnotationTone,
  marginBottom: 4 | 8 | 10 = 8,
): string {
  return cn(
    `${CASE__MONO_12} font-medium uppercase tracking-[.18em] block`,
    tone === "subtle" ? "text-subtle" : "text-dim",
    marginBottom === 10 ? "mb-10" : marginBottom === 4 ? "mb-4" : "mb-8",
  );
}

export const casePageHeroCardLabelClass =
  `${CASE__MONO_12} uppercase tracking-[.18em] text-dim block mb-4`;

// ═══════════════════════════════════════════════════════════════════════════
// Documento Notion (blocos) — legendas e UI partilham `CASE__MONO_12` + cor
// ═══════════════════════════════════════════════════════════════════════════

const CASE__NOTION_CAPTION_12 = `${CASE__MONO_12_RELAX} text-subtle`;

export const CASE_NOTION_FIGCAPTION = `mt-3 ${CASE__NOTION_CAPTION_12}`;

export const CASE_NOTION_EMBED_CAPTION = `-mt-4 mb-8 ${CASE__NOTION_CAPTION_12}`;

export const CASE_NOTION_CODE_PRE =
  `my-6 overflow-x-auto rounded-[24px] border border-line bg-card p-4 ${CASE__DOC_UI}`;

export const CASE_NOTION_CODE_LANG_LABEL =
  `mb-2 block font-mono text-[14px] uppercase tracking-wider text-subtle`;

export const CASE_NOTION_EQUATION_PRE =
  `my-6 overflow-x-auto rounded-[24px] border border-line bg-card p-4 ${CASE__MONO_14} leading-relaxed text-ink`;

export const CASE_NOTION_TABLE =
  "min-w-full border-collapse text-left text-[14px] md:text-[15px]";

export const CASE_NOTION_TABLE_CELL_TH =
  "max-w-[min(24rem,40vw)] border-r border-line px-3 py-2 align-top last:border-r-0 bg-card font-semibold text-ink";

export const CASE_NOTION_TABLE_CELL_TD =
  "max-w-[min(24rem,40vw)] border-r border-line px-3 py-2 align-top last:border-r-0 font-light text-muted";

export const CASE_NOTION_TOGGLE_SUMMARY =
  "cursor-pointer text-[16px] font-medium text-ink";

export const CASE_NOTION_BOOKMARK_HOST = `${CASE__MONO_11_U} text-subtle`;

export const CASE_NOTION_BOOKMARK_URL =
  "break-all text-[15px] font-medium leading-snug text-ink";

export const CASE_NOTION_BOOKMARK_CAPTION = `mt-1 ${CASE__SUPPORT_CORE}`;

export const CASE_NOTION_CHILD_PAGE = "my-4 text-[14px] text-subtle";

export const CASE_NOTION_EMPTY_STATE = "content-wrap py-20 text-muted";

export const CASE_NOTION_CALLOUT_ICON = "text-lg leading-none";

// ═══════════════════════════════════════════════════════════════════════════
// Hero editorial
// ═══════════════════════════════════════════════════════════════════════════

export const CASE_HERO_MEGA_FONT_SIZE_DISPLAY = "clamp(120px, 18vw, 280px)";

export const CASE_HERO_MEGA_FONT_SIZE_DEFAULT = "clamp(56px, 11vw, 200px)";

const CASE__HERO_EYEBROW = `${CASE__MONO_12} uppercase tracking-[.2em]`;

export function caseHeroEditorialEyebrowClass(isInk: boolean): string {
  return isInk
    ? `${CASE__HERO_EYEBROW} text-ink-muted mb-6 max-w-3xl md:mb-8`
    : `${CASE__HERO_EYEBROW} text-muted mb-5 md:mb-6`;
}

export function caseHeroEditorialTitleClass(
  isInk: boolean,
  titleScale: "display" | "headline",
): string {
  const clamp =
    titleScale === "headline"
      ? "text-[clamp(2.5rem,6vw,4.5rem)]"
      : "text-[clamp(2.5rem,8vw,7rem)]";
  const color = isInk
    ? "font-bold leading-[1.04] tracking-[-0.045em] text-white"
    : "font-bold leading-[1.04] tracking-[-0.045em] text-ink";
  return `${color} ${clamp} mb-4 md:mb-6`;
}

export function caseHeroEditorialTaglineClass(isInk: boolean): string {
  return isInk
    ? "text-[15px] md:text-[16px] font-medium text-white/90 tracking-[-.01em] leading-snug"
    : "text-[15px] md:text-[16px] font-medium text-ink/90 tracking-[-.01em] leading-snug";
}

export function caseHeroEditorialLeadClass(isInk: boolean): string {
  return isInk
    ? "text-[clamp(17px,2vw,20px)] font-light text-ink-muted leading-[1.6] mb-6 md:mb-8"
    : "text-[clamp(17px,2vw,20px)] font-light text-muted leading-[1.6] mb-6 md:mb-8";
}

export function caseHeroEditorialSummaryClass(isInk: boolean): string {
  return isInk
    ? "text-[clamp(18px,1.6vw,22px)] font-normal text-ink-muted leading-[1.6]"
    : "text-[clamp(18px,1.6vw,22px)] font-normal text-muted leading-[1.6]";
}

export function caseHeroEditorialSectionShellClass(isInk: boolean): string {
  return isInk
    ? "relative w-full overflow-hidden text-on-panel"
    : "relative w-full overflow-hidden";
}

export const CASE_HERO_MEGA_WATERMARK =
  "font-extrabold tracking-[-.06em] leading-none pointer-events-none select-none whitespace-nowrap";

// ═══════════════════════════════════════════════════════════════════════════
// Faixa de meta (hero strip)
// ═══════════════════════════════════════════════════════════════════════════

export const CASE_HERO_META_STRIP_VALUE_INK =
  `${CASE__MONO_14} md:text-[16px] text-on-panel leading-snug`;

export const CASE_HERO_META_STRIP_VALUE_SURFACE =
  `${CASE__MONO_14} md:text-[16px] text-ink leading-snug`;

export const CASE_HERO_META_COMPANY_PRIMARY =
  "normal-case tracking-normal font-medium";

export const CASE_HERO_META_PRODUCT_SUBLINE_INK =
  "mt-1.5 block text-[14px] font-normal text-ink-muted normal-case tracking-normal";

export const CASE_HERO_META_PRODUCT_SUBLINE_SURFACE =
  "mt-1.5 block text-[14px] font-normal text-muted normal-case tracking-normal";

// ═══════════════════════════════════════════════════════════════════════════
// Hero full-bleed / hero escuro
// ═══════════════════════════════════════════════════════════════════════════

export const CASE_HERO_FULL_BLEED_TITLE =
  "mt-3 font-extrabold leading-[1.05] tracking-[-.04em] text-white";

export const CASE_STYLE_FONT_SIZE_HERO_FULL_BLEED_TITLE =
  "clamp(28px, 4.5vw, 56px)";

export const CASE_HERO_FULL_BLEED_TAGLINE =
  "mt-4 max-w-4xl text-[15px] font-medium leading-snug tracking-[-.01em] text-white/90 md:text-[16px]";

export const CASE_HERO_DARK_MEGA =
  "font-extrabold tracking-[-.06em] leading-none pointer-events-none select-none whitespace-nowrap text-white";

export const CASE_STYLE_FONT_SIZE_HERO_DARK_MEGA = "clamp(72px, 14vw, 200px)";

export const CASE_HERO_DARK_EYEBROW =
  `${CASE__HERO_EYEBROW} text-ink-muted mb-8 max-w-3xl`;

export const CASE_HERO_DARK_TITLE =
  "font-extrabold leading-[1.05] tracking-[-.04em] text-white max-w-[980px] mb-12";

export const CASE_STYLE_FONT_SIZE_HERO_DARK_TITLE = "clamp(28px, 4.2vw, 52px)";

export const CASE_HERO_DARK_LEAD =
  "text-[17px] font-light leading-[1.85] text-ink-muted max-w-[640px]";

// ═══════════════════════════════════════════════════════════════════════════
// Citações / resultados
// ═══════════════════════════════════════════════════════════════════════════

export const CASE_TEXT_DISPLAY_QUOTE =
  "font-semibold leading-[1.25] tracking-[-0.035em] text-ink";

export const CASE_STYLE_FONT_SIZE_DISPLAY_QUOTE = "clamp(26px, 3.4vw, 48px)";

export const CASE_PULL_QUOTE_BLOCK =
  "m-0 p-0";

export const CASE_RESULTS_QUOTE_SECTION_LABEL =
  `block ${CASE__KICKER}`;

// ═══════════════════════════════════════════════════════════════════════════
// Métricas / gráficos / jornada (apoio = `CASE__FINE` + layout no export)
// ═══════════════════════════════════════════════════════════════════════════

export const CASE_STAT_VALUE =
  "max-w-full hyphens-auto break-words font-extrabold leading-none tracking-[-0.04em] text-ink";

export const CASE_STYLE_FONT_SIZE_STAT_VALUE = "clamp(2rem, 5vw, 3.5rem)";

export const CASE_STAT_FOOTNOTE = CASE__FINE;

export const CASE_RESULTS_CHARTS_INTRO =
  "text-[14px] max-w-xl leading-[1.7] text-muted";

export const CASE_RESULTS_CHARTS_FOOTER =
  `mt-6 max-w-2xl ${CASE__FINE} leading-relaxed`;

export const CASE_RESULTS_JOURNEY_STEP_INDEX =
  `mb-1 block ${CASE__MONO_9_U} text-ink/30`;

export const CASE_RESULTS_HERO_SECTION_LABEL =
  `mb-8 block ${CASE__MONO_12} font-medium uppercase tracking-[.18em] text-dim md:mb-10`;

export const CASE_RESULTS_HERO_INTRO =
  "mx-auto mb-10 max-w-xl text-[14px] leading-[1.75] text-muted md:mb-12";

export const CASE_RESULTS_HERO_VALUE =
  "block text-[clamp(4rem,12vw,9rem)]";

export const CASE_RESULTS_HERO_VALUE_WRAP =
  "mb-4 font-extrabold leading-none tracking-[-0.05em]";

export const CASE_RESULTS_HERO_DESCRIPTION =
  `mx-auto max-w-[560px] font-mono text-[14px] uppercase tracking-[0.25em] text-ink/50`;

// ═══════════════════════════════════════════════════════════════════════════
// Secções / navegação / rodapé
// ═══════════════════════════════════════════════════════════════════════════

export const CASE_SECTION_LABEL_INSET =
  `${CASE__MONO_12} font-medium uppercase tracking-[.18em] text-dim mb-10 block`;

export const CASE_SECTION_LABEL_MEDIA =
  `w-full text-center ${CASE__MONO_12} font-medium uppercase tracking-[.18em] text-dim`;

export const CASE_MEDIA_FIGURE_CAPTION_WRAP = "mt-2 w-full px-0 text-left";

export const CASE_SECTION_NAV_COMPANY =
  "min-w-0 max-w-[min(50%,14rem)] shrink-0 truncate text-[14px] font-semibold leading-tight tracking-[-0.02em] text-ink md:max-w-[min(45%,20rem)] md:text-[14px]";

/** Mesmo gancho visual que a nav global (`.punk-link` em `globals.css`). */
export const CASE_SECTION_NAV_LINK =
  `punk-link shrink-0 px-1 py-2.5 text-right font-mono text-[14px] font-medium uppercase leading-tight tracking-[0.1em] text-muted no-underline transition-colors hover:text-ink md:px-3 md:py-4 md:text-[14px] md:tracking-[0.16em]`;

export const CASE_NEXT_LINK_EYEBROW_EXTRA =
  "mb-10 block font-medium tracking-[.18em]";

export const CASE_NEXT_LINK_COMPANY =
  `${CASE__MONO_12} uppercase tracking-[.1em] text-dim`;

export const CASE_NEXT_LINK_ARROW =
  "text-[28px] text-ink transition-transform duration-[320ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none group-hover:translate-x-3 group-hover:-translate-y-1";

// ═══════════════════════════════════════════════════════════════════════════
// Rodapé case / mídia / playbook / índice (chrome — layout + mono 12)
// ═══════════════════════════════════════════════════════════════════════════

export const CASE_LANDING_FOOTER_BRAND =
  "text-[14px] font-bold uppercase tracking-[.1em] text-ink";

export const CASE_LANDING_FOOTER_LINK =
  "text-[14px] text-dim no-underline tracking-[.04em] hover:text-ink transition-colors duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]";

export const CASE_LANDING_FOOTER_COPYRIGHT = "text-[14px] text-muted";

export const CASE_MEDIA_CAPTION_BAR =
  `w-full border-t border-line px-4 py-3 text-center ${CASE__MONO_12} uppercase tracking-[.12em] text-dim`;

export const CASE_MEDIA_VIDEO_ERROR = `p-6 ${CASE__SUPPORT_CORE}`;

export const CASE_MEDIA_GALLERY_TILE_CAPTION =
  "line-clamp-2 text-[14px] font-medium leading-snug text-white/95 md:text-[14px]";

export const CASE_MEDIA_GALLERY_FIGCAPTION_MOBILE =
  `mt-2 w-full px-0 text-center ${CASE__MONO_9_U} text-ink/40 md:hidden`;

export const CASE_PLAYBOOK_NAME =
  `${CASE__MONO_12} font-medium uppercase tracking-[.14em] text-dim`;

export const CASE_PLAYBOOK_USAGE_PRE =
  `overflow-x-auto rounded-[24px] border border-line bg-card px-4 py-3 ${CASE__MONO_12} leading-relaxed text-ink/90 whitespace-pre-wrap`;

export const CASE_NOTION_LEGACY_CHALLENGE_LABEL =
  `mb-10 block ${CASE__MONO_12} font-medium uppercase tracking-[.18em] text-subtle`;

export const CASE_NOTION_LEGACY_MEDIA_CAPTION =
  `${CASE__MONO_12} leading-[1.65] text-muted`;

export const CASE_PLAYBOOK_DEMO_CHIP =
  `rounded-[24px] border border-dashed border-line bg-card-alt px-4 py-3 ${CASE__MONO_12} uppercase tracking-[.06em] text-dim`;

export const CASE_PLAYBOOK_DEMO_LEVEL_MUTED =
  `w-full max-w-[200px] rounded-[24px] border border-line bg-card-alt px-3 py-2 text-center ${CASE__MONO_12} uppercase tracking-[.08em] text-muted`;

export const CASE_PLAYBOOK_DEMO_LEVEL_EMPHASIS =
  `w-full max-w-[200px] rounded-[24px] border-2 border-ink bg-surface px-3 py-2 text-center ${CASE__MONO_12} uppercase tracking-[.08em] text-ink`;

export const CASE_WORKS_INDEX_EYEBROW_COUNTER_ON_IMAGE =
  "text-on-panel/90";

export const CASE_WORKS_INDEX_EYEBROW_FOOTER_ON_IMAGE =
  "text-on-panel/75";

export const CASE_WORKS_INDEX_EYEBROW_SEP = "mx-2 text-on-panel/40";

const CASE__INDEX_PROSE =
  "text-[15px] font-light leading-[1.85] text-muted md:text-[16px]";

export const CASE_WORKS_INDEX_SUMMARY = `mt-4 max-w-[42ch] ${CASE__INDEX_PROSE}`;

export const CASE_WORKS_INDEX_CTA =
  `mt-8 inline-flex items-center gap-2 font-mono text-[14px] font-medium uppercase tracking-[0.1em] text-dim transition-colors duration-300 group-hover:text-accent md:text-[14px]`;

export const CASE_WORKS_INDEX_LEAD = `mt-6 max-w-[640px] ${CASE__INDEX_PROSE}`;

export const CASE_SCENE_COUNTER =
  `${CASE__MONO_10_U} text-dim md:text-[14px]`;

export const CASE_SLIDE_META = `mt-6 ${CASE__MONO_14} text-ink`;

export const CASE_SLIDE_SUMMARY =
  "mt-8 max-w-[480px] text-[16px] leading-[1.75] text-muted";

export const CASE_PRESENTATION_HERO_HINT =
  `mt-10 max-w-[min(100%,28rem)] px-2 text-center ${CASE__MONO_10_U} text-dim sm:mt-12 sm:text-[14px] md:mt-16 md:max-w-none md:px-0 md:text-[14px]`;

export const CASE_NAV_PANEL_INDEX = `${CASE__MONO_12} text-accent`;

export const CASE_NAV_PANEL_TITLE = `relative ${CASE__MONO_14} text-ink`;

export const CASE_NAV_PANEL_COMPANY = `font-mono text-[14px] text-dim`;

export const CASE_TRANSITION_HEADLINE_STATIC =
  "text-[clamp(2rem,6vw,4rem)] font-extrabold text-ink";

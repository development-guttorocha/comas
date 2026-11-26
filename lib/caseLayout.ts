/**
 * Layout e medidas dos cases. Tipografia de corpo/títulos: `lib/caseTypography.ts`.
 *
 * Offset de scroll para âncoras sob o header fixo dos cases — usar em `className` dos blocos ancorados.
 */
export const CASE_SCROLL_ANCHOR_CLASS = "scroll-mt-[5.5rem]";

/** Máximo de âncoras na barra local do case (empresa à esquerda; links à direita). */
export const CASE_SECTION_NAV_MAX = 6;

/**
 * Medidas editoriais partilhadas — evitar `max-w-*` dispersos com valores ligeiramente diferentes.
 *
 * - **PROSE** (~50rem / 800px): corpo de texto único em todos os cases (splits, Notion, desafio).
 *   Mais estreito que `content-wrap` / mídia, que podem usar largura total ou {@link CASE_MEASURE_MEDIA_STAGE}.
 * - **HERO_TITLE**: título do hero em coluna única.
 * - **HERO_LEAD**: destaque curto abaixo do título quando em coluna única.
 */
export const CASE_MEASURE_PROSE = "max-w-[min(760px,100%)]";

/** Mídia + legenda no case: mais largo que o corpo, ainda abaixo do `content-wrap` (1600px). */
export const CASE_MEASURE_MEDIA_STAGE = "max-w-[min(1200px,100%)]";

/** Secção mista (texto + blocos largos como antes/depois): palco editorial completo. */
export const CASE_MEASURE_SECTION_STAGE = "max-w-[min(1200px,100%)]";

export const CASE_MEASURE_HERO_TITLE = "max-w-[min(56rem,100%)]";

export const CASE_MEASURE_HERO_LEAD = "max-w-[min(40rem,100%)]";

/** Título principal do `CaseHeroEditorial` (`titleScale="display"`). */
export const CASE_HERO_TITLE_DISPLAY_CLAMP = "clamp(30px, 4.5vw, 96px)";

/** Título mais contido (`titleScale="headline"`). */
export const CASE_HERO_TITLE_HEADLINE_CLAMP = "clamp(26px, 3.5vw, 64px)";

/**
 * Blocos de mídia: ocupam sempre 100% da largura do contentor (até ao limite do parent / `content-wrap`).
 */
export const CASE_MEDIA_BLOCK =
  "flex w-full min-w-0 max-w-full flex-col items-stretch";

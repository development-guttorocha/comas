/** Caminhos dos ativos de marca em `public/brand/`. */
export const BRAND = {
  /** Wordmark central — fundo escuro: tipografia creme. */
  heroDesktopDark: "/brand/Desktop-Center-svg-dark.svg",
  heroDesktopWidth: 18918,
  heroDesktopHeight: 6321,
  /** Wordmark central mobile — exports em `POrtfolio (1)/Desktop-Center-svg-*.svg` (fundo escuro / claro). */
  heroMobileDark: "/brand/Mobile-Center-svg-dark.svg",
  /** Fallback (viewBox do export atual: 11788×9699). */
  heroMobileWidth: 11788,
  heroMobileHeight: 9699,
  /** Símbolo circular sobre fundo claro (círculo creme, header claro, menu). */
  symbolOnLightBg: "/brand/symbol-on-light-bg.svg",
  /** Símbolo circular sobre fundo escuro (sem círculo claro). */
  symbolOnDarkBg: "/brand/symbol-on-dark-bg.svg",
} as const;

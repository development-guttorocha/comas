# Theme

## Summary
- Dark site: surface #000000, ink #f8f8f5, muted #a3a39c, line #334047, card #151d20 / #172329, accent #efefea (on-accent #171717), contact red #ef352c.
- Font: DM Sans for everything. Display clamp(42px,6.4vw,120px), section clamp(30px,4.2vw,76px), subheading clamp(26px,2.6vw,44px), card title clamp(22px,2.1vw,34px), body clamp(16px,1.15vw,20px), caption 12-14px, label 12px uppercase tracking .06em. Heading weight 700, tight negative tracking.
- Radii: tag 8px, note 16px, card 24px, canvas clamp(24px,2.5vw,40px), control pill 999px.
- Layout: page gutter 10vw, content width calc(100% - 20vw), reading width 65ch.
- Calm, editorial, minimal; no accent side bars in front of text.

## Raw: app/design-tokens.css
```css
/* Shared foundations, drawn from the Sobre page. Media and narrative scenes
   keep their own colors and proportions. */
@theme {
  --font-sans: var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif;

  --color-surface: #000000;
  --color-ink: #f8f8f5;
  --color-muted: #a3a39c;
  --color-subtle: #b8b8b1;
  --color-dim: #92928a;
  --color-line: #334047;
  --color-card: #151d20;
  --color-card-alt: #172329;
  --color-panel: #000000;
  --color-on-panel: #f8f8f5;
  --color-ink-muted: #a3a39c;
  --color-accent: #efefea;
  --color-on-accent: #171717;
  --color-highlight: #efefea;
  --color-live: #a3a39c;
  --color-paper: #ffffff;
  --color-on-paper: #171717;
  --color-contact: #ef352c;
  --color-on-contact: #080808;
  --color-control-line: #666660;

  --radius-tag: 8px;
  --radius-note: 16px;
  --radius-card: 24px;
  --radius-canvas: clamp(24px, 2.5vw, 40px);
  --radius-control: 999px;
}

:root {
  --type-display: clamp(42px, 6.4vw, 120px);
  /* Heroes split with a visual; still a step above --type-section. */
  --type-display-sm: clamp(38px, 4.4vw, 80px);
  --type-section: clamp(30px, 4.2vw, 76px);
  --type-subheading: clamp(26px, 2.6vw, 44px);
  --type-card-title: clamp(22px, 2.1vw, 34px);
  --type-body: clamp(16px, 1.15vw, 20px);
  --type-caption: clamp(12px, .9vw, 14px);
  --type-label: 12px;
  --type-control: 12px;
  --type-button: 15px;
  --type-button-sm: 14px;
  --weight-heading: 700;
  --tracking-display: -.065em;
  --tracking-heading: -.045em;
  --tracking-title: -.03em;
  --tracking-label: .06em;
  --leading-display: 1.06;
  --leading-heading: 1.23;
  --leading-body: 1.85;
  --leading-text: 1.6;

  --page-gutter: 10vw;
  --content-width: calc(100% - var(--page-gutter) * 2);
  --reading-width: 65ch;
  --layout-gap: clamp(32px, 6vw, 96px);
  --card-padding: clamp(24px, 2.5vw, 36px);
  --space-section-heading: clamp(32px, 4vw, 64px);
  --pad-section-sm: clamp(48px, 5vw, 80px);
  --pad-section-md: clamp(72px, 8vw, 144px);
  --pad-section-lg: clamp(96px, 12vw, 180px);
  --control-height-lg: 56px;
  --control-height: 48px;
  --control-height-sm: 44px;
}

@media (min-width: 768px) and (max-width: 1023px) {
  :root { --page-gutter: 7vw; }
}

@media (max-width: 767px) {
  :root {
    --page-gutter: 24px;
    --type-display: clamp(38px, 9vw, 64px);
    --type-display-sm: clamp(36px, 8.5vw, 56px);
    --type-section: clamp(30px, 7vw, 44px);
    --type-subheading: clamp(26px, 6vw, 34px);
    --type-card-title: clamp(22px, 5.5vw, 28px);
    --layout-gap: 32px;
    --pad-section-md: 72px;
    --pad-section-lg: 96px;
  }
}

```

## Raw: app/globals.css
```css
@import 'tailwindcss';
/* Colours, type scale, grid and radii come from the Sobre page. */
@import './design-tokens.css';

/**
 * Classes só definidas em `lib/*.ts` (ex. `caseTypography.ts`) precisam deste scan
 * explícito — de outro modo o Tailwind pode não gerar utilities usadas via `className={TOKEN}`.
 */
@source "../lib";
@source "../components";

/* Tailwind's smallest text steps never go below 14px. */
@theme {
  --text-xs: 14px;
  --text-sm: 14px;
}

/* ─── Base ─── */
html {
  background: var(--color-surface);
  color-scheme: dark;
}

@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}

body {
  min-height: 100vh;
  overflow-x: hidden;
  background: var(--color-surface);
  color: var(--color-ink);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

::selection { background: var(--color-ink); color: var(--color-surface); }
small, sub, sup { font-size: max(14px, 1em); }
a, a:hover, a:focus-visible { text-decoration: none !important; }

a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}

#historia, #perfil, #experiencia, #manifesto, #cases { scroll-margin-top: 110px; }

/* ─── Utilities ─── */
@layer utilities {
  /**
   * Largura máxima só no conteúdo. Fundos (bg-*), imagens e tipos decorativos
   * devem ficar em um pai `w-full` fora deste wrapper.
   */
  .content-wrap {
    box-sizing: border-box;
    margin-inline: auto;
    width: 100%;
    padding-inline: max(1rem, min(5vw, 4rem));
  }

  .pad-section-md { padding-block: var(--pad-section-md); }
  .pad-section-lg { padding-block: var(--pad-section-lg); }

  /** Tags dos cases; cor e borda vêm do componente (`CaseTag`). */
  .case-tag-pill {
    font-family: var(--font-mono), ui-monospace, monospace;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 0.35rem 0.80rem;
    border-radius: 9999px;
  }
}

/* Unlayered on purpose: it must win over `max-w-full` on the same element. */
.content-wrap { max-width: 90%; }

/* ─── Shared pieces ─── */
/* Ilustrações dotwork transparentes (`HomeFigmaArt`), sem inversão. */
.illustration { filter: none; }

.punk-link { position: relative; text-decoration: none; }
.punk-link, .case-content a { font-weight: 700; }

.portfolio-footer-wordmark { font-style: normal; }

/* Imagens entram com fade ao terminar de carregar (`components/ImageVeil.tsx`). */
@keyframes imageFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@media (prefers-reduced-motion: no-preference) {
  .image-fade-in { animation: imageFadeIn .6s cubic-bezier(.16, 1, .3, 1) backwards; }
}

/* ─── Páginas de case ─── */
.portfolio-case-page {
  background: var(--color-surface);
  color: var(--color-ink);
}

.portfolio-case-page .case-content,
.portfolio-case-page .content-wrap {
  --case-page-gutter: clamp(1rem, 4vw, 4.5rem);
}

/* ─── Impressão (currículo e resto do site) ─── */
/* Paper is white and A4; the résumé prints its own document (components/curriculo/CurriculumPrint). */
@page { size: A4; margin: 12mm 14mm; }
@media print {
  /* The site is dark; Chrome paints the page margins from the root, so paper goes light. */
  html { color-scheme: light !important; }
  html, body { background: #fff !important; color: #161616 !important; }
  nav[aria-label="Principal"],
  footer,
  .curriculum-print-button {
    display: none !important;
  }
}

```

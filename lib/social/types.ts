export type SlideKind = "cover" | "content" | "comparison" | "quote" | "cta";

export type SocialSlide = {
  id: string;
  kind: SlideKind;
  eyebrow?: string;
  title: string;
  body?: string;
  highlight?: string;
  /** Used by `comparison` (Antes × Depois) */
  wrongLabel?: string;
  wrongText?: string;
  rightLabel?: string;
  rightText?: string;
  /** Used by `quote` (Nota / Citação) */
  author?: string;
  /** Optional step badge (e.g. "01") */
  stepNumber?: string;
};

export type SocialFormat = "carousel" | "single_card";
export type SocialStatus = "draft_ai" | "in_review" | "exported";
export type TemplatePreset = "cycle_steps" | "before_after" | "quick_tip";

export type SocialPost = {
  id: string;
  title: string;
  format: SocialFormat;
  status: SocialStatus;
  slides: SocialSlide[];
  caption: string;
  sourceIdea?: string;
  createdAt: string;
  updatedAt: string;
};

export type SocialPalette = {
  background: string;
  surface: string;
  primary: string;
  accent: string;
  accentSoft: string;
  muted: string;
  wrong: string;
  right: string;
};

export type SocialTheme = {
  brandName: string;
  handle: string;
  tagline: string;
  palette: SocialPalette;
  displayFont: "serif" | "sans";
  showSlideNumbers: boolean;
  showFooterHandle: boolean;
};

/** Character limits to prevent text overflow on 1080×1350px slides. */
export const SLIDE_LIMITS = {
  eyebrow: 36,
  coverTitle: 60,
  coverBody: 140,
  contentTitle: 52,
  contentBody: 220,
  highlight: 110,
  comparisonTitle: 48,
  wrongText: 140,
  rightText: 140,
  quoteTitle: 180,
  ctaTitle: 60,
  ctaBody: 140,
} as const;

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350;

export function makeSlideId(): string {
  return `s_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptySlide(kind: SlideKind, index = 1): SocialSlide {
  const stepNumber = String(index).padStart(2, "0");
  switch (kind) {
    case "cover":
      return {
        id: makeSlideId(),
        kind: "cover",
        eyebrow: "TEXTO EM CICLO",
        title: "Título que desperta curiosidade",
        body: "Uma linha curta explicando o que a pessoa vai aprender neste carrossel.",
        highlight: "Arraste para ver →",
      };
    case "comparison":
      return {
        id: makeSlideId(),
        kind: "comparison",
        eyebrow: "ANTES × DEPOIS",
        title: "Como deixar a frase mais direta",
        wrongLabel: "Evite assim",
        wrongText: "Vamos estar realizando a entrega do material no decorrer da semana.",
        rightLabel: "Prefira assim",
        rightText: "Entregaremos o material nesta semana.",
        body: "Corte verbos auxiliares desnecessários para dar ritmo e clareza.",
      };
    case "quote":
      return {
        id: makeSlideId(),
        kind: "quote",
        eyebrow: "NOTA DE REDAÇÃO",
        title: "Escrever bem não é usar palavras difíceis; é fazer o leitor entender na primeira leitura.",
        author: "Texto em Ciclo",
      };
    case "cta":
      return {
        id: makeSlideId(),
        kind: "cta",
        eyebrow: "SALVE PARA CONSULTAR",
        title: "Este conteúdo te ajudou?",
        body: "Salve este post para revisar antes de escrever seu próximo texto e envie para alguém que precisa desta dica.",
        highlight: "Comente sua dúvida aqui embaixo ↓",
      };
    case "content":
    default:
      return {
        id: makeSlideId(),
        kind: "content",
        stepNumber,
        eyebrow: `PASSO ${stepNumber}`,
        title: "Ideia principal deste slide",
        body: "Explique em 2 ou 3 frases curtas. Textos objetivos aumentam o salvamento e a leitura até o final.",
        highlight: "Dica prática: leia em voz alta para testar o ritmo.",
      };
  }
}

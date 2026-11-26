import type { ReelDoc } from "@/lib/reel/types";

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
  /** Optional AI-generated or uploaded background image (e.g. via MuAPI) */
  imageUrl?: string;
  /** Overlay darkness over imageUrl (0.15 to 0.9, default 0.72) */
  imageOverlay?: number;
};

export type SocialFormat = "carousel" | "single_card" | "reel";
export type SocialStatus = "draft_ai" | "in_review" | "exported";
export type TemplatePreset =
  | "repertorio_banca"
  | "cycle_steps"
  | "before_after"
  | "radar_temas"
  | "quick_tip";

export const TEMPLATE_PRESET_OPTIONS: ReadonlyArray<{
  value: TemplatePreset;
  label: string;
  hint: string;
}> = [
  {
    value: "repertorio_banca",
    label: "Atualidades / Obra → Repertório & Bancas",
    hint: "Fato ou obra cultural → conceito/autor → Causa & Consequência → como já caiu em provas",
  },
  {
    value: "cycle_steps",
    label: "Estratégia de Redação / Passo a passo",
    hint: "Comandos práticos de escrita, leitura de coletânea e preparação sem surtar",
  },
  {
    value: "before_after",
    label: "Norma-padrão (Erros reais × Forma certa)",
    hint: "Palavras e construções que os vestibulandos juram que sabem usar + dica da Prô",
  },
  {
    value: "radar_temas",
    label: "Radar de Temas de Vestibular",
    hint: "Compilado de propostas recentes (recorte 'entre X e Y' ou pergunta) para salvar e treinar",
  },
  {
    value: "quick_tip",
    label: "Card único (Posicionamento / Citação)",
    hint: "Pílula de método, acolhimento pré-prova ou citação comentada",
  },
];

export function isValidTemplatePreset(value: unknown): value is TemplatePreset {
  return TEMPLATE_PRESET_OPTIONS.some(opt => opt.value === value);
}

export type SocialPost = {
  id: string;
  title: string;
  format: SocialFormat;
  status: SocialStatus;
  slides: SocialSlide[];
  reel?: ReelDoc | null;
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
        eyebrow: "REPERTÓRIO DE REDAÇÃO",
        title: "Como transformar esse tema em argumento",
        body: "Da leitura da coletânea ao projeto de texto sem modelos engessados.",
        highlight: "deslize →",
      };
    case "comparison":
      return {
        id: makeSlideId(),
        kind: "comparison",
        eyebrow: "NORMA-PADRÃO NA REDAÇÃO",
        title: "corroborar [verbo transitivo direto]",
        wrongLabel: "Evite na redação",
        wrongText: "“As ONGs corroboram com o governo na criação de políticas públicas.”",
        rightLabel: "Na norma-padrão",
        rightText: "“Os dados do IBGE corroboram a tese apresentada.”",
        body: "Parece chique, mas não é sinônimo de “colaborar”: pede complemento sem preposição.",
      };
    case "quote":
      return {
        id: makeSlideId(),
        kind: "quote",
        eyebrow: "ESCRITA É PROCESSO",
        title: "Tanto faz o tema da redação se você domina a estrutura, a leitura de coletânea e os eixos temáticos.",
        author: "Renata · @textoemciclo",
      };
    case "cta":
      return {
        id: makeSlideId(),
        kind: "cta",
        eyebrow: "@TEXTOEMCICLO",
        title: "Salve para consultar antes de escrever :)",
        body: "Envie este carrossel para quem está treinando redação com você neste semestre.",
        highlight: "Vamos juntos? Me conta sua dúvida nos comentários ↓",
      };
    case "content":
    default:
      return {
        id: makeSlideId(),
        kind: "content",
        stepNumber,
        eyebrow: "ARGUMENTO POSSÍVEL",
        title: "Causa (quem tem responsabilidade?)",
        body: "Articule o repertório diretamente ao problema do tema, mostrando por que o impasse persiste e quem é afetado.",
        highlight: "Dica da Prô: o recorte específico do tema você amarra depois da coletânea.",
      };
  }
}

import type { ReelDoc } from "@/lib/reel/types";
import type { SocialSlide } from "./types";

export type ArtDirection = "editorial" | "notebook" | "dark" | "book";
export type StudioAspect = "carousel" | "story";

export const ART_DIRECTIONS: Array<{ id: ArtDirection; label: string; hint: string }> = [
  { id: "editorial", label: "Editorial", hint: "Papel creme, serifada e respiro limpo" },
  { id: "notebook", label: "Caderno", hint: "Pautas sutis de caderno e marca-texto" },
  { id: "dark", label: "Escuro", hint: "Alto contraste em grafite e terracota" },
  { id: "book", label: "Página de livro", hint: "Moldura literária clássica e centralizada" },
];

export const ASPECT_DIMENSIONS: Record<StudioAspect, { width: number; height: number; label: string; ratio: string }> = {
  carousel: { width: 1080, height: 1350, label: "Carrossel 4:5", ratio: "4 / 5" },
  story: { width: 1080, height: 1920, label: "Stories 9:16", ratio: "9 / 16" },
};

/**
 * Portable JSON representation of a BlockNote document stored inside SocialPost.studioDoc.
 * We keep it loosely typed as records so it stays decoupled from internal BlockNote AST versions.
 */
export type StudioBlockJson = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: StudioBlockJson[];
};

import type { StudioCanvas } from "./canvas";

export type StudioDocumentData = {
  artDirection: ArtDirection;
  aspect: StudioAspect;
  blocks: StudioBlockJson[];
  canvas?: StudioCanvas | null;
};

/** Compiled slide produced from a Studio BlockNote document for preview and PNG/ZIP export. */
export type CompiledSlide =
  | {
      id: string;
      kind: "cover";
      eyebrow?: string;
      title: string;
      subtitle?: string;
      cta?: string;
      imageUrl?: string;
      imageOverlay?: number;
    }
  | {
      id: string;
      kind: "before_after";
      eyebrow?: string;
      title: string;
      wrongLabel: string;
      wrongText: string;
      rightLabel: string;
      rightText: string;
      note?: string;
    }
  | {
      id: string;
      kind: "step";
      stepNumber: string;
      eyebrow?: string;
      title: string;
      body: string;
      tip?: string;
    }
  | {
      id: string;
      kind: "checklist";
      eyebrow?: string;
      title: string;
      items: string[];
      footerNote?: string;
    }
  | {
      id: string;
      kind: "quote";
      eyebrow?: string;
      quote: string;
      author?: string;
    }
  | {
      id: string;
      kind: "image";
      eyebrow?: string;
      title?: string;
      caption?: string;
      imageUrl?: string;
      imageOverlay?: number;
    }
  | {
      id: string;
      kind: "cta";
      eyebrow?: string;
      title: string;
      body?: string;
      buttonLabel?: string;
    }
  | {
      id: string;
      kind: "free";
      eyebrow?: string;
      heading?: string;
      paragraphs: Array<{ text: string; kind: "p" | "bullet" | "numbered" | "quote" }>;
    };

export const STARTER_STUDIO_DOC: StudioDocumentData = {
  artDirection: "notebook",
  aspect: "carousel",
  blocks: [
    {
      type: "socialCover",
      props: {
        eyebrow: "TEXTO EM CICLO",
        title: "Pare de repetir 'que' na sua redação",
        subtitle: "3 trocas simples para deixar qualquer parágrafo mais fluido e elegante.",
        cta: "Arraste para ver o ciclo →",
        imageUrl: "",
        imageOverlay: 0.78,
      },
    },
    {
      type: "socialStep",
      props: {
        stepNumber: "01",
        eyebrow: "DIAGNÓSTICO",
        title: "Leia o parágrafo em voz alta",
        body: "Quando o 'que' aparece mais de duas vezes na mesma frase, o ouvido percebe antes dos olhos. Marque todas as ocorrências com um traço.",
        tip: "Se você perdeu o fôlego lendo, a frase precisa ser dividida.",
      },
    },
    {
      type: "socialBeforeAfter",
      props: {
        eyebrow: "ANTES × DEPOIS",
        title: "Troque a oração por um verbo direto",
        wrongLabel: "Com excesso de 'que'",
        wrongText: "O estudo que foi feito pela equipe mostrou que os alunos que leem mais escrevem melhor.",
        rightLabel: "Mais direto e limpo",
        rightText: "O estudo da equipe mostrou um padrão claro: alunos leitores escrevem melhor.",
        note: "Cortar 'que foi feito' e usar dois-pontos elimina dois ecos de uma vez.",
      },
    },
    {
      type: "socialChecklist",
      props: {
        eyebrow: "CHECKLIST DE REVISÃO",
        title: "3 saídas rápidas para substituir o 'que'",
        itemsJson: JSON.stringify([
          "Use dois-pontos (:) para anunciar uma explicação ou consequência",
          "Troque 'que + verbo' por um adjetivo ou particípio (ex: 'que foi criado' → 'criado')",
          "Divida uma frase longa em duas frases curtas com ponto final",
        ]),
        footerNote: "Aplique sempre na segunda leitura, nunca enquanto escreve o rascunho.",
      },
    },
    {
      type: "socialQuote",
      props: {
        eyebrow: "NOTA DE CADERNO",
        quote: "Escrever bem não é enfeitar o texto; é tirar o que atrapalha o leitor de chegar à ideia.",
        author: "Renata · Texto em Ciclo",
      },
    },
    {
      type: "socialCta",
      props: {
        eyebrow: "SALVE PARA CONSULTAR",
        title: "Quer destravar sua escrita toda semana?",
        body: "Salve este guia para revisar seu próximo texto e envie para alguém que sempre trava na revisão.",
        buttonLabel: "Comente 'REVISÃO' aqui embaixo ↓",
      },
    },
  ],
};

export type StudioExportPayload = {
  studioDoc: StudioDocumentData;
  slides: SocialSlide[];
  reel?: ReelDoc | null;
};

import type { Case, CaseLandingMedia } from "@/lib/cases";

/**
 * Mídia de landing só em código (paths em `public/`) — o Notion não modela isto.
 * Dados do case (texto, stats, etc.) vêm da database; isto é só composição visual da página dedicada.
 */
const WEBMOTORS_CATALOG_LANDING_MEDIA: CaseLandingMedia = {
  afterHero: {
    src: "/cases/webmotors/portfolio-destaque-processo.png",
    alt: "Destaque do processo: da ideia ao impacto no mercado de 0km",
    caption:
      "Trecho do case público em guttorocha.com.br/meus-cases/catalogowebmotors.",
  },
  problemStructural: {
    src: "/cases/webmotors/portfolio-taxonomia-central.png",
    alt: "Estrutura montadora, modelo e versão no catálogo",
    caption: "Organização central usada como base de componentes e páginas pilar.",
  },
  liveProductGallery: [
    {
      src: "/cases/webmotors/portfolio-step-1.png",
      alt: "Catálogo 0km: pesquisa, benchmarks e descoberta",
    },
    {
      src: "/cases/webmotors/portfolio-step-2.png",
      alt: "Catálogo 0km: navegação montadora, modelo e versão",
    },
    {
      src: "/cases/webmotors/portfolio-step-3.png",
      alt: "Catálogo 0km: listagem e comparador",
    },
  ],
  liveProductNote:
    "Telas de referência do fluxo atual em webmotors.com.br/catalogo. Contexto completo no case público em guttorocha.com.br/meus-cases/catalogowebmotors.",
};

export function mergeLandingMediaExtras(c: Case): Case {
  if (c.slug === "webmotors-catalogo") {
    return { ...c, landingMedia: WEBMOTORS_CATALOG_LANDING_MEDIA };
  }
  return c;
}

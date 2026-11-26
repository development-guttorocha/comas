import type { SiteLocale } from "@/lib/siteLocale";
import { DEFAULT_SITE_LOCALE } from "@/lib/siteLocale";

export interface CaseStat {
  value: string
  label: string
  /** Legenda curta (período, definição) — útil em faixas tipo “painel de growth”. */
  caption?: string
}

export interface CaseSection {
  title: string
  body: string[]
}

/** Item de mídia da landing (path em `public/` ou URL absoluta). */
export interface CaseLandingMediaItem {
  src: string
  alt: string
  caption?: string
}

/** Mídia opcional por case — usado em landings dedicadas (ex. WebMotors). */
export interface CaseLandingMedia {
  /** Primeira faixa full-bleed após o hero textual. */
  afterHero?: CaseLandingMediaItem
  /** Seção taxonomia / problema estrutural. */
  problemStructural?: CaseLandingMediaItem
  /** Galeria destacada em “Referência de produto no ar” (telas / fluxo do catálogo). */
  liveProductGallery?: [
    CaseLandingMediaItem,
    CaseLandingMediaItem,
    CaseLandingMediaItem,
  ]
  /** Nota ou atribuição abaixo da galeria (ex. fonte, data de captura). */
  liveProductNote?: string
}

export interface Case {
  slug: string
  num: string
  title: string
  company: string
  /** Rótulo pequeno no hero (ex.: linha de produto), junto à empresa. */
  productTag?: string
  year: string
  role: string
  tags: string[]
  accentTags: string[]
  /** Destaque na home — alinhado a guttorocha.com.br (Cases públicos) */
  featuredOnSite?: boolean
  /** Rascunho: fica no admin e fora do site até ser publicado. */
  draft?: boolean
  /** Arquivado: saiu do site, mas fica guardado no admin. */
  archived?: boolean
  /**
   * Ordem na listagem (número vindo do Notion: `order`, `ordem`, `orderNum`, …).
   * Sem valor → fica no fim quando se ordena por `order`.
   */
  order?: number
  placeholder: string        // cor do placeholder até ter imagem real
  /** Cor de marca (hex): degradê no hero claro e na lista da home — ver `caseBrandGradientBackground`. */
  brandColor: string
  /** Hero do case: mesma URL do topo da landing quando existir. Home carrega só no hover/focus (pointer fino). */
  heroImage?: string
  /** Capa no celular (opcional). */
  heroImageMobile?: string
  /** Ponto da capa que fica à vista quando ela é cortada (`"50% 30%"`). */
  heroImageFocus?: string
  /** Card da Home: cada campo vazio usa o dado do próprio case. */
  homeCompany?: string
  homeYear?: string
  /** Fundo do card na Home; vazio usa `brandColor`. */
  homeColor?: string
  /** Título do card na Home; vazio usa `title`. */
  homeTitle?: string
  /** Rótulo acima dos números (ex.: "Resultados"). */
  homeLabel?: string
  /** Até dois números do card; vazio usa os do primeiro bloco de métricas. */
  homeStats?: CaseStat[]
  /** Nota pequena abaixo dos números. */
  homeNote?: string
  /** Imagem do card e da esteira na Home; vazia usa a capa (`heroImage`). */
  homeImage?: string
  /** Versão da imagem da Home para o celular. */
  homeImageMobile?: string
  /** Ponto da imagem da Home que fica à vista quando ela é cortada. */
  homeImageFocus?: string
  /** Resumo editorial opcional para o card da Home; prevalece sobre o corpo do case. */
  homeSummary?: string
  homeHighlightKind?: "results" | "delivery"
  summary: string            // frase curta — aparece na home e no topo do case
  context: string            // o cenário antes de você chegar
  challenge: string          // o problema real
  approach: CaseSection[]    // o que foi feito — N blocos narrativos
  stats: CaseStat[]          // números de impacto
  outcome: string            // o resultado
  learning: string           // o que ficou de aprendizado
  /** Last saved in the admin (YYYY-MM-DD): the sitemap's `lastmod`. */
  updatedAt?: string
  /** Nota de atribuição (ex.: stats de busca em período longo). */
  attributionNote?: string
  /** Rodapé editorial mínimo (ex.: duas fontes, contexto público do produto). */
  editorialSourceNote?: string
  /** Imagens da landing dedicada (paths relativos a `public/`). */
  landingMedia?: CaseLandingMedia
  /**
   * Marca d’água gigante no hero (referência: BrandLovers).
   * Omitido → `getCaseHeroMegaWord` usa o nome da empresa em uppercase sem espaços.
   */
  heroMegaWord?: string
  /**
   * Topo do case em rotas genéricas (`/cases/[slug]`):
   * `editorial` (padrão) — degradê + faixa de imagem opcional abaixo;
   * `fullBleed` — `CaseHeroFullBleed` (mídia em ecrã inteiro). Requer `heroImage` ou `heroFullBleedVideoUrl`.
   */
  heroVariant?: "editorial" | "fullBleed"
  /** Só `fullBleed`: rótulo acima do título (ex.: produto ou “Visão geral”). */
  heroFullBleedEyebrow?: string
  /** Só `fullBleed`: linha opcional abaixo do título (default: `summary`). */
  heroFullBleedTagline?: string
  /** Só `fullBleed`: id da secção para o botão “Continuar” (default: `case-contexto`). */
  heroFullBleedNextSectionId?: string
  /**
   * Só `fullBleed`: texto integral do CTA (âncora `heroFullBleedNextSectionId`).
   * Se preenchido no Notion, substitui o padrão “Continuar” / “Continuar {empresa}”.
   */
  heroFullBleedContinueLabel?: string
  /** Só `fullBleed`: vídeo de fundo em vez de `heroImage`. */
  heroFullBleedVideoUrl?: string
  heroFullBleedVideoPoster?: string
  /**
   * Corpo noutra página Notion (opcional). Se vazio, usa `notionSourcePageId` (a própria linha da database).
   */
  notionContentPageId?: string
  /**
   * Página Notion duplicada em inglês (mesmo slug global). Usada em `/en/cases/[slug]`.
   * Colunas aceites no Notion: `notionContentPageIdEn`, `bodyEn`, `paginaEn`, … (ver `notionCases.ts`).
   */
  notionContentPageIdEn?: string
  /** Título em inglês (hero, SEO, “próximo case”). Se vazio em EN, usa `title`. */
  titleEn?: string
  /** Resumo em inglês. Se vazio em EN, usa `summary`. */
  summaryEn?: string
  /**
   * ID da página Notion desta linha na database (preenchido pela API). O texto do case fica no **corpo** desta página.
   */
  notionSourcePageId?: string
}

/**
 * Degradê do hero / hover da home: light = 10% marca → branco; dark = 15% marca → surface.
 * Usa `light-dark()` para não depender de classe CSS no bundle.
 */
export function caseBrandGradientBackground(
  brandHex: string,
  angleDeg: number = 165
): string {
  return `linear-gradient(${angleDeg}deg, light-dark(color-mix(in srgb, ${brandHex} 10%, #ffffff), color-mix(in srgb, ${brandHex} 15%, var(--color-surface))) 0%, var(--color-surface) 55%)`;
}

/**
 * Texto da marca d’água do hero (padrão BrandLovers: nome gigante, `megaScale` display,
 * esquerda, base — ver `CaseHeroEditorial`).
 */
export function getCaseHeroMegaWord(c: Case): string {
  const o = c.heroMegaWord?.trim()
  if (o) return o
  return c.company.replace(/\s+/g, "").toUpperCase()
}

/** URL pública do case — `pt` em `/cases/…`, `en` em `/en/cases/…` (slug global igual). */
export function getCaseHref(slug: string, locale: SiteLocale = DEFAULT_SITE_LOCALE): string {
  if (locale === "en") return `/en/cases/${slug}`;
  return `/cases/${slug}`;
}

/**
 * Única rota estática fora do template Notion: playbook de componentes (`app/cases/modelo/page.tsx`).
 * Todos os outros slugs vêm da database e renderizam em `[slug]` + `NotionPageDocument`.
 */
export const CUSTOM_CASE_LANDING_SLUGS = ["modelo"] as const

/**
 * Fallback quando **nenhuma** linha no Notion tem `featuredOnSite === true` —
 * mantém o trio clássico se ainda existir na lista.
 */
export const HOME_SHOWCASE_SLUGS = [
  "brandlovers-criadores",
  "loft-lideranca-gestao-e-cultura-de-design",
  "webmotors-catalogo",
] as const

/**
 * Cases da secção “Cases” na home: linhas com **`featuredOnSite`** vindo do Notion (checkbox/select/status “sim”).
 * Ordem = ordenação na database Notion (`order`, `ordem`, `orderNum`, …). Se ninguém estiver marcado, usa `HOME_SHOWCASE_SLUGS`.
 */
function sortByListOrder(list: Case[]): Case[] {
  return [...list].sort(
    (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER),
  );
}

export function getCasesForHomeShowcaseFromList(allCases: Case[]): Case[] {
  const flagged = allCases.filter((c) => c.featuredOnSite === true);
  if (flagged.length > 0) {
    return sortByListOrder(flagged);
  }
  return HOME_SHOWCASE_SLUGS.map((slug) => allCases.find((c) => c.slug === slug)).filter(
    (c): c is Case => c !== undefined
  );
}

/** Destaques seguem exclusivamente a marcação do Notion; os demais entram na lista. */
export function getHomeCaseGroups(allCases: Case[]) {
  const ordered = sortByListOrder(allCases.filter((c) => c.slug !== "modelo"));
  return {
    featured: ordered.filter((c) => c.featuredOnSite === true),
    remaining: ordered.filter((c) => c.featuredOnSite !== true),
  };
}

/** Uma linha full-bleed ou duas colunas ~50% / 50%. */
export type HomeCaseRow<T extends Case = Case> =
  | { kind: "full"; item: T }
  | { kind: "pair"; left: T; right: T }

/**
 * Ritmo: full → par (2) → full → par → … Se faltar 1 no par, vira linha full.
 */
export function buildHomeCaseRows<T extends Case>(list: T[]): HomeCaseRow<T>[] {
  const rows: HomeCaseRow<T>[] = []
  let i = 0
  let blockIdx = 0
  while (i < list.length) {
    if (blockIdx % 2 === 0) {
      rows.push({ kind: "full", item: list[i] })
      i += 1
    } else {
      const left = list[i]
      const right = list[i + 1]
      if (right) {
        rows.push({ kind: "pair", left, right })
        i += 2
      } else {
        rows.push({ kind: "full", item: left })
        i += 1
      }
    }
    blockIdx += 1
  }
  return rows
}

export function getFeaturedCasesForHomeFromList(allCases: Case[]): Case[] {
  return getCasesForHomeShowcaseFromList(allCases)
}

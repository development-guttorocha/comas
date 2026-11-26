import type { Case, CaseSection, CaseStat } from "@/lib/cases";
import { mergeLandingMediaExtras } from "@/lib/caseLandingMediaExtras";
import { normalizeNotionId } from "@/lib/notionIds";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_API_VERSION = "2022-06-28";

type NotionPage = {
  id: string;
  properties?: Record<string, unknown>;
};

export type NotionCaseBlock = {
  id: string;
  slug: string;
  componentKey: string;
  order: number;
  enabled: boolean;
  props: Record<string, unknown>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Compara nomes de colunas Notion com aliases (remove acentos, emoji, pontuação). */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Valores aceites no Notion: editorial, fullBleed, full-bleed, full, etc. */
function parseHeroVariant(raw: string | undefined): "editorial" | "fullBleed" | undefined {
  if (!raw) return undefined;
  const n = raw.trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (n === "fullbleed" || n === "full" || n === "bleed") return "fullBleed";
  if (n === "editorial") return "editorial";
  return undefined;
}

/** Texto, URL, ou relation → ID/URL de página Notion para o corpo WYSIWYG. */
function asNotionPageLinkValue(value: unknown): string | undefined {
  const text = asText(value);
  if (text) return text;
  if (!isObject(value)) return undefined;
  if (value.type === "relation") {
    const arr = Array.isArray(value.relation) ? value.relation : [];
    const first = arr[0];
    if (isObject(first) && typeof first.id === "string") return first.id;
  }
  return undefined;
}

function findProp(page: NotionPage, candidates: string[]): unknown {
  const props = page.properties;
  if (!props) return undefined;

  for (const key of Object.keys(props)) {
    const norm = normalizeName(key);
    if (candidates.some((c) => normalizeName(c) === norm)) {
      return props[key];
    }
  }

  return undefined;
}

function asText(value: unknown): string | undefined {
  if (!isObject(value)) return undefined;
  const type = typeof value.type === "string" ? value.type : "";

  if (type === "title") {
    const title = Array.isArray(value.title) ? value.title : [];
    return title.map((x) => (isObject(x) ? String(x.plain_text ?? "") : "")).join("").trim() || undefined;
  }

  if (type === "rich_text") {
    const rich = Array.isArray(value.rich_text) ? value.rich_text : [];
    return rich.map((x) => (isObject(x) ? String(x.plain_text ?? "") : "")).join("").trim() || undefined;
  }

  if (type === "url") {
    return typeof value.url === "string" ? value.url.trim() || undefined : undefined;
  }

  if (type === "select") {
    const sel = isObject(value.select) ? value.select : null;
    return sel && typeof sel.name === "string" ? sel.name.trim() || undefined : undefined;
  }

  if (type === "status") {
    const st = isObject(value.status) ? value.status : null;
    return st && typeof st.name === "string" ? st.name.trim() || undefined : undefined;
  }

  if (type === "number") {
    return typeof value.number === "number" ? String(value.number) : undefined;
  }

  return undefined;
}

/**
 * Primeira URL numa propriedade Notion **Files** (upload na database ou link externo).
 * @see https://developers.notion.com/reference/property-object#files
 */
function firstNotionFileUrl(value: unknown): string | undefined {
  if (!isObject(value) || value.type !== "files") return undefined;
  const files = Array.isArray(value.files) ? value.files : [];
  for (const item of files) {
    if (!isObject(item)) continue;
    const ty = typeof item.type === "string" ? item.type : "";
    if (ty === "file" && isObject(item.file) && typeof item.file.url === "string") {
      const u = item.file.url.trim();
      if (u) return u;
    }
    if (ty === "external" && isObject(item.external) && typeof item.external.url === "string") {
      const u = item.external.url.trim();
      if (u) return u;
    }
  }
  return undefined;
}

/** Coluna URL, texto com URL, ou tipo **Files** (Notion). */
function asUrlOrNotionFile(value: unknown): string | undefined {
  const text = asText(value);
  if (text) return text;
  return firstNotionFileUrl(value);
}

function asNumber(value: unknown): number | undefined {
  if (!isObject(value)) return undefined;
  if (value.type === "number" && typeof value.number === "number") return value.number;
  /** Fórmulas no Notion: `formula.number` ou `formula.string` numérico. */
  if (value.type === "formula" && isObject(value.formula)) {
    const f = value.formula as { type?: string; number?: unknown; string?: unknown };
    if (f.type === "number" && typeof f.number === "number") return f.number;
    if (f.type === "string" && typeof f.string === "string") {
      const n = Number(f.string.trim());
      return Number.isFinite(n) ? n : undefined;
    }
  }
  const text = asText(value);
  if (!text) return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

function asCheckbox(value: unknown): boolean | undefined {
  if (!isObject(value)) return undefined;
  if (value.type === "checkbox" && typeof value.checkbox === "boolean") return value.checkbox;
  const text = asText(value)?.toLowerCase();
  if (!text) return undefined;
  if (["true", "1", "yes", "sim", "published", "publicado"].includes(text)) return true;
  if (["false", "0", "no", "nao", "não", "draft", "rascunho"].includes(text)) return false;
  return undefined;
}

/**
 * Lista de etiquetas no Notion: **multi-select**, **select** (um valor), **status**,
 * ou **texto / rich text** com separadores `,` `;` `|` ou quebra de linha.
 */
function asStringListProp(value: unknown): string[] {
  if (!isObject(value)) return [];
  const type = typeof value.type === "string" ? value.type : "";

  if (type === "multi_select") {
    const items = Array.isArray(value.multi_select) ? value.multi_select : [];
    return items
      .map((x) => (isObject(x) && typeof x.name === "string" ? x.name.trim() : ""))
      .filter(Boolean);
  }

  if (type === "select") {
    const sel = isObject(value.select) ? value.select : null;
    const name = sel && typeof sel.name === "string" ? sel.name.trim() : "";
    return name ? [name] : [];
  }

  if (type === "status") {
    const st = isObject(value.status) ? value.status : null;
    const name = st && typeof st.name === "string" ? st.name.trim() : "";
    return name ? [name] : [];
  }

  let blob = "";
  if (type === "rich_text") {
    const rich = Array.isArray(value.rich_text) ? value.rich_text : [];
    blob = rich.map((x) => (isObject(x) ? String(x.plain_text ?? "") : "")).join("").trim();
  } else if (type === "title") {
    const title = Array.isArray(value.title) ? value.title : [];
    blob = title.map((x) => (isObject(x) ? String(x.plain_text ?? "") : "")).join("").trim();
  }

  if (blob) {
    return blob
      .split(/[,;|•\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

function splitLines(text?: string): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseStatsText(raw?: string): CaseStat[] {
  const lines = splitLines(raw);
  const out: CaseStat[] = [];

  for (const line of lines) {
    const [value, label, caption] = line.split("|").map((x) => x.trim());
    if (!value || !label) continue;
    out.push({ value, label, caption: caption || undefined });
  }

  return out;
}

function parseApproachText(raw?: string): CaseSection[] {
  if (!raw) return [];

  const groups = raw
    .split(/\n\s*\n/g)
    .map((x) => x.trim())
    .filter(Boolean);

  return groups.map((group, index) => {
    const [titleLine, ...bodyLines] = group.split("\n").map((x) => x.trim()).filter(Boolean);
    if (!titleLine) {
      return {
        title: `Bloco ${index + 1}`,
        body: [],
      };
    }

    if (bodyLines.length === 0) {
      return {
        title: `Bloco ${index + 1}`,
        body: [titleLine],
      };
    }

    return {
      title: titleLine,
      body: bodyLines,
    };
  });
}

async function notionQueryDatabase(databaseId: string, token: string): Promise<NotionPage[]> {
  const results: NotionPage[] = [];
  let cursor: string | null = null;

  while (true) {
    const res = await fetch(`${NOTION_API_BASE}/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page_size: 100,
        start_cursor: cursor ?? undefined,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Notion query failed: ${res.status}`);
    }

    const data = (await res.json()) as {
      results?: NotionPage[];
      has_more?: boolean;
      next_cursor?: string | null;
    };

    const pageResults = Array.isArray(data.results) ? data.results : [];
    results.push(...pageResults);

    if (!data.has_more || !data.next_cursor) break;
    cursor = data.next_cursor;
  }

  return results;
}

function mapCaseFromNotion(page: NotionPage, index: number): (Case & { _order: number }) | null {
  const slug = asText(findProp(page, ["slug", "caseSlug"]));
  if (!slug) return null;

  const title = asText(findProp(page, ["title", "titulo", "name"])) ?? slug;

  const mapped: Case = {
    slug,
    num: asText(findProp(page, ["num", "numero"])) ?? String(index + 1).padStart(2, "0"),
    title,
    company: (asText(findProp(page, ["company", "empresa"])) ?? "—").replace(/brandlovers/gi, "BrandLovrs"),
    productTag: asText(findProp(page, ["productTag", "produto"])),
    year: asText(findProp(page, ["year", "ano"])) ?? "",
    role: asText(findProp(page, ["role", "papel", "cargo"])) ?? "",
    tags: asStringListProp(
      findProp(page, ["tags", "tag", "etiquetas", "etiqueta", "categorias", "categoria", "tipo"]),
    ),
    accentTags: asStringListProp(
      findProp(page, [
        "accentTags",
        "tagsAccent",
        "accent",
        "tagdestaque",
        "destaquetag",
        "tagsdestaque",
        "chip",
        "destaquevisual",
      ]),
    ),
    featuredOnSite: (() => {
      const raw = findProp(page, [
        "featuredOnSite",
        "featured",
        "destaque",
        "destaquenosite",
        "destaquenohome",
        "emdestaque",
        "showonhome",
        "mostrarna home",
        "mostrarnahome",
        "casosemdestaque",
      ]);
      if (raw === undefined) return undefined;
      return asCheckbox(raw) ?? true;
    })(),
    placeholder:
      asText(findProp(page, ["placeholder", "placeholderColor"])) ?? "#E4E1DA",
    brandColor:
      asText(findProp(page, ["brandColor", "corMarca", "brand"])) ?? "#E8321A",
    heroImage: asUrlOrNotionFile(
      findProp(page, ["heroImage", "heroImageUrl", "hero", "capa", "imagemCapa"]),
    ),
    summary: asText(findProp(page, ["summary", "resumo"])) ?? "",
    homeSummary: asText(findProp(page, ["homeSummary", "resumoHome"])),
    homeHighlightKind: (() => {
      const raw = asText(findProp(page, ["homeHighlightKind", "tipoResumoHome"]));
      if (!raw) return undefined;
      const kind = normalizeName(raw);
      if (["results", "resultados", "resultado"].includes(kind)) return "results";
      if (["delivery", "entrega", "entregas"].includes(kind)) return "delivery";
      return undefined;
    })(),
    context: asText(findProp(page, ["context", "contexto"])) ?? "",
    challenge: asText(findProp(page, ["challenge", "desafio"])) ?? "",
    approach: parseApproachText(asText(findProp(page, ["approach", "abordagem"]))),
    stats: parseStatsText(asText(findProp(page, ["stats", "metricas", "métricas"]))),
    outcome: asText(findProp(page, ["outcome", "resultado"])) ?? "",
    learning: asText(findProp(page, ["learning", "aprendizado"])) ?? "",
    attributionNote: asText(findProp(page, ["attributionNote", "notaAtribuicao"])),
    editorialSourceNote: asText(findProp(page, ["editorialSourceNote", "notaEditorial"])),
    heroMegaWord: asText(findProp(page, ["heroMegaWord", "megaWord"])),
    heroVariant: (() => {
      const raw = asText(findProp(page, ["heroVariant", "heroLayout", "tipoHero"])) ?? undefined;
      return parseHeroVariant(raw);
    })(),
    heroFullBleedEyebrow: asText(findProp(page, ["heroFullBleedEyebrow", "fullBleedEyebrow", "eyebrowHero"])),
    heroFullBleedTagline: asText(findProp(page, ["heroFullBleedTagline", "fullBleedTagline", "taglineHero"])),
    heroFullBleedNextSectionId: asText(findProp(page, [
      "heroFullBleedNextSectionId",
      "continuarPara",
      "heroNextAnchor",
    ])),
    heroFullBleedContinueLabel: asText(findProp(page, [
      "heroFullBleedContinueLabel",
      "continueLabel",
      "ctaContinuar",
      "fullBleedCta",
      "textoBotaoContinuar",
    ])),
    heroFullBleedVideoUrl: asUrlOrNotionFile(
      findProp(page, ["heroFullBleedVideoUrl", "heroVideoUrl", "videoHero"]),
    ),
    heroFullBleedVideoPoster: asUrlOrNotionFile(
      findProp(page, ["heroFullBleedVideoPoster", "heroVideoPoster"]),
    ),
    notionContentPageId: (() => {
      const prop = findProp(page, [
        "notionContentPageId",
        "contentPageId",
        "paginaConteudo",
        "bodyPageId",
        "notionPage",
        "paginaDoCase",
        "casePage",
      ]);
      const raw = asNotionPageLinkValue(prop) ?? undefined;
      return normalizeNotionId(raw);
    })(),
    notionContentPageIdEn: (() => {
      const prop = findProp(page, [
        "notionContentPageIdEn",
        "contentPageIdEn",
        "paginaConteudoEn",
        "bodyEn",
        "bodyPageIdEn",
        "notionPageEn",
        "paginaEn",
        "casePageEn",
        "notionBodyEn",
      ]);
      const raw = asNotionPageLinkValue(prop) ?? undefined;
      return normalizeNotionId(raw);
    })(),
    titleEn: asText(findProp(page, ["titleEn", "englishTitle", "tituloEn", "tituloEN"])),
    summaryEn: asText(findProp(page, ["summaryEn", "englishSummary", "resumoEn", "resumoEN"])),
    /** Corpo padrão: texto na própria página da linha (abre a linha no Notion e escreve abaixo das propriedades). */
    notionSourcePageId: page.id,
  };

  const order =
    asNumber(findProp(page, ["order", "ordem", "orderNum", "orderNumber", "numOrdem"])) ??
    index + 1;
  const published = asCheckbox(findProp(page, ["published", "publicado", "enabled"]));
  if (published === false) return null;

  return { ...mapped, order, _order: order };
}

/**
 * Lê a database de cases do Notion. Usado só pela exportação (`scripts/export-notion-cases.ts`):
 * o site lê `content/cases/` (ver `lib/caseContent.ts`).
 */
export async function fetchNotionCases(): Promise<Case[]> {
  const token = process.env.NOTION_TOKEN?.trim();
  const casesDb = normalizeNotionId(process.env.NOTION_CASES_DATABASE_ID);
  if (!token || !casesDb) throw new Error("Configure NOTION_TOKEN e NOTION_CASES_DATABASE_ID.");
  const casePages = await notionQueryDatabase(casesDb, token);
  return casePages
    .map((p, i) => mapCaseFromNotion(p, i))
    .filter((x): x is Case & { _order: number } => x !== null)
    .sort((a, b) => a._order - b._order)
    .map(({ _order, ...rest }) => {
      void _order;
      return mergeLandingMediaExtras(rest as Case);
    });
}

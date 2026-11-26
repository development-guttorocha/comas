import { formatNotionUuid, normalizeNotionId } from "@/lib/notionIds";
import { readCrop, type MediaCrop } from "@/lib/mediaCrop";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_API_VERSION = "2022-06-28";

export type NotionBlockNode = {
  id: string;
  type: string;
  has_children?: boolean;
  [key: string]: unknown;
  children?: NotionBlockNode[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fetchBlockChildrenPage(
  blockId: string,
  token: string,
): Promise<NotionBlockNode[]> {
  const id = formatNotionUuid(blockId);
  const out: NotionBlockNode[] = [];
  let cursor: string | undefined;

  while (true) {
    const url = new URL(`${NOTION_API_BASE}/blocks/${id}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_API_VERSION,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Notion blocks ${res.status}`);
    }

    const data = (await res.json()) as {
      results?: NotionBlockNode[];
      has_more?: boolean;
      next_cursor?: string | null;
    };

    const batch = Array.isArray(data.results) ? data.results : [];
    out.push(...batch);

    if (!data.has_more || !data.next_cursor) break;
    cursor = data.next_cursor;
  }

  return out;
}

/**
 * Árvore de blocos da página Notion (títulos, parágrafos, listas, imagens…).
 */
export async function fetchNotionPageBlockTree(
  pageIdRaw: string,
  token: string,
  { maxDepth = Infinity }: { maxDepth?: number } = {},
): Promise<NotionBlockNode[]> {
  const compact = normalizeNotionId(pageIdRaw.trim()) ?? pageIdRaw.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(compact)) {
    return [];
  }

  async function buildTree(blockId: string, depth = 0): Promise<NotionBlockNode[]> {
    const blocks = await fetchBlockChildrenPage(blockId, token);
    const nodes: NotionBlockNode[] = [];
    for (const b of blocks) {
      const node: NotionBlockNode = { ...b };
      if (b.has_children && depth < maxDepth) {
        node.children = await buildTree(b.id, depth + 1);
      }
      nodes.push(node);
    }
    return nodes;
  }

  return buildTree(compact);
}

export function getRichTextArray(block: NotionBlockNode): unknown[] {
  const t = block.type;
  const payload = block[t];
  if (!isObject(payload)) return [];
  const rt = (payload as { rich_text?: unknown[] }).rich_text;
  return Array.isArray(rt) ? rt : [];
}

export function getImageUrl(block: NotionBlockNode): string | undefined {
  const im = block.image;
  if (!isObject(im)) return undefined;
  if (im.type === "external" && isObject(im.external) && typeof im.external.url === "string") {
    return im.external.url;
  }
  if (im.type === "file" && isObject(im.file) && typeof im.file.url === "string") {
    return im.file.url;
  }
  return undefined;
}

/** The phone version the admin can attach to an image (`image.mobile_url`). */
export function getImageMobileUrl(block: NotionBlockNode): string | undefined {
  const im = block.image;
  return isObject(im) && typeof im.mobile_url === "string" && im.mobile_url ? im.mobile_url : undefined;
}

const IMAGE_SIZES = ["bleed", "w75", "w50", "w25", "w15", "w10", "w5", "narrow"] as const;
/** How wide the admin set an image or video (`case_size`): a share of the screen (100% to 5%), or the text column. */
export function getImageSize(block: NotionBlockNode): (typeof IMAGE_SIZES)[number] | undefined {
  const payload = block[block.type];
  const size = isObject(payload) ? payload.case_size : undefined;
  return IMAGE_SIZES.find(s => s === size);
}

/** The area of an image or video shown on the page (`case_crop`; `case_crop_mobile` for the phone version). */
export function getMediaCrop(block: NotionBlockNode, mobile = false): MediaCrop | undefined {
  const payload = block[block.type];
  return isObject(payload) ? readCrop(payload[mobile ? "case_crop_mobile" : "case_crop"]) : undefined;
}

export function getImageCaptionParts(block: NotionBlockNode): unknown[] {
  const im = block.image;
  if (!isObject(im)) return [];
  const cap = im.caption;
  return Array.isArray(cap) ? cap : [];
}

/** Texto plano a partir de `rich_text` do Notion (legendas, etc.). */
export function richTextPlain(parts: unknown[]): string {
  if (!Array.isArray(parts)) return "";
  let out = "";
  for (const p of parts) {
    if (!isObject(p)) continue;
    const pt = p.plain_text;
    if (typeof pt === "string") out += pt;
  }
  return out.trim();
}

export function getCodeLanguage(block: NotionBlockNode): string | undefined {
  const c = block.code;
  if (!isObject(c)) return undefined;
  return typeof c.language === "string" ? c.language : undefined;
}

export function getVideoPageUrl(block: NotionBlockNode): string | undefined {
  const v = block.video;
  if (!isObject(v)) return undefined;
  if (v.type === "external" && isObject(v.external) && typeof v.external.url === "string") {
    return v.external.url.trim() || undefined;
  }
  if (v.type === "file" && isObject(v.file) && typeof v.file.url === "string") {
    return v.file.url.trim() || undefined;
  }
  return undefined;
}

export function getVideoCaptionParts(block: NotionBlockNode): unknown[] {
  const v = block.video;
  if (!isObject(v)) return [];
  const cap = v.caption;
  return Array.isArray(cap) ? cap : [];
}

export function getEmbedBlockUrl(block: NotionBlockNode): string | undefined {
  const e = block.embed;
  if (!isObject(e) || typeof e.url !== "string") return undefined;
  return e.url.trim() || undefined;
}

export function getEmbedCaptionParts(block: NotionBlockNode): unknown[] {
  const e = block.embed;
  if (!isObject(e)) return [];
  const cap = e.caption;
  return Array.isArray(cap) ? cap : [];
}

export function getBookmarkBlock(block: NotionBlockNode): { url: string; caption: unknown[] } | undefined {
  const b = block.bookmark;
  if (!isObject(b) || typeof b.url !== "string") return undefined;
  const cap = b.caption;
  return { url: b.url.trim(), caption: Array.isArray(cap) ? cap : [] };
}

/** Bloco “link preview” (ex. Figma colado) — só vem na resposta da API, não é criável por API. */
export function getLinkPreviewUrl(block: NotionBlockNode): string | undefined {
  const lp = block.link_preview;
  if (!isObject(lp) || typeof lp.url !== "string") return undefined;
  return lp.url.trim() || undefined;
}

export function getFileBlockUrlAndName(block: NotionBlockNode): { url: string; name: string } | undefined {
  const f = block.file;
  if (!isObject(f)) return undefined;
  let url: string | undefined;
  if (f.type === "external" && isObject(f.external) && typeof f.external.url === "string") {
    url = f.external.url.trim() || undefined;
  }
  if (f.type === "file" && isObject(f.file) && typeof f.file.url === "string") {
    url = f.file.url.trim() || undefined;
  }
  if (!url) return undefined;
  const name = typeof f.name === "string" && f.name.trim() ? f.name.trim() : "Ficheiro";
  return { url, name };
}

export function getEquationExpression(block: NotionBlockNode): string | undefined {
  const eq = block.equation;
  if (!isObject(eq) || typeof eq.expression !== "string") return undefined;
  return eq.expression;
}

export function getTableFlags(block: NotionBlockNode): { colHeader: boolean; rowHeader: boolean } {
  const t = block.table;
  if (!isObject(t)) return { colHeader: false, rowHeader: false };
  return {
    colHeader: t.has_column_header === true,
    rowHeader: t.has_row_header === true,
  };
}

/** Células de uma linha de tabela Notion (cada uma = array rich_text). */
export function getTableRowCells(row: NotionBlockNode): unknown[][] {
  if (row.type !== "table_row") return [];
  const tr = row.table_row;
  if (!isObject(tr)) return [];
  const cells = tr.cells;
  if (!Array.isArray(cells)) return [];
  return cells.map((c) => (Array.isArray(c) ? c : []));
}

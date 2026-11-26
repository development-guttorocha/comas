import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { getRichTextArray } from "@/lib/notionBlockTree";

/** Blocos Notion onde `[-nav N] …` no texto gera item na barra e âncora `#slug`. */
const NAV_ANCHOR_BLOCK_TYPES = new Set(["heading_1", "heading_2", "heading_3", "paragraph"]);

/** `[-nav 1]` … `[-nav 6]` no início do texto do bloco; o resto vira rótulo e slug da âncora. */
const NAV_MARKER_RE = /^\s*\[-nav\s*([1-6])\]\s*(.*)$/iu;

/** Fecho opcional no fim: `[/-nav N+true]` ou `[/-nav N+false]` (N deve coincidir com o abridor). */
const NAV_CLOSE_RE = /\s*\[\/-nav\s*([1-6])\s*\+\s*(true|false)\s*\]\s*$/iu;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function richTextPlain(block: NotionBlockNode): string {
  const parts = getRichTextArray(block);
  return parts.map((p) => (isObject(p) && typeof p.plain_text === "string" ? p.plain_text : "")).join("");
}

export type NotionHeadingAnchorMeta = {
  anchorId: string;
  displayLabel: string;
  /** `false` = só menu/âncora; corpo sem texto visível (“fantasma”). Omitido = `true`. */
  visibleBody?: boolean;
};

export type CaseSectionNavItemLite = { id: string; label: string };

export function parseNotionNavHeading(plain: string): { order: number; title: string; visible: boolean } | null {
  const m = plain.match(NAV_MARKER_RE);
  if (!m) return null;
  const order = Number.parseInt(m[1]!, 10);
  if (order < 1 || order > 6) return null;
  let rest = (m[2] ?? "").trimEnd();
  let visible = true;
  const closeMatch = rest.match(NAV_CLOSE_RE);
  if (closeMatch && typeof closeMatch.index === "number") {
    const closeOrder = Number.parseInt(closeMatch[1]!, 10);
    if (closeOrder === order) {
      visible = closeMatch[2]!.toLowerCase() === "true";
      rest = rest.slice(0, closeMatch.index).trimEnd();
    }
  }
  const title = rest.trim() || `Secção ${order}`;
  return { order, title, visible };
}

function slugifyAnchorBase(label: string, order: number): string {
  const raw = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return raw || `nav-${order}`;
}

function allocateSlugs(
  entries: { order: number; title: string; blockId: string; visible: boolean }[],
): { navItems: CaseSectionNavItemLite[]; headingAnchors: Record<string, NotionHeadingAnchorMeta> } {
  const slugCounts = new Map<string, number>();
  const navItems: CaseSectionNavItemLite[] = [];
  const headingAnchors: Record<string, NotionHeadingAnchorMeta> = {};

  for (const e of entries) {
    const base = slugifyAnchorBase(e.title, e.order);
    const n = (slugCounts.get(base) ?? 0) + 1;
    slugCounts.set(base, n);
    const anchorId = n === 1 ? base : `${base}-${n}`;
    const displayLabel = e.title;

    navItems.push({ id: anchorId, label: displayLabel });
    headingAnchors[e.blockId] = {
      anchorId,
      displayLabel,
      ...(e.visible ? {} : { visibleBody: false }),
    };
  }

  return { navItems, headingAnchors };
}

function collectNavAnchorCandidates(blocks: NotionBlockNode[] | undefined, out: NotionBlockNode[]) {
  if (!blocks?.length) return;
  for (const b of blocks) {
    if (NAV_ANCHOR_BLOCK_TYPES.has(b.type)) {
      const plain = richTextPlain(b);
      const parsed = parseNotionNavHeading(plain);
      if (parsed) {
        out.push(b);
      }
    }
    if (b.children?.length) collectNavAnchorCandidates(b.children, out);
  }
}

/**
 * Em profundidade-primeiro na árvore de blocos (ordem de leitura do Notion).
 * Ordena por número `[-nav N]`, depois pela ordem de aparição; no máximo 6 itens.
 */
export function collectNotionCaseSectionNav(blocks: NotionBlockNode[]): {
  navItems: CaseSectionNavItemLite[];
  headingAnchors: Record<string, NotionHeadingAnchorMeta>;
} {
  const candidates: NotionBlockNode[] = [];
  collectNavAnchorCandidates(blocks, candidates);

  const withMeta = candidates
    .map((b) => {
      const plain = richTextPlain(b);
      const parsed = parseNotionNavHeading(plain)!;
      return {
        blockId: b.id,
        order: parsed.order,
        title: parsed.title,
        visible: parsed.visible,
        index: 0,
      };
    })
    .map((x, index) => ({ ...x, index }));

  withMeta.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.index - b.index;
  });

  const top = withMeta.slice(0, 6);
  return allocateSlugs(top);
}

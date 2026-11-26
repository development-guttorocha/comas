import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { IMAGE_SIZES, readBlock, writeBlock, type BlockModel, type EmbedVariant, type ImageItem, type TextStyle } from "./caseBlocks";
import { mdToRich, richToMd, type RichTextPart } from "./richText";
import { readDivider } from "@/lib/caseDivider";
import { paragraphAlign, paragraphColor, paragraphSize } from "@/lib/caseParagraph";
import { cropFromText, cropToText } from "@/lib/mediaCrop";
import { SPACE_SIZES, type SpaceSize } from "@/lib/caseEmbedSpace";

const spaceOf = (v: string): "" | SpaceSize => ((SPACE_SIZES as readonly string[]).includes(v) ? (v as SpaceSize) : "");

/**
 * O corpo do case (blocos no formato que o site renderiza) ↔ o documento do editor (BlockNote).
 * Na volta, um bloco cujo conteúdo não mudou devolve o original intacto: abrir e salvar não muda nada.
 */
type Styles = { bold?: boolean; italic?: boolean; strike?: boolean; code?: boolean; underline?: boolean };
type StyledText = { type: "text"; text: string; styles: Styles };
type Link = { type: "link"; href: string; content: StyledText[] };
export type EditorInline = StyledText | Link;
export type EditorBlock = {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  content?: EditorInline[] | unknown;
  children?: EditorBlock[];
};

const STYLE_TO_TYPE: Record<string, TextStyle> = { paragraph: "paragraph", quote: "quote", bulletListItem: "bulleted_list_item", numberedListItem: "numbered_list_item" };
const TYPE_TO_STYLE: Partial<Record<TextStyle, string>> = { paragraph: "paragraph", quote: "quote", bulleted_list_item: "bulletListItem", numbered_list_item: "numberedListItem" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/* ---------- Inline text ---------- */

export function richToInline(parts: unknown): EditorInline[] {
  if (!Array.isArray(parts)) return [];
  const out: EditorInline[] = [];
  for (const p of parts) {
    if (!isRecord(p)) continue;
    const text = isRecord(p.text) && typeof p.text.content === "string" ? p.text.content : typeof p.plain_text === "string" ? p.plain_text : "";
    if (!text) continue;
    const a = isRecord(p.annotations) ? p.annotations : {};
    const styles: Styles = {};
    if (a.bold) styles.bold = true;
    if (a.italic) styles.italic = true;
    if (a.strikethrough) styles.strike = true;
    if (a.code) styles.code = true;
    if (a.underline) styles.underline = true;
    const styled: StyledText = { type: "text", text, styles };
    const href = isRecord(p.text) && isRecord(p.text.link) && typeof p.text.link.url === "string" ? p.text.link.url : null;
    const last = out.at(-1);
    if (href && last?.type === "link" && last.href === href) last.content.push(styled);
    else out.push(href ? { type: "link", href, content: [styled] } : styled);
  }
  return out;
}

function inlineToRich(content: unknown): RichTextPart[] {
  if (!Array.isArray(content)) return [];
  const part = (t: StyledText, href: string | null): RichTextPart => ({
    type: "text",
    text: { content: t.text, link: href ? { url: href } : null },
    annotations: { bold: !!t.styles?.bold, italic: !!t.styles?.italic, strikethrough: !!t.styles?.strike, underline: !!t.styles?.underline, code: !!t.styles?.code, color: "default" },
    plain_text: t.text,
    href,
  });
  return content.flatMap(item => {
    if (!isRecord(item)) return [];
    if (item.type === "link" && Array.isArray(item.content)) return (item.content as StyledText[]).map(t => part(t, String(item.href ?? "")));
    if (item.type === "text") return [part(item as StyledText, null)];
    return [];
  });
}

/* ---------- Blocks ---------- */

function modelToEditor(id: string, model: BlockModel): EditorBlock {
  switch (model.kind) {
    case "section": return { id, type: "section", props: { label: model.label, position: model.position, visible: model.visible } };
    case "component": return { id, type: "caseComponent", props: { name: model.name, data: JSON.stringify(model.props) } };
    case "text": {
      const content = richToInline(mdToRich(model.md));
      if (model.style.startsWith("heading")) return { id, type: "heading", props: { level: Number(model.style.slice(-1)) }, content };
      if (model.style === "paragraph" && model.look) return { id, type: "paragraph", props: { size: model.look.size, textAlignment: model.look.align || "left", color: model.look.color }, content };
      return { id, type: TYPE_TO_STYLE[model.style] ?? "paragraph", content };
    }
    case "spacer": return { id, type: "paragraph", content: [] };
    case "image": return { id, type: "image", props: { url: model.src, caption: model.caption, mobileUrl: model.mobileSrc, size: model.size, crop: model.crop, mobileCrop: model.mobileCrop, background: model.background, border: model.border, spaceTop: model.spaceTop, spaceBottom: model.spaceBottom } };
    case "images": return { id, type: "imageRow", props: { data: JSON.stringify(model.images) } };
    case "embed":
      return model.variant === "video"
        ? { id, type: "caseVideo", props: { url: model.url, caption: model.caption, poster: model.poster, mp4: model.mp4, player: model.player, size: model.size, crop: model.crop, border: model.border } }
        : { id, type: "embedLink", props: { variant: model.variant, url: model.url, caption: model.caption, poster: model.poster } };
    case "divider": return { id, type: "divider", props: { color: model.color, size: model.size, align: model.align, spaceTop: model.spaceTop, spaceBottom: model.spaceBottom } };
    case "raw": return { id, type: "rawBlock", props: { json: model.json } };
  }
}

/** The case body as the editor's initial document. */
export function bodyToEditor(body: NotionBlockNode[]): EditorBlock[] {
  return body.map(block => {
    const model = readBlock(block);
    // Text keeps its exact parts (links, styles) instead of a markdown round trip.
    if (model.kind === "text") {
      const editor = modelToEditor(block.id, model);
      return { ...editor, content: richToInline((block[block.type] as { rich_text?: unknown })?.rich_text) };
    }
    return modelToEditor(block.id, model);
  });
}

function editorToModel(block: EditorBlock): BlockModel | null {
  const props = block.props ?? {};
  const str = (key: string) => (typeof props[key] === "string" ? props[key] as string : "");
  switch (block.type) {
    case "section": return { kind: "section", position: Number(props.position) || 1, label: str("label"), visible: props.visible === true };
    case "caseComponent": {
      try { return { kind: "component", name: str("name"), props: JSON.parse(str("data") || "{}") }; } catch { return null; }
    }
    case "heading": case "paragraph": case "quote": case "bulletListItem": case "numberedListItem": {
      const rich = inlineToRich(block.content);
      if (block.type === "paragraph" && !rich.some(p => p.plain_text)) return { kind: "spacer" };
      const style = block.type === "heading" ? (`heading_${Math.min(3, Math.max(1, Number(props.level) || 1))}` as TextStyle) : STYLE_TO_TYPE[block.type]!;
      if (style !== "paragraph") return { kind: "text", style, md: richToMd(rich), lossy: false };
      const look = { size: paragraphSize(props.size), align: paragraphAlign(props.textAlignment), color: paragraphColor(props.color) };
      return { kind: "text", style, md: richToMd(rich), lossy: false, ...(look.size || look.align || look.color ? { look } : {}) };
    }
    case "image": return { kind: "image", src: str("url"), caption: str("caption"), mobileSrc: str("mobileUrl"), size: IMAGE_SIZES.find(s => s.value === str("size"))?.value ?? "", crop: cropToText(cropFromText(str("crop"))), mobileCrop: str("mobileUrl") ? cropToText(cropFromText(str("mobileCrop"))) : "", background: props.background !== false, border: props.border !== false, spaceTop: spaceOf(str("spaceTop")), spaceBottom: spaceOf(str("spaceBottom")) };
    case "imageRow": {
      try { return { kind: "images", images: (JSON.parse(str("data") || "[]") as ImageItem[]).map(i => ({ src: i.src ?? "", caption: i.caption ?? "", mobileSrc: i.mobileSrc ?? "" })) }; } catch { return null; }
    }
    case "caseVideo": return { kind: "embed", variant: "video", url: str("url"), caption: str("caption"), poster: str("poster"), mp4: str("mp4"), player: props.player === true, size: IMAGE_SIZES.find(s => s.value === str("size"))?.value ?? "", crop: cropToText(cropFromText(str("crop"))), border: props.border !== false };
    case "embedLink": return { kind: "embed", variant: (str("variant") || "embed") as EmbedVariant, url: str("url"), caption: str("caption"), poster: str("poster"), mp4: "", player: false, size: "", crop: "", border: true };
    case "divider": return { kind: "divider", ...readDivider({ case_color: str("color"), case_size: str("size"), case_align: str("align"), case_space_top: str("spaceTop"), case_space_bottom: str("spaceBottom") }) };
    case "rawBlock": return { kind: "raw", json: str("json") };
    default: return null;
  }
}

const comparable = (model: BlockModel) => JSON.stringify(model.kind === "text" ? { ...model, lossy: false } : model);

/** The editor's document back as the case body; untouched blocks return as they were. */
export function editorToBody(document: EditorBlock[], originals: Map<string, NotionBlockNode>): NotionBlockNode[] {
  // Nested blocks (indentation) are flattened: the site has no nesting for them.
  const flat = document.flatMap(function walk(block): EditorBlock[] { return [block, ...(block.children ?? []).flatMap(walk)]; });
  // The editor keeps an empty line at the end for typing; it is not content.
  while (flat.length && flat.at(-1)!.type === "paragraph" && !originals.has(flat.at(-1)!.id) && !inlineToRich(flat.at(-1)!.content).some(p => p.plain_text)) flat.pop();
  return flat.flatMap(block => {
    const model = editorToModel(block);
    const original = originals.get(block.id);
    if (!model) return original ? [original] : [];
    if (original && comparable(readBlock(original)) === comparable(model)) return [original];
    return [writeBlock(original ?? { id: block.id, type: "paragraph" }, model)];
  });
}

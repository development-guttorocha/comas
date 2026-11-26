import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { tryParseCaseEmbedParagraph } from "@/lib/notionCaseEmbedFromNotion";
import { COMPONENT_BY_NAME } from "./componentSchemas";
import { mdToRich, richIsLossy, richPlain, richToMd } from "./richText";
import { readDivider, writeDivider, type DividerStyle } from "@/lib/caseDivider";
import { cleanCrop, cropFromText, cropToText, readCrop } from "@/lib/mediaCrop";
import { SPACE_SIZES, type SpaceSize } from "@/lib/caseEmbedSpace";
import { readParagraphLook, writeParagraphLook, type ParagraphLook } from "@/lib/caseParagraph";

/**
 * O corpo do case continua no formato de blocos que o site renderiza; o admin lê cada bloco como
 * um modelo editável e o escreve de volta. Um bloco que não foi editado nunca é reescrito.
 */
export type TextStyle = "paragraph" | "heading_1" | "heading_2" | "heading_3" | "quote" | "bulleted_list_item" | "numbered_list_item";
/** `mobileSrc`: an optional version shown on phones (stored as `image.mobile_url`). */
export type ImageItem = { src: string; caption: string; mobileSrc: string };
/** How wide a single image sits on the page (stored as `image.case_size`); "" = the content width. */
export type ImageSize = "" | "bleed" | "w75" | "w50" | "w25" | "w15" | "w10" | "w5" | "narrow";
export const IMAGE_SIZES: { value: ImageSize; label: string }[] = [
  { value: "", label: "Largura do conteúdo" },
  { value: "bleed", label: "100% da tela" },
  { value: "w75", label: "75% da tela" },
  { value: "w50", label: "50% da tela" },
  { value: "w25", label: "25% da tela" },
  { value: "w15", label: "15% da tela" },
  { value: "w10", label: "10% da tela" },
  { value: "w5", label: "5% da tela" },
  { value: "narrow", label: "Coluna de texto" },
];
export type EmbedVariant = "embed" | "link_preview" | "video" | "bookmark";

export type BlockModel =
  | { kind: "section"; position: number; label: string; visible: boolean }
  | { kind: "component"; name: string; props: Record<string, unknown> }
  /** `look`: a paragraph's own size, alignment and colour (see lib/caseParagraph.ts). */
  | { kind: "text"; style: TextStyle; md: string; lossy: boolean; look?: ParagraphLook }
  /** `crop` / `mobileCrop`: the area shown, as text (see lib/mediaCrop.ts); "" = the whole file. */
  | { kind: "image"; src: string; caption: string; mobileSrc: string; size: ImageSize; crop: string; mobileCrop: string; background: boolean; border: boolean; spaceTop: "" | SpaceSize; spaceBottom: "" | SpaceSize }
  | { kind: "images"; images: ImageItem[] }
  /** `poster`: image shown until the reader starts it. Videos: `mp4` alternative, `player` = controls instead of a silent loop. */
  | { kind: "embed"; variant: EmbedVariant; url: string; caption: string; poster: string; mp4: string; player: boolean; size: ImageSize; crop: string; border: boolean }
  | ({ kind: "divider" } & DividerStyle)
  | { kind: "spacer" }
  | { kind: "raw"; json: string };

export const TEXT_STYLES: { value: TextStyle; label: string }[] = [
  { value: "paragraph", label: "Parágrafo" },
  { value: "heading_1", label: "Título 1" },
  { value: "heading_2", label: "Título 2" },
  { value: "heading_3", label: "Título 3" },
  { value: "quote", label: "Citação" },
  { value: "bulleted_list_item", label: "Item de lista" },
  { value: "numbered_list_item", label: "Item numerado" },
];
const TEXT_TYPES = new Set<string>(TEXT_STYLES.map(s => s.value));
const EMBED_TYPES = new Set<string>(["embed", "link_preview", "video", "bookmark"]);

const SECTION = /^\s*\[-nav\s*([1-6])\]\s*([\s\S]*?)\s*(?:\[\/-nav\s*\1\s*\+\s*(true|false)\s*\])?\s*$/i;
const COMPONENT = /^\s*\[case:\s*(\w+)\]\s*(\{[\s\S]*\})\s*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
const payload = (block: NotionBlockNode) => (isRecord(block[block.type]) ? block[block.type] as Record<string, unknown> : {});
const fileUrl = (value: Record<string, unknown>) => {
  const holder = value.type === "external" ? value.external : value.file;
  return isRecord(holder) && typeof holder.url === "string" ? holder.url : "";
};
const fileValue = (url: string) => /^https?:\/\//i.test(url) ? { type: "external", external: { url } } : { type: "file", file: { url } };

export function newBlockId() {
  return crypto.randomUUID();
}

function singleImage(block: NotionBlockNode): ImageItem | null {
  if (block.type !== "image") return null;
  const p = payload(block);
  return { src: fileUrl(p), caption: richToMd(p.caption), mobileSrc: typeof p.mobile_url === "string" ? p.mobile_url : "" };
}

export function readBlock(block: NotionBlockNode): BlockModel {
  const p = payload(block);
  if (block.type === "paragraph" || TEXT_TYPES.has(block.type)) {
    const plain = richPlain(p.rich_text);
    const section = SECTION.exec(plain);
    if (section) return { kind: "section", position: Number(section[1]), label: section[2]!.trim(), visible: section[3]?.toLowerCase() !== "false" };
    const component = COMPONENT.exec(plain);
    if (component) {
      try {
        const props = JSON.parse(component[2]!);
        if (isRecord(props)) return { kind: "component", name: component[1]!, props };
      } catch { /* malformed JSON stays editable as raw */ }
      return { kind: "raw", json: JSON.stringify(block, null, 2) };
    }
    if (block.type === "paragraph" && !plain.trim() && !block.children?.length) return { kind: "spacer" };
    if (!block.children?.length) {
      const look = block.type === "paragraph" ? readParagraphLook(p) : undefined;
      return { kind: "text", style: block.type as TextStyle, md: richToMd(p.rich_text), lossy: richIsLossy(p.rich_text), ...(look ? { look } : {}) };
    }
  }
  if (block.type === "image") {
    const image = singleImage(block)!;
    const size = IMAGE_SIZES.find(s => s.value && s.value === p.case_size)?.value ?? "";
    return image.src ? { kind: "image", ...image, size, crop: cropToText(readCrop(p.case_crop)), mobileCrop: cropToText(readCrop(p.case_crop_mobile)), background: p.case_background !== false, border: p.case_border !== false, spaceTop: imageSpace(p.case_space_top), spaceBottom: imageSpace(p.case_space_bottom) } : { kind: "raw", json: JSON.stringify(block, null, 2) };
  }
  if (block.type === "column_list") {
    const images = (block.children ?? []).map(column => column.type === "column" && column.children?.length === 1 ? singleImage(column.children[0]!) : null);
    if (images.length > 0 && images.every(Boolean)) return { kind: "images", images: images as ImageItem[] };
  }
  if (EMBED_TYPES.has(block.type)) {
    const url = block.type === "video" ? fileUrl(p) : typeof p.url === "string" ? p.url : "";
    const text = (key: string) => (typeof p[key] === "string" ? p[key] as string : "");
    const size = block.type === "video" ? IMAGE_SIZES.find(s => s.value && s.value === p.case_size)?.value ?? "" : "";
    return { kind: "embed", variant: block.type as EmbedVariant, url, caption: richToMd(p.caption), poster: text("poster"), mp4: text("mp4_url"), player: p.player === true, size, crop: block.type === "video" ? cropToText(readCrop(p.case_crop)) : "", border: p.case_border !== false };
  }
  if (block.type === "divider") return { kind: "divider", ...readDivider(p) };
  return { kind: "raw", json: JSON.stringify(block, null, 2) };
}

const textBlock = (id: string, type: string, md: string, look?: ParagraphLook): NotionBlockNode => ({ id, type, has_children: false, [type]: { rich_text: mdToRich(md), color: "default", ...(type === "paragraph" ? writeParagraphLook(look) : {}) } });
/** Markers and component JSON are literal text, never markdown. */
const literalBlock = (id: string, type: string, content: string): NotionBlockNode => ({
  id, type, has_children: false,
  [type]: { rich_text: [{ type: "text", text: { content, link: null }, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default" }, plain_text: content, href: null }], color: "default" },
});

const imageSpace = (v: unknown): "" | SpaceSize => (typeof v === "string" && (SPACE_SIZES as readonly string[]).includes(v) ? (v as SpaceSize) : "");

const cropValue = (key: string, text: string) => {
  const crop = cropFromText(text);
  return crop ? { [key]: cleanCrop(crop) } : {};
};

/** `background` / `border`: on unless turned off, so only `false` is written; `space`: room above and below. */
function imageBlock(id: string, item: ImageItem, size: ImageSize = "", crop = "", mobileCrop = "", background = true, border = true, space: { top?: string; bottom?: string } = {}): NotionBlockNode {
  return { id, type: "image", has_children: false, image: { caption: mdToRich(item.caption), ...fileValue(item.src), ...(item.mobileSrc ? { mobile_url: item.mobileSrc } : {}), ...(size ? { case_size: size } : {}), ...cropValue("case_crop", crop), ...(item.mobileSrc ? cropValue("case_crop_mobile", mobileCrop) : {}), ...(background ? {} : { case_background: false }), ...(border ? {} : { case_border: false }), ...(space.top ? { case_space_top: space.top } : {}), ...(space.bottom ? { case_space_bottom: space.bottom } : {}) } };
}

/** Writes a model into a block, keeping its id (and, for a row of images, the ids of its parts). */
export function writeBlock(block: NotionBlockNode, model: BlockModel): NotionBlockNode {
  const id = block.id;
  switch (model.kind) {
    case "section":
      return literalBlock(id, TEXT_TYPES.has(block.type) ? block.type : "paragraph", `[-nav ${model.position}] ${model.label.trim()} [/-nav ${model.position}+${model.visible}]`);
    case "component":
      return literalBlock(id, "paragraph", `[case:${model.name}] ${JSON.stringify(model.props)}`);
    case "text":
      return textBlock(id, model.style, model.md, model.look);
    case "image":
      return imageBlock(id, model, model.size, model.crop, model.mobileCrop, model.background, model.border, { top: model.spaceTop, bottom: model.spaceBottom });
    case "images": {
      const columns = block.type === "column_list" ? block.children ?? [] : [];
      return {
        id, type: "column_list", has_children: true, column_list: {},
        children: model.images.map((item, i) => {
          const column = columns[i];
          return { id: column?.id ?? newBlockId(), type: "column", has_children: true, column: {}, children: [imageBlock(column?.children?.[0]?.id ?? newBlockId(), item)] };
        }),
      };
    }
    case "embed": {
      const caption = mdToRich(model.caption);
      const poster = model.poster ? { poster: model.poster } : {};
      if (model.variant === "video") return { id, type: "video", has_children: false, video: { caption, ...fileValue(model.url), ...poster, ...(model.mp4 ? { mp4_url: model.mp4 } : {}), ...(model.player ? { player: true } : {}), ...(model.size ? { case_size: model.size } : {}), ...cropValue("case_crop", model.crop), ...(model.border ? {} : { case_border: false }) } };
      if (model.variant === "link_preview") return { id, type: "link_preview", has_children: false, link_preview: { url: model.url, ...poster } };
      return { id, type: model.variant, has_children: false, [model.variant]: { caption, url: model.url, ...poster } };
    }
    case "divider":
      return { id, type: "divider", has_children: false, divider: writeDivider(model) };
    case "spacer":
      return textBlock(id, "paragraph", "");
    case "raw": {
      const parsed = JSON.parse(model.json) as NotionBlockNode;
      if (!isRecord(parsed) || typeof parsed.type !== "string") throw new Error("O bloco precisa ter um tipo.");
      return { ...parsed, id };
    }
  }
}

export function createBlock(model: BlockModel): NotionBlockNode {
  return writeBlock({ id: newBlockId(), type: "paragraph" }, model);
}

/** Whether a component's props reach the site: the same parser the page uses must accept them. */
export function componentRenders(model: Extract<BlockModel, { kind: "component" }>) {
  return tryParseCaseEmbedParagraph(`[case:${model.name}] ${JSON.stringify(model.props)}`) !== null;
}

export function blockLabel(model: BlockModel): string {
  switch (model.kind) {
    case "section": return "Seção";
    case "component": return COMPONENT_BY_NAME.get(model.name)?.label ?? model.name;
    case "text": return TEXT_STYLES.find(s => s.value === model.style)?.label ?? "Texto";
    case "image": return "Imagem";
    case "images": return "Imagens lado a lado";
    case "embed": return model.variant === "video" ? "Vídeo" : model.variant === "link_preview" ? "Protótipo (Figma)" : "Incorporação";
    case "divider": return "Divisor";
    case "spacer": return "Espaço";
    case "raw": return "Bloco avançado";
  }
}

export function blockSummary(model: BlockModel): string {
  switch (model.kind) {
    case "section": return model.label;
    case "component": return COMPONENT_BY_NAME.get(model.name)?.summary(model.props) ?? "";
    case "text": return model.md.replace(/\\(.)/g, "$1").replace(/\*\*|__|~~|`/g, "");
    case "image": return model.caption || model.src.split("/").pop() || "";
    case "images": return `${model.images.length} imagens`;
    case "embed": return model.url;
    case "raw": {
      try { return (JSON.parse(model.json) as { type?: string }).type ?? ""; } catch { return ""; }
    }
    default: return "";
  }
}

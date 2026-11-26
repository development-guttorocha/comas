"use client";

import "@blocknote/ariakit/style.css";
import "./blocknote-theme.css";
import { BlockNoteView } from "@blocknote/ariakit";
import { BlockNoteSchema, defaultBlockSpecs, defaultStyleSpecs, insertOrUpdateBlockForSlashMenu, type PartialBlock } from "@blocknote/core";
import { FilePanelExtension } from "@blocknote/core/extensions";
import { pt } from "@blocknote/core/locales";
import {
  BasicTextStyleButton, BlockTypeSelect, CreateLinkButton, FileCaptionButton, FileDeleteButton, FilePanelController,
  FormattingToolbar, FormattingToolbarController, SuggestionMenuController, TextAlignButton, getDefaultReactSlashMenuItems, useBlockNoteEditor, useComponentsContext, useCreateBlockNote, useExtension, usePortalElement, useSelectedBlocks,
  type FilePanelProps,
} from "@blocknote/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { IMAGE_SIZES } from "@/lib/admin/caseBlocks";
import { SPACE_OPTIONS } from "@/lib/caseEmbedSpace";
import { PARAGRAPH_COLORS, PARAGRAPH_SIZES } from "@/lib/caseParagraph";
import { COMPONENTS } from "@/lib/admin/componentSchemas";
import { bodyToEditor, editorToBody, type EditorBlock } from "@/lib/admin/editorConvert";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { api } from "../client";
import { ComponentBlock, DividerBlock, EmbedBlock, ImageRowBlock, RawBlock, SectionBlock, VideoBlock } from "./blocks";
import { useCropper } from "../CropDialog";
import { useMediaPicker } from "../MediaPicker";
import InsertMenu, { CATEGORIES, type InsertCategory, type InsertItem } from "./InsertMenu";
import styles from "./editor.module.css";

// The editor's own image, plus the version shown on phones (written as `image.mobile_url`)
// how wide it sits on the page (`image.case_size`) and whether it keeps its card background and border.
const imageSpec = defaultBlockSpecs.image;
const caseImage = {
  ...imageSpec,
  config: { ...imageSpec.config, propSchema: { ...imageSpec.config.propSchema, mobileUrl: { default: "" }, size: { default: "" }, crop: { default: "" }, mobileCrop: { default: "" }, background: { default: true }, border: { default: true }, spaceTop: { default: "" }, spaceBottom: { default: "" } } },
} as unknown as typeof imageSpec;

// A paragraph's own font size and colour (`case_size`, `case_color`); alignment is the editor's own.
const paragraphSpec = defaultBlockSpecs.paragraph;
const caseParagraph = {
  ...paragraphSpec,
  config: { ...paragraphSpec.config, propSchema: { ...paragraphSpec.config.propSchema, size: { default: "" }, color: { default: "" } } },
} as unknown as typeof paragraphSpec;

/** Only what the site renders: no colours, underline, tables or toggles. */
const schema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: caseParagraph,
    heading: defaultBlockSpecs.heading,
    quote: defaultBlockSpecs.quote,
    bulletListItem: defaultBlockSpecs.bulletListItem,
    numberedListItem: defaultBlockSpecs.numberedListItem,
    image: caseImage,
    caseVideo: VideoBlock(),
    divider: DividerBlock(),
    section: SectionBlock(),
    caseComponent: ComponentBlock(),
    imageRow: ImageRowBlock(),
    embedLink: EmbedBlock(),
    rawBlock: RawBlock(),
  },
  styleSpecs: { bold: defaultStyleSpecs.bold, italic: defaultStyleSpecs.italic, strike: defaultStyleSpecs.strike, code: defaultStyleSpecs.code },
});
type Editor = typeof schema.BlockNoteEditor;

// The editor's own blocks, in the category they belong to; the menu marks them "editor".
const DEFAULT_ITEMS: Record<string, InsertCategory> = {
  paragraph: "texto", heading: "texto", heading_2: "texto", heading_3: "texto", quote: "texto", bullet_list: "texto", numbered_list: "texto", divider: "estrutura", image: "midia",
};
const COMPONENT_CATEGORY: Record<string, InsertCategory> = {
  CaseSectionSplit: "texto", CaseEditorialParagraph: "texto",
  CaseChapter: "estrutura", CaseStatement: "estrutura", CaseTitleBox: "estrutura", CaseLightPanel: "estrutura",
  CaseBigNumber: "destaques", CaseStatBand: "destaques", CaseChart: "destaques", CasePanel: "destaques", CaseIconRatio: "destaques", CaseIconStats: "destaques", CasePullQuote: "destaques", CaseResultsQuote: "destaques",
  CaseTimeline: "conteudo", CaseComparison: "conteudo", CaseFlowDiagram: "conteudo", CaseFlow: "conteudo", CaseBento: "conteudo", CaseApproachCards: "conteudo", CaseBeforeAfter: "conteudo", CaseResultsJourney: "conteudo", CaseThanksCards: "conteudo",
  CaseScreens: "midia", CaseImageCompare: "midia", CaseImageStack: "midia", CaseMediaFigure: "midia", CaseMediaFullWidth: "midia", CaseSectionMedia: "midia", CaseMediaEmbed: "midia",
};

function slashItems(editor: Editor): InsertItem[] {
  const insert = (block: PartialBlock<typeof schema.blockSchema>) => () => insertOrUpdateBlockForSlashMenu(editor, block);
  const defaults: InsertItem[] = getDefaultReactSlashMenuItems(editor).flatMap(item => {
    const key = (item as { key?: string }).key ?? "";
    return DEFAULT_ITEMS[key] ? [{ ...item, key, category: DEFAULT_ITEMS[key], editor: true }] : [];
  });
  const items: InsertItem[] = [
    { key: "section", title: "Seção", subtext: "Um item do índice lateral", aliases: ["secao", "indice", "nav"], category: "estrutura", onItemClick: insert({ type: "section", props: { label: "Nova seção" } }) },
    ...COMPONENTS.map(def => ({
      key: def.name, title: def.label, subtext: def.description, aliases: [def.name.toLowerCase(), "componente"], category: COMPONENT_CATEGORY[def.name] ?? "conteudo",
      onItemClick: insert({ type: "caseComponent", props: { name: def.name, data: JSON.stringify(def.defaults) } }),
    })),
    { key: "imageRow", title: "Imagens lado a lado", subtext: "Duas a quatro imagens em colunas", aliases: ["colunas", "galeria", "imagens"], category: "midia", onItemClick: insert({ type: "imageRow" }) },
    { key: "caseVideo", title: "Vídeo", subtext: "Em loop como GIF, ou com player", aliases: ["video", "gif", "mp4", "webm"], category: "midia", onItemClick: insert({ type: "caseVideo" }) },
    { key: "embedLink", title: "Incorporação", subtext: "Site ou protótipo do Figma", aliases: ["embed", "figma", "iframe", "link"], category: "midia", onItemClick: insert({ type: "embedLink" }) },
    ...defaults,
  ];
  // In category order; within one, the case's blocks before the editor's.
  return CATEGORIES.flatMap(({ id }) => items.filter(item => item.category === id));
}

// "/numeros" finds "Números": typing without accents is how most people search.
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function filterItems(items: InsertItem[], query: string) {
  const q = fold(query.trim());
  return q ? items.filter(item => [item.title, item.subtext ?? "", ...(item.aliases ?? [])].some(text => fold(text).includes(q))) : items;
}

/** On a selected image: choose (or remove) the version shown on phones. */
function MobileImageButton() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const pick = useMediaPicker();
  const block = useSelectedBlocks(editor).find(b => b.type === "image");
  if (!block) return null;
  const current = String((block.props as { mobileUrl?: string }).mobileUrl ?? "");
  return (
    <Components.FormattingToolbar.Button mainTooltip={current ? "Trocar ou remover a versão para celular" : "Adicionar uma versão para celular"} isSelected={!!current}
      onClick={async () => { const url = await pick(current); if (url !== null && url !== current) editor.updateBlock(block, { props: { mobileUrl: url, mobileCrop: "" } } as never); }}>
      {current ? "Mobile ✓" : "Mobile"}
    </Components.FormattingToolbar.Button>
  );
}

/**
 * "Adicionar imagem" opens the admin's media library (upload or pick from the case's files)
 * in place of the editor's own panel, which has no upload of its own here.
 */
function ImagePanel({ blockId }: FilePanelProps) {
  const editor = useBlockNoteEditor();
  const pick = useMediaPicker();
  const panel = useExtension(FilePanelExtension);
  const opened = useRef("");
  useEffect(() => {
    if (opened.current === blockId) return;
    opened.current = blockId;
    const block = editor.getBlock(blockId);
    void pick(String((block?.props as { url?: string } | undefined)?.url ?? "")).then(url => {
      opened.current = "";
      panel.closeMenu();
      if (url !== null && editor.getBlock(blockId)) editor.updateBlock(blockId, { props: { url } } as never);
    });
  }, [blockId, editor, panel, pick]);
  return null;
}

/** On a selected image: swap the file through the same media library. */
function ImageReplaceButton() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const pick = useMediaPicker();
  const block = useSelectedBlocks(editor).find(b => b.type === "image");
  if (!block) return null;
  const current = String((block.props as { url?: string }).url ?? "");
  return (
    <Components.FormattingToolbar.Button mainTooltip="Trocar imagem"
      onClick={async () => { const url = await pick(current); if (url && url !== current) editor.updateBlock(block, { props: { url, crop: "" } } as never); }}>
      Trocar
    </Components.FormattingToolbar.Button>
  );
}

/** On a selected image: the area shown, and the phone version's own when there is one. */
function ImageCropButtons() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const crop = useCropper();
  const block = useSelectedBlocks(editor).find(b => b.type === "image");
  if (!block) return null;
  const props = block.props as { url?: string; mobileUrl?: string; crop?: string; mobileCrop?: string };
  if (!props.url) return null;
  const button = (key: "crop" | "mobileCrop", src: string, label: string) => (
    <Components.FormattingToolbar.Button key={key} mainTooltip={props[key] ? "Ajustar ou remover o recorte" : "Mostrar só uma parte do arquivo"} isSelected={!!props[key]}
      onClick={async () => { const next = await crop(src, props[key] ?? ""); if (next !== null) editor.updateBlock(block, { props: { [key]: next } } as never); }}>
      {props[key] ? `${label} ✓` : label}
    </Components.FormattingToolbar.Button>
  );
  return <>{button("crop", props.url, "Recortar")}{props.mobileUrl ? button("mobileCrop", props.mobileUrl, "Recortar mobile") : null}</>;
}

/** On a selected image: whether it sits on the card background and keeps its thin border. */
function ImageFrameButtons() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const block = useSelectedBlocks(editor).find(b => b.type === "image");
  if (!block) return null;
  const props = block.props as { background?: boolean; border?: boolean };
  const button = (key: "background" | "border", label: string, on: string, off: string) => {
    const value = props[key] !== false;
    return (
      <Components.FormattingToolbar.Button key={key} mainTooltip={value ? on : off} isSelected={value}
        onClick={() => editor.updateBlock(block, { props: { [key]: !value } } as never)}>
        {label}
      </Components.FormattingToolbar.Button>
    );
  };
  return <>{button("background", "Fundo", "Tirar o fundo atrás da imagem", "Pôr o fundo atrás da imagem")}{button("border", "Borda", "Tirar a borda", "Pôr a borda")}</>;
}

/** On a selected image: the room above and below it; "Padrão" keeps the page's own. */
function ImageSpaceSelects() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const portalElement = usePortalElement();
  const block = useSelectedBlocks(editor).find(b => b.type === "image");
  if (!block) return null;
  const props = block.props as { spaceTop?: string; spaceBottom?: string };
  const select = (key: "spaceTop" | "spaceBottom", arrow: string) => (
    <Components.FormattingToolbar.Select key={key} portalElement={portalElement} items={SPACE_OPTIONS.map(o => ({
      text: `${arrow} ${o.label}`, icon: null, isSelected: o.value === (props[key] ?? ""),
      onClick: () => editor.updateBlock(block, { props: { [key]: o.value } } as never),
    }))} />
  );
  return <>{select("spaceTop", "↑")}{select("spaceBottom", "↓")}</>;
}

/** On a selected image: how wide it sits on the page. */
function ImageSizeSelect() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const portalElement = usePortalElement();
  const block = useSelectedBlocks(editor).find(b => b.type === "image");
  if (!block) return null;
  const current = String((block.props as { size?: string }).size ?? "");
  return (
    <Components.FormattingToolbar.Select portalElement={portalElement} items={IMAGE_SIZES.map(size => ({
      text: size.label, icon: null, isSelected: size.value === current,
      onClick: () => editor.updateBlock(block, { props: { size: size.value } } as never),
    }))} />
  );
}

/** On a selected paragraph: its font size. */
function ParagraphSizeSelect() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const portalElement = usePortalElement();
  const block = useSelectedBlocks(editor).find(b => b.type === "paragraph");
  if (!block) return null;
  const current = String((block.props as { size?: string }).size ?? "");
  return (
    <Components.FormattingToolbar.Select portalElement={portalElement} items={PARAGRAPH_SIZES.map(size => ({
      text: size.label, icon: null, isSelected: size.value === current,
      onClick: () => editor.updateBlock(block, { props: { size: size.value } } as never),
    }))} />
  );
}

/** On a selected paragraph: its colour, named or any other through the picker. */
function ParagraphColorSelect() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const portalElement = usePortalElement();
  const block = useSelectedBlocks(editor).find(b => b.type === "paragraph");
  if (!block) return null;
  const color = String((block.props as { color?: string }).color ?? "");
  const custom = color.startsWith("#");
  const set = (value: string) => editor.updateBlock(block, { props: { color: value } } as never);
  return <>
    <Components.FormattingToolbar.Select portalElement={portalElement} items={PARAGRAPH_COLORS.map(o => ({
      text: o.label, icon: null, isSelected: o.value === (custom ? "custom" : color),
      onClick: () => set(o.value === "custom" ? (custom ? color : "#ffffff") : o.value),
    }))} />
    {custom ? <input type="color" className={styles.paragraphPicker} value={color.length === 7 ? color : "#ffffff"} onChange={e => set(e.target.value)} aria-label="Cor personalizada" /> : null}
  </>;
}

/** Custom colours have no class: one rule per colour in use (the editor's own DOM is left alone). */
function customColorRules(blocks: EditorBlock[]) {
  const colors = new Set(blocks.flatMap(function walk(b): string[] {
    const color = b.type === "paragraph" ? String(b.props?.color ?? "") : "";
    return [...(/^#[0-9a-f]{3,8}$/i.test(color) ? [color] : []), ...(b.children ?? []).flatMap(walk)];
  }));
  return [...colors].map(c => `.bn-block-content[data-content-type="paragraph"][data-color="${c}"] { color: ${c}; }`).join("\n");
}

/**
 * O corpo do case como um documento: escreva em texto corrido e use "/" para inserir títulos,
 * imagens e os componentes do case. Cada mudança volta para o formato do site.
 */
export default function DocumentEditor({ slug, body, onChange, brandColor, mediaFolder = "cases" }: { slug: string; body: NotionBlockNode[]; onChange: (body: NotionBlockNode[]) => void; brandColor?: string; mediaFolder?: "cases" | "articles" }) {
  const originals = useRef(new Map(body.map(block => [block.id, block])));
  const initialContent = useMemo(() => {
    const doc = bodyToEditor(body) as PartialBlock<typeof schema.blockSchema>[];
    return doc.length ? doc : undefined;
    // The editor owns the document after it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editor = useCreateBlockNote({
    schema,
    initialContent,
    dictionary: {
      ...pt,
      placeholders: { ...pt.placeholders, default: "Escreva, ou digite \"/\" para inserir um bloco" },
    },
    uploadFile: async (file: File) => {
      const form = new FormData();
      form.set("slug", slug);
      form.set("folder", mediaFolder);
      form.set("file", file);
      return (await api<{ file: { url: string } }>("/api/admin/media", { method: "POST", body: form })).file.url;
    },
  });

  const [colorRules, setColorRules] = useState(() => customColorRules(editor.document as unknown as EditorBlock[]));

  return (
    <div className={styles.doc} style={brandColor ? { ["--case-brand" as string]: brandColor } : undefined}>
      {colorRules ? <style>{colorRules}</style> : null}
      <BlockNoteView
        editor={editor}
        theme="dark"
        slashMenu={false}
        formattingToolbar={false}
        filePanel={false}
        onChange={() => {
          const doc = editor.document as unknown as EditorBlock[];
          onChange(editorToBody(doc, originals.current));
          setColorRules(customColorRules(doc));
        }}
      >
        <SuggestionMenuController<(query: string) => Promise<InsertItem[]>> triggerCharacter="/" getItems={async query => filterItems(slashItems(editor), query)} suggestionMenuComponent={InsertMenu} />
        <FilePanelController filePanel={ImagePanel} />
        <FormattingToolbarController formattingToolbar={() => (
          <FormattingToolbar>
            <BlockTypeSelect key="type" />
            <ParagraphSizeSelect key="pSize" />
            <TextAlignButton textAlignment="left" key="alignLeft" />
            <TextAlignButton textAlignment="center" key="alignCenter" />
            <TextAlignButton textAlignment="right" key="alignRight" />
            <ParagraphColorSelect key="pColor" />
            <FileCaptionButton key="caption" />
            <MobileImageButton key="mobile" />
            <ImageSizeSelect key="size" />
            <ImageCropButtons key="crop" />
            <ImageFrameButtons key="frame" />
            <ImageSpaceSelects key="space" />
            <ImageReplaceButton key="replace" />
            <FileDeleteButton key="delete" />
            <BasicTextStyleButton basicTextStyle="bold" key="bold" />
            <BasicTextStyleButton basicTextStyle="italic" key="italic" />
            <BasicTextStyleButton basicTextStyle="strike" key="strike" />
            <BasicTextStyleButton basicTextStyle="code" key="code" />
            <CreateLinkButton key="link" />
          </FormattingToolbar>
        )} />
      </BlockNoteView>
    </div>
  );
}

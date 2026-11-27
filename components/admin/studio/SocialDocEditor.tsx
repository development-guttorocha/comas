"use client";

import "@blocknote/ariakit/style.css";
import "../editor/blocknote-theme.css";
import { BlockNoteView } from "@blocknote/ariakit";
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultStyleSpecs,
  insertOrUpdateBlockForSlashMenu,
  type PartialBlock,
} from "@blocknote/core";
import { FilePanelExtension } from "@blocknote/core/extensions";
import { pt } from "@blocknote/core/locales";
import {
  BasicTextStyleButton,
  BlockTypeSelect,
  CreateLinkButton,
  FileCaptionButton,
  FileDeleteButton,
  FilePanelController,
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  TextAlignButton,
  useBlockNoteEditor,
  useComponentsContext,
  useCreateBlockNote,
  useExtension,
  useSelectedBlocks,
  type FilePanelProps,
} from "@blocknote/react";
import { useEffect, useMemo, useRef } from "react";
import { COMPONENTS } from "@/lib/admin/componentSchemas";
import type { StudioBlockJson } from "@/lib/social/studioTypes";
import { api } from "../client";
import { useCropper } from "../CropDialog";
import { ComponentBlock, DividerBlock, ImageRowBlock } from "../editor/blocks";
import InsertMenu, { CATEGORIES, type InsertCategory, type InsertItem } from "../editor/InsertMenu";
import { useMediaPicker } from "../MediaPicker";
import {
  SlideBreakBlock,
  SocialBeforeAfterBlock,
  SocialChecklistBlock,
  SocialCoverBlock,
  SocialCtaBlock,
  SocialImageBlock,
  SocialQuoteBlock,
  SocialStepBlock,
} from "./socialBlocks";
import editorStyles from "../editor/editor.module.css";

const imageSpec = defaultBlockSpecs.image;
const studioImage = {
  ...imageSpec,
  config: {
    ...imageSpec.config,
    propSchema: {
      ...imageSpec.config.propSchema,
      crop: { default: "" },
    },
  },
} as unknown as typeof imageSpec;

const schema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    heading: defaultBlockSpecs.heading,
    quote: defaultBlockSpecs.quote,
    bulletListItem: defaultBlockSpecs.bulletListItem,
    numberedListItem: defaultBlockSpecs.numberedListItem,
    image: studioImage,
    imageRow: ImageRowBlock(),
    divider: DividerBlock(),
    caseComponent: ComponentBlock(),
    socialCover: SocialCoverBlock(),
    socialBeforeAfter: SocialBeforeAfterBlock(),
    socialStep: SocialStepBlock(),
    socialChecklist: SocialChecklistBlock(),
    socialQuote: SocialQuoteBlock(),
    socialImage: SocialImageBlock(),
    socialCta: SocialCtaBlock(),
    slideBreak: SlideBreakBlock(),
  },
  styleSpecs: {
    bold: defaultStyleSpecs.bold,
    italic: defaultStyleSpecs.italic,
    strike: defaultStyleSpecs.strike,
    code: defaultStyleSpecs.code,
  },
});

type Editor = typeof schema.BlockNoteEditor;

const DEFAULT_ITEMS: Record<string, InsertCategory> = {
  paragraph: "texto",
  heading: "texto",
  heading_2: "texto",
  heading_3: "texto",
  quote: "texto",
  bullet_list: "texto",
  numbered_list: "texto",
  image: "midia",
};

/** Reusable components from the admin editor curated for editorial/social storytelling. */
const STUDIO_COMPONENT_CATEGORY: Record<string, InsertCategory> = {
  CaseStatement: "estrutura",
  CaseLightPanel: "estrutura",
  CaseBigNumber: "destaques",
  CaseStatBand: "destaques",
  CasePullQuote: "destaques",
  CaseResultsQuote: "destaques",
  CaseChart: "destaques",
  CaseBeforeAfter: "conteudo",
  CaseComparison: "conteudo",
  CaseApproachCards: "conteudo",
  CaseTimeline: "conteudo",
  CaseFlowDiagram: "conteudo",
};

function slashItems(editor: Editor): InsertItem[] {
  const insert = (block: PartialBlock<typeof schema.blockSchema>) => () =>
    insertOrUpdateBlockForSlashMenu(editor, block);

  const custom: InsertItem[] = [
    {
      key: "socialCover",
      title: "Capa do Post",
      subtext: "Slide de abertura com título grande e gancho",
      aliases: ["capa", "cover", "abertura", "titulo"],
      category: "estrutura",
      onItemClick: insert({ type: "socialCover" }),
    },
    {
      key: "slideBreak",
      title: "Quebra de Slide",
      subtext: "Separa texto livre em um novo slide",
      aliases: ["slide", "quebra", "separador", "novo"],
      category: "estrutura",
      onItemClick: insert({ type: "slideBreak" }),
    },
    {
      key: "divider",
      title: "Divisor",
      subtext: "Linha divisória que inicia um novo slide",
      aliases: ["divisor", "linha", "hr"],
      category: "estrutura",
      onItemClick: insert({ type: "divider" }),
    },
    {
      key: "socialCta",
      title: "CTA Final",
      subtext: "Encerramento convidando a salvar e comentar",
      aliases: ["cta", "final", "chamada", "encerramento"],
      category: "estrutura",
      onItemClick: insert({ type: "socialCta" }),
    },
    {
      key: "socialBeforeAfter",
      title: "Verbete / Antes × Depois",
      subtext: "Erro real (❌) comparado com a forma adequada (✔️)",
      aliases: ["antes", "depois", "verbete", "erro", "correcao"],
      category: "destaques",
      onItemClick: insert({ type: "socialBeforeAfter" }),
    },
    {
      key: "socialQuote",
      title: "Nota / Citação",
      subtext: "Reflexão editorial ou frase de repertório",
      aliases: ["nota", "citacao", "quote", "caderno"],
      category: "destaques",
      onItemClick: insert({ type: "socialQuote" }),
    },
    {
      key: "socialStep",
      title: "Passo / Ciclo",
      subtext: "Slide numerado (01, 02…) com dica prática",
      aliases: ["passo", "ciclo", "etapa", "step"],
      category: "conteudo",
      onItemClick: insert({ type: "socialStep" }),
    },
    {
      key: "socialChecklist",
      title: "Checklist de Revisão",
      subtext: "Lista de pontos práticos com ícone de check",
      aliases: ["checklist", "lista", "revisao", "check"],
      category: "conteudo",
      onItemClick: insert({ type: "socialChecklist" }),
    },
    {
      key: "socialImage",
      title: "Slide com Imagem",
      subtext: "Foto da Mídia ou arte gerada com IA (MuAPI)",
      aliases: ["imagem", "foto", "muapi", "ia", "ilustracao"],
      category: "midia",
      onItemClick: insert({ type: "socialImage" }),
    },
    {
      key: "imageRow",
      title: "Imagens lado a lado",
      subtext: "Duas a quatro imagens da biblioteca de Mídia",
      aliases: ["colunas", "galeria", "imagens"],
      category: "midia",
      onItemClick: insert({ type: "imageRow" }),
    },
    ...COMPONENTS.filter(def => def.name in STUDIO_COMPONENT_CATEGORY).map(def => ({
      key: def.name,
      title: def.label,
      subtext: def.description,
      aliases: [def.name.toLowerCase(), "componente"],
      category: STUDIO_COMPONENT_CATEGORY[def.name]!,
      onItemClick: insert({ type: "caseComponent", props: { name: def.name, data: JSON.stringify(def.defaults) } }),
    })),
  ];

  const defaults: InsertItem[] = getDefaultReactSlashMenuItems(editor).flatMap(item => {
    const key = (item as { key?: string }).key ?? "";
    return DEFAULT_ITEMS[key] ? [{ ...item, key, category: DEFAULT_ITEMS[key], editor: true }] : [];
  });

  const all = [...custom, ...defaults];
  return CATEGORIES.flatMap(({ id }) => all.filter(item => item.category === id));
}

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function filterItems(items: InsertItem[], query: string) {
  const q = fold(query.trim());
  return q
    ? items.filter(item => [item.title, item.subtext ?? "", ...(item.aliases ?? [])].some(t => fold(t).includes(q)))
    : items;
}

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

function ImageReplaceButton() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const pick = useMediaPicker();
  const block = useSelectedBlocks(editor).find(b => b.type === "image");
  if (!block) return null;
  const current = String((block.props as { url?: string }).url ?? "");
  return (
    <Components.FormattingToolbar.Button
      mainTooltip="Trocar imagem da biblioteca de Mídia"
      onClick={async () => {
        const url = await pick(current);
        if (url && url !== current) editor.updateBlock(block, { props: { url, crop: "" } } as never);
      }}
    >
      Trocar
    </Components.FormattingToolbar.Button>
  );
}

function ImageCropButton() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const crop = useCropper();
  const block = useSelectedBlocks(editor).find(b => b.type === "image");
  if (!block) return null;
  const props = block.props as { url?: string; crop?: string };
  if (!props.url) return null;
  return (
    <Components.FormattingToolbar.Button
      mainTooltip={props.crop ? "Ajustar ou remover recorte" : "Recortar imagem"}
      isSelected={!!props.crop}
      onClick={async () => {
        const next = await crop(props.url!, props.crop ?? "");
        if (next !== null) editor.updateBlock(block, { props: { crop: next } } as never);
      }}
    >
      {props.crop ? "Recortar ✓" : "Recortar"}
    </Components.FormattingToolbar.Button>
  );
}

export default function SocialDocEditor({
  slug = "estudio",
  brandColor,
  initialBlocks,
  onChange,
}: {
  slug?: string;
  brandColor?: string;
  initialBlocks: StudioBlockJson[];
  onChange: (blocks: StudioBlockJson[]) => void;
}) {
  const initialContent = useMemo(() => {
    return (initialBlocks.length ? initialBlocks : [{ type: "paragraph" }]) as PartialBlock<typeof schema.blockSchema>[];
    // Editor owns state after mount (remount via `key` when AI or canvas sync replaces document)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editor = useCreateBlockNote({
    schema,
    initialContent,
    dictionary: {
      ...pt,
      placeholders: {
        ...pt.placeholders,
        default: 'Escreva o roteiro ou digite "/" para inserir blocos, imagens da Mídia, gráficos e comparativos…',
      },
    },
    uploadFile: async (file: File) => {
      const form = new FormData();
      form.set("slug", slug);
      form.set("folder", "estudio");
      form.set("file", file);
      return (await api<{ file: { url: string } }>("/api/social/media", { method: "POST", body: form })).file.url;
    },
  });

  return (
    <div className={editorStyles.doc} style={brandColor ? { ["--case-brand" as string]: brandColor } : undefined}>
      <BlockNoteView
        editor={editor}
        theme="dark"
        slashMenu={false}
        formattingToolbar={false}
        filePanel={false}
        onChange={() => {
          onChange(editor.document as unknown as StudioBlockJson[]);
        }}
      >
        <SuggestionMenuController<(query: string) => Promise<InsertItem[]>>
          triggerCharacter="/"
          getItems={async query => filterItems(slashItems(editor), query)}
          suggestionMenuComponent={InsertMenu}
        />
        <FilePanelController filePanel={ImagePanel} />
        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar>
              <BlockTypeSelect key="type" />
              <BasicTextStyleButton basicTextStyle="bold" key="bold" />
              <BasicTextStyleButton basicTextStyle="italic" key="italic" />
              <BasicTextStyleButton basicTextStyle="strike" key="strike" />
              <BasicTextStyleButton basicTextStyle="code" key="code" />
              <TextAlignButton textAlignment="left" key="alignLeft" />
              <TextAlignButton textAlignment="center" key="alignCenter" />
              <TextAlignButton textAlignment="right" key="alignRight" />
              <CreateLinkButton key="link" />
              <FileCaptionButton key="caption" />
              <ImageCropButton key="crop" />
              <ImageReplaceButton key="replace" />
              <FileDeleteButton key="delete" />
            </FormattingToolbar>
          )}
        />
      </BlockNoteView>
    </div>
  );
}

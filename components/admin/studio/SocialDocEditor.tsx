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
import { pt } from "@blocknote/core/locales";
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { useMemo } from "react";
import type { StudioBlockJson } from "@/lib/social/studioTypes";
import InsertMenu, { CATEGORIES, type InsertCategory, type InsertItem } from "../editor/InsertMenu";
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

const schema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    heading: defaultBlockSpecs.heading,
    quote: defaultBlockSpecs.quote,
    bulletListItem: defaultBlockSpecs.bulletListItem,
    numberedListItem: defaultBlockSpecs.numberedListItem,
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
  quote: "texto",
  bullet_list: "texto",
  numbered_list: "texto",
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
      key: "socialBeforeAfter",
      title: "Antes × Depois",
      subtext: "Frase riscada comparada com a versão reescrita",
      aliases: ["antes", "depois", "comparacao", "erro", "correcao"],
      category: "destaques",
      onItemClick: insert({ type: "socialBeforeAfter" }),
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
      key: "socialQuote",
      title: "Nota / Citação",
      subtext: "Reflexão editorial ou frase de repertório",
      aliases: ["nota", "citacao", "quote", "caderno"],
      category: "destaques",
      onItemClick: insert({ type: "socialQuote" }),
    },
    {
      key: "socialImage",
      title: "Imagem IA (MuAPI)",
      subtext: "Gera foto ou ilustração editorial dentro do slide",
      aliases: ["imagem", "foto", "muapi", "ia", "ilustracao"],
      category: "midia",
      onItemClick: insert({ type: "socialImage" }),
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
      key: "slideBreak",
      title: "Quebra de Slide",
      subtext: "Separa texto livre em um novo slide",
      aliases: ["slide", "quebra", "separador", "novo"],
      category: "estrutura",
      onItemClick: insert({ type: "slideBreak" }),
    },
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

export default function SocialDocEditor({
  initialBlocks,
  onChange,
}: {
  initialBlocks: StudioBlockJson[];
  onChange: (blocks: StudioBlockJson[]) => void;
}) {
  const initialContent = useMemo(() => {
    return (initialBlocks.length ? initialBlocks : [{ type: "paragraph" }]) as PartialBlock<typeof schema.blockSchema>[];
    // Editor owns state after mount (remount via `key` when AI replaces document)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const editor = useCreateBlockNote({
    schema,
    initialContent,
    dictionary: {
      ...pt,
      placeholders: {
        ...pt.placeholders,
        default: 'Escreva livremente ou digite "/" para inserir Capa, Antes × Depois, Passo, Checklist, Imagem IA…',
      },
    },
  });

  return (
    <div className={editorStyles.doc}>
      <BlockNoteView
        editor={editor}
        theme="dark"
        slashMenu={false}
        onChange={() => {
          onChange(editor.document as unknown as StudioBlockJson[]);
        }}
      >
        <SuggestionMenuController<(query: string) => Promise<InsertItem[]>>
          triggerCharacter="/"
          getItems={async query => filterItems(slashItems(editor), query)}
          suggestionMenuComponent={InsertMenu}
        />
      </BlockNoteView>
    </div>
  );
}

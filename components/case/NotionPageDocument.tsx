import type { SiteLocale } from "@/lib/siteLocale";
import { getTranslator, type Translator } from "@/lib/i18n/messages";
import type { ReactNode } from "react";
import {
  getBookmarkBlock,
  getCodeLanguage,
  getEmbedBlockUrl,
  getEmbedCaptionParts,
  getEquationExpression,
  getFileBlockUrlAndName,
  getImageCaptionParts,
  getImageMobileUrl,
  getImageSize,
  getMediaCrop,
  getImageUrl,
  getLinkPreviewUrl,
  getRichTextArray,
  getTableFlags,
  getTableRowCells,
  getVideoCaptionParts,
  getVideoPageUrl,
  richTextPlain,
  type NotionBlockNode,
} from "@/lib/notionBlockTree";
import type { NotionHeadingAnchorMeta } from "@/lib/notionCaseNavFromHeadings";
import CaseMediaGallery from "@/components/case/blocks/CaseMediaGallery";
import NotionCaseEmbed from "@/components/case/NotionCaseEmbed";
import CaseDivider from "@/components/case/blocks/CaseDivider";
import { readDivider } from "@/lib/caseDivider";
import { SPACE_VALUES } from "@/lib/caseEmbedSpace";
import { cropCoverPosition, type MediaCrop } from "@/lib/mediaCrop";
import {
  caseMediaGalleryPropsFromWrapperOptions,
  parseCaseEmbedJson,
  tryParseCaseEmbedParagraph,
  tryParseCaseEmbedWrapperClose,
  tryParseCaseEmbedWrapperOpen,
  type ParsedCaseEmbed,
} from "@/lib/notionCaseEmbedFromNotion";
import { embedBorderProps } from "@/lib/notionCaseEmbedBorder";
import { CASE_SCROLL_ANCHOR_CLASS } from "@/lib/caseLayout";
import styles from "./NotionDocument.module.css";
import {
  CASE_DOC_H2,
  CASE_DOC_H3,
  CASE_DOC_H4,
  CASE_NOTION_BOOKMARK_CAPTION,
  CASE_NOTION_BOOKMARK_HOST,
  CASE_NOTION_BOOKMARK_URL,
  CASE_NOTION_CALLOUT_ICON,
  CASE_NOTION_CHILD_PAGE,
  CASE_NOTION_CODE_LANG_LABEL,
  CASE_NOTION_CODE_PRE,
  CASE_NOTION_EMBED_CAPTION,
  CASE_NOTION_EMPTY_STATE,
  CASE_NOTION_EQUATION_PRE,
  CASE_NOTION_FIGCAPTION,
  CASE_NOTION_TABLE,
  CASE_NOTION_TABLE_CELL_TD,
  CASE_NOTION_TABLE_CELL_TH,
  CASE_NOTION_TOGGLE_SUMMARY,
  CASE_TEXT_BLOCKQUOTE,
  CASE_TEXT_BODY,
  CASE_TEXT_BODY_SPACED,
  CASE_TEXT_CALLOUT,
  CASE_TEXT_LINK_ACCENT,
  CASE_TEXT_TODO_ROW,
} from "@/lib/caseTypography";
import {
  isProbablyDirectVideoFile,
  notionEmbedIframeIsFigma,
  notionEmbedIframeSrc,
  notionEmbedIframeUsesAspectVideo,
} from "@/lib/notionEmbedUrls";
import NotionRichText from "@/components/case/NotionRichText";
import EmbedFacade from "@/components/case/EmbedFacade";
import LoopVideo from "@/components/case/LoopVideo";
import { paragraphLookAttrs, readParagraphLook } from "@/lib/caseParagraph";
import NotionProgressiveImage from "@/components/case/NotionProgressiveImage";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** A prioridade é calculada uma vez, sem alterar props durante a renderização. */
function firstImageId(blocks: NotionBlockNode[]): string | undefined {
  for (const block of blocks) {
    if (block.type === "image" && getImageUrl(block)) return block.id;
    if (block.children?.length) {
      const child = firstImageId(block.children);
      if (child) return child;
    }
  }
}

function renderInlineChildren(
  children: NotionBlockNode[] | undefined,
  headingAnchors?: Record<string, NotionHeadingAnchorMeta>,
  priorityImageId?: string,
  t: Translator = getTranslator("pt"),
): ReactNode {
  if (!children?.length) return null;
  return (
    <BlockList
      blocks={children}
      headingAnchors={headingAnchors}
      priorityImageId={priorityImageId}
      t={t}
    />
  );
}

function paragraphPlainText(block: NotionBlockNode): string {
  const rt = getRichTextArray(block);
  return rt.map((p) => (isObject(p) && typeof p.plain_text === "string" ? p.plain_text : "")).join("");
}

function BlockList({
  blocks,
  headingAnchors,
  caseMediaGalleryOverrides,
  priorityImageId,
  t = getTranslator("pt"),
  afterBlocks,
  embedOverrides,
}: {
  blocks: NotionBlockNode[];
  headingAnchors?: Record<string, NotionHeadingAnchorMeta>;
  /** Dentro de `[case:CaseMediaGallery]` … `[/case:CaseMediaGallery]`: galeria com 1+ imagens e opções opcionais. */
  caseMediaGalleryOverrides?: {
    variant?: "uniform" | "headline";
    columns?: 2 | 3;
    id?: string;
    borderClass?: string;
  } | null;
  /** ID da primeira imagem relevante, calculado antes da renderização. */
  priorityImageId?: string;
  t?: Translator;
  /** Conteúdo extra (ex. gráficos) inserido logo depois do bloco com este id. */
  afterBlocks?: Record<string, ReactNode>;
  /** Troca a renderização de um embed `[case:…]` por outra feita a partir dos mesmos dados. */
  embedOverrides?: Record<string, (embed: ParsedCaseEmbed) => ReactNode>;
}) {
  const nodes: ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.type === "paragraph") {
      const plain = paragraphPlainText(b);
      const open = tryParseCaseEmbedWrapperOpen(plain);
      if (open) {
        let j = i + 1;
        let foundClose = -1;
        while (j < blocks.length) {
          const b2 = blocks[j];
          if (b2.type === "paragraph") {
            const closeName = tryParseCaseEmbedWrapperClose(paragraphPlainText(b2));
            if (closeName === open.component) {
              foundClose = j;
              break;
            }
          }
          j++;
        }
        if (foundClose === -1) {
          nodes.push(
            <NotionBlock
              key={b.id}
              block={b}
              headingAnchors={headingAnchors}
              priorityImageId={priorityImageId}
      t={t}
            />,
          );
          i++;
          continue;
        }
        const inner = blocks.slice(i + 1, foundClose);
        if (open.component === "CaseMediaGallery") {
          const overrides = caseMediaGalleryPropsFromWrapperOptions(open.options);
          nodes.push(
            <BlockList
              key={`notion-case-wrap-${b.id}`}
              blocks={inner}
              headingAnchors={headingAnchors}
              caseMediaGalleryOverrides={overrides}
              priorityImageId={priorityImageId}
      t={t}
            />,
          );
        }
        i = foundClose + 1;
        continue;
      }
    }
    if (b.type === "bulleted_list_item") {
      const group: NotionBlockNode[] = [];
      while (i < blocks.length && blocks[i].type === "bulleted_list_item") {
        group.push(blocks[i]);
        i++;
      }
      nodes.push(
        <ul key={group[0]!.id} className={`my-4 list-disc space-y-2 pl-6 ${CASE_TEXT_BODY}`}>
          {group.map((item) => (
            <li key={item.id} className="pl-1">
              <NotionRichText parts={getRichTextArray(item)} />
              {renderInlineChildren(item.children, headingAnchors, priorityImageId, t)}
            </li>
          ))}
        </ul>,
      );
    } else if (b.type === "numbered_list_item") {
      const group: NotionBlockNode[] = [];
      while (i < blocks.length && blocks[i].type === "numbered_list_item") {
        group.push(blocks[i]);
        i++;
      }
      nodes.push(
        <ol key={group[0]!.id} className={`my-4 list-decimal space-y-2 pl-6 ${CASE_TEXT_BODY}`}>
          {group.map((item) => (
            <li key={item.id} className="pl-1">
              <NotionRichText parts={getRichTextArray(item)} />
              {renderInlineChildren(item.children, headingAnchors, priorityImageId, t)}
            </li>
          ))}
        </ol>,
      );
    } else if (b.type === "image") {
      const group: NotionBlockNode[] = [];
      while (i < blocks.length && blocks[i].type === "image") {
        group.push(blocks[i]);
        i++;
      }
      const galleryItems = group
        .map((block) => {
          const src = getImageUrl(block);
          if (!src) return null;
          const cap = richTextPlain(getImageCaptionParts(block));
          const item: { src: string; alt: string; caption?: string; mobileSrc?: string } = {
            src,
            alt: cap || t("Imagem"),
            mobileSrc: getImageMobileUrl(block),
          };
          if (cap) item.caption = cap;
          return item;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const minForGallery = caseMediaGalleryOverrides ? 1 : 2;
      if (galleryItems.length >= minForGallery) {
        const shouldPrioritizeFirst = group[0]?.id === priorityImageId;
        nodes.push(
          <div key={`notion-gallery-${group[0]!.id}`} className={styles.media}>
          <CaseMediaGallery
            items={galleryItems}
            prioritizeFirstImage={shouldPrioritizeFirst}
            id={caseMediaGalleryOverrides?.id}
            {...embedBorderProps(caseMediaGalleryOverrides?.borderClass)}
          />
          </div>,
        );
      } else {
        for (const g of group) {
          nodes.push(
            <NotionBlock
              key={g.id}
              block={g}
              headingAnchors={headingAnchors}
              priorityImageId={priorityImageId}
      t={t}
            />,
          );
        }
      }
    } else {
      const override = embedOverrides?.[b.id];
      const overrideEmbed = override && b.type === "paragraph" ? tryParseCaseEmbedParagraph(paragraphPlainText(b)) : null;
      if (override && overrideEmbed) nodes.push(<div key={b.id} className={styles.feature}>{override(overrideEmbed)}</div>);
      else nodes.push(
        <NotionBlock
          key={b.id}
          block={b}
          headingAnchors={headingAnchors}
          priorityImageId={priorityImageId}
      t={t}
        />,
      );
      if (afterBlocks?.[b.id]) nodes.push(<div key={`after-${b.id}`} className={styles.feature}>{afterBlocks[b.id]}</div>);
      i++;
    }
  }
  return <>{nodes}</>;
}

type EmbedExtras = { poster?: string; mp4?: string; player?: boolean; size?: ReturnType<typeof getImageSize>; crop?: MediaCrop; noBorder?: boolean };

/** What the admin may add to an embed or video: a cover, an MP4 alternative, a player instead of a loop. */
function embedExtras(block: NotionBlockNode): EmbedExtras {
  const p = block[block.type];
  if (!p || typeof p !== "object") return {};
  const v = p as Record<string, unknown>;
  const str = (key: string) => (typeof v[key] === "string" && v[key] ? v[key] as string : undefined);
  return { poster: str("poster"), mp4: str("mp4_url"), player: v.player === true, size: getImageSize(block), crop: getMediaCrop(block), noBorder: v.case_border === false };
}

function NotionEmbedFrame({ src, href, title, poster, t }: { src: string; href: string; title: string; poster?: string; t: Translator }) {
  const isFigma = notionEmbedIframeIsFigma(src);
  const isAspectVideo = notionEmbedIframeUsesAspectVideo(src);
  /**
   * Vídeo (YouTube/Vimeo): 16:9.
   * Figma: altura tipo canvas (já existia).
   * Resto (Notion, URL genérica, etc.): no mobile altura ~viewport para UIs que não são 16:9.
   */
  const shellClass = isFigma
    ? "my-8 h-[min(75vh,820px)] min-h-[280px] w-full max-h-[90vh]"
    : isAspectVideo
      ? "my-8 aspect-video w-full"
      : "my-8 h-[min(82svh,720px)] min-h-[300px] w-full max-h-[92dvh] sm:min-h-[340px] md:h-[min(72vh,800px)] md:min-h-[400px] md:max-h-[88vh]";
  const allow = isFigma
    ? "clipboard-read; clipboard-write; fullscreen; accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
    : "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  // Loaded on request: the page stays light and scrolling never gets caught inside it.
  return (
    <EmbedFacade
      src={src}
      href={href}
      title={title}
      poster={poster}
      shellClass={`${styles.media} ${styles.embedFrame} ${shellClass}`}
      allow={allow}
      labels={{ action: t("Ver funcionando"), close: t("Fechar") }}
    />
  );
}

function renderVideoOrEmbedFromUrl(url: string, captionRt: unknown[], label: string, t: Translator, extras: EmbedExtras = {}) {
  if (isProbablyDirectVideoFile(url)) {
    return (
      <figure className={`my-8 w-full ${extras.size ? styles[extras.size] : ""} ${extras.noBorder ? styles.noBorder : ""}`.trim()}>
        {extras.player
          ? <video controls className="w-full rounded-[24px]" preload="metadata" poster={extras.poster} style={extras.crop ? { aspectRatio: extras.crop.r, objectFit: "cover", objectPosition: cropCoverPosition(extras.crop) } : undefined}>{extras.mp4 ? <source src={extras.mp4} type="video/mp4" /> : null}<source src={url} /></video>
          : <LoopVideo src={url} mp4={extras.mp4} poster={extras.poster} crop={extras.crop} labels={{ pause: t("Pausar vídeo"), play: t("Reproduzir vídeo") }} />}
        {captionRt.length > 0 ? (
          <figcaption className={CASE_NOTION_FIGCAPTION}>
            <NotionRichText parts={captionRt} />
          </figcaption>
        ) : null}
      </figure>
    );
  }

  const iframeSrc = notionEmbedIframeSrc(url);
  if (iframeSrc) {
    const embedTitle = notionEmbedIframeIsFigma(iframeSrc) ? "Figma" : label;
    return (
      <>
        <NotionEmbedFrame src={iframeSrc} href={url} title={embedTitle} poster={extras.poster} t={t} />
        {captionRt.length > 0 ? (
          <p className={CASE_NOTION_EMBED_CAPTION}>
            <NotionRichText parts={captionRt} />
          </p>
        ) : null}
      </>
    );
  }

  // Fallback genérico: se for uma URL web válida, tenta renderizar em iframe.
  // Alguns domínios podem bloquear por CSP/X-Frame-Options; nesse caso o browser mostrará frame vazio.
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return (
        <>
          <NotionEmbedFrame src={u.toString()} href={u.toString()} title={label} poster={extras.poster} t={t} />
          {captionRt.length > 0 ? (
            <p className={CASE_NOTION_EMBED_CAPTION}>
              <NotionRichText parts={captionRt} />
            </p>
          ) : null}
        </>
      );
    }
  } catch {
    // URL inválida: cai para o fallback com link.
  }

  return (
    <p className={`my-6 ${CASE_TEXT_BODY}`}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={CASE_TEXT_LINK_ACCENT}
      >
        {t("Abrir conteúdo incorporado")}
      </a>
      {captionRt.length > 0 ? (
        <span className="mt-2 block">
          <NotionRichText parts={captionRt} />
        </span>
      ) : null}
    </p>
  );
}

function renderHeading(
  Tag: "h2" | "h3" | "h4",
  className: string,
  block: NotionBlockNode,
  rt: unknown[],
  headingAnchors: Record<string, NotionHeadingAnchorMeta> | undefined,
) {
  const meta = headingAnchors?.[block.id];
  if (meta?.visibleBody === false) {
    return (
      <div
        id={meta.anchorId}
        className={`${CASE_SCROLL_ANCHOR_CLASS} ${styles.chapter} h-0 w-full overflow-hidden`}
        aria-hidden="true"
      />
    );
  }
  const mergedClass = meta ? `${className} ${CASE_SCROLL_ANCHOR_CLASS}` : className;
  return (
    <Tag id={meta?.anchorId} className={mergedClass}>
      {meta ? meta.displayLabel : <NotionRichText parts={rt} />}
    </Tag>
  );
}

function NotionBlock({
  block,
  headingAnchors,
  priorityImageId,
  t = getTranslator("pt"),
}: {
  block: NotionBlockNode;
  headingAnchors?: Record<string, NotionHeadingAnchorMeta>;
  priorityImageId?: string;
  t?: Translator;
}) {
  const rt = getRichTextArray(block);

  switch (block.type) {
    case "paragraph": {
      if (rt.length === 0) return <div className="h-3" aria-hidden />;
      const plain = rt.map((p) => (isObject(p) && typeof p.plain_text === "string" ? p.plain_text : "")).join("");
      const meta = headingAnchors?.[block.id];
      if (meta) {
        if (meta.visibleBody === false) {
          return (
            <div
              id={meta.anchorId}
              className={`${CASE_SCROLL_ANCHOR_CLASS} ${styles.chapter} h-0 w-full overflow-hidden`}
              aria-hidden="true"
            />
          );
        }
        return (
          <p id={meta.anchorId} className={`${CASE_TEXT_BODY_SPACED} ${CASE_SCROLL_ANCHOR_CLASS}`}>
            {meta.displayLabel}
          </p>
        );
      }
      const caseEmbed = tryParseCaseEmbedParagraph(plain);
      if (caseEmbed) return <div className={styles.feature}><NotionCaseEmbed embed={caseEmbed} t={t} /></div>;
      return (
        <p className={CASE_TEXT_BODY_SPACED} {...paragraphLookAttrs(readParagraphLook((isObject(block.paragraph) ? block.paragraph : {}) as Record<string, unknown>))}>
          <NotionRichText parts={rt} />
        </p>
      );
    }
    case "heading_1":
      return renderHeading("h2", CASE_DOC_H2, block, rt, headingAnchors);
    case "heading_2":
      return renderHeading("h3", CASE_DOC_H3, block, rt, headingAnchors);
    case "heading_3":
      return renderHeading("h4", CASE_DOC_H4, block, rt, headingAnchors);
    case "to_do": {
      const td = block.to_do;
      const checked = isObject(td) && td.checked === true;
      return (
        <div className={CASE_TEXT_TODO_ROW}>
          <span
            className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-line"
            aria-hidden
          >
            {checked ? "✓" : ""}
          </span>
          <span className={checked ? "opacity-70 line-through" : undefined}>
            <NotionRichText parts={rt} />
          </span>
        </div>
      );
    }
    case "quote":
      return (
        <blockquote className={CASE_TEXT_BLOCKQUOTE}>
          <NotionRichText parts={rt} />
        </blockquote>
      );
    case "divider": {
      const style = readDivider(isObject(block.divider) ? block.divider : {});
      if (!style.color && !style.size && !style.align && !style.spaceTop && !style.spaceBottom) return <hr className="my-12 border-line" />;
      return <CaseDivider style={style} />;
    }
    case "code": {
      const langRaw = getCodeLanguage(block);
      const lang = langRaw?.trim().toLowerCase() ?? "";
      const code = rt.map((p) => (isObject(p) && typeof p.plain_text === "string" ? p.plain_text : "")).join("");
      if (
        lang === "case" ||
        lang === "portfolio-case" ||
        lang === "json"
      ) {
        const embed = parseCaseEmbedJson(code.trim());
        if (embed) return <div className={styles.feature}><NotionCaseEmbed embed={embed} t={t} /></div>;
      }
      return (
        <pre className={CASE_NOTION_CODE_PRE}>
          {langRaw ? (
            <span className={CASE_NOTION_CODE_LANG_LABEL}>
              {langRaw}
            </span>
          ) : null}
          <code className="font-mono">{code}</code>
        </pre>
      );
    }
    case "callout": {
      const co = block.callout;
      const icon =
        isObject(co) && isObject(co.icon) && co.icon.type === "emoji" && typeof co.icon.emoji === "string"
          ? co.icon.emoji
          : "";
      return (
        <aside className={CASE_TEXT_CALLOUT}>
          {icon ? <span className={CASE_NOTION_CALLOUT_ICON}>{icon}</span> : null}
          <div className="min-w-0 flex-1">
            <NotionRichText parts={rt} />
            {block.children?.length ? (
              <div className="mt-3">
                {renderInlineChildren(block.children, headingAnchors, priorityImageId, t)}
              </div>
            ) : null}
          </div>
        </aside>
      );
    }
    case "image": {
      const src = getImageUrl(block);
      const captionRt = getImageCaptionParts(block);
      if (!src) return null;
      const shouldPrioritize = block.id === priorityImageId;
      const size = getImageSize(block);
      const frame = isObject(block.image) ? block.image : {};
      const space = (v: unknown) => (typeof v === "string" && v in SPACE_VALUES ? SPACE_VALUES[v as keyof typeof SPACE_VALUES] : undefined);
      const [spaceTop, spaceBottom] = [space(frame.case_space_top), space(frame.case_space_bottom)];
      return (
        <figure className={`my-8 w-full ${size ? styles[size] : ""} ${frame.case_border === false ? styles.noBorder : ""}`.trim()}
          style={spaceTop || spaceBottom ? { marginTop: spaceTop, marginBottom: spaceBottom } : undefined}>
          <NotionProgressiveImage
            src={src}
            mobileSrc={getImageMobileUrl(block)}
            crop={getMediaCrop(block)}
            mobileCrop={getMediaCrop(block, true)}
            alt=""
            loading={shouldPrioritize ? "eager" : "lazy"}
            fetchPriority={shouldPrioritize ? "high" : "auto"}
            wrapperClassName={`w-full overflow-hidden rounded-[24px] ${frame.case_background === false ? "" : "bg-card"}`.trim()}
            className="h-auto w-full object-cover"
          />
          {captionRt.length > 0 ? (
            <figcaption className={CASE_NOTION_FIGCAPTION}>
              <NotionRichText parts={captionRt} />
            </figcaption>
          ) : null}
        </figure>
      );
    }
    case "video": {
      const url = getVideoPageUrl(block);
      if (!url) return null;
      const captionRt = getVideoCaptionParts(block);
      return renderVideoOrEmbedFromUrl(url, captionRt, t("Vídeo incorporado"), t, embedExtras(block));
    }
    case "embed": {
      const url = getEmbedBlockUrl(block);
      if (!url) return null;
      const captionRt = getEmbedCaptionParts(block);
      return renderVideoOrEmbedFromUrl(url, captionRt, t("Conteúdo incorporado"), t, embedExtras(block));
    }
    case "link_preview": {
      const url = getLinkPreviewUrl(block);
      if (!url) return null;
      return renderVideoOrEmbedFromUrl(url, [], t("Pré-visualização"), t, embedExtras(block));
    }
    case "bookmark": {
      const bm = getBookmarkBlock(block);
      if (!bm) return null;
      if (notionEmbedIframeSrc(bm.url)) {
        return renderVideoOrEmbedFromUrl(bm.url, bm.caption, t("Conteúdo incorporado"), t, embedExtras(block));
      }
      let hostname = "";
      try {
        hostname = new URL(bm.url).hostname.replace(/^www\./, "");
      } catch {
        hostname = "";
      }
      return (
        <a
          href={bm.url}
          target="_blank"
          rel="noopener noreferrer"
          className="my-6 flex max-w-full flex-col gap-2 rounded-[24px] bg-card p-6 no-underline transition-colors hover:bg-card-alt"
        >
          {hostname ? (
            <span className={CASE_NOTION_BOOKMARK_HOST}>{hostname}</span>
          ) : null}
          <span className={CASE_NOTION_BOOKMARK_URL}>{bm.url}</span>
          {bm.caption.length > 0 ? (
            <span className={CASE_NOTION_BOOKMARK_CAPTION}>
              <NotionRichText parts={bm.caption} />
            </span>
          ) : null}
        </a>
      );
    }
    case "file": {
      const f = getFileBlockUrlAndName(block);
      if (!f) return null;
      return (
        <p className={`my-6 ${CASE_TEXT_BODY}`}>
          <a
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            className={CASE_TEXT_LINK_ACCENT}
          >
            {f.name}
          </a>
        </p>
      );
    }
    case "equation": {
      const expr = getEquationExpression(block);
      if (!expr) return null;
      return (
        <pre
          className={CASE_NOTION_EQUATION_PRE}
          aria-label="Equação"
        >
          {expr}
        </pre>
      );
    }
    case "table": {
      const { colHeader, rowHeader } = getTableFlags(block);
      const rows = block.children?.filter((c) => c.type === "table_row") ?? [];
      if (rows.length === 0) return null;
      return (
        <div className="my-8 w-full overflow-x-auto rounded-[24px] bg-card">
          <table className={CASE_NOTION_TABLE}>
            <tbody>
              {rows.map((row, ri) => {
                const cells = getTableRowCells(row);
                const isColHeadRow = colHeader && ri === 0;
                return (
                  <tr key={row.id} className="border-b border-line last:border-b-0">
                    {cells.map((cellParts, ci) => {
                      const isRowHeadCell = rowHeader && ci === 0;
                      const useTh = isColHeadRow || isRowHeadCell;
                      const Tag = useTh ? "th" : "td";
                      return (
                        <Tag
                          key={`${row.id}-${ci}`}
                          className={
                            useTh
                              ? CASE_NOTION_TABLE_CELL_TH
                              : CASE_NOTION_TABLE_CELL_TD
                          }
                        >
                          <NotionRichText parts={cellParts as unknown[]} />
                        </Tag>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
    case "table_row":
      return null;
    case "toggle":
      return (
        <details className="my-4 rounded-[24px] bg-card p-6">
          <summary className={CASE_NOTION_TOGGLE_SUMMARY}>
            <NotionRichText parts={rt} />
          </summary>
          {block.children?.length ? (
            <div className="mt-6">
              {renderInlineChildren(block.children, headingAnchors, priorityImageId, t)}
            </div>
          ) : null}
        </details>
      );
    case "column_list":
      return (
        <div className={`${styles.columns} grid md:grid-cols-2`}>
          {block.children?.map((col) => (
            <div key={col.id} className="min-w-0">
              {col.type === "column" && col.children?.length
                ? renderInlineChildren(col.children, headingAnchors, priorityImageId, t)
                : null}
            </div>
          ))}
        </div>
      );

    case "child_page": {
      const cp = block.child_page;
      const title = isObject(cp) && typeof cp.title === "string" ? cp.title : "Subpágina";
      return (
        <p className={CASE_NOTION_CHILD_PAGE}>
          <span className="font-mono">[Página: {title}]</span> — abra no Notion para editar.
        </p>
      );
    }

    case "synced_block":
    case "template":
      return block.children?.length
        ? renderInlineChildren(block.children, headingAnchors, priorityImageId, t)
        : null;

    default:
      return block.children?.length ? (
        <div className="my-6">
          {renderInlineChildren(block.children, headingAnchors, priorityImageId, t)}
        </div>
      ) : null;
  }
}

type Props = {
  locale?: SiteLocale;
  /** âncora do wrapper (ex. `case-doc`) — útil para “Conteúdo” quando não há `[-nav …]` */
  anchorId?: string;
  anchorClassName?: string;
  /** O corpo do case (`getCaseBody`). */
  blocks: NotionBlockNode[];
  /** Metadados de âncora por `block.id` (títulos com prefixo `[-nav N]`). */
  headingAnchors?: Record<string, NotionHeadingAnchorMeta>;
  /** Conteúdo inserido depois de blocos de topo, por `block.id`. */
  afterBlocks?: Record<string, ReactNode>;
  /** Renderização alternativa de embeds de topo, por `block.id`. */
  embedOverrides?: Record<string, (embed: ParsedCaseEmbed) => ReactNode>;
};

export default async function NotionPageDocument({
  locale = "pt",
  anchorId = "case-doc",
  anchorClassName,
  blocks: tree,
  headingAnchors,
  afterBlocks,
  embedOverrides,
}: Props) {
  const t = getTranslator(locale);
  if (tree.length === 0) {
    return (
      <div id={anchorId} className={anchorClassName}>
        <p className={CASE_NOTION_EMPTY_STATE}>{t("Este case ainda não tem conteúdo.")}</p>
      </div>
    );
  }

  return (
    <div id={anchorId} className={anchorClassName}>
      <article className={styles.document}>
        <BlockList
          blocks={tree}
          headingAnchors={headingAnchors}
          priorityImageId={firstImageId(tree)}
          t={t}
          afterBlocks={afterBlocks}
          embedOverrides={embedOverrides}
        />
      </article>
    </div>
  );
}

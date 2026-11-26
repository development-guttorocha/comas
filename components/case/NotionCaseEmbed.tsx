import CaseApproachCards from "@/components/case/blocks/CaseApproachCards";
import CaseThanksCards from "@/components/case/blocks/CaseThanksCards";
import CaseBeforeAfter from "@/components/case/blocks/CaseBeforeAfter";
import CaseEditorialParagraph from "@/components/case/blocks/CaseEditorialParagraph";
import CaseMediaFigure from "@/components/case/blocks/CaseMediaFigure";
import CaseMediaFullWidth from "@/components/case/blocks/CaseMediaFullWidth";
import CaseMediaGallery from "@/components/case/blocks/CaseMediaGallery";
import CaseMediaEmbed from "@/components/case/blocks/CaseMediaEmbed";
import CasePullQuote from "@/components/case/blocks/CasePullQuote";
import CaseResultsJourney from "@/components/case/blocks/CaseResultsJourney";
import CaseResultsQuote from "@/components/case/blocks/CaseResultsQuote";
import CaseSectionMedia from "@/components/case/blocks/CaseSectionMedia";
import CaseSectionSplit from "@/components/case/blocks/CaseSectionSplit";
import CaseStatBand from "@/components/case/blocks/CaseStatBand";
import CaseFlowDiagram from "@/components/case/blocks/CaseFlowDiagram";
import CaseChart from "@/components/case/blocks/CaseChart";
import CasePanel from "@/components/case/blocks/CasePanel";
import CaseScreens from "@/components/case/blocks/CaseScreens";
import CaseImageCompare from "@/components/case/blocks/CaseImageCompare";
import CaseImageStack from "@/components/case/blocks/CaseImageStack";
import { CaseComparison, CaseIconRatio, CaseIconStats, CaseTimeline } from "@/components/case/blocks/CaseInfographics";
import { CaseBento, CaseBigNumber, CaseChapter, CaseFlow, CaseLightPanel, CaseStatement, CaseTitleBox } from "@/components/case/blocks/CaseStoryBlocks";
import NotionProgressiveImage from "@/components/case/NotionProgressiveImage";
import { SPACE_VALUES } from "@/lib/caseEmbedSpace";
import { getTranslator, type Translator } from "@/lib/i18n/messages";
import { CASE_MEDIA_BLOCK } from "@/lib/caseLayout";
import { cn } from "@/lib/cn";
import type { ParsedCaseEmbed } from "@/lib/notionCaseEmbedFromNotion";
import {
  embedBorderProps,
  normalizeNotionBorderClass,
} from "@/lib/notionCaseEmbedBorder";
import spaceStyles from "./CaseEmbedSpace.module.css";
import {
  CASE_TEXT_BEFORE_AFTER_BODY,
  CASE_TEXT_BEFORE_AFTER_PREWRAP,
  CASE_TEXT_BEFORE_AFTER_SECTION_HEADING,
} from "@/lib/caseTypography";

function NotionCaseEmbedImage({
  src,
  alt,
  id,
  priority,
  borderClass,
}: {
  src: string;
  alt: string;
  id?: string;
  priority?: boolean;
  borderClass?: string;
}) {
  if (src.startsWith("/")) {
    return (
      <CaseMediaFullWidth
        src={src}
        alt={alt}
        id={id}
        priority={priority}
        {...embedBorderProps(borderClass)}
      />
    );
  }
  return (
    <div
      id={id}
      className={cn(
        CASE_MEDIA_BLOCK,
        "w-full max-w-full",
        borderClass !== undefined ? normalizeNotionBorderClass(borderClass) : "",
      )}
    >
      <NotionProgressiveImage
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        wrapperClassName="w-full overflow-hidden bg-card"
        className="h-auto w-full object-cover object-center"
      />
    </div>
  );
}

function splitBodyParagraphs(body: string): string[] {
  return body
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function NotionCaseEmbed({ embed, t = getTranslator("pt") }: { embed: ParsedCaseEmbed; t?: Translator }) {
  const content = <CaseEmbedContent embed={embed} t={t} />;
  const { top, bottom } = embed.space ?? {};
  if (!top && !bottom) return content;
  return (
    <div
      className={spaceStyles.space}
      data-top={top}
      data-bottom={bottom}
      style={{ ["--space-top" as string]: top ? SPACE_VALUES[top] : undefined, ["--space-bottom" as string]: bottom ? SPACE_VALUES[bottom] : undefined }}
    >
      {content}
    </div>
  );
}

function CaseEmbedContent({ embed, t }: { embed: ParsedCaseEmbed; t: Translator }) {
  switch (embed.kind) {
    case "CasePullQuote":
      return (
        <CasePullQuote
          label={embed.label}
          centered={embed.centered ?? true}
          bgClass={embed.bgClass}
          sectionClassName={embed.sectionClassName}
          {...embedBorderProps(embed.borderClass)}
        >
          {embed.body}
        </CasePullQuote>
      );
    case "CaseStatBand":
      return (
        <CaseStatBand
          stats={embed.stats}
          sectionLabel={embed.sectionLabel}
          heading={embed.heading}
          intro={embed.intro}
          attributionNote={embed.attributionNote}
          editorialSourceNote={embed.editorialSourceNote}
          emphasizeIndices={embed.emphasizeIndices}
          display={embed.display}
          {...embedBorderProps(embed.borderClass)}
        />
      );
    case "CaseSectionSplit": {
      const chunks = splitBodyParagraphs(embed.body);
      const contentClassName =
        embed.contentClassName !== undefined
          ? embed.contentClassName
          : chunks.length > 1
            ? "space-y-8"
            : "";
      return (
        <CaseSectionSplit
          label={embed.label}
          id={embed.id}
          layout={embed.layout}
          tone={embed.tone}
          labelColumnPx={embed.labelColumnPx}
          {...embedBorderProps(embed.borderClass)}
          contentClassName={contentClassName}
        >
          {chunks.map((chunk, i) => (
            <CaseEditorialParagraph key={i} maxWidthClass={false}>
              {chunk}
            </CaseEditorialParagraph>
          ))}
        </CaseSectionSplit>
      );
    }
    case "CaseEditorialParagraph":
      return (
        <CaseEditorialParagraph
          variant={embed.variant}
          className={cn(
            embed.className,
            embed.borderClass !== undefined &&
              normalizeNotionBorderClass(embed.borderClass),
          )}
        >
          {embed.body}
        </CaseEditorialParagraph>
      );
    case "CaseMediaFullWidth":
      return (
        <NotionCaseEmbedImage
          src={embed.src}
          alt={embed.alt}
          id={embed.id}
          priority={embed.priority}
          borderClass={embed.borderClass}
        />
      );
    case "CaseMediaEmbed":
      return (
        <CaseMediaEmbed
          id={embed.id}
          className={embed.className}
          src={embed.src}
          title={embed.title}
          caption={embed.caption}
          heightClass={embed.heightClass}
          minHeightClass={embed.minHeightClass}
          {...embedBorderProps(embed.borderClass)}
        />
      );
    case "CaseSectionMedia":
      return (
        <CaseSectionMedia
          label={embed.label}
          intro={embed.intro}
          id={embed.id}
          {...embedBorderProps(embed.borderClass)}
        >
          <NotionCaseEmbedImage src={embed.src} alt={embed.alt} />
        </CaseSectionMedia>
      );
    case "CaseBeforeAfter":
      return (
        <CaseBeforeAfter
          id={embed.id}
          padClass={embed.padClass}
          bgClass={embed.bgClass}
          {...embedBorderProps(embed.borderClass)}
          sectionLabel={embed.sectionLabel}
          heading={
            embed.heading ? (
              <h2 className={CASE_TEXT_BEFORE_AFTER_SECTION_HEADING}>
                {embed.heading}
              </h2>
            ) : undefined
          }
          banner={
            embed.banner ? (
              <p className={CASE_TEXT_BEFORE_AFTER_BODY}>{embed.banner}</p>
            ) : undefined
          }
          before={{
            label: embed.before.label,
            lead: embed.before.lead,
            foot: embed.before.foot,
            variant: embed.before.variant,
            children: (
              <div className={CASE_TEXT_BEFORE_AFTER_PREWRAP}>
                {embed.before.body}
              </div>
            ),
          }}
          after={{
            label: embed.after.label,
            lead: embed.after.lead,
            foot: embed.after.foot,
            variant: embed.after.variant,
            children: (
              <div className={CASE_TEXT_BEFORE_AFTER_PREWRAP}>
                {embed.after.body}
              </div>
            ),
          }}
        />
      );
    case "CaseMediaFigure":
      return (
        <CaseMediaFigure
          id={embed.id}
          src={embed.src}
          alt={embed.alt}
          caption={embed.caption}
          aspectClass={embed.aspectClass}
          priority={embed.priority}
          {...embedBorderProps(embed.borderClass)}
        />
      );
    case "CaseApproachCards":
      return (
        <CaseApproachCards
          id={embed.id}
          sectionLabel={embed.sectionLabel}
          heading={embed.heading}
          columns={embed.columns}
          padClass={embed.padClass}
          bgClass={embed.bgClass}
          {...embedBorderProps(embed.borderClass)}
          items={embed.items.map((item) => ({
            title: item.title,
            body: item.body,
            tone: item.tone,
          }))}
        />
      );
    case "CaseThanksCards":
      return (
        <CaseThanksCards
          id={embed.id}
          sectionLabel={embed.sectionLabel}
          heading={embed.heading}
          columns={embed.columns}
          padClass={embed.padClass}
          bgClass={embed.bgClass}
          {...embedBorderProps(embed.borderClass)}
          items={embed.items.map((item) => ({
            title: item.title,
            body: item.body,
            tone: item.tone,
          }))}
        />
      );
    case "CaseMediaGallery":
      return (
        <CaseMediaGallery
          id={embed.id}
          items={embed.items}
          {...embedBorderProps(embed.borderClass)}
        />
      );
    case "CaseResultsJourney":
      return (
        <CaseResultsJourney
          id={embed.id}
          className={embed.className}
          sectionLabel={embed.sectionLabel}
          heading={embed.heading}
          intro={embed.intro}
          hideStepIndices={embed.hideStepIndices}
          padClass={embed.padClass}
          bgClass={embed.bgClass}
          {...embedBorderProps(embed.borderClass)}
          steps={embed.steps.map((step) => ({
            title: step.title,
            body: step.body,
            indexLabel: step.indexLabel,
          }))}
        />
      );
    case "CaseResultsQuote":
      return (
        <CaseResultsQuote
          id={embed.id}
          className={embed.className}
          sectionLabel={embed.sectionLabel}
          attribution={embed.attribution}
          padClass={embed.padClass}
          bgClass={embed.bgClass}
          {...embedBorderProps(embed.borderClass)}
        >
          {embed.body}
        </CaseResultsQuote>
      );
    case "CaseFlow":
      return <CaseFlow {...embed} />;
    case "CaseFlowDiagram":
      return <CaseFlowDiagram diagram={embed} />;
    case "CaseChart":
      return <CaseChart spec={embed} />;
    case "CasePanel":
      return <CasePanel data={embed} />;
    case "CaseScreens":
      return <CaseScreens data={embed} />;
    case "CaseImageCompare":
      return <CaseImageCompare data={embed} />;
    case "CaseImageStack":
      return <CaseImageStack data={embed} />;
    case "CaseIconRatio":
      return <CaseIconRatio data={embed} />;
    case "CaseIconStats":
      return <CaseIconStats data={embed} />;
    case "CaseTimeline":
      return <CaseTimeline data={embed} />;
    case "CaseComparison":
      return <CaseComparison data={embed} />;
    case "CaseBento":
      return <CaseBento {...embed} videoLabels={{ pause: t("Pausar vídeo"), play: t("Reproduzir vídeo") }} />;
    case "CaseChapter":
      return <CaseChapter {...embed} />;
    case "CaseStatement":
      return <CaseStatement {...embed} />;
    case "CaseTitleBox":
      return <CaseTitleBox {...embed} />;
    case "CaseLightPanel":
      return <CaseLightPanel {...embed} />;
    case "CaseBigNumber":
      return <CaseBigNumber {...embed} />;
    default:
      return null;
  }
}

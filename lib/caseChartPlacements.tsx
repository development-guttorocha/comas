import type { ReactNode } from "react";
import CaseStatBand from "@/components/case/blocks/CaseStatBand";
import CaseChartBars from "@/components/case/charts/CaseChartBars";
import CaseChartBeforeAfter from "@/components/case/charts/CaseChartBeforeAfter";
import CaseChartDots from "@/components/case/charts/CaseChartDots";
import CaseChartRanges from "@/components/case/charts/CaseChartRanges";
import styles from "@/components/case/charts/CaseCharts.module.css";
import { gainRowsFromStats, parseStatNumber } from "@/lib/caseChartData";
import { getTranslator, type Translator } from "@/lib/i18n/messages";
import type { ParsedCaseEmbed } from "@/lib/notionCaseEmbedFromNotion";
import { embedBorderProps } from "@/lib/notionCaseEmbedBorder";
import type { SiteLocale } from "@/lib/siteLocale";

type EmbedOverride = (embed: ParsedCaseEmbed) => ReactNode;

export type CaseChartPlacements = {
  /** Gráfico inserido depois do bloco Notion com este id. */
  afterBlocks: Record<string, ReactNode>;
  /** Embed renderizado de novo com parte dos seus dados em gráfico. */
  embedOverrides: Record<string, EmbedOverride>;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Faixa de stats com alguns números em gráfico e o resto em cards. Os valores vêm do próprio
 * embed (PT ou EN); se não forem lidos como esperado, a faixa volta a ser só cards.
 */
function statBandWithCharts(build: (stats: Extract<ParsedCaseEmbed, { kind: "CaseStatBand" }>["stats"]) => { charts: ReactNode[]; hide: number[] } | null): EmbedOverride {
  return function StatBandWithCharts(embed: ParsedCaseEmbed) {
    if (embed.kind !== "CaseStatBand") return null;
    const built = build(embed.stats);
    return (
      <CaseStatBand
        stats={embed.stats}
        sectionLabel={embed.sectionLabel}
        heading={embed.heading}
        intro={embed.intro}
        attributionNote={embed.attributionNote}
        editorialSourceNote={embed.editorialSourceNote}
        emphasizeIndices={embed.emphasizeIndices}
        {...embedBorderProps(embed.borderClass)}
        charts={built?.charts.length ? built.charts : undefined}
        hideIndices={built?.hide}
      />
    );
  };
}

/** Ganhos "+N%" dos stats indicados, na mesma régua. */
function gainChart(indices: number[]) {
  return (stats: Parameters<typeof gainRowsFromStats>[0]) => {
    const rows = gainRowsFromStats(stats, indices);
    return rows ? { node: <CaseChartBeforeAfter key="gain" rows={rows} mode="gain" />, hide: indices } : null;
  };
}

/** Notas de 0 a 5 dos stats indicados. */
function ratingChart(indices: number[], t: Translator) {
  return (stats: Parameters<typeof gainRowsFromStats>[0]) => {
    const bars = indices.map((i) => ({ label: capitalize(stats[i]?.label ?? ""), value: parseStatNumber(stats[i]?.value ?? "") ?? NaN }));
    if (bars.some((b) => !Number.isFinite(b.value) || b.value > 5)) return null;
    return {
      node: <CaseChartBars key="rating" title={t("Notas nas lojas de apps")} subtitle={t("Escala de 0 a 5")} bars={bars} scaleMax={5} fractionDigits={1} />,
      hide: indices,
    };
  };
}

function combine(...parts: Array<(stats: Parameters<typeof gainRowsFromStats>[0]) => { node: ReactNode; hide: number[] } | null>) {
  return (stats: Parameters<typeof gainRowsFromStats>[0]) => {
    const built = parts.map((part) => part(stats)).filter((b) => b !== null);
    return { charts: built.map((b) => b.node), hide: built.flatMap((b) => b.hide) };
  };
}

/**
 * Gráficos de cada case, presos a blocos do Notion pelo id (o mesmo em PT e EN). Dados que
 * estão no texto ficam aqui; dados de uma faixa de stats são lidos do próprio embed.
 */
export function caseChartPlacements(slug: string, locale: SiteLocale): CaseChartPlacements {
  const t = getTranslator(locale);
  const section = (node: ReactNode) => <section className={styles.section}><div className="content-wrap">{node}</div></section>;

  if (slug === "banco-pan") {
    return { embedOverrides: {}, afterBlocks: {
      // Depois de "Pesquisa": o alcance do survey contra as conversas que de fato aconteceram.
      "33b7bcc8-93e5-8066-80d9-e0a9474d3aa7": section(
        <CaseChartBars
          title={t("Do alcance às conversas")}
          subtitle={t("Pesquisa quantitativa e qualitativa")}
          bars={[
            { label: t("Lojistas alcançados pelo survey"), value: 7000, muted: true },
            { label: t("Respostas válidas na 1ª rodada"), value: 170 },
            { label: t("Participantes na 2ª rodada"), detail: t("Entre eles, 84 lojistas e 46 operadores"), value: 155 },
            { label: t("Entrevistas presenciais"), value: 29 },
            { label: t("Entrevistas adicionais"), detail: t("Fevereiro e março de 2019"), value: 25 },
          ]}
          note={t("Menos de 3% dos lojistas alcançados responderam na primeira rodada.")}
        />,
      ),
      // Depois de "Principais achados": os dois achados que têm número.
      "33b7bcc8-93e5-80b3-bc40-d52e21a66b2a": section(
        <div className={styles.pair}>
          <CaseChartRanges
            title={t("Aprovação percebida pelos lojistas")}
            subtitle={t("Quanto cada banco aprovaria, na estimativa de quem vende")}
            ranges={[
              { label: "Banco PAN", min: 30, max: 40 },
              { label: "Santander", min: 80, max: 90, muted: true },
            ]}
            note={t("O problema não era a taxa real, era a assertividade do simulador.")}
          />
          <CaseChartDots
            percent={50}
            title={t("Metade do dia dos operadores ia para a formalização")}
            subtitle={t("Tempo atribuído a tarefas operacionais")}
            highlightLabel={t("Tarefas operacionais")}
            restLabel={t("Resto do trabalho")}
          />
        </div>,
      ),
    } };
  }

  if (slug === "brandlovers") {
    return {
      afterBlocks: {
        // Depois do diagnóstico: o problema dos fluxos, antes da solução.
        "33a7bcc8-93e5-80eb-9b08-f830f18814ba": section(
          <CaseChartDots
            percent={40}
            title={t("Cerca de 40% abandonavam no meio do fluxo")}
            subtitle={t("Creators que desistiam, citando demora e falta de instrução")}
            highlightLabel={t("Abandonavam")}
            restLabel={t("Seguiam no fluxo")}
          />,
        ),
      },
      embedOverrides: {
        // "Resultados em 1 quarter": +99% e +48% em gráfico; R$500K segue como card.
        "3387bcc8-93e5-80bb-9428-c754f197ed49": statBandWithCharts(combine(gainChart([0, 1]))),
      },
    };
  }

  if (slug === "loft-design") {
    return {
      afterBlocks: {},
      embedOverrides: {
        // "Resultados para o produto": ganhos e notas em gráfico; usuários e MAU seguem como cards.
        "3377bcc8-93e5-8078-9ee0-f1bc11550442": statBandWithCharts(combine(gainChart([4, 5]), ratingChart([2, 3], t))),
      },
    };
  }

  return { afterBlocks: {}, embedOverrides: {} };
}

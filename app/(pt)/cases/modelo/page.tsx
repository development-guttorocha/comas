import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CaseShell from "@/components/case/CaseShell";
import {
  CaseApproachCards,
  CaseCard,
  CaseBeforeAfter,
  CaseEditorialParagraph,
  CaseHeroEditorial,
  CaseHeroFullBleed,
  CaseHeroMetaStrip,
  CaseMediaEmbed,
  CaseMediaFigure,
  CaseMediaFullWidth,
  CaseMediaGallery,
  CaseMediaVideo,
  CasePlaybookDemoItem,
  CasePlaybookGuide,
  CasePullQuote,
  CaseResultsCharts,
  CaseResultsHeroMetric,
  CaseResultsJourney,
  CaseResultsQuote,
  CaseResultsSimple,
  CaseSectionMedia,
  CaseSectionSplit,
  CaseStatBand,
} from "@/components/case/blocks";
import { InlineCode } from "@/components/ui/InlineCode";
import { CASE_MEASURE_PROSE, CASE_SCROLL_ANCHOR_CLASS } from "@/lib/caseLayout";
import {
  CASE_PLAYBOOK_DEMO_CHIP,
  CASE_PLAYBOOK_DEMO_LEVEL_EMPHASIS,
  CASE_PLAYBOOK_DEMO_LEVEL_MUTED,
  CASE_TEXT_BODY,
  CASE_TEXT_BEFORE_AFTER_SECTION_HEADING,
  CASE_TEXT_H3,
} from "@/lib/caseTypography";
import { getCaseHeroMegaWord } from "@/lib/cases";
import { getCaseDataSource, getNextCaseFromList } from "@/lib/caseContent";

const SLUG = "modelo" as const;

const HERO_IMAGE_SRC = "/cases/modelo-hero-brandlovers-v2.png";
const MP4_SAMPLE =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

/** Navegação local: só capítulos principais (máx. 5; ver `CASE_SECTION_NAV_MAX`). */
const navItems = [
  { id: "case-hero-fullbleed", label: "Intro" },
  { id: "case-visao-geral", label: "Visão geral" },
  { id: "case-contexto", label: "Contexto" },
  { id: "case-abordagem", label: "Abordagem" },
  { id: "case-resultados-simples", label: "Resultados" },
] as const;

const scroll = CASE_SCROLL_ANCHOR_CLASS;

export async function generateMetadata(): Promise<Metadata> {
  const data = await getCaseDataSource();
  const c = data.cases.find((x) => x.slug === SLUG);
  return {
    title: "Modelo de case — Playbook · Gutto Rocha",
    description: c?.summary ?? "Playbook de componentes de case.",
    robots: { index: false, follow: false },
  };
}

export default async function CaseModeloPage() {
  const data = await getCaseDataSource();
  const c = data.cases.find((x) => x.slug === SLUG);
  if (!c) notFound();
  const next = getNextCaseFromList(data.cases, SLUG);

  return (
    <CaseShell
      next={next}
      sectionNav={{
        company: c.company,
        items: [...navItems],
        brandColor: c.brandColor,
      }}
      hero={
        <div id="case-hero-fullbleed" className={scroll}>
        <div className="border-b border-line bg-surface pad-section-md">
          <div className="content-wrap">
            <CasePlaybookGuide
              name="CaseHeroFullBleed"
              usage={`import { CaseHeroFullBleed } from "@/components/case/blocks";

<CaseHeroFullBleed
  eyebrow="Rótulo curto"
  title={<>Título</>}
  nextSectionId="id-da-secao-seguinte"
  media={{ type: "image", src: "/…", alt: "…" }}
/>`}
              description={
                <>
                  Hero em ecrã inteiro com mídia de fundo (imagem ou vídeo), texto no canto e botão de
                  âncora para a secção seguinte. Opcional:{" "}
                  <InlineCode>company</InlineCode> e{" "}
                  <InlineCode>brandColor</InlineCode> no CTA;{" "}
                  <InlineCode>continueLabel</InlineCode> define o texto completo do botão (senão:
                  {"“Continuar” ou “Continuar {empresa}”"}). Na database Notion:{" "}
                  <InlineCode>heroFullBleedContinueLabel</InlineCode> ou aliases{" "}
                  <InlineCode>continueLabel</InlineCode>, <InlineCode>ctaContinuar</InlineCode>, etc.
                </>
              }
            />
          </div>
        </div>

        <CaseHeroFullBleed
          eyebrow="Playbook"
          title={<>Blocos de case</>}
          tagline="Documentação dos componentes reutilizáveis — importe a partir de @/components/case/blocks."
          nextSectionId="case-visao-geral"
          company={c.company}
          brandColor={c.brandColor}
          media={{
            type: "image",
            src: HERO_IMAGE_SRC,
            alt: "Exemplo visual de hero full-bleed",
          }}
        />
      </div>
      }
    >
      <div id="case-visao-geral" className={scroll}>
        <div className="border-b border-line bg-surface pad-section-md">
          <div className="content-wrap">
            <CasePlaybookGuide
              name="CaseHeroEditorial"
              usage={`import { CaseHeroEditorial } from "@/components/case/blocks";

<CaseHeroEditorial
  placeholder="#cor"
  brandColor="#hexOpcional"
  megaWord="MARCA"
  company="…"
  year="…"
  eyebrow="// …"
  title={<>…</>}
  summary="…"
  role="…"
  tags={[…]}
  accentTags={[…]}
/>`}
              description={
                <>
                  Hero textual com degradê ou cor de marca, marca d&apos;água opcional e faixa de meta
                  (empresa, ano, tags). A faixa fixa ao scroll faz parte deste bloco — não precisa de
                  outro componente para isso.
                </>
              }
            />
          </div>
        </div>

        <CaseHeroEditorial
          placeholder={c.placeholder}
          brandColor={c.brandColor}
          megaWord={getCaseHeroMegaWord(c)}
          megaVertical="bottom"
          megaScale="display"
          company={c.company}
          year={c.year}
          eyebrow="// Visão geral"
          title={
            <>
              Hero editorial
              <br />
              (texto + meta)
            </>
          }
          titleScale="headline"
          tagline="Use para abrir o case com contexto, título e resumo alinhados ao restante da página."
          lead="O playbook abaixo lista cada bloco com nome, exemplo de import e descrição neutra. Copie o padrão para novas landings."
          summary={c.summary}
          role={c.role}
          scopeLine="Documentação, UI"
          tags={c.tags}
          accentTags={c.accentTags}
        />
      </div>

      <section
        id="case-faixa-meta"
        className={`w-full border-t border-line bg-surface pad-section-md ${scroll}`}
      >
        <div className="content-wrap">
          <CasePlaybookGuide
            name="CaseHeroMetaStrip"
            usage={`import { CaseHeroMetaStrip } from "@/components/case/blocks";

<CaseHeroMetaStrip
  company="…"
  year="…"
  role="…"
  scopeLine="Token1, Token2"
  productTag="…"
  tags={[…]}
  accentTags={[…]}
/>`}
            description={
              <>
                Faixa compacta com empresa, ano, papel, produto e pills de escopo/tags. Em geral
                vem embutida no <InlineCode>CaseHeroEditorial</InlineCode>; use
                exportado só se precisares do mesmo layout noutro sítio.
              </>
            }
          />
          <div className="mt-8 rounded-sm border border-line bg-card p-6 md:p-8">
            <CaseHeroMetaStrip
              company={c.company}
              year={c.year}
              role={c.role}
              scopeLine="Documentação, UI"
              productTag="Playbook"
              tags={c.tags}
              accentTags={c.accentTags}
            />
          </div>
        </div>
      </section>

      <div id="case-contexto" className={scroll}>
        <div className="content-wrap pt-8 md:pt-10">
          <CasePlaybookGuide
            name="CaseSectionSplit"
            usage={`import { CaseSectionSplit, CaseEditorialParagraph } from "@/components/case/blocks";

<CaseSectionSplit label="// Contexto" borderClass="border-t border-ink/10">
  <CaseEditorialParagraph>…</CaseEditorialParagraph>
</CaseSectionSplit>`}
            description="Secção em duas colunas (rótulo estreito + conteúdo). Por defeito a coluna de conteúdo usa a medida editorial (CASE_MEASURE_PROSE). Usa contentMeasureClass={false} quando precisas que mídia ou blocos largos ocupem toda a coluna; maxWidthClass no grelha exterior só em casos excecionais."
          />
        </div>
        <CaseSectionSplit
          label="// Contexto"
          borderClass="border-t border-ink/10"
        >
          <CaseEditorialParagraph>
            Parágrafo editorial padrão. Descreve o cenário antes do teu trabalho — mesmo ritmo tipográfico
            que nas outras landings.
          </CaseEditorialParagraph>
        </CaseSectionSplit>
      </div>

      <div id="case-antes-depois" className={scroll}>
        <div className="content-wrap pt-8 md:pt-10">
          <CasePlaybookGuide
            name="CaseBeforeAfter"
            usage={`import { CaseBeforeAfter } from "@/components/case/blocks";

<CaseBeforeAfter
  sectionLabel="// …"
  heading={<h2>…</h2>}
  before={{ label: "Antes", lead: "…", children: <>…</>, foot: "…" }}
  after={{ label: "Depois", lead: "…", children: <>…</> }}
/>`}
            description="Comparativo Antes / Depois: duas colunas no desktop com separador diagonal, tipografia editorial e respiro generoso — sem fundo nem bordas próprios na secção."
          />
        </div>
        <CaseBeforeAfter
          sectionLabel="// Comparativo"
          heading={
            <h2 className={CASE_TEXT_BEFORE_AFTER_SECTION_HEADING}>
              Estado inicial vs. estado desejado
            </h2>
          }
          before={{
            label: "Antes",
            lead: "Descrição curta do problema ou caos — exemplo genérico para o playbook.",
            children: (
              <div className="flex min-h-[120px] flex-wrap content-center items-center justify-center gap-3">
                {["A", "B", "C"].map((t) => (
                  <span
                    key={t}
                    className={CASE_PLAYBOOK_DEMO_CHIP}
                  >
                    {t}
                  </span>
                ))}
              </div>
            ),
            foot: "Resumo de uma linha sobre o estado anterior.",
          }}
          after={{
            label: "Depois",
            lead: "Hierarquia ou sistema claro — texto de exemplo.",
            children: (
              <div className="flex min-h-[120px] flex-col items-center justify-center gap-2">
                <span className={CASE_PLAYBOOK_DEMO_LEVEL_MUTED}>
                  Nível 1
                </span>
                <span className="text-dim">↓</span>
                <span className={CASE_PLAYBOOK_DEMO_LEVEL_EMPHASIS}>
                  Nível 2
                </span>
              </div>
            ),
            foot: "Uma linha sobre o alinhamento desejado.",
          }}
        />
      </div>

      <div id="case-abordagem" className={scroll}>
        <div className="content-wrap pt-8 md:pt-10">
          <CasePlaybookGuide
            name="CaseApproachCards"
            usage={`import { CaseApproachCards } from "@/components/case/blocks";

<CaseApproachCards
  sectionLabel="// Abordagem"
  items={[{ title: "…", body: <>…</> }]}
  featured={<>…</>}
/>`}
            description="Grelha de cartões com título e corpo — usado na abordagem do case WebMotors. A prop opcional `featured` recebe um bloco à parte (ex. terceiro eixo com métricas). "
          />
        </div>
        <CaseApproachCards
          sectionLabel="// Abordagem"
          borderClass="border-t border-line"
          items={[
            {
              title: c.approach[0].title,
              body: (
                <>
                  {c.approach[0].body.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </>
              ),
            },
            {
              title: "Segundo eixo",
              body: (
                <p>
                  Texto de exemplo no playbook. Nas landings, estes blocos alimentam-se a partir de{" "}
                  <InlineCode>c.approach</InlineCode> em{" "}
                  <InlineCode>getCaseDataSource()</InlineCode> (<InlineCode>content/cases</InlineCode>).
                </p>
              ),
            },
          ]}
          featured={
            <article className="rounded-sm border-2 border-ink bg-surface p-8 md:p-10">
              <h3 className={`mb-6 ${CASE_TEXT_H3}`}>
                Cartão destacado (opcional)
              </h3>
              <p className={CASE_TEXT_BODY}>
                Usa a prop <InlineCode>featured</InlineCode> para um
                terceiro eixo com métricas, timeline ou narrativa longa — como no case WebMotors.
              </p>
            </article>
          }
        />
      </div>

      <div id="case-cards" className={`border-t border-line bg-surface ${scroll}`}>
        <div className="content-wrap pad-section-md">
          <CasePlaybookGuide
            name="CaseCard"
            usage={`import { CaseCard } from "@/components/case/blocks";

<CaseCard variant="default" padding="md" title="Título opcional" eyebrow="Rótulo">
  <p>Conteúdo.</p>
</CaseCard>`}
            description={
              <>
                Cartão editorial único — útil para evidências, passos ou notas fora da grelha de{" "}
                <InlineCode>CaseApproachCards</InlineCode>. Variantes:{" "}
                <InlineCode>default</InlineCode>,{" "}
                <InlineCode>muted</InlineCode>,{" "}
                <InlineCode>emphasis</InlineCode>,{" "}
                <InlineCode>dashed</InlineCode>,{" "}
                <InlineCode>panel</InlineCode>. Props{" "}
                <InlineCode>padding</InlineCode> e{" "}
                <InlineCode>as</InlineCode> (div ou article).
              </>
            }
          />
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <CaseCard variant="default" title="default">
              <p>
                Borda fina, fundo surface — o mais neutro para texto e listas dentro do case.
              </p>
            </CaseCard>
            <CaseCard variant="muted" title="muted">
              <p>
                Fundo <InlineCode>card-alt</InlineCode> — notas e
                blocos secundários.
              </p>
            </CaseCard>
            <CaseCard variant="emphasis" title="emphasis">
              <p>
                Contorno duplo — destaque sem usar o painel escuro.
              </p>
            </CaseCard>
            <CaseCard variant="dashed" title="dashed">
              <p>
                Tracejado — bom para placeholders, rascunhos ou “em construção” no playbook.
              </p>
            </CaseCard>
            <CaseCard
              variant="panel"
              padding="lg"
              eyebrow="KPI · exemplo"
              title="panel"
              className="md:col-span-2"
            >
              <p>
                Superfície escura para contraste em secções claras — título e corpo ajustados ao
                token <InlineCode className="text-white/70">on-panel</InlineCode>.
              </p>
            </CaseCard>
            <CaseCard variant="default" padding="sm" eyebrow="Passo 02" title="Com eyebrow + padding sm">
              <p>
                <InlineCode>eyebrow</InlineCode> opcional acima do
                título; <InlineCode>padding=&quot;sm&quot;</InlineCode>{" "}
                para cartões compactos.
              </p>
            </CaseCard>
            <CaseCard as="article" variant="muted" title="as=&quot;article&quot;">
              <p>
                Use <InlineCode>as=&quot;article&quot;</InlineCode>{" "}
                quando o cartão for uma unidade semântica isolada (acessibilidade / outline).
              </p>
            </CaseCard>
          </div>
        </div>
      </div>

      <CaseSectionMedia
        id="case-midia"
        className={scroll}
        intro={
          <>
            <CasePlaybookGuide
              name="CaseSectionMedia"
              usage={`import { CaseSectionMedia } from "@/components/case/blocks";

<CaseSectionMedia label="// Mídia" intro={<>…</>}>
  <CaseMediaFullWidth … />
</CaseSectionMedia>`}
              description="Agrupa vários blocos de mídia dentro do content-wrap, com rótulo e texto introdutório opcionais — sem grelha de duas colunas do split."
            />
            <CaseEditorialParagraph maxWidthClass={false} className="mt-6">
              Abaixo, cada cartão inclui o mesmo padrão: nome do componente, snippet de import e texto
              curto. Os exemplos usam imagens de exemplo do repositório.
            </CaseEditorialParagraph>
          </>
        }
      >
        <CasePlaybookDemoItem
          name="CaseMediaFullWidth"
          usage={`import { CaseMediaFullWidth } from "@/components/case/blocks";

<CaseMediaFullWidth src="/…" alt="…" />`}
          description="Imagem (ou vídeo) à largura útil do content-wrap, com cantos e borda alinhados ao sistema."
        >
          <CaseMediaFullWidth
            src="/figma-hero/cosmonaut.png"
            alt="Exemplo de mídia full-width"
          />
        </CasePlaybookDemoItem>

        <CasePlaybookDemoItem
          name="CaseMediaGallery"
          usage={`<CaseMediaGallery items={[…]} />`}
          description="Galeria automática: as imagens se revezam num palco com controles para voltar, pausar e avançar; clicar amplia a imagem da vez."
        >
          <CaseMediaGallery
            items={[
              {
                src: "/cases/webmotors/portfolio-step-1.png",
                alt: "Passo 1",
                caption: "Passo 1",
              },
              {
                src: "/cases/webmotors/portfolio-step-2.png",
                alt: "Passo 2",
                caption: "Passo 2",
              },
              {
                src: "/cases/webmotors/portfolio-step-3.png",
                alt: "Passo 3",
                caption: "Passo 3",
              },
            ]}
          />
        </CasePlaybookDemoItem>

        <CasePlaybookDemoItem
          name="CaseMediaFigure"
          usage={`<CaseMediaFigure src="/…" alt="…" aspectClass="aspect-[16/9]" caption="…" />`}
          description="Figura com proporção controlada e legenda — quando precisas de moldura editorial sem ocupar toda a faixa."
        >
          <CaseMediaFigure
            src="/figma-hero/logo-mark.png"
            alt="Figura de exemplo"
            aspectClass="aspect-[16/9]"
            caption="Legenda opcional abaixo da imagem."
          />
        </CasePlaybookDemoItem>

        <CasePlaybookDemoItem
          name="CaseMediaVideo · embed"
          usage={`<CaseMediaVideo
  kind="embed"
  url="https://youtube.com/watch?v=…"
  title="…"
  caption="…"
/>`}
          description="Incorpora YouTube ou Vimeo a partir do URL de partilha. O componente resolve o iframe."
        >
          <CaseMediaVideo
            kind="embed"
            url="https://www.youtube.com/watch?v=ScMzIvxBSi4"
            title="Vídeo de exemplo"
            caption="Embed — URL pública YouTube ou Vimeo."
          />
        </CasePlaybookDemoItem>

        <CasePlaybookDemoItem
          name="CaseMediaVideo · file"
          usage={`<CaseMediaVideo
  kind="file"
  src="/video.mp4"
  poster="/poster.jpg"
  label="Descrição curta acessível"
  caption="…"
/>`}
          description="Ficheiro MP4 em public/ ou URL HTTPS — controlos nativos, poster opcional."
        >
          <CaseMediaVideo
            kind="file"
            src={MP4_SAMPLE}
            label="Vídeo de exemplo (ficheiro)"
            caption="Exemplo com MP4 remoto; em produção usa ficheiro em /public ou CDN."
          />
        </CasePlaybookDemoItem>

        <CasePlaybookDemoItem
          name="CaseMediaEmbed"
          usage={`<CaseMediaEmbed src="https://…" title="…" caption="…" />`}
          description="iframe genérico (Figma, mapas, prototipos) com altura mínima configurável."
        >
          <CaseMediaEmbed
            src="https://embed.figma.com/proto/FFJRc9YC7iGi0wxmbzOP5Q/BrandLovrs---Revamp?node-id=1-3091&scaling=contain&content-scaling=fixed&page-id=0%3A1&embed-host=share"
            title="Protótipo (embed)"
            caption="Substitui pelo URL do teu embed."
            minHeightClass="min-h-[600px] md:min-h-[820px]"
          />
        </CasePlaybookDemoItem>
      </CaseSectionMedia>

      <div id="case-resultados-simples" className={scroll}>
        <div className="content-wrap pt-8 md:pt-10">
          <CasePlaybookGuide
            name="CaseResultsSimple"
            usage={`import { CaseResultsSimple } from "@/components/case/blocks";

<CaseResultsSimple id="…" stats={stats} intro={…} />`}
            description="Grelha de métricas em cartões 2×N: valor grande + rótulo. Ideal para KPIs diretos."
          />
        </div>
        <CaseResultsSimple
        className=""
        headerPadClass="pt-24 pb-6"
        intro={<span>Intro opcional acima da grelha.</span>}
        stats={c.stats}
        />
      </div>

      <div id="case-resultados-graficos" className={scroll}>
        <div className="content-wrap pt-8 md:pt-10">
          <CasePlaybookGuide
            name="CaseResultsCharts"
            usage={`<CaseResultsCharts id="…" points={[…]} intro={…} footerNote="…" />`}
            description="Série temporal em barras verticais — escala automática, sem cor de marca no gráfico."
          />
        </div>
        <CaseResultsCharts
        className=""
        headerPadClass="pt-24 pb-6"
        intro={<span>Dados ilustrativos; substitui pela série real e período.</span>}
        footerNote="Período de exemplo."
        points={[
          { label: "Set", value: 12 },
          { label: "Out", value: 22 },
          { label: "Nov", value: 18 },
          { label: "Dez", value: 31 },
          { label: "Jan", value: 26 },
          { label: "Fev", value: 35 },
          { label: "Mar", value: 28 },
        ]}
        />
      </div>

      <div id="case-resultados-destaque" className={scroll}>
        <div className="content-wrap pt-8 md:pt-10">
          <CasePlaybookGuide
            name="CaseResultsHeroMetric"
            usage={`<CaseResultsHeroMetric value="3×" description="…" intro="…" />`}
            description="Um número em destaque central com texto de apoio — narrativa de impacto único."
          />
        </div>
        <CaseResultsHeroMetric
        className=""
        intro="Número central com escala tipográfica forte."
        value="3×"
        description="Texto curto abaixo do valor — exemplo para o playbook."
        />
      </div>

      <div id="case-resultados-quote" className={scroll}>
        <div className="content-wrap pt-8 md:pt-10">
          <CasePlaybookGuide
            name="CaseResultsQuote"
            usage={`<CaseResultsQuote attribution="…">…</CaseResultsQuote>`}
            description="Citação curta dentro da secção de resultados, com atribuição (entrevista, fonte, data)."
          />
        </div>
        <CaseResultsQuote
          className=""
          sectionLabel="// Resultados · citação"
          attribution="Atribuição · exemplo"
        >
          Citação de resultado: útil quando o impacto é qualitativo e vem de voz do cliente ou stakeholder.
        </CaseResultsQuote>
      </div>

      <div id="case-resultados-jornada" className={scroll}>
        <div className="content-wrap pt-8 md:pt-10">
          <CasePlaybookGuide
            name="CaseResultsJourney"
            usage={`<CaseResultsJourney steps={[ { title, body }, … ]} intro="…" />`}
            description="Linha do tempo vertical com marcos — quando o impacto se descreve em fases, não num único número."
          />
        </div>
        <CaseResultsJourney
        className=""
        intro="Marcos qualitativos ao longo do tempo."
        steps={[
          {
            title: "Descoberta",
            body: "Alinhar problema e audiência — saída: escopo e hipóteses.",
          },
          {
            title: "Entrega",
            body: "Versões testáveis e critérios de sucesso.",
          },
          {
            title: "Consolidação",
            body: "Métricas e ajustes sem regressão.",
          },
        ]}
        />
      </div>

      <div id="case-resultados-stats" className={scroll}>
        <div className="content-wrap pt-8 md:pt-10">
          <CasePlaybookGuide
            name="CaseStatBand"
            usage={`import { CaseStatBand } from "@/components/case/blocks";

<CaseStatBand
  stats={stats}
  emphasizeIndices={[0]}
  attributionNote="…"
/>`}
            description="Faixa única de impacto com grelha de stats — o mesmo padrão das landings públicas. Opcional: destacar células e notas de atribuição."
          />
        </div>
        <CaseStatBand
        className=""
        borderClass="border-y border-line"
        stats={c.stats}
        headerPadClass="pt-14 pb-6"
        emphasizeIndices={[0]}
        attributionNote="Nota opcional abaixo da grelha (atribuição, período, metodologia)."
        intro={
          <CaseEditorialParagraph maxWidthClass="max-w-xl">
            Exemplo com <InlineCode>emphasizeIndices</InlineCode> e{" "}
            <InlineCode>attributionNote</InlineCode>.
          </CaseEditorialParagraph>
        }
        />
      </div>

      <div id="case-citacao-centrada" className={scroll}>
        <div className="content-wrap pt-8 md:pt-10">
          <CasePlaybookGuide
            name="CasePullQuote · centrada (default)"
            usage={`import { CasePullQuote } from "@/components/case/blocks";

<CasePullQuote label="// Learning">{c.learning}</CasePullQuote>`}
            description="Bloco de destaque para aprendizados ou frase-chave — texto centrado por defeito."
          />
        </div>
        <CasePullQuote
          label="// Citação"
          sectionClassName=""
          borderClass="border-t border-line"
        >
          Aprendizagem ou insight que queres que o leitor leve da narrativa — exemplo centrado.
        </CasePullQuote>
      </div>

      <div id="case-citacao-alinhada" className={scroll}>
        <div className="content-wrap pt-8 md:pt-10">
          <CasePlaybookGuide
            name="CasePullQuote · alinhada à esquerda"
            usage={`<CasePullQuote label="// Learning" centered={false}>
  {c.learning}
</CasePullQuote>`}
            description="Mesmo bloco com alinhamento à esquerda — útil quando a citação é longa ou integra lista."
          />
        </div>
        <CasePullQuote
          label="// Citação"
          centered={false}
          sectionClassName=""
          borderClass="border-t border-line"
        >
          Variante com texto alinhado ao início da coluna — comum quando o excerto é denso ou comparativo.
        </CasePullQuote>
      </div>
    </CaseShell>
  );
}

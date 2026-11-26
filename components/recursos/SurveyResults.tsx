import Link from "next/link";
import { ServiceHeading, shellStyles } from "@/components/servicos/ServiceShell";
import type { SalarySurveyContent } from "@/lib/resources";
import { brl } from "@/lib/salaryBands";
import type { SurveyCutItem, SurveyResultsData } from "@/lib/salarySurveyResults";
import styles from "@/app/(pt)/recursos/survey.module.css";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function maxUpperBound(items: SurveyCutItem[]): number {
  return Math.max(...items.map(i => i.p75), 1);
}

function cutDescription(content: SalarySurveyContent, title: string, fallback: string): string {
  return content.results.cuts.find(c => c.title === title)?.body ?? fallback;
}

function RangeBars({ items, scaleMax }: { items: SurveyCutItem[]; scaleMax?: number }) {
  if (!items.length) return null;
  const maxVal = scaleMax && scaleMax > 0 ? scaleMax : maxUpperBound(items);

  return (
    <ul className={styles.resultBars}>
      {items.map(item => {
        const leftPct = clamp((item.p25 / maxVal) * 100, 0, 98);
        const rightPct = clamp((item.p75 / maxVal) * 100, leftPct + 2, 100);
        const widthPct = Math.max(rightPct - leftPct, 2);
        const medianPct = clamp((item.p50 / maxVal) * 100, 1.5, 98.5);
        const a11y = `${item.label}, ${item.sampleCount} respostas, mediana ${brl(item.p50)}, P25 ${brl(item.p25)}, P75 ${brl(item.p75)}`;

        return (
          <li key={item.key} className={styles.resultRow} aria-label={a11y}>
            <div className={styles.resultHead}>
              <span className={styles.resultLabel}>
                {item.label} <span className={styles.resultCount}>({item.sampleCount})</span>
              </span>
              <strong className={styles.resultMedianValue}>{brl(item.p50)}</strong>
            </div>
            <div className={styles.resultTrack} aria-hidden="true">
              <span
                className={styles.resultRange}
                style={{ left: `${leftPct.toFixed(1)}%`, width: `${widthPct.toFixed(1)}%` }}
              />
              <span
                className={styles.resultMedian}
                style={{ left: `${medianPct.toFixed(1)}%` }}
              />
            </div>
            <div className={styles.resultBounds}>
              <span>P25 {brl(item.p25)}</span>
              <span>P75 {brl(item.p75)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function WaitingGroupNote({ minGroup }: { minGroup: number }) {
  return <p className={styles.resultFoot}>Aguardando atingir {minGroup} respostas aprovadas por grupo.</p>;
}

/**
 * Live aggregated cuts on `/recursos/pesquisa-salarial#resultados`.
 * Shows real groups as soon as they reach `minGroup` (5+) and degrades to the waiting cards when empty.
 */
export default function SurveyResults({
  content: s,
  results,
  guideHref,
}: {
  content: SalarySurveyContent;
  results: SurveyResultsData;
  guideHref: string;
}) {
  if (!results.hasAnyCut) {
    return (
      <section id="resultados" className={shellStyles.section} aria-labelledby="results-title">
        <ServiceHeading
          id="results-title"
          kicker={s.results.kicker}
          title={s.results.title}
          continuation={s.results.continuation}
        />
        <p className={styles.lead}>{s.results.lead}</p>
        <ul className={styles.cuts}>
          {s.results.cuts.map((c, i) => (
            <li key={c.title}>
              <div className={styles.cutChart} aria-hidden="true">
                {[[62, 84, 48, 92], [80, 55, 70, 40], [45, 90, 66, 58], [72, 50, 88, 64], [58, 76, 52, 84]][i % 5]!.map((w, n) => (
                  <span key={n} style={{ width: `${w}%` }} />
                ))}
              </div>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
              <small>{s.results.waiting}</small>
            </li>
          ))}
        </ul>
        <a href="#responder" className={styles.resultsCta} data-cta="pesquisa-resultados">
          {s.results.cta} →
        </a>
      </section>
    );
  }

  const countLabel = results.totalApproved === 1 ? "resposta aprovada." : "respostas aprovadas.";
  const genderScaleMax = maxUpperBound([
    ...results.byGender,
    ...results.byGenderSameRole.flatMap(g => g.items),
  ]);
  const orgScaleMax = maxUpperBound([...results.byCompanySize, ...results.bySector]);

  return (
    <section id="resultados" className={shellStyles.section} aria-labelledby="results-title">
      <ServiceHeading
        id="results-title"
        kicker={`Resultados parciais · edição ${results.edition}`}
        title={s.results.title}
        continuation={`${results.totalApproved} ${countLabel}`}
      />
      <p className={styles.lead}>
        Os recortes abaixo já passaram de {results.minGroup} respostas e atualizam sozinhos conforme novas respostas entram. O relatório fechado sai em março de 2027, e grupos menores ficam ocultos até atingir {results.minGroup}.
      </p>

      <dl className={styles.resultsSummary}>
        <div>
          <dt>Respostas aprovadas</dt>
          <dd>{results.totalApproved}</dd>
        </div>
        <div>
          <dt>Mediana geral (bruto)</dt>
          <dd>{results.overall ? brl(results.overall.p50) : "—"}</dd>
        </div>
        <div>
          <dt>Recortes abertos</dt>
          <dd>{results.cutsReadyCount} de 5</dd>
        </div>
        <div>
          <dt>Mínimo por grupo</dt>
          <dd>{results.minGroup} respostas</dd>
        </div>
      </dl>

      <p className={styles.resultsLegend}>
        <span><span className={styles.legendRange} aria-hidden="true" />Faixa central (P25–P75)</span>
        <span><span className={styles.legendDot} aria-hidden="true" />Mediana (P50)</span>
        <span className={styles.legendUnit}>Salário bruto mensal (R$)</span>
      </p>

      <div className={styles.resultsGrid}>
        <article className={styles.resultCard}>
          <header className={styles.resultCardHead}>
            <h3>Por nível</h3>
          </header>
          <p className={styles.resultCopy}>
            {cutDescription(s, "Por nível", "Começo, mediana e topo em cada papel com amostra suficiente.")}
          </p>
          {results.byRole.length > 0 ? (
            <RangeBars items={results.byRole} />
          ) : (
            <WaitingGroupNote minGroup={results.minGroup} />
          )}
          {results.waitingRoles.length > 0 ? (
            <p className={styles.resultFoot}>
              Aguardando {results.minGroup} respostas: {results.waitingRoles.join(", ")}.
            </p>
          ) : null}
        </article>

        <article className={styles.resultCard}>
          <header className={styles.resultCardHead}>
            <h3>Por regime</h3>
            {results.pjVsCltPct !== null ? (
              <span className={styles.resultBadge}>
                PJ {results.pjVsCltPct >= 0 ? "+" : ""}
                {results.pjVsCltPct}% na mediana bruta
              </span>
            ) : null}
          </header>
          <p className={styles.resultCopy}>
            {cutDescription(s, "Por regime", "CLT, PJ e contratados de fora no valor bruto informado.")}
          </p>
          {results.byRegime.length > 0 ? (
            <RangeBars items={results.byRegime} />
          ) : (
            <WaitingGroupNote minGroup={results.minGroup} />
          )}
        </article>

        <article className={styles.resultCard}>
          <header className={styles.resultCardHead}>
            <h3>Por região</h3>
          </header>
          <p className={styles.resultCopy}>
            {cutDescription(s, "Por região", "Estados e macro-regiões que atingiram o piso de amostra.")}
          </p>
          {results.byRegion.length > 0 ? (
            <RangeBars items={results.byRegion} />
          ) : (
            <WaitingGroupNote minGroup={results.minGroup} />
          )}
          {results.byState.length > 0 ? (
            <div className={styles.resultSub}>
              <h4 className={styles.resultSubTitle}>Estados com {results.minGroup}+ respostas</h4>
              <ul className={styles.resultStates}>
                {results.byState.map(st => (
                  <li key={st.key}>
                    <span>{st.label}</span>
                    <strong>{brl(st.p50)}</strong>
                    <em>({st.sampleCount})</em>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className={styles.resultFoot}>
            Estados com menos de {results.minGroup} respostas entram agrupados na região.
          </p>
        </article>

        <article className={styles.resultCard}>
          <header className={styles.resultCardHead}>
            <h3>Por gênero</h3>
          </header>
          <p className={styles.resultCopy}>
            {cutDescription(s, "Por gênero", "Diferença entre grupos no mesmo nível e na amostra geral.")}
          </p>
          {results.byGenderSameRole.length > 0 ? (
            <>
              {results.byGenderSameRole.map(group => (
                <div key={group.role} className={styles.resultSub}>
                  <h4 className={styles.resultSubTitle}>No mesmo nível · {group.role}</h4>
                  <RangeBars items={group.items} scaleMax={genderScaleMax} />
                </div>
              ))}
              {results.byGender.length > 0 ? (
                <div className={styles.resultSub}>
                  <h4 className={styles.resultSubTitle}>Amostra geral</h4>
                  <RangeBars items={results.byGender} scaleMax={genderScaleMax} />
                </div>
              ) : null}
              <p className={styles.resultFoot}>
                A amostra geral mistura níveis e regimes. Recortes no mesmo nível aparecem assim que dois grupos atingem {results.minGroup} respostas no papel.
              </p>
            </>
          ) : results.byGender.length > 0 ? (
            <>
              <RangeBars items={results.byGender} />
              <p className={styles.resultFoot}>
                Comparações dentro do mesmo papel abrem assim que dois grupos atingem {results.minGroup} respostas no nível.
              </p>
            </>
          ) : (
            <WaitingGroupNote minGroup={results.minGroup} />
          )}
        </article>

        <article className={`${styles.resultCard} ${styles.resultCardWide}`}>
          <header className={styles.resultCardHead}>
            <h3>Por porte e setor</h3>
          </header>
          <p className={styles.resultCopy}>
            {cutDescription(s, "Por porte e setor", "Tamanho da empresa e áreas de atuação com amostra aberta.")}
          </p>
          {results.byCompanySize.length > 0 || results.bySector.length > 0 ? (
            <div className={styles.resultSplit}>
              <div>
                <h4 className={styles.resultSubTitle}>Porte da empresa</h4>
                {results.byCompanySize.length > 0 ? (
                  <RangeBars items={results.byCompanySize} scaleMax={orgScaleMax} />
                ) : (
                  <WaitingGroupNote minGroup={results.minGroup} />
                )}
              </div>
              <div>
                <h4 className={styles.resultSubTitle}>Setor</h4>
                {results.bySector.length > 0 ? (
                  <RangeBars items={results.bySector} scaleMax={orgScaleMax} />
                ) : (
                  <WaitingGroupNote minGroup={results.minGroup} />
                )}
              </div>
            </div>
          ) : (
            <WaitingGroupNote minGroup={results.minGroup} />
          )}
        </article>
      </div>

      <p className={styles.resultsNote}>
        Valores em salário bruto mensal informado na pesquisa (CLT e PJ). Na página de salário em design, os mesmos dados passam pela normalização de regime e porte.
      </p>

      <div className={styles.resultsActions}>
        <a href="#responder" className={styles.resultsCta} data-cta="pesquisa-resultados">
          {s.results.cta} →
        </a>
        <Link href={guideHref} className={styles.resultsSecondary} data-cta="pesquisa-resultados-regua">
          Ver régua de salários atualizada →
        </Link>
      </div>
    </section>
  );
}

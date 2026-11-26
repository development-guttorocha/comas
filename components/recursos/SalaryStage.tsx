"use client";

import { track } from "@vercel/analytics";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import CltPjCompare from "@/components/recursos/CltPjCompare";
import RaiseCheck from "@/components/recursos/RaiseCheck";
import SalaryRuler, { FIGURES, ZONE } from "@/components/recursos/SalaryRuler";
import type { SalaryGuideContent } from "@/lib/resources";
import { bandFor, brl, defaultSalaryBands, verdictOf, type SalaryBandsData } from "@/lib/salaryBands";
import styles from "@/app/(pt)/recursos/salario.module.css";


const num = (s: string) => Number(s.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");

type Bar = { label: string; value: number; on: boolean };

/** A small chart for the factors: one median per row, the visitor's own lit. */
function Bars({ rows }: { rows: Bar[] }) {
  const max = Math.max(...rows.map(r => r.value));
  return (
    <ul className={styles.bars}>
      {rows.map(r => (
        <li key={r.label} data-on={r.on || undefined}>
          <span>{r.label}</span>
          <i><em style={{ width: `${(r.value / max) * 100}%` }} /></i>
          <b>{brl(r.value)}</b>
        </li>
      ))}
    </ul>
  );
}

type Copy = Pick<SalaryGuideContent, "hero" | "zones" | "factors" | "check" | "next" | "raise" | "compare" | "table">;

/**
 * Salário. The visitor's own sentence ("Sou Pleno e ganho R$ …") places them on a ruler where three
 * designers stand, each in one of the doubts: below the band, in it, above it. The one they become
 * lights up, and the rest of the page (next step, CLT x PJ, every band) follows from that answer.
 * Without reviewed bands (`bands` false) the ruler loses its numbers and the visitor picks a zone.
 */
export default function SalaryStage({ copy, heading, intro, draft, bands, bandsData, hrefs }: {
  copy: Copy; heading: ReactNode; intro?: string; draft?: string; bands: boolean; bandsData?: SalaryBandsData; hrefs: { track: string; consulting: string };
}) {
  const live = bandsData ?? defaultSalaryBands;
  const c = copy.check;
  const [role, setRole] = useState("pleno");
  const [salary, setSalary] = useState("");
  const [size, setSize] = useState(2);
  const [regime, setRegime] = useState<"CLT" | "PJ">("CLT");
  const [picked, setPicked] = useState<number | null>(null);
  const [idle, setIdle] = useState(1);

  const r = live.roles.find(x => x.id === role) ?? live.roles[0]!;
  const band = bandFor(role, size, regime, live)!;
  const mine = num(salary);
  const has = bands && mine >= 500;
  const verdict = has ? verdictOf(mine, band) : null;
  const f = copy.factors;
  // The role before and after the visitor's, for the first factor.
  const at = live.roles.findIndex(x => x.id === role);
  const neighbours = live.roles.slice(Math.max(0, Math.min(at - 1, live.roles.length - 3)), Math.max(0, Math.min(at - 1, live.roles.length - 3)) + 3);
  const money = { role: r.label, p25: brl(band.p25), p50: brl(band.p50), p75: brl(band.p75) };
  // What is missing to the next mark, or how far past the top.
  const gap = verdict === "below" ? band.p25 - mine : verdict === "low" ? band.p50 - mine : verdict === "above" ? mine - band.p75 : 0;
  const yours = verdict ? ZONE[verdict] : null;
  const zone = yours ?? picked;
  const lit = zone ?? idle;
  const open = zone === null ? null : copy.zones[zone]!;

  // Until there is an answer, the three take turns with their doubt.
  useEffect(() => {
    if (zone !== null || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIdle(i => (i + 1) % 3), 3400);
    return () => clearInterval(t);
  }, [zone]);

  const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      {/* ─── Hero: the question as a sentence, and the ruler the three designers stand on ─── */}
      <section id="inicio" className={styles.hero} aria-labelledby="salary-title">
        <div className={styles.canvas}>
          <span className={styles.boardTab} aria-hidden="true">{copy.hero.boardTab}</span>
          <div className={styles.copy}>
            {heading}
            {bands ? (
              <>
                <p className={styles.sentence}>
                  <span>{c.iAm}</span>
                  <span className={styles.field}>
                    <select aria-label="Seu papel" value={role} onChange={e => setRole(e.target.value)}>
                      {live.roles.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                    </select>,
                  </span>
                  <span className={styles.field}>
                    <select aria-label={c.regime} value={regime} onChange={e => setRegime(e.target.value as "CLT" | "PJ")}>
                      {c.regimes.map(x => <option key={x}>{x}</option>)}
                    </select>,
                  </span>
                  <span>{c.inCompany}</span>
                  <span className={styles.field}>
                    <select aria-label={c.size} aria-describedby="porte" value={size} onChange={e => setSize(Number(e.target.value))}>
                      {c.sizes.map((label, i) => <option key={label} value={i}>{label}</option>)}
                    </select><sup aria-hidden="true">*</sup>{c.people}
                  </span>
                  <span>{c.andEarn}</span>
                  <span className={styles.money}><i>R$</i>
                    <input aria-label="Seu salário bruto por mês" inputMode="decimal" placeholder={c.placeholder} value={salary}
                      onChange={e => setSalary(e.target.value)} onBlur={() => { if (has) track("salary_check", { role, regime }); }} />
                  </span>
                  <span>{c.perMonth}</span>
                </p>
                <p id="porte" className={styles.sizesNote}>{c.sizesNote}</p>
                <div className={styles.answer} aria-live="polite">
                  {verdict ? (
                    <>
                      <strong data-verdict={verdict}>{c.verdicts[verdict]}</strong>
                      <p>{fill(c.explain[verdict], { ...money, gap: brl(gap) })}{regime === "PJ" ? ` ${c.pjNote}` : ""}</p>
                      <a href="#proximo-passo" className={styles.nowStep} onClick={e => { e.preventDefault(); goTo("proximo-passo"); }}>
                        <small>{copy.hero.next}</small>
                        <strong>{open!.title}</strong>
                        <span>{open!.cta} ↓</span>
                      </a>
                    </>
                  ) : <p>{c.typeHint}</p>}
                </div>
                {draft ? <p className={styles.draft}>{draft}</p> : null}
              </>
            ) : <p className={styles.intro}>{intro}</p>}
          </div>

          <div className={styles.stageCol}>
            <SalaryRuler priority lit={lit} bubbleKey={`${lit}-${verdict}`} youLabel={copy.hero.you} band={bands ? band : null} mine={has ? mine : null}
              bubble={yours !== null ? <><small>{copy.hero.you}</small>{c.verdicts[verdict!]}</> : copy.hero.doubts[lit]}
              zones={copy.zones.map((z, i) => ({ label: z.label, read: bands ? fill(c.zoneReads[i]!, money) : undefined }))}
              medianRead={bands ? fill(c.medianRead, money) : undefined} />
          </div>
        </div>
      </section>

      {/* ─── What moves the number, shown with the visitor's own role ─── */}
      {bands ? (
        <section id="o-que-muda" className={styles.section} aria-labelledby="factors-title">
          <p className={styles.kicker}>{f.kicker}</p>
          <h2 id="factors-title" className={styles.h2}>{f.title} <span>{f.continuation}</span></h2>
          <p className={styles.lead}>{f.lead}</p>
          <ol className={styles.factors}>
            {f.items.map((x, i) => (
              <li key={x.title}>
                <span className={styles.factorNum}>{String(i + 1).padStart(2, "0")}</span>
                <h3>{x.title}</h3>
                <p>{x.body}</p>
                <small>{fill(x.demo, money)}</small>
                <Bars rows={i === 0
                  ? neighbours.map(x => ({ label: x.label, value: bandFor(x.id, size, regime, live)!.p50, on: x.id === role }))
                  : i === 1
                    ? c.sizes.map((label, n) => ({ label, value: bandFor(role, n, regime, live)!.p50, on: n === size }))
                    : c.regimes.map(x => ({ label: x, value: bandFor(role, size, x as "CLT" | "PJ", live)!.p50, on: x === regime }))} />
              </li>
            ))}
          </ol>
          <p className={styles.tableNote}>{f.note}</p>
        </section>
      ) : null}

      {/* ─── The next step: one per place on the ruler; the visitor's own is open ─── */}
      <section id="proximo-passo" className={styles.section} aria-labelledby="next-title">
        <p className={styles.kicker}>{copy.next.kicker}</p>
        <h2 id="next-title" className={styles.h2}>{copy.next.title} <span>{copy.next.continuation}</span></h2>
        <p className={styles.lead}>{copy.next.lead}</p>
        <div className={styles.paths}>
          {copy.zones.map((z, i) => (
            <button key={z.label} type="button" aria-pressed={zone === i} aria-controls="zona-painel"
              className={styles.path} data-dim={(zone !== null && zone !== i) || undefined} onClick={() => setPicked(i)}>
              <span className={styles.pathFace}><Image src={FIGURES[i]!} alt="" width={1024} height={1536} sizes="96px" /></span>
              <span className={styles.pathText}>
                <small>{String(i + 1).padStart(2, "0")} · {z.label}</small>
                <strong>{z.title}</strong>
                <em>{yours === i ? copy.next.yours : zone === i ? "" : `${copy.next.pick} →`}</em>
              </span>
            </button>
          ))}
        </div>
        {open ? (
          <div id="zona-painel" className={styles.panel}>
            <div className={styles.panelText}>
              <h3>{open.title}</h3>
              <p>{open.body}</p>
              {open.links ? (
                <div className={styles.links}>
                  {open.links.map(l => <Link key={l.label} href={hrefs[l.to as "track" | "consulting"]} data-cta={`salario-${l.to}`}>{l.label} →</Link>)}
                </div>
              ) : <><p className={styles.panelTool}>{open.tool}</p><p className={styles.panelTool}>{copy.raise.lead}</p></>}
            </div>
            {zone === 0 ? <RaiseCheck copy={copy.raise} /> : null}
          </div>
        ) : null}
      </section>

      {/* ─── CLT x PJ, starting from the salary typed above ─── */}
      <section id="clt-pj" className={styles.section} aria-labelledby="cmp-title">
        <CltPjCompare key={has && regime === "CLT" ? mine : 0} copy={copy.compare} initialClt={has && regime === "CLT" ? mine : undefined}
          heading={<>
            <p className={styles.kicker}>{copy.compare.kicker}</p>
            <h2 id="cmp-title" className={styles.h2}>{copy.compare.title} <span>{copy.compare.continuation}</span></h2>
          </>} />
      </section>

      {/* ─── Every band, plain; a row takes its role back to the ruler ─── */}
      {bands ? (
        <section id="faixas" className={styles.section} aria-labelledby="faixas-title">
          <p className={styles.kicker}>{copy.table.kicker}</p>
          <h2 id="faixas-title" className={styles.h2}>{copy.table.title}</h2>
          <table className={styles.table}>
            <caption>{fill(copy.table.for, { size: c.sizes[size]!, regime })}</caption>
            <thead><tr>
              <th scope="col">{copy.table.colRole}</th>
              <th scope="col">{copy.table.colLow}<small>{copy.table.colLowHint}</small></th>
              <th scope="col">{copy.table.colMedian}<small>{copy.table.colMedianHint}</small></th>
              <th scope="col">{copy.table.colHigh}<small>{copy.table.colHighHint}</small></th>
            </tr></thead>
            <tbody>
              {live.roles.map(x => {
                const b = bandFor(x.id, size, regime, live)!;
                return (
                  <tr key={x.id} aria-current={x.id === role || undefined} onClick={() => { setRole(x.id); goTo("inicio"); }}>
                    <th scope="row">
                      {x.label}
                      {live.hasLiveData ? <small className={styles.roleSource}>{x.surveyWeight > 0 ? `${x.sampleCount} respostas` : "referência"}</small> : null}
                    </th>
                    <td>{brl(b.p25)}</td><td><strong>{brl(b.p50)}</strong></td><td>{brl(b.p75)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className={styles.tableNote}>{copy.table.note}{regime === "PJ" ? ` ${c.pjNote}` : ""}</p>
        </section>
      ) : null}
    </>
  );
}

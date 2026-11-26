"use client";

import { useId, useState, type ChangeEvent, type ReactNode } from "react";
import type { SalaryGuideContent } from "@/lib/resources";
import { brl } from "@/lib/salaryBands";
import styles from "@/app/(pt)/recursos/salario.module.css";

const num = (s: string) => Number(s.replace(/[^\d,]/g, "").replace(",", ".")) || 0;

/**
 * The CLT year (12 salaries, the 13th, a third more on vacation, 8% FGTS on all of it, benefits
 * and bonus) next to what a PJ contract must bill to end the year with the same: its taxes on the
 * billing and the accountant come out of 12 invoices.
 */
export function pjEquivalent({ clt, benefits, bonus, tax, accountant }: { clt: number; benefits: number; bonus: number; tax: number; accountant: number }) {
  const parts = { salaries: clt * 12, thirteenth: clt, vacation: clt / 3, fgts: clt * (13 + 1 / 3) * 0.08, benefits: benefits * 12, bonus };
  const pack = Object.values(parts).reduce((a, b) => a + b, 0);
  const monthly = (pack + accountant * 12) / (12 * (1 - tax / 100));
  return { parts, pack, monthly, invoices: monthly * 12, taxes: monthly * 12 * (tax / 100), accountant: accountant * 12, ratio: clt > 0 ? monthly / clt : 0 };
}

/**
 * Two columns that end on the same yearly total: the same salary, in two currencies. The section
 * heading comes in from the page so the rule of thumb under it can use this calculation's ratio.
 */
export default function CltPjCompare({ copy, initialClt, heading }: { copy: SalaryGuideContent["compare"]; initialClt?: number; heading: ReactNode }) {
  const [v, setV] = useState({ clt: String(initialClt || 10000), benefits: "1500", bonus: "0", tax: "9", accountant: "300" });
  const id = useId();
  const r = pjEquivalent({ clt: num(v.clt), benefits: num(v.benefits), bonus: num(v.bonus), tax: Math.min(num(v.tax), 60), accountant: num(v.accountant) });
  const set = (key: keyof typeof v) => (e: ChangeEvent<HTMLInputElement>) => setV(s => ({ ...s, [key]: e.target.value }));
  const field = (key: Exclude<keyof typeof v, "clt">, label: string, unit: "R$" | "%" = "R$") => (
    <label className={styles.cmpField}>
      <span>{label}</span>
      <span className={styles.cmpInput}>
        {unit === "R$" ? <i>R$</i> : null}
        <input inputMode="decimal" value={v[key]} onChange={set(key)} aria-describedby={key === "tax" ? `${id}-tax` : undefined} />
        {unit === "%" ? <i>%</i> : null}
      </span>
    </label>
  );
  const row = (label: string, value: number, sign = "+", hint?: string) => value > 0 ? <li key={label}><span>{label}{hint ? <small>{hint}</small> : null}</span><b>{sign} {brl(value)}</b></li> : null;
  const h = copy.hints;
  const k = copy.rows;

  return (
    <>
      {heading}
      <p className={styles.lead}>{copy.intro}</p>
      <p className={`${styles.lead} ${styles.cmpRule}`}>{copy.rule.replace("{ratio}", r.ratio.toLocaleString("pt-BR", { maximumFractionDigits: 1 }))}</p>
      <div className={styles.cmp}>
        <label className={styles.cmpMain}>
          <span>{copy.clt}</span>
          <span className={styles.money}><i>R$</i><input inputMode="decimal" value={v.clt} onChange={set("clt")} /></span>
          <span>{copy.perMonth}</span>
        </label>

        <div className={styles.cmpSides}>
          <section className={styles.cmpSide} aria-label="CLT">
            <p>{copy.cltTitle}</p>
            <ul>
              {row(k.salaries, r.parts.salaries)}
              {row(k.thirteenth, r.parts.thirteenth, "+", h.thirteenth)}
              {row(k.vacation, r.parts.vacation, "+", h.vacation)}
              {row(k.fgts, r.parts.fgts, "+", h.fgts)}
              {row(k.benefits, r.parts.benefits, "+", h.benefits)}
              {row(k.bonus, r.parts.bonus)}
            </ul>
          </section>
          <span className={styles.cmpEq} aria-hidden="true">=</span>
          <section className={styles.cmpSide} data-pj aria-label="PJ">
            <p>{copy.pjTitle}</p>
            <output className={styles.cmpBig} aria-live="polite">{brl(r.monthly)}<small> {copy.perMonth}</small></output>
            <em>{r.ratio.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {copy.ratio}</em>
            <ul>
              {row(k.invoices, r.invoices)}
              {row(k.tax, r.taxes, "−", h.tax)}
              {row(k.accountant, r.accountant, "−", h.accountant)}
            </ul>
          </section>
          <p className={styles.cmpTotal}><span>{copy.total}</span><strong>{brl(r.pack)}</strong></p>
        </div>

        <details className={styles.cmpAdjust}>
          <summary>{copy.adjust}<span aria-hidden="true" /></summary>
          <div>
            {field("benefits", copy.benefits)}
            {field("bonus", copy.bonus)}
            {field("accountant", copy.accountant)}
            {field("tax", copy.tax, "%")}
          </div>
          <small id={`${id}-tax`}>{copy.taxHint}</small>
        </details>
        <p className={styles.cmpNote}>{copy.note}</p>
      </div>
    </>
  );
}

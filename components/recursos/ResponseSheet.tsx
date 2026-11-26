"use client";

import { useEffect, useState } from "react";
import type { SalarySurveyContent } from "@/lib/resources";
import styles from "@/app/(pt)/recursos/survey.module.css";

type Field = keyof SalarySurveyContent["sheet"]["labels"];
const FIELDS: Field[] = ["role", "specialty", "experience", "regime", "salary", "bonus", "companySize", "sector", "state", "workModel", "gender"];

/**
 * The record the survey sends, drawn as a paper sheet that fills in as the person answers. It is
 * the proof of the anonymity promise: the lines for name and company are there, and empty by design.
 */
export default function ResponseSheet({ copy, values, active, compact = false }: {
  copy: SalarySurveyContent["sheet"]; values: Record<string, string>; active?: string; compact?: boolean;
}) {
  // The day only, as the record keeps it; set after mount so server and browser agree.
  const [date, setDate] = useState("");
  useEffect(() => { setDate(new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })); }, []);

  const shown = (k: Field) => {
    const v = values[k]?.trim();
    if (!v) return null;
    if (k === "salary") return `R$ ${v}`;
    if (k === "experience") return `${v} ${copy.experienceSuffix}`;
    return v;
  };

  return (
    <figure className={styles.sheet} data-compact={compact || undefined} aria-label={copy.title}>
      <header>
        <strong>{copy.title}</strong>
        <span>{copy.edition}</span>
      </header>
      <dl>
        {copy.absent.map(a => (
          <div key={a.label} data-absent>
            <dt>{a.label}</dt>
            <dd>{a.note}</dd>
          </div>
        ))}
        {FIELDS.map(k => {
          const v = shown(k);
          return (
            <div key={k} data-active={active === k || undefined} data-filled={v ? true : undefined}>
              <dt>{copy.labels[k]}</dt>
              <dd key={v ?? ""}>{v ?? copy.pending}</dd>
            </div>
          );
        })}
      </dl>
      <footer>
        <span>{copy.date.replace("{date}", date || "…")}</span>
        <span>{copy.email}</span>
      </footer>
    </figure>
  );
}

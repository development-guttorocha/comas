"use client";

import { useState, type ReactNode } from "react";
import { CHART_TYPE_LABELS, CHART_TYPES, parsePastedTable, readNumber, type ChartSeries, type ChartType } from "@/lib/chartSpec";
import { COMPONENT_BY_NAME } from "@/lib/admin/componentSchemas";
import type { FieldDef, Values } from "@/lib/admin/fields";
import { Fields, move } from "../Fields";
import { DownIcon, PlusIcon, TrashIcon, UpIcon } from "../icons";
import styles from "./ChartEditor.module.css";

/**
 * O gráfico editado como uma planilha: escolha o tipo, escreva (ou cole do Sheets/Excel) a tabela de
 * categorias × séries e ajuste as opções. Cada série tem a sua cor.
 */

const COLORS: { value: string; label: string }[] = [
  { value: "", label: "Automática" }, { value: "brand", label: "Cor do case" }, { value: "ink", label: "Texto" },
  { value: "soft", label: "Suave" }, { value: "muted", label: "Cinza" }, { value: "custom", label: "Personalizada…" },
];

const TYPE_PICS: Record<ChartType, ReactNode> = {
  column: <><path d="M4 24h32" /><rect x="7" y="13" width="5" height="11" rx="1" /><rect x="17.5" y="7" width="5" height="17" rx="1" fill="currentColor" fillOpacity=".25" /><rect x="28" y="16" width="5" height="8" rx="1" /></>,
  bar: <><path d="M5 3v22" /><rect x="5" y="5" width="22" height="4.5" rx="1" /><rect x="5" y="12" width="30" height="4.5" rx="1" fill="currentColor" fillOpacity=".25" /><rect x="5" y="19" width="15" height="4.5" rx="1" /></>,
  line: <><path d="M4 24h32" /><path d="M5 20l8-6 7 3 8-9 7 2" /><circle cx="35" cy="10" r="1.6" fill="currentColor" /></>,
  area: <><path d="M4 24h32" /><path d="M5 20l8-6 7 3 8-9 7 2v14H5z" fill="currentColor" fillOpacity=".2" /><path d="M5 20l8-6 7 3 8-9 7 2" /></>,
  progress: <><rect x="4" y="6" width="32" height="4" rx="2" /><rect x="4" y="6" width="24" height="4" rx="2" fill="currentColor" fillOpacity=".35" /><rect x="4" y="17" width="32" height="4" rx="2" /><rect x="4" y="17" width="13" height="4" rx="2" fill="currentColor" fillOpacity=".35" /></>,
  gauge: <><path d="M7 22a13 13 0 0 1 26 0" /><path d="M7 22a13 13 0 0 1 20.5-10.6" strokeWidth="3" /><path d="M20 22l5-6" /></>,
  beforeAfter: <><path d="M4 9h32M4 20h32" opacity=".35" /><path d="M10 9h18M8 20h12" strokeWidth="2.4" /><circle cx="10" cy="9" r="2.2" fill="currentColor" /><circle cx="28" cy="9" r="2.6" /><circle cx="8" cy="20" r="2.2" fill="currentColor" /><circle cx="20" cy="20" r="2.6" /></>,
};

/** A number cell that keeps what is typed ("1,") while it is being written. */
function NumberCell({ value, onChange, label }: { value: number | null; onChange: (value: number | null) => void; label: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input className={styles.cell} inputMode="decimal" aria-label={label} value={draft ?? (value === null ? "" : String(value).replace(".", ","))}
      onFocus={e => setDraft(e.target.value)} onBlur={() => setDraft(null)}
      onChange={e => { setDraft(e.target.value); onChange(readNumber(e.target.value)); }} />
  );
}

/** Inside a panel card the texts around the chart belong to the card: only the chart's options show. */
const CARD_OWNED = new Set(["sectionLabel", "heading", "intro", "title", "caption", "id"]);

export default function ChartEditor({ values, onChange, inCard }: { values: Values; onChange: (values: Values) => void; inCard?: boolean }) {
  const def = COMPONENT_BY_NAME.get("CaseChart")!;
  const fields: FieldDef[] = inCard ? def.fields.filter(f => !CARD_OWNED.has(f.key)) : def.fields;
  const type: ChartType = (CHART_TYPES as readonly string[]).includes(values.type as string) ? (values.type as ChartType) : "column";
  const categories = (Array.isArray(values.categories) ? values.categories : []).map(c => String(c ?? ""));
  const series: ChartSeries[] = (Array.isArray(values.series) ? values.series : []).map(raw => {
    const s = (raw ?? {}) as Partial<ChartSeries>;
    return { label: s.label ?? "", color: s.color, values: categories.map((_, i) => (Array.isArray(s.values) && typeof s.values[i] === "number" ? s.values[i]! : null)) };
  });
  const [pasting, setPasting] = useState<string | null>(null);
  const [pasteError, setPasteError] = useState("");

  const save = (next: { categories?: string[]; series?: ChartSeries[]; type?: ChartType }) => onChange({ ...values, categories, series, ...next });
  const setCell = (j: number, i: number, v: number | null) => save({ series: series.map((s, k) => (k === j ? { ...s, values: s.values.map((x, n) => (n === i ? v : x)) } : s)) });
  const addRow = () => save({ categories: [...categories, ""], series: series.map(s => ({ ...s, values: [...s.values, null] })) });
  const removeRow = (i: number) => save({ categories: categories.filter((_, n) => n !== i), series: series.map(s => ({ ...s, values: s.values.filter((_, n) => n !== i) })) });
  const moveRow = (i: number, to: number) => save({ categories: move(categories, i, to), series: series.map(s => ({ ...s, values: move(s.values, i, to) })) });
  const addSeries = () => save({ series: [...series, { label: `Série ${series.length + 1}`, values: categories.map(() => null) }] });

  function applyPaste() {
    const table = parsePastedTable(pasting ?? "");
    if (!table) { setPasteError("Não entendi a tabela: a primeira linha tem os nomes das séries e a primeira coluna, as categorias."); return; }
    save(table);
    setPasting(null);
    setPasteError("");
  }

  const needsTwo = type === "beforeAfter" && series.length < 2;
  return (
    <div className={styles.editor}>
      <div className={styles.types} role="radiogroup" aria-label="Tipo de gráfico">
        {CHART_TYPES.map(id => (
          <button key={id} type="button" role="radio" aria-checked={type === id} className={styles.type} title={CHART_TYPE_LABELS[id].hint} onClick={() => save({ type: id })}>
            <svg viewBox="0 0 40 28" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{TYPE_PICS[id]}</svg>
            <span>{CHART_TYPE_LABELS[id].label}</span>
          </button>
        ))}
      </div>
      <p className={styles.hint}>{CHART_TYPE_LABELS[type].hint}{needsTwo ? " Adicione uma segunda série para o depois." : ""}</p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.corner}>{type === "line" || type === "area" ? "Período" : "Categoria"}</th>
              {series.map((s, j) => (
                <th key={j}>
                  <div className={styles.seriesHead}>
                    <input className={styles.seriesName} value={s.label} placeholder={`Série ${j + 1}`} aria-label={`Nome da série ${j + 1}`} onChange={e => save({ series: series.map((x, k) => (k === j ? { ...x, label: e.target.value } : x)) })} />
                    <button type="button" className={styles.tool} aria-label={`Remover série ${s.label || j + 1}`} disabled={series.length < 2} onClick={() => save({ series: series.filter((_, k) => k !== j) })}><TrashIcon /></button>
                  </div>
                  <div className={styles.seriesColor}>
                    <select value={s.color && s.color.startsWith("#") ? "custom" : s.color ?? ""} aria-label={`Cor da série ${s.label || j + 1}`}
                      onChange={e => save({ series: series.map((x, k) => (k === j ? { ...x, color: e.target.value === "custom" ? "#ffffff" : e.target.value || undefined } : x)) })}>
                      {COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    {s.color?.startsWith("#") ? <input type="color" value={s.color} aria-label="Cor personalizada" onChange={e => save({ series: series.map((x, k) => (k === j ? { ...x, color: e.target.value } : x)) })} /> : null}
                  </div>
                </th>
              ))}
              <th className={styles.addCol} aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {categories.map((c, i) => (
              <tr key={i}>
                <td><input className={styles.category} value={c} placeholder={`Item ${i + 1}`} aria-label={`Categoria ${i + 1}`} onChange={e => save({ categories: categories.map((x, n) => (n === i ? e.target.value : x)) })} /></td>
                {series.map((s, j) => <td key={j}><NumberCell value={s.values[i] ?? null} label={`${c || `Item ${i + 1}`}, ${s.label || `série ${j + 1}`}`} onChange={v => setCell(j, i, v)} /></td>)}
                <td className={styles.rowTools}>
                  <button type="button" className={styles.tool} aria-label="Subir" disabled={i === 0} onClick={() => moveRow(i, i - 1)}><UpIcon /></button>
                  <button type="button" className={styles.tool} aria-label="Descer" disabled={i === categories.length - 1} onClick={() => moveRow(i, i + 1)}><DownIcon /></button>
                  <button type="button" className={styles.tool} aria-label={`Remover ${c || `item ${i + 1}`}`} disabled={categories.length < 2} onClick={() => removeRow(i)}><TrashIcon /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.tableActions}>
        <button type="button" className={styles.add} onClick={addRow}><PlusIcon />Linha</button>
        <button type="button" className={styles.add} onClick={addSeries} title="Uma nova coluna de valores, com a sua cor"><PlusIcon />Série</button>
        <button type="button" className={styles.add} onClick={() => setPasting(pasting === null ? "" : null)}>{pasting === null ? "Colar do Sheets ou Excel" : "Cancelar"}</button>
      </div>
      {pasting !== null ? (
        <div className={styles.paste}>
          <textarea value={pasting} onChange={e => setPasting(e.target.value)} rows={5} placeholder={"Copie as células da planilha e cole aqui.\nPrimeira linha: nomes das séries. Primeira coluna: categorias."} aria-label="Tabela colada" autoFocus />
          {pasteError ? <p className={styles.error}>{pasteError}</p> : null}
          <button type="button" className={styles.add} onClick={applyPaste} disabled={!pasting.trim()}>Usar esta tabela</button>
        </div>
      ) : null}

      <Fields defs={fields} values={values} onChange={onChange} />
    </div>
  );
}

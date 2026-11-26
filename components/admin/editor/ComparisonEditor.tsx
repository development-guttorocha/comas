"use client";

import { useId } from "react";
import { COMPONENT_BY_NAME } from "@/lib/admin/componentSchemas";
import type { Values } from "@/lib/admin/fields";
import { cellMark } from "@/lib/infographics";
import { Fields, move } from "../Fields";
import { DownIcon, PlusIcon, TrashIcon, UpIcon } from "../icons";
import styles from "./ChartEditor.module.css";

/**
 * A comparação editada como tabela: as colunas são as opções comparadas (uma pode ficar em destaque)
 * e cada linha, um atributo. Uma célula é ✓, ✕, "em parte" ou um texto curto.
 */

type Column = { label: string; highlight?: boolean };
type Row = { label: string; values: string[] };
const MARKS: { value: string; glyph: string; title: string }[] = [
  { value: "sim", glyph: "✓", title: "Sim" }, { value: "não", glyph: "✕", title: "Não" }, { value: "parcial", glyph: "~", title: "Em parte" },
];

export default function ComparisonEditor({ values, onChange }: { values: Values; onChange: (values: Values) => void }) {
  const def = COMPONENT_BY_NAME.get("CaseComparison")!;
  const group = useId();
  const columns: Column[] = (Array.isArray(values.columns) ? values.columns : []).map(c => ({ label: String((c as Column)?.label ?? ""), highlight: (c as Column)?.highlight || undefined }));
  const rows: Row[] = (Array.isArray(values.rows) ? values.rows : []).map(r => ({ label: String((r as Row)?.label ?? ""), values: columns.map((_, i) => String((r as Row)?.values?.[i] ?? "")) }));
  const save = (next: { columns?: Column[]; rows?: Row[] }) => onChange({ ...values, columns, rows, ...next });
  const setCell = (r: number, c: number, v: string) => save({ rows: rows.map((row, i) => (i === r ? { ...row, values: row.values.map((x, j) => (j === c ? v : x)) } : row)) });

  return (
    <div className={styles.editor}>
      <p className={styles.hint}>Cada coluna é uma opção comparada; marque a que deve ficar em destaque. Nas células, use os botões ✓ ✕ ~ ou escreva um texto curto.</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.corner}>Atributo</th>
              {columns.map((c, j) => (
                <th key={j}>
                  <div className={styles.seriesHead}>
                    <input className={styles.seriesName} value={c.label} placeholder={`Opção ${j + 1}`} aria-label={`Nome da coluna ${j + 1}`} onChange={e => save({ columns: columns.map((x, k) => (k === j ? { ...x, label: e.target.value } : x)) })} />
                    <button type="button" className={styles.tool} aria-label={`Remover coluna ${c.label || j + 1}`} disabled={columns.length < 2}
                      onClick={() => save({ columns: columns.filter((_, k) => k !== j), rows: rows.map(r => ({ ...r, values: r.values.filter((_, k) => k !== j) })) })}><TrashIcon /></button>
                  </div>
                  <label className={styles.seriesColor}>
                    <input type="radio" name={group} checked={!!c.highlight} onChange={() => save({ columns: columns.map((x, k) => ({ ...x, highlight: k === j || undefined })) })} />
                    <span>Destaque</span>
                  </label>
                </th>
              ))}
              <th className={styles.addCol} aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                <td><input className={styles.category} value={row.label} placeholder={`Atributo ${r + 1}`} aria-label={`Atributo ${r + 1}`} onChange={e => save({ rows: rows.map((x, i) => (i === r ? { ...x, label: e.target.value } : x)) })} /></td>
                {row.values.map((value, c) => {
                  const mark = cellMark(value);
                  return (
                    <td key={c}>
                      <div className={styles.markCell}>
                        <input className={styles.category} value={value} placeholder="—" aria-label={`${row.label || `Atributo ${r + 1}`}, ${columns[c]?.label || `opção ${c + 1}`}`} onChange={e => setCell(r, c, e.target.value)} />
                        {MARKS.map(m => (
                          <button key={m.value} type="button" className={styles.markButton} data-on={(mark === "yes" && m.value === "sim") || (mark === "no" && m.value === "não") || (mark === "partial" && m.value === "parcial") || undefined}
                            title={m.title} aria-label={m.title} onClick={() => setCell(r, c, m.value)}>{m.glyph}</button>
                        ))}
                      </div>
                    </td>
                  );
                })}
                <td className={styles.rowTools}>
                  <button type="button" className={styles.tool} aria-label="Subir" disabled={r === 0} onClick={() => save({ rows: move(rows, r, r - 1) })}><UpIcon /></button>
                  <button type="button" className={styles.tool} aria-label="Descer" disabled={r === rows.length - 1} onClick={() => save({ rows: move(rows, r, r + 1) })}><DownIcon /></button>
                  <button type="button" className={styles.tool} aria-label={`Remover ${row.label || `atributo ${r + 1}`}`} disabled={rows.length < 2} onClick={() => save({ rows: rows.filter((_, i) => i !== r) })}><TrashIcon /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.tableActions}>
        <button type="button" className={styles.add} onClick={() => save({ rows: [...rows, { label: "", values: columns.map(() => "") }] })}><PlusIcon />Atributo</button>
        <button type="button" className={styles.add} onClick={() => save({ columns: [...columns, { label: `Opção ${columns.length + 1}` }], rows: rows.map(r => ({ ...r, values: [...r.values, ""] })) })}><PlusIcon />Coluna</button>
      </div>
      <Fields defs={def.fields} values={values} onChange={onChange} />
    </div>
  );
}

import type { CareerTrackContent } from "@/lib/resources";
import styles from "@/app/(pt)/recursos/trilha.module.css";

/**
 * The printed track as it arrives: the real table, readable in its first columns and fading out
 * to the right and below, with the usage page behind it.
 */
export default function MaterialPreview({ material: m }: { material: CareerTrackContent["material"] }) {
  return (
    <div className={styles.paper} aria-hidden="true">
      <div className={styles.paperBack}>
        <p className={styles.paperH}>{m.howTo.title}</p>
        <ol>{m.howTo.steps.map(s => <li key={s}>{s}</li>)}</ol>
      </div>
      <div className={styles.paperFront}>
        <div className={styles.paperTop}><span /><b>Design Resources</b><i>guttorocha.com.br/recursos</i></div>
        <p className={styles.paperH}>{m.title}</p>
        <table>
          <thead><tr><th />{m.levels.map(l => <th key={l.id}>{l.name}<small>{l.scope}</small></th>)}</tr></thead>
          <tbody>
            {m.competencies.map(c => (
              <tr key={c.name}><th>{c.name}</th>{m.levels.map(l => <td key={l.id}><i />{c.levels[l.id as keyof typeof c.levels]}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { track } from "@vercel/analytics";
import { useState } from "react";
import CareerFlow from "@/components/recursos/CareerFlow";
import type { CareerTrackContent } from "@/lib/resources";
import styles from "@/app/(pt)/recursos/trilha.module.css";

/** Roles whose full text shows before the e-mail. */
const OPEN = new Set(["junior", "pleno", "senior"]);

/**
 * "Clique no seu papel": the flow lights the paths that leave the chosen role, and the panel
 * shows the role as the material has it. Past Sênior, the paths still show; the text is the
 * reason to leave the e-mail.
 */
export default function TrackExplorer({ content: s, gateHref }: { content: CareerTrackContent; gateHref: string }) {
  const c = s.explorer, m = s.material, flow = s.flow;
  const [sel, setSel] = useState("senior");
  const [touched, setTouched] = useState(false);
  const node = flow.nodes.find(n => n.id === sel)!;
  const level = m.levels.find(l => l.id === sel);
  const paths = flow.edges.filter(e => e.from === sel).map(e => ({ label: e.label, to: flow.nodes.find(n => n.id === e.to)!.label }));
  const pick = (id: string) => { setSel(id); setTouched(true); track("track_explore", { node: id }); };

  return (
    <div className={styles.explorer}>
      <ol className={styles.steps3} aria-label="Como usar">
        {c.steps.map((step, i) => (
          <li key={step} data-state={!touched ? (i === 0 ? "now" : undefined) : "done"}><span>{i + 1}</span>{step}</li>
        ))}
      </ol>
      <div className={styles.board} data-touched={touched || undefined}>
        <CareerFlow flow={flow} mode="pick" selected={sel} onSelect={pick} label={c.title} hint={!touched} />
      </div>

      <aside className={styles.panel} aria-live="polite">
        <p className={styles.panelKind}>{node.kind === "area" ? flow.areaNote.split(":")[0] : `${c.scope}: ${level?.scope}`}</p>
        <h3>{node.label}</h3>

        {node.kind === "area" ? <p className={styles.panelNote}>{c.areaHint}</p> : OPEN.has(sel) && level ? (
          <dl className={styles.comps}>
            {m.competencies.map(comp => <div key={comp.name}><dt>{comp.name}</dt><dd>{comp.levels[level.id as keyof typeof comp.levels]}</dd></div>)}
          </dl>
        ) : (
          <div className={styles.locked}>
            <dl className={styles.comps} aria-hidden="true">
              {m.competencies.slice(0, 3).map(comp => <div key={comp.name}><dt>{comp.name}</dt><dd>{"Descrição completa deste papel nesta competência, como está no material."}</dd></div>)}
            </dl>
            <div className={styles.lockCard}>
              <p>{c.locked}</p>
              <a href={gateHref} data-cta="explorar-desbloquear">{c.unlock} →</a>
            </div>
          </div>
        )}

        <div className={styles.paths}>
          <p>{c.paths}</p>
          {paths.length ? (
            <ul>{paths.map(p => <li key={p.to}><span>{p.label}</span><b>→ {p.to}</b></li>)}</ul>
          ) : <p className={styles.panelNote}>{c.noPaths}</p>}
        </div>
      </aside>
    </div>
  );
}

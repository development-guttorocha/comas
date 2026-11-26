"use client";

import { useMemo, useState } from "react";
import type { Case } from "@/lib/cases";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { readBlock } from "@/lib/admin/caseBlocks";
import { mergeCaseData, type DraftCaseData } from "@/lib/caseDraft/caseData";
import { CheckIcon, SparkIcon } from "./icons";
import styles from "./admin.module.css";
import p from "./aiProposal.module.css";

// The AI proposes, Gutto chooses (audit W2). The AI's draft never replaces the case by itself: it waits
// here next to what the case has now, and goes in whole, one section at a time, or not at all. Before
// anything goes in, the editor keeps the current version for "Desfazer IA".

export type Proposal = { at: string; body: NotionBlockNode[]; data?: DraftCaseData };
type Part = { key: string; position: number | null; label: string; blocks: NotionBlockNode[] };

/** The body cut at its section markers; what comes before the first one is the opening. */
export function caseParts(body: NotionBlockNode[]): Part[] {
  const out: Part[] = [];
  for (const block of body) {
    const model = readBlock(block);
    if (model.kind === "section") out.push({ key: block.id, position: model.position, label: model.label, blocks: [block] });
    else {
      if (!out.length) out.push({ key: "start", position: null, label: "Abertura", blocks: [] });
      out.at(-1)!.blocks.push(block);
    }
  }
  return out;
}

/** The body with one section of the proposal in place of the case's own (same number, else same name), or added in order. */
export function withSection(body: NotionBlockNode[], part: Part): NotionBlockNode[] {
  const parts = caseParts(body);
  const same = (x: Part) => x.position === part.position && (part.position !== null || x.key === "start");
  let at = parts.findIndex(same);
  if (at < 0 && part.label) at = parts.findIndex(x => x.label.trim().toLowerCase() === part.label.trim().toLowerCase());
  if (at >= 0) parts[at] = part;
  else {
    const after = part.position === null ? 0 : parts.findIndex(x => x.position !== null && x.position > part.position!);
    parts.splice(after < 0 ? parts.length : after, 0, part);
  }
  return parts.flatMap(x => x.blocks);
}

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const blocks = (n: number) => `${n} ${n === 1 ? "bloco" : "blocos"}`;
const name = (part: Part) => `${part.position ?? ""} ${part.label || "Sem nome"}`.trim();

export default function AiProposal({ proposal, body, data, onUseAll, onUseSection, onUseData, onClose }: {
  proposal: Proposal; body: NotionBlockNode[]; data: Case;
  onUseAll: () => void;
  onUseSection: (body: NotionBlockNode[]) => void;
  onUseData: () => void;
  /** Ignorar, or done after using some sections. */
  onClose: (used: boolean) => void;
}) {
  const [used, setUsed] = useState<Set<string>>(() => new Set());
  const now = useMemo(() => caseParts(body), [body]);
  const next = useMemo(() => caseParts(proposal.body), [proposal.body]);
  // Only the empty fields of Dados are filled: what Gutto wrote there never changes.
  const fills = useMemo(() => {
    if (!proposal.data) return 0;
    const merged = mergeCaseData(data, proposal.data) as unknown as Record<string, unknown>;
    const before = data as unknown as Record<string, unknown>;
    return Object.keys(merged).filter(k => JSON.stringify(merged[k]) !== JSON.stringify(before[k])).length;
  }, [data, proposal.data]);
  const any = used.size > 0;
  const mark = (key: string) => setUsed(prev => new Set(prev).add(key));

  return (
    <section className={p.proposal} aria-label="Proposta da IA">
      <header className={p.head}>
        <span className={p.title}><SparkIcon />Proposta da IA <span className={p.meta}>{next.length} {next.length === 1 ? "seção" : "seções"} · {when(proposal.at)}</span></span>
        <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={() => onClose(any)}>{any ? "Concluir" : "Ignorar"}</button>
        <button type="button" className={styles.button} onClick={onUseAll}>Usar tudo</button>
      </header>
      <div className={p.columns}>
        <div>
          <span className={p.colTitle}>Agora no case</span>
          {now.length ? (
            <ol className={p.list}>{now.map(part => <li key={part.key}><span>{name(part)}</span><span className={p.count}>{blocks(part.blocks.length)}</span></li>)}</ol>
          ) : <p className={p.empty}>Ainda sem conteúdo.</p>}
        </div>
        <div>
          <span className={p.colTitle}>Proposta</span>
          <ol className={p.list}>
            {next.map(part => (
              <li key={part.key}>
                <span>{name(part)}</span><span className={p.count}>{blocks(part.blocks.length)}</span>
                {used.has(part.key)
                  ? <span className={p.done}><CheckIcon />Usada</span>
                  : <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => { onUseSection(withSection(body, part)); mark(part.key); }}>Usar esta seção</button>}
              </li>
            ))}
            {fills ? (
              <li>
                <span>Campos vazios da aba Dados</span><span className={p.count}>{fills} {fills === 1 ? "campo" : "campos"}</span>
                {used.has("data")
                  ? <span className={p.done}><CheckIcon />Usados</span>
                  : <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => { onUseData(); mark("data"); }}>Usar</button>}
              </li>
            ) : null}
          </ol>
        </div>
      </div>
      <p className={p.foot}>Antes de aplicar, a versão atual fica guardada: depois dá para desfazer. Nada é gravado até você salvar.</p>
    </section>
  );
}

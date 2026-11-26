"use client";
/* eslint-disable @next/next/no-img-element -- admin thumbnails: local files on this machine, no optimizer needed. */

import { useEffect, useRef, useState } from "react";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import type { CaseMaterial } from "@/lib/caseMaterial";
import { DRAFT_KINDS, DRAFT_VOCABULARY, draftTypeLabel, type CasePlan, type DraftKind, type DraftType, type PlanBlock } from "@/lib/caseDraft/plan";
import type { DraftCaseData } from "@/lib/caseDraft/caseData";
import BusyOverlay from "./BusyOverlay";
import { api } from "./client";
import styles from "./admin.module.css";
import css from "./caseDraft.module.css";

export type DraftImageInfo = { src: string; kind: string | null; width: number; height: number };
export type DraftWarning = { section: number; block: number; message: string };
type Finding = { check: string; severity: "erro" | "aviso"; index: number; message: string };
type DraftAnswer = {
  body: NotionBlockNode[]; data: DraftCaseData; findings: Finding[]; fixed: Finding[]; dropped: { block: string; reason: string }[];
  checklist?: Record<string, boolean>; reviewed: boolean; tokens: { write: number; review: number; data: number; total: number }; from: "material" | "case";
};
/** Lives in the case editor, so the plan survives switching tabs. */
export type DraftState = {
  plan: CasePlan; warnings: DraftWarning[]; images: DraftImageInfo[]; planTokens: number; from: "material" | "case";
  result?: Omit<DraftAnswer, "body" | "data"> & { blocks: number };
};

const SCREEN_ONLY = new Set(["CaseImageStack", "CaseScreens"]);
const kTokens = (n: number) => `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

/**
 * The case draft with AI, in the Material tab: the AI proposes the skeleton, Gutto corrects it
 * (order, component, sections), and the approved plan is written into the editor. Nothing is saved
 * until he clicks Salvar; Descartar goes back to what is saved.
 */
export default function CaseDraftPanel({ slug, material, hasBody, state, onState, onDraft, notify }: {
  slug: string; material: CaseMaterial; hasBody: boolean;
  state: DraftState | null; onState: (state: DraftState | null) => void;
  onDraft: (body: NotionBlockNode[], data?: DraftCaseData) => void; notify: (value: unknown) => void;
}) {
  const [busy, setBusy] = useState("");
  const [notes, setNotes] = useState("");
  const edited = useRef(false);
  const plan = state?.plan;
  const images = new Map((state?.images ?? []).map(i => [i.src, i]));

  // Every edit of the plan is checked again, without the AI.
  useEffect(() => {
    if (!state || !edited.current) return;
    const timer = window.setTimeout(async () => {
      try {
        const { warnings } = await api<{ warnings: DraftWarning[] }>(`/api/admin/cases/${slug}/draft`, { method: "POST", body: { step: "check", material, plan: state.plan } });
        edited.current = false;
        onState({ ...state, warnings });
      } catch { /* the warnings only lag behind */ }
    }, 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the plan triggers a new check
  }, [state?.plan]);

  function setPlan(next: CasePlan) {
    if (!state) return;
    edited.current = true;
    onState({ ...state, plan: next, result: undefined });
  }
  const setSections = (sections: CasePlan["sections"]) => plan && setPlan({ ...plan, sections });
  const setBlocks = (si: number, blocks: PlanBlock[]) => plan && setSections(blocks.length ? plan.sections.map((s, i) => (i === si ? { ...s, blocks } : s)) : plan.sections.filter((_, i) => i !== si));
  const setBlock = (si: number, bi: number, patch: Partial<PlanBlock>) => plan && setBlocks(si, plan.sections[si]!.blocks.map((b, j) => (j === bi ? { ...b, ...patch } : b)));

  async function propose() {
    if (plan && !window.confirm("Propor de novo substitui o plano que você corrigiu. Continuar?")) return;
    setBusy("A IA está lendo o material e as imagens e montando o esqueleto do case…");
    try {
      const r = await api<{ plan: CasePlan; warnings: DraftWarning[]; tokens: number; images: DraftImageInfo[]; from: "material" | "case" }>(`/api/admin/cases/${slug}/draft`, { method: "POST", body: { step: "plan", material, notes } });
      edited.current = false;
      onState({ plan: r.plan, warnings: r.warnings, images: r.images, planTokens: r.tokens, from: r.from });
    } catch (error) {
      notify(error);
    } finally {
      setBusy("");
    }
  }

  async function write() {
    if (!plan) return;
    if (hasBody && !window.confirm("O rascunho substitui o conteúdo no editor. Nada é gravado até você clicar em Salvar, e Descartar volta ao que está salvo. Continuar?")) return;
    setBusy("A IA está escrevendo as seções, o filtro confere imagens, números e citações, e a revisão corrige o que a checagem achar. Leva de dois a quatro minutos…");
    try {
      const r = await api<DraftAnswer>(`/api/admin/cases/${slug}/draft`, { method: "POST", body: { step: "write", material, plan } });
      const { body, data, ...rest } = r;
      onState({ ...state!, result: { ...rest, blocks: body.length } });
      onDraft(body, data);
    } catch (error) {
      notify(error);
    } finally {
      setBusy("");
    }
  }

  const warningsAt = (si: number, bi: number) => (state?.warnings ?? []).filter(w => w.section === si && w.block === bi);
  const general = (state?.warnings ?? []).filter(w => w.section < 0);
  const total = (state?.planTokens ?? 0) + (state?.result?.tokens.total ?? 0);

  return (
    <section className={`${styles.panel} ${styles.formPanel}`} aria-label="Rascunho do case com IA">
      <div className={css.wrap}>
        <div className={css.head}>
          <div>
            <h2>Rascunho com IA</h2>
            <p className={styles.hint} style={{ margin: "2px 0 0" }}>
              Parte do material abaixo{state?.from === "case" ? "; como ele está vazio, usa o texto atual do case" : " (vazio: usa o texto atual do case)"}. O resultado é um esqueleto para editar. Nada é gravado sem você clicar em Salvar.
            </p>
            <ol className={css.steps}>
              <li data-on={!plan || undefined}>Propor estrutura</li>
              <li data-on={(plan && !state?.result) || undefined}>Corrigir o plano</li>
              <li data-on={state?.result ? true : undefined}>Escrever no editor</li>
            </ol>
          </div>
          <div className={css.actions}>
            {plan ? <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={() => void propose()}>Propor de novo</button> : null}
            {plan ? <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => void write()} disabled={!plan.sections.length}>Escrever rascunho</button>
              : <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => void propose()}>Propor estrutura</button>}
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Pedido para a IA (opcional)</span>
          <input className={styles.input} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex.: abra pelo problema do lojista; quero o depoimento no fim." />
        </label>

        {plan ? (
          <>
            <div className={css.meta}>
              <label className={styles.field} style={{ minWidth: 280 }}>
                <span className={styles.label}>Modelo</span>
                <select className={styles.select} value={plan.kind} onChange={e => setPlan({ ...plan, kind: e.target.value as DraftKind })}>
                  {DRAFT_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </label>
            </div>
            {general.length ? <ul className={css.list}>{general.map((w, i) => <li key={i}><span className={styles.chip} data-tone="warn">Aviso</span> {w.message}</li>)}</ul> : null}

            {plan.sections.map((s, si) => (
              <div key={si} className={css.section}>
                <div className={css.sectionHead}>
                  <span className={css.num}>{si + 1}</span>
                  <input className={styles.input} value={s.label} maxLength={24} aria-label={`Rótulo da seção ${si + 1}`} onChange={e => setSections(plan.sections.map((x, i) => (i === si ? { ...x, label: e.target.value } : x)))} />
                  <span className={css.tools}>
                    <button type="button" title="Subir a seção" disabled={si === 0} onClick={() => setSections(move(plan.sections, si, si - 1))}>↑</button>
                    <button type="button" title="Descer a seção" disabled={si === plan.sections.length - 1} onClick={() => setSections(move(plan.sections, si, si + 1))}>↓</button>
                    <button type="button" title="Tirar a seção" onClick={() => setSections(plan.sections.filter((_, i) => i !== si))}>✕</button>
                  </span>
                </div>
                {warningsAt(si, -1).map((w, i) => <p key={i} className={styles.hint} style={{ margin: 0 }}><span className={styles.chip} data-tone="warn">Aviso</span> {w.message}</p>)}
                {s.blocks.map((b, bi) => (
                  <div key={bi} className={css.block}>
                    <span className={css.num}>{si + 1}.{bi + 1}</span>
                    <div className={css.blockBody}>
                      <div className={css.blockTop}>
                        <select className={styles.select} value={b.component} aria-label="Componente" onChange={e => setBlock(si, bi, { component: e.target.value as DraftType })}>
                          {DRAFT_VOCABULARY.map(t => <option key={t} value={t}>{draftTypeLabel(t)}</option>)}
                        </select>
                        <textarea className={`${styles.textarea} ${css.idea}`} value={b.idea} aria-label="O que o bloco diz" onChange={e => setBlock(si, bi, { idea: e.target.value })} />
                      </div>
                      {b.images.length ? (
                        <div className={css.thumbs}>
                          {b.images.map(src => {
                            const info = images.get(src);
                            const wrong = SCREEN_ONLY.has(b.component) && info?.kind && info.kind !== "tela-app" && info.kind !== "tela-web";
                            return (
                              <span key={src} className={css.thumb} title={`${src.split("/").pop()}${info?.kind ? ` · ${info.kind}` : ""}`} data-warn={wrong || undefined}>
                                <img src={src} alt="" />
                                <button type="button" aria-label="Tirar a imagem" onClick={() => setBlock(si, bi, { images: b.images.filter(x => x !== src) })}>×</button>
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                      {b.why ? <span className={css.why}>{b.why}</span> : null}
                      {warningsAt(si, bi).map((w, i) => <span key={i} className={styles.hint}><span className={styles.chip} data-tone="warn">Aviso</span> {w.message}</span>)}
                    </div>
                    <span className={css.tools}>
                      <button type="button" title="Subir" disabled={bi === 0} onClick={() => setBlocks(si, move(s.blocks, bi, bi - 1))}>↑</button>
                      <button type="button" title="Descer" disabled={bi === s.blocks.length - 1} onClick={() => setBlocks(si, move(s.blocks, bi, bi + 1))}>↓</button>
                      <button type="button" title="Tirar o bloco" onClick={() => setBlocks(si, s.blocks.filter((_, j) => j !== bi))}>✕</button>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </>
        ) : null}

        {state?.result ? (
          <div className={css.result}>
            <strong style={{ fontSize: 13, fontWeight: 500 }}>Rascunho no editor: {state.result.blocks} blocos com seções e divisores{state.result.reviewed ? ", revisado" : ""}</strong>
            <div className={css.meta}>
              <span className={styles.chip}>Plano {kTokens(state.planTokens)} tokens</span>
              <span className={styles.chip}>Texto {kTokens(state.result.tokens.write)}</span>
              {state.result.tokens.review ? <span className={styles.chip}>Revisão {kTokens(state.result.tokens.review)}</span> : null}
              <span className={styles.chip} data-tone="good">Total {kTokens(total)} tokens</span>
            </div>
            {state.result.checklist ? (
              <div className={css.meta}>{Object.entries(state.result.checklist).map(([k, ok]) => <span key={k} className={styles.chip} data-tone={ok ? "good" : "warn"}>{k}</span>)}</div>
            ) : null}
            {state.result.findings.length ? (
              <details open>
                <summary className={styles.hint} style={{ cursor: "pointer" }}>Checagem: {state.result.findings.filter(f => f.severity === "erro").length} erros e {state.result.findings.filter(f => f.severity === "aviso").length} avisos</summary>
                <ul className={css.list} style={{ marginTop: 8 }}>{state.result.findings.map((f, i) => <li key={i}><strong>{f.severity}</strong> · {f.message}</li>)}</ul>
              </details>
            ) : <span className={styles.hint}>A checagem automática não achou problema.</span>}
            {state.result.fixed.length ? (
              <details>
                <summary className={styles.hint} style={{ cursor: "pointer" }}>A revisão corrigiu {state.result.fixed.length} {state.result.fixed.length === 1 ? "problema" : "problemas"} da primeira versão</summary>
                <ul className={css.list} style={{ marginTop: 8 }}>{state.result.fixed.map((f, i) => <li key={i}><strong>{f.severity}</strong> · {f.message}</li>)}</ul>
              </details>
            ) : null}
            {state.result.dropped.length ? (
              <details>
                <summary className={styles.hint} style={{ cursor: "pointer" }}>O filtro cortou {state.result.dropped.length} {state.result.dropped.length === 1 ? "coisa" : "coisas"}</summary>
                <ul className={css.list} style={{ marginTop: 8 }}>{state.result.dropped.map((d, i) => <li key={i}><strong>{d.block}</strong>: {d.reason}</li>)}</ul>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>
      <BusyOverlay label={busy} />
    </section>
  );
}

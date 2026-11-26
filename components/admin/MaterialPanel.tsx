"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  dismissKeys, itemProblems, materialCounts, SCALAR_LABELS,
  type AnyItem, type CaseMaterial, type ListKey, type MaterialDecision, type MaterialOrigin, type MaterialQuote, type MaterialResult, type ScalarKey,
} from "@/lib/caseMaterial";
import { draftTypeLabel } from "@/lib/caseDraft/plan";
import type { ChatMessage } from "@/lib/material/chat";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { api } from "./client";
import { ArrowIcon, CheckIcon, CloseIcon, UploadIcon } from "./icons";
import Skeleton from "./Skeleton";
import type { DraftCaseData } from "@/lib/caseDraft/caseData";
import styles from "./admin.module.css";
import m from "./material.module.css";

// The Material tab: a conversation, one column, one path. Gutto drops the material, answers a few
// short questions, asks for the structure, then the draft. The four steps sit in a thin rail on top,
// and the next step is always the strip above the text box. What the AI already knows (each fact
// with where it came from) is a column beside the conversation from 1200px (the editor's side slot),
// and a fold under it below that; a fact can be confirmed or removed there, and corrected by saying
// so in the conversation. The white action of the screen is "Publicar": nothing here is white.

const thousands = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : String(n));
const time = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const ME: MaterialOrigin = { source: "gutto", file: "Você", where: "confirmado no painel" };
const STEPS = ["Material", "Perguntas", "Estrutura", "Rascunho"] as const;
/** The conversation's old line for a draft (lib/material/chat.ts): today the draft arrives as a proposal. */
const DRAFTED = /^Rascunho no editor, na aba Conteúdo\. Nada foi gravado: revise e clique em Salvar\.\s*/;
/** A numbered or bulleted line: the questions, when the message also carries them as a list. */
const LIST_LINE = /^\s*(\d+[.)]|[-•])\s+/;

/**
 * Where the draft stands, from the case itself (audit MAT-1), not from the text of the messages:
 * a proposal waiting for Gutto, an AI draft in the editor not saved yet, or a case that has content.
 */
export type MaterialDraftState = { kind: "proposal"; at: string } | { kind: "unsaved" } | { kind: "content" } | { kind: "none" };

type Turn = { messages: ChatMessage[]; material: CaseMaterial; revision: string; unread: number; tokens: number; draft?: NotionBlockNode[]; draftData?: DraftCaseData; failed: { name: string; error: string }[] };

/** The AI's line without the question list, when the questions come apart and are shown as a block. */
function lead(msg: ChatMessage) {
  if (DRAFTED.test(msg.text)) return `Rascunho escrito: foi como proposta para a aba Conteúdo.${msg.text.replace(DRAFTED, " ").trimEnd()}`.trim();
  if (!msg.questions?.length) return msg.text;
  return msg.text.split("\n").filter(line => !LIST_LINE.test(line)).join("\n").trim();
}

/** One fact in the drawer: what it says, where it came from and, if it is not a fact yet, why. */
function Fact({ item, kind, label, onConfirm, onRemove }: { item: AnyItem; kind?: ListKey; label?: string; onConfirm: () => void; onRemove: () => void }) {
  const problems = itemProblems(item, kind);
  let main = "", extra: string[] = [];
  if (kind === "decisions") { const d = item as MaterialDecision; main = d.decision ?? ""; extra = [d.why ? `Por quê: ${d.why}` : "", d.tradeoff ? `Abriu mão: ${d.tradeoff}` : ""]; }
  else if (kind === "results") { const r = item as MaterialResult; main = [r.metric, [r.before, r.value].filter(Boolean).join(" → ")].filter(Boolean).join(": "); extra = [r.source ? `Medido em: ${r.source}` : ""]; }
  else if (kind === "quotes") { const q = item as MaterialQuote; main = `“${q.text ?? ""}”`; extra = [[q.author, q.role].filter(Boolean).join(", ")]; }
  else main = `${label ? `${label}: ` : ""}${"text" in item ? item.text : ""}`;
  const from = item.origins?.filter(o => o.where !== ME.where) ?? [];
  return (
    <div className={m.fact}>
      <div className={m.factHead}>
        <span className={m.factText}>{main}{extra.filter(Boolean).map((e, i) => <small key={i}>{e}</small>)}</span>
        <span className={m.factActions}>
          {problems.length ? <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton}`} title="Confirmo: entra no case como está" aria-label="Confirmar" onClick={onConfirm}><CheckIcon /></button> : null}
          <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton} ${styles.danger}`} title="Remover" aria-label="Remover" onClick={onRemove}><CloseIcon /></button>
        </span>
      </div>
      {from.length ? <span className={m.origin} title={from.map(o => (o.excerpt ? `“${o.excerpt}”` : "")).filter(Boolean).join("\n")}>{[...new Set(from.map(o => [o.file, o.where].filter(Boolean).join(" · ")))].join("; ")}</span> : null}
      {problems.length ? <span className={m.problem}>{problems.join("; ")}</span> : null}
    </div>
  );
}

function Known({ material, onChange, tokens }: { material: CaseMaterial; onChange: (m: CaseMaterial) => void; tokens: number }) {
  const counts = materialCounts(material);
  const confirm = (item: AnyItem): AnyItem => ({ ...item, origins: [...(item.origins ?? []), ME] });
  const dismissed = (item: AnyItem) => (item.by === "ia" ? [...new Set([...(material.dismissed ?? []), ...dismissKeys(item)])] : material.dismissed);
  const scalar = (keys: ScalarKey[]) => keys.filter(k => material[k]).map(k => (
    <Fact key={k} item={material[k]!} label={SCALAR_LABELS[k]}
      onConfirm={() => onChange({ ...material, [k]: confirm(material[k]!) })}
      onRemove={() => onChange({ ...material, [k]: undefined, dismissed: dismissed(material[k]!) })} />
  ));
  const list = (key: ListKey) => ((material[key] ?? []) as AnyItem[]).map((item, i, all) => (
    <Fact key={i} item={item} kind={key}
      onConfirm={() => onChange({ ...material, [key]: all.map((x, j) => (j === i ? confirm(x) : x)) })}
      onRemove={() => { const rest = all.filter((_, j) => j !== i); onChange({ ...material, [key]: rest.length ? rest : undefined, dismissed: dismissed(item) }); }} />
  ));
  const groups: [string, React.ReactNode[]][] = [
    ["Contexto", scalar(["company", "product", "period"])],
    ["Seu papel", scalar(["roleTitle", "roleTeam", "rolePartners"])],
    ["Problema", scalar(["problem"])],
    ["Decisões", list("decisions")],
    ["Resultados", list("results")],
    ["Depoimentos", list("quotes")],
    ["O que mudou", scalar(["changes"])],
  ];
  return (
    <>
      <p className={m.sideHint}>
        {counts.facts + counts.flagged ? <>Para conferir. Para corrigir, diga na conversa.{counts.flagged ? <> <span className={m.flagged}>{counts.flagged} sem confirmação</span> ficam fora do case.</> : null}</> : "Nada ainda. Aparece aqui conforme a IA lê."}
      </p>
      {groups.filter(([, items]) => items.length).map(([title, items]) => (
        <div key={title} className={m.group}><span className={m.groupTitle}>{title}</span>{items}</div>
      ))}
      {material.questions?.length ? (
        <div className={m.group}>
          <span className={m.groupTitle}>Em aberto</span>
          <ul className={m.missing}>{material.questions.map(q => <li key={q.id}>{q.text}</li>)}</ul>
        </div>
      ) : null}
      {tokens ? <span className={m.cost}>Esta conversa: {thousands(tokens)} tokens.</span> : null}
    </>
  );
}

const day = (iso: string) => { const [y, mo, d] = iso.slice(0, 10).split("-"); return y && mo && d ? `${d}/${mo}` : ""; };

export default function MaterialPanel({ slug, material, revision, onChange, onSynced, onDraft, draft, onOpenDraft, notify, side, savedOn }: {
  slug: string; material: CaseMaterial; revision: string;
  onChange: (material: CaseMaterial) => void;
  /** After each message: the material as the server saved it. */
  onSynced: (material: CaseMaterial, revision: string) => void;
  onDraft: (body: NotionBlockNode[], data?: DraftCaseData) => void;
  draft: MaterialDraftState;
  /** Goes to the Conteúdo tab, where the draft is. */
  onOpenDraft: () => void;
  notify: (value: unknown, tone?: "good" | "bad") => void;
  /** The editor's side column (from 1200px): what the AI knows goes there; without it, a fold under the conversation. */
  side?: HTMLElement | null;
  /** The day the case was last saved (case.updatedAt), for the last step. */
  savedOn?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [tokens, setTokens] = useState(0);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [waiting, setWaiting] = useState<{ text: string; since: number } | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [over, setOver] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const latest = useRef({ material, revision });
  useEffect(() => { latest.current = { material, revision }; }, [material, revision]);

  useEffect(() => {
    api<{ messages: ChatMessage[]; tokens: number }>(`/api/admin/cases/${slug}/material/chat`).then(r => { setMessages(r.messages); setTokens(r.tokens); }, () => setMessages([]));
  }, [slug]);
  // The first load opens at the end of the conversation; new messages scroll there smoothly.
  const loaded = useRef(false);
  useEffect(() => {
    if (!messages) return;
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: loaded.current ? "smooth" : "instant" });
    loaded.current = true;
  }, [messages, waiting]);
  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => setSeconds(Math.round((Date.now() - waiting.since) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [waiting]);

  const send = useCallback(async function send(payload: { text?: string; files?: File[]; action?: "continuar" | "plano" | "rascunho" }): Promise<boolean> {
    const form = new FormData();
    form.set("text", payload.text ?? "");
    for (const f of payload.files ?? []) form.append("files", f);
    form.set("material", JSON.stringify(latest.current.material));
    form.set("revision", latest.current.revision);
    if (payload.action) form.set("action", payload.action);
    const label = payload.action === "rascunho" ? "Escrevendo o rascunho (1 a 3 minutos)…"
      : payload.action === "plano" ? "Montando a estrutura do case…"
        : payload.files?.length ? "Lendo os arquivos…" : payload.action === "continuar" ? "Lendo o resto do material…" : "Pensando…";
    setSeconds(0);
    setWaiting({ text: label, since: Date.now() });
    try {
      const r = await api<Turn>(`/api/admin/cases/${slug}/material/chat`, { method: "POST", body: form });
      setMessages(prev => [...(prev ?? []), ...r.messages]);
      setTokens(t => t + r.tokens);
      latest.current = { material: r.material, revision: r.revision };
      onSynced(r.material, r.revision);
      if (r.draft) onDraft(r.draft, r.draftData);
      // A big file is read in parts: the conversation answers first and keeps reading.
      if (r.unread > 0) window.setTimeout(() => void send({ action: "continuar" }), 50);
      return true;
    } catch (error) {
      notify(error);
      return false;
    } finally { setWaiting(null); }
  }, [notify, onDraft, onSynced, slug]);

  async function submit() {
    if (waiting || (!text.trim() && !files.length)) return;
    const payload = { text, files };
    setText(""); setFiles([]);
    if (!(await send(payload))) { setText(payload.text); setFiles(payload.files); }
  }

  const add = (picked: File[]) => { if (picked.length) { setFiles(prev => [...prev, ...picked]); input.current?.focus(); } };

  // Where Gutto is on the one path: material → questions → structure → draft.
  const all = messages ?? [];
  const planAt = all.findLastIndex(msg => msg.plan);
  const hasMaterial = all.some(msg => msg.role === "gutto");
  // The last step reads the case: a draft waiting or in the editor, or (after a structure) a case with content.
  const isDrafted = draft.kind === "proposal" || draft.kind === "unsaved" || (planAt >= 0 && draft.kind === "content");
  const step = !hasMaterial ? 0 : isDrafted ? 3 : planAt < 0 ? 1 : 2;
  const lastIa = [...all].reverse().find(msg => msg.role === "ia");
  const ready = !!lastIa?.offerPlan;
  const asking = !!lastIa && (!!lastIa.questions?.length || /\?\s*$/m.test(lastIa.text)) && step === 1;
  const counts = materialCounts(material);
  const known = counts.facts + counts.flagged;

  // The screen's one white action is Publicar: the next step and Enviar are grey.
  const typing = !!text.trim() || files.length > 0;
  const stepButton = () => `${styles.button} ${styles.small} ${m.go}`;
  // The last step says where the draft is, read from the case (MAT-1).
  const lastLabel = step < 3 ? STEPS[3]
    : draft.kind === "proposal" ? "Proposta esperando sua escolha"
      : draft.kind === "unsaved" ? "Rascunho no editor, sem salvar"
        : savedOn && day(savedOn) ? `Rascunho salvo em ${day(savedOn)}` : "Rascunho salvo no case";
  const facts = <Known material={material} onChange={onChange} tokens={tokens} />;

  const placeholder = step === 0 ? "Cole um texto, ou arraste arquivos para cá"
    : asking ? "Responda só o que souber. “Não sei” também vale."
      : step === 2 ? "Peça mudanças na estrutura, ou siga para o rascunho"
        : "Escreva para a IA";

  return (
    <div className={m.layout}>
      <section
        className={m.chat} data-over={over} aria-label="Conversa sobre o material"
        // the idle lock reads this, so it never locks the admin while the AI is answering
        aria-busy={waiting ? true : undefined}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false); }}
        onDrop={e => { e.preventDefault(); setOver(false); add([...e.dataTransfer.files]); }}
      >
        <header className={m.bar}>
          <ol className={m.steps} aria-label="Passos">
            {STEPS.map((label, i) => (
              <li key={label} data-state={i < step ? "done" : i === step ? "now" : "next"} aria-current={i === step ? "step" : undefined}>
                <span className={m.stepMark}>{i < step ? <CheckIcon /> : i + 1}</span>{i === 3 ? lastLabel : label}
              </li>
            ))}
          </ol>
        </header>

        <div className={m.messages} ref={list}>
          <div className={m.thread}>
            {!messages ? <Skeleton kind="chat" label="Abrindo a conversa" /> : null}
            {messages && !messages.length && !waiting ? (
              <div className={m.start}>
                <span className={m.startIcon}><UploadIcon /></span>
                <h2>Comece pelo material</h2>
                <p>Deck, PDF, Word, prints ou texto colado, como estiver. Pode mandar tudo de uma vez: eu leio, digo o que entendi e pergunto só o que faltar.</p>
                <button type="button" className={styles.button} onClick={() => picker.current?.click()}><UploadIcon />Escolher arquivos</button>
                <span className={m.startHint}>ou arraste para cá, ou cole o texto na caixa abaixo</span>
              </div>
            ) : null}
            {all.map(msg => (
              <div key={msg.id} className={m.msg} data-role={msg.role}>
                <span className={m.meta} suppressHydrationWarning title={msg.role === "ia" && msg.tokens ? `${thousands(msg.tokens)} tokens` : undefined}>{time(msg.at)}</span>
                {msg.text ? <div className={m.bubble}>{msg.role === "ia" ? lead(msg) : msg.text}</div> : null}
                {msg.role === "ia" && msg.questions?.length ? (
                  <ol className={m.questions}>{msg.questions.map((q, i) => <li key={i}>{q}</li>)}</ol>
                ) : null}
                {msg.attachments?.length ? (
                  <div className={m.attachments}>
                    {msg.attachments.map((a, i) => <span key={i} className={m.attachment} data-bad={!a.id}><b title={a.name}>{a.name}</b>{a.line ? <span>{a.line}</span> : null}</span>)}
                  </div>
                ) : null}
                {msg.plan ? (
                  <div className={m.plan}>
                    <span className={m.planTitle}>Estrutura do case</span>
                    <ol>
                      {msg.plan.sections.map((s, i) => (
                        <li key={i}><b>{s.label}</b>
                          <ul>{s.blocks.map((b, j) => <li key={j}>{draftTypeLabel(b.component)}{b.idea ? ` — ${b.idea}` : ""}{b.images.length ? ` · ${b.images.length} ${b.images.length > 1 ? "imagens" : "imagem"}` : ""}</li>)}</ul>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </div>
            ))}
            {waiting ? <div className={m.msg} data-role="ia"><span className={m.typing}>{waiting.text}{seconds > 2 ? ` ${seconds}s` : ""}</span></div> : null}
          </div>
        </div>

        {step > 0 && !waiting ? (
          <div className={m.next}>
            {step === 1 ? <>
              <span>{ready ? "Já tenho o bastante para montar o case." : "Quando quiser, eu monto a estrutura com o que já tenho."}</span>
              <button type="button" className={stepButton()} onClick={() => void send({ action: "plano" })}>Montar a estrutura<ArrowIcon /></button>
            </> : step === 2 ? <>
              <span>Estrutura pronta. Peça mudanças aqui na conversa, ou siga.</span>
              <button type="button" className={stepButton()} onClick={() => void send({ action: "rascunho" })}>Escrever o rascunho<ArrowIcon /></button>
            </> : draft.kind === "proposal" ? <>
              <span>Rascunho pronto. Ele espera sua escolha na aba Conteúdo: tudo, por seção ou nada.</span>
              <button type="button" className={stepButton()} onClick={onOpenDraft}>Ver a proposta<ArrowIcon /></button>
            </> : draft.kind === "unsaved" ? <>
              <span>O rascunho da IA está no editor, ainda sem salvar.</span>
              <button type="button" className={stepButton()} onClick={onOpenDraft}>Abrir o conteúdo<ArrowIcon /></button>
            </> : <>
              <span>O case já tem conteúdo. Se quiser, peça outro rascunho: ele chega como proposta.</span>
              <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={() => void send({ action: "rascunho" })}>Escrever outro rascunho</button>
              <button type="button" className={stepButton()} onClick={onOpenDraft}>Abrir o conteúdo<ArrowIcon /></button>
            </>}
          </div>
        ) : null}

        <div className={m.composer}>
          {files.length ? (
            <div className={m.pending}>
              {files.map((f, i) => (
                <span key={i} className={m.pendingFile}>{f.name}
                  <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton}`} style={{ width: 22, height: 22 }} aria-label={`Tirar ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><CloseIcon /></button>
                </span>
              ))}
            </div>
          ) : null}
          <div className={m.box}>
            <textarea
              ref={input} className={m.input} value={text} placeholder={placeholder} rows={1}
              onChange={e => setText(e.target.value)} aria-label="Mensagem"
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); } }}
              onPaste={e => { const pasted = [...e.clipboardData.files]; if (pasted.length) { e.preventDefault(); add(pasted); } }}
            />
            <div className={m.boxRow}>
              <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} title="PDF, PowerPoint, Word, imagens" onClick={() => picker.current?.click()}><UploadIcon />Anexar</button>
              <input ref={picker} type="file" multiple hidden accept=".pdf,.pptx,.docx,.txt,.md,.csv,image/*" onChange={e => { add([...(e.target.files ?? [])]); e.target.value = ""; }} />
              <span className={m.spacer} />
              {typing ? <button type="button" className={`${styles.button} ${styles.small}`} disabled={!!waiting} title="Enter envia · Shift+Enter quebra a linha" onClick={() => void submit()}>Enviar</button> : null}
            </div>
          </div>
        </div>
        {over ? <div className={m.drop} aria-hidden><UploadIcon />Solte para mandar à IA</div> : null}
      </section>
      {side ? createPortal(
        <aside className={m.side} aria-label="O que a IA já sabe"><h2 className={m.sideTitle}>O que a IA já sabe</h2>{facts}</aside>, side,
      ) : (
        <details className={m.fold}>
          <summary>O que a IA já sabe <span className={m.count}>{known}</span></summary>
          <div className={m.foldBody}>{facts}</div>
        </details>
      )}
    </div>
  );
}

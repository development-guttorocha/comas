"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { blockLabel, blockSummary, readBlock } from "@/lib/admin/caseBlocks";
import type { TranslationRecord, TranslationUnit } from "@/lib/translations/document";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import BusyOverlay from "./BusyOverlay";
import { api, Toast, useToast } from "./client";
import { AlertIcon, ExternalIcon, SparkIcon } from "./icons";
import { saveTranslationEdits, translationUnits, type TranslationEdits } from "./translationDraft";
import t from "./translation.module.css";
import styles from "./admin.module.css";

type Source = { slug: string; title: string; sourceHash: string; units: TranslationUnit[] };
type Row = { key: string; source: string; target: string; was?: string; state: "ok" | "changed" | "missing" };

const CASE_FIELDS: Record<string, string> = {
  title: "Título", productTag: "Área", role: "Papel", tags: "Etiqueta", accentTags: "Etiqueta em destaque", summary: "Resumo",
  homeSummary: "Texto na Home", heroFullBleedContinueLabel: "Texto do botão", heroFullBleedEyebrow: "Rótulo sobre o título", heroFullBleedTagline: "Linha abaixo do título",
};
const PARTS: Record<string, string> = {
  label: "Título", body: "Texto", sectionLabel: "Rótulo", title: "Título", caption: "Legenda", heading: "Título", intro: "Introdução",
  attribution: "Atribuição", lead: "Abertura", foot: "Rodapé", banner: "Faixa", alt: "Descrição", rich_text: "Texto", indexLabel: "Número",
  before: "Antes", after: "Depois", items: "Card", stats: "Número", steps: "Etapa", attributionNote: "Nota", editorialSourceNote: "Fonte",
};

function findBlock(blocks: NotionBlockNode[], id: string): NotionBlockNode | undefined {
  for (const block of blocks) {
    if (block.id === id) return block;
    const inner = block.children ? findBlock(block.children, id) : undefined;
    if (inner) return inner;
  }
}

/** Where a unit lives, in the editor's words: its block, and the field inside it. */
function describe(key: string, body: NotionBlockNode[]) {
  const [head, ...rest] = key.split(".");
  if (head === "case") return { group: "Dados do case", field: CASE_FIELDS[rest[0]!] ?? rest[0]! };
  const block = findBlock(body, head!);
  const model = block ? readBlock(block) : null;
  // "stats.0.label" reads "Número 1 · Título"; the part index of a text says nothing to the author.
  const parts = rest.filter(part => part !== "embed"), field: string[] = [];
  parts.forEach((part, i) => {
    if (!/^\d+$/.test(part)) field.push(PARTS[part] ?? part);
    else if (!["rich_text", "caption", "cells"].includes(parts[i - 1] ?? "") && field.length) field[field.length - 1] += ` ${Number(part) + 1}`;
  });
  return { group: model ? `${blockLabel(model)}${blockSummary(model) ? ` · ${blockSummary(model).slice(0, 60)}` : ""}` : "Bloco removido", field: field.join(" · ") };
}

/**
 * The English of the case. What Gutto types here belongs to the case's unsaved edits (`edits`, kept by
 * the editor, so it survives a tab change): the case's automatic saving keeps it as the draft, even half done.
 * "Publicar inglês" is the one step that asks for every text.
 */
export default function TranslationPanel({ slug, body, unsaved, edits, onEdits, version }: {
  slug: string; body: NotionBlockNode[];
  /** The Portuguese has unsaved edits: the translation reads the saved version. */
  unsaved: boolean;
  edits: TranslationEdits;
  onEdits: (edits: TranslationEdits) => void;
  /** Changes after the case is saved, so the panel reads the draft again. */
  version: number;
}) {
  const [source, setSource] = useState<Source>();
  const [record, setRecord] = useState<TranslationRecord | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const [pendingOnly, setPendingOnly] = useState(true);
  const [busy, setBusy] = useState<"" | "generate" | "publish">("");
  const { toast, show, clear } = useToast();

  const load = useCallback(async () => {
    const [one, all] = await Promise.all([
      api<{ source: Source; record: TranslationRecord | null }>(`/api/translations?slug=${slug}`),
      api<{ configuration: { apiReady: boolean } }>("/api/translations"),
    ]);
    setSource(one.source);
    setRecord(one.record);
    setApiReady(all.configuration.apiReady);
  }, [slug]);
  useEffect(() => { load().catch(show); }, [load, show, version]);

  const rows: Row[] = useMemo(() => {
    if (!source) return [];
    const previous = new Map((record?.draft ?? record?.published)?.units.map(u => [u.key, u]) ?? []);
    return source.units.map(unit => {
      const prev = previous.get(unit.key);
      const state = !prev?.target.trim() ? "missing" : prev.source !== unit.source ? "changed" : "ok";
      return { key: unit.key, source: unit.source, target: edits[unit.key] ?? prev?.target ?? "", was: state === "changed" ? prev!.source : undefined, state };
    });
  }, [edits, record, source]);

  const counts = { ok: rows.filter(r => r.state === "ok").length, changed: rows.filter(r => r.state === "changed").length, missing: rows.filter(r => r.state === "missing").length };
  const dirty = Object.keys(edits).length > 0;
  const published = !!source && record?.published?.sourceHash === source.sourceHash;
  const draftAhead = !!record?.draft && JSON.stringify(record.draft.units) !== JSON.stringify(record.published?.units);
  const complete = rows.every(r => r.target.trim());
  const empty = rows.filter(r => !r.target.trim()).length;
  const pending = counts.changed + counts.missing;

  const groups = useMemo(() => {
    const out: { group: string; rows: (Row & { field: string })[] }[] = [];
    for (const row of rows) {
      if (pendingOnly && row.state === "ok" && !(row.key in edits)) continue;
      const { group, field } = describe(row.key, body);
      const last = out.at(-1);
      if (last?.group === group) last.rows.push({ ...row, field }); else out.push({ group, rows: [{ ...row, field }] });
    }
    return out;
  }, [body, edits, pendingOnly, rows]);

  async function act(action: "generate" | "publish") {
    if (!source) return;
    setBusy(action);
    clear();
    try {
      let current = record;
      if (action === "generate") {
        // What Gutto already typed is kept first: the AI fills only what is still missing or changed.
        if (dirty) current = await saveTranslationEdits(slug, edits);
        const data = await api<{ record: TranslationRecord }>("/api/translations", { method: "POST", body: { slug, action, revision: current?.revision ?? "" } });
        current = data.record;
      } else {
        const data = await api<{ record: TranslationRecord }>("/api/translations", { method: "POST", body: { slug, action, revision: current?.revision ?? "", units: translationUnits(source, current, edits) } });
        current = data.record;
      }
      setRecord(current);
      onEdits({});
      show(action === "generate" ? "A IA traduziu os trechos pendentes. Revise antes de publicar." : "Inglês publicado: vai ao ar no próximo deploy.");
    } catch (error) {
      show(error);
    } finally {
      setBusy("");
    }
  }

  if (!source) return <p className={styles.hint} style={{ padding: 24 }}>Carregando a tradução…</p>;

  const state = published ? (draftAhead || dirty ? "publicado, com mudanças a publicar" : "publicado e em dia") : record?.published ? "publicado, mas desatualizado" : "ainda não publicado";
  return (
    <div className={styles.page} style={{ gap: 12 }}>
      <p className={t.summary} aria-label="Situação da tradução">
        Inglês {state} · {counts.ok} de {rows.length} trechos em dia
        {counts.changed ? <> · <span className={t.warn}>{counts.changed} mudaram em português</span></> : null}
        {counts.missing ? <> · <span className={t.warn}>{counts.missing} sem inglês</span></> : null}
      </p>

      {unsaved ? (
        <div className={`${styles.panel} ${styles.banner}`} data-tone="warn">
          <span className={styles.bannerIcon}><AlertIcon /></span>
          <span><strong>O português tem alterações não salvas.</strong> A tradução usa a versão salva: salve para traduzir as mudanças.</span>
        </div>
      ) : null}

      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist" aria-label="Mostrar">
          <button type="button" role="tab" className={styles.tab} aria-selected={pendingOnly} onClick={() => setPendingOnly(true)}>Pendentes <span className={styles.tabCount}>{pending}</span></button>
          <button type="button" role="tab" className={styles.tab} aria-selected={!pendingOnly} onClick={() => setPendingOnly(false)}>Todos <span className={styles.tabCount}>{rows.length}</span></button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <a className={`${styles.button} ${styles.ghost}`} href={`/en/cases/${slug}${published && !draftAhead ? "" : "?translation=draft"}`} target="_blank" rel="noreferrer"><ExternalIcon />{published && !draftAhead ? "Ver em inglês" : "Prévia do rascunho"}</a>
          <button type="button" className={styles.button} disabled={!!busy || !pending || !apiReady} title={apiReady ? undefined : "Configure OPENAI_API_KEY"} onClick={() => void act("generate")}><SparkIcon />{busy === "generate" ? "Traduzindo…" : "Traduzir pendentes com IA"}</button>
          <button type="button" className={styles.button} disabled={!!busy || !complete || (published && !draftAhead && !dirty)} title={complete ? undefined : `Faltam ${empty} ${empty === 1 ? "trecho" : "trechos"} em inglês`} onClick={() => void act("publish")}>{busy === "publish" ? "Publicando…" : "Publicar inglês"}</button>
        </div>
      </div>
      <p className={styles.hint} style={{ margin: 0 }}>
        {dirty ? "O que você escreve aqui é salvo sozinho, mesmo incompleto. " : ""}
        {complete ? "" : `Para publicar, faltam ${empty} ${empty === 1 ? "trecho" : "trechos"} em inglês: traduza com IA ou escreva à mão.`}
      </p>

      <section className={styles.panel}>
        {groups.map(group => (
          <div key={group.group + group.rows[0]!.key} className={styles.unitGroup}>
            <div className={styles.unitGroupHead}>{group.group}</div>
            {group.rows.map(row => (
              <div key={row.key} className={styles.unit} data-state={row.state}>
                <div className={styles.unitSource}>
                  <span>
                    <span className={styles.label} style={{ display: "block", marginBottom: 2 }}>{row.field}</span>
                    {row.source}
                    {row.was ? <span className={styles.unitWas}>{row.was}</span> : null}
                  </span>
                </div>
                <textarea className={styles.textarea} style={{ minHeight: "2lh" }} value={row.target} placeholder="Inglês" aria-label={`Inglês: ${row.field}`} onChange={e => onEdits({ ...edits, [row.key]: e.target.value })} />
              </div>
            ))}
          </div>
        ))}
        {!groups.length ? <p className={styles.emptyBody}>{pendingOnly ? "Nenhum trecho pendente. Tudo em dia com o português." : "Este case ainda não tem texto."}</p> : null}
      </section>
      <BusyOverlay label={busy === "generate" ? "Traduzindo com IA…" : busy === "publish" ? "Publicando o inglês…" : ""} />
      <Toast toast={toast} onClose={toast?.tone === "bad" ? clear : undefined} />
    </div>
  );
}

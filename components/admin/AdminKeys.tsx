"use client";

import { useState } from "react";
import type { KeyRow } from "@/lib/admin/apiKeys";
import { REASONING_LEVELS } from "@/lib/admin/reasoningLevels";
import AdminShell from "./AdminShell";
import { api, Toast, useToast } from "./client";
import { ExternalIcon, PlusIcon, TrashIcon } from "./icons";
import styles from "./admin.module.css";

type Draft = { value: string; expires: string; notes: string; model: string; reasoning: string };

function expiryChip(expires?: string) {
  if (!expires) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(`${expires}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
  const date = new Date(`${expires}T00:00:00`).toLocaleDateString("pt-BR");
  if (days < 0) return <span className={styles.chip} data-tone="bad">Venceu em {date}</span>;
  if (days <= 21) return <span className={styles.chip} data-tone="warn">Vence em {days} {days === 1 ? "dia" : "dias"}</span>;
  return <span className={styles.chip}>Vence em {date}</span>;
}

/** Gutto's API keys: the presets plus any he adds. Values stay in .env.local, shown masked. */
export default function AdminKeys({ initial, initialOpen }: { initial: KeyRow[]; initialOpen?: string }) {
  const [keys, setKeys] = useState(initial);
  const [open, setOpen] = useState<string | null>(initialOpen ?? null);
  const [draft, setDraft] = useState<Draft>(() => {
    const k = initial.find(x => x.id === initialOpen);
    return { value: "", expires: k?.expires ?? "", notes: k?.notes ?? "", model: k?.model ?? "", reasoning: k?.reasoning ?? "" };
  });
  const [models, setModels] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState({ label: "", env: "", value: "" });
  const { toast, show, clear } = useToast();
  const isAiKey = (k: KeyRow) => (k.kind ?? "ai") === "ai";
  const aiTest = (k: KeyRow) => (k.test && k.test !== "supabase" ? k.test : null);
  // Only unused AI presets wait behind one button; infrastructure presets (Supabase) stay visible.
  const [showUnused, setShowUnused] = useState(false);
  const unused = keys.filter(k => !k.set && k.preset && isAiKey(k));
  const shown = keys.filter(k => k.set || !k.preset || !isAiKey(k) || showUnused || open === k.id);

  const edit = (k: KeyRow) => {
    setOpen(open === k.id ? null : k.id);
    setDraft({ value: "", expires: k.expires ?? "", notes: k.notes ?? "", model: k.model ?? "", reasoning: k.reasoning ?? "" });
    if (open !== k.id && k.set && aiTest(k) && !models[k.id]) void loadModels(k.id, true);
  };
  const loadModels = async (id: string, quiet = false) => {
    try {
      const r = await api<{ ok: boolean; message: string; models?: string[] }>("/api/admin/keys", { method: "POST", body: { id } });
      if (r.models) setModels(m => ({ ...m, [id]: r.models! }));
      if (!quiet || !r.ok) show(r.ok ? `${r.models?.length ?? 0} modelos disponíveis.` : r.message, r.ok ? "good" : "bad");
    } catch (e) { show(e); }
  };
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { show(e); } finally { setBusy(false); } };

  const save = (id: string) => run(async () => {
    const data = await api<{ keys: KeyRow[] }>("/api/admin/keys", { method: "PUT", body: { id, ...draft } });
    setKeys(data.keys); setOpen(null); show("Chave salva com segurança.", "good");
  });
  const test = (id: string) => run(async () => {
    const r = await api<{ ok: boolean; message: string; models?: string[] }>("/api/admin/keys", { method: "POST", body: { id } });
    if (r.models) setModels(m => ({ ...m, [id]: r.models! }));
    show(r.message, r.ok ? "good" : "bad");
  });
  const remove = (k: KeyRow) => run(async () => {
    if (!confirm(k.preset ? `Apagar o valor salvo de ${k.env}?` : `Remover ${k.label} (${k.env})?`)) return;
    const data = await api<{ keys: KeyRow[] }>(`/api/admin/keys?id=${encodeURIComponent(k.id)}`, { method: "DELETE" });
    setKeys(data.keys); setOpen(null); show("Chave removida.");
  });
  const addCustom = () => run(async () => {
    const data = await api<{ keys: KeyRow[] }>("/api/admin/keys", { method: "PUT", body: custom });
    setKeys(data.keys); setAdding(false); setCustom({ label: "", env: "", value: "" }); show("Chave adicionada.", "good");
  });

  return (
    <AdminShell
      crumbs={[{ label: "Chaves de API" }]}
      actions={<button type="button" className={styles.button} onClick={() => setAdding(a => !a)}><PlusIcon />Nova chave</button>}
    >
      <div className={styles.sheet}>
      <div className={styles.page}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Chaves de API</h1>
            <p className={styles.subtitle}>Salvas de forma criptografada no painel (Supabase / .env.local) e aplicadas imediatamente nos geradores de IA e mídia.</p>
          </div>
        </div>

        {adding ? (
          <section className={styles.group} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", alignItems: "end" }} aria-label="Nova chave">
            <label className={styles.field}><span className={styles.label}>Nome</span><input className={styles.input} value={custom.label} onChange={e => setCustom({ ...custom, label: e.target.value })} placeholder="Ex.: Replicate" /></label>
            <label className={styles.field}><span className={styles.label}>Variável</span><input className={`${styles.input} ${styles.mono}`} value={custom.env} onChange={e => setCustom({ ...custom, env: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })} placeholder="REPLICATE_API_TOKEN" /></label>
            <label className={styles.field}><span className={styles.label}>Chave</span><input className={`${styles.input} ${styles.mono}`} type="password" autoComplete="off" value={custom.value} onChange={e => setCustom({ ...custom, value: e.target.value })} /></label>
            <button type="button" className={`${styles.button} ${styles.primary}`} disabled={busy || !custom.label || !custom.env} onClick={addCustom}>Adicionar</button>
          </section>
        ) : null}

        <section className={styles.rows} aria-label="Chaves">
          {shown.map(k => {
            const testKind = aiTest(k);
            const reasoningLabel = testKind && k.reasoning ? REASONING_LEVELS[testKind]?.find(l => l.value === k.reasoning)?.label.toLowerCase() ?? k.reasoning : "";
            return (
              <div key={k.id}>
                <div className={styles.row} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto auto", gap: 12, alignItems: "center", padding: "12px 20px" }}>
                  <span>
                    <span className={styles.rowTitle} style={{ display: "block" }}>{k.label}</span>
                    <span className={`${styles.rowMeta} ${styles.mono}`} style={{ display: "block" }}>{k.env}{k.set ? ` · ${k.masked}` : ""}{k.model ? ` · ${k.model}` : ""}{reasoningLabel ? ` · raciocínio ${reasoningLabel}` : ""}{k.notes ? ` · ${k.notes}` : ""}</span>
                  </span>
                  <span style={{ display: "flex", gap: 6 }}>
                    {k.set ? <span className={styles.chip} data-tone="good">Configurada</span> : <span className={styles.chip}>Vazia</span>}
                    {k.set ? expiryChip(k.expires) : null}
                  </span>
                  <span style={{ display: "flex", gap: 6 }}>
                    {k.set && k.test ? <button type="button" className={`${styles.button} ${styles.small}`} disabled={busy} onClick={() => test(k.id)}>{k.test === "supabase" ? "Testar conexão" : "Testar"}</button> : null}
                    <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => edit(k)}>{open === k.id ? "Fechar" : k.set ? "Editar" : "Adicionar"}</button>
                  </span>
                </div>
                {open === k.id ? (
                  <div style={{ padding: "4px 20px 16px", display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", alignItems: "end" }}>
                    <label className={styles.field} style={{ gridColumn: "span 2" }}>
                      <span className={styles.label}>
                        {k.kind === "url"
                          ? (k.set ? "Nova URL do projeto (em branco mantém a atual)" : "URL do projeto")
                          : (k.set ? "Nova chave (em branco mantém a atual)" : "Chave")}
                      </span>
                      <input
                        className={`${styles.input} ${styles.mono}`}
                        type={k.kind === "url" ? "url" : "password"}
                        autoComplete="off"
                        value={draft.value}
                        onChange={e => setDraft({ ...draft, value: e.target.value })}
                        placeholder={k.set ? k.masked : (k.kind === "url" ? "https://seu-projeto.supabase.co" : "Cole a chave aqui")}
                      />
                    </label>
                    {isAiKey(k) ? (
                      <>
                        <label className={styles.field} style={{ gridColumn: "span 2" }}>
                          <span className={styles.label}>Modelo padrão <span className={styles.mono}>({k.modelEnv})</span></span>
                          <span style={{ display: "flex", gap: 6 }}>
                            {models[k.id]?.length ? (
                              <select className={`${styles.select} ${styles.mono}`} value={draft.model} onChange={e => setDraft({ ...draft, model: e.target.value })}>
                                <option value="">Nenhum</option>
                                {draft.model && !models[k.id]!.includes(draft.model) ? <option value={draft.model}>{draft.model}</option> : null}
                                {models[k.id]!.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                            ) : (
                              <input className={`${styles.input} ${styles.mono}`} value={draft.model} onChange={e => setDraft({ ...draft, model: e.target.value })} placeholder={testKind ? "Carregue a lista ou digite" : "Digite o nome do modelo"} />
                            )}
                            {k.set && testKind ? <button type="button" className={`${styles.button} ${styles.small}`} style={{ height: "auto" }} onClick={() => loadModels(k.id)}>Carregar modelos</button> : null}
                          </span>
                        </label>
                        {testKind && REASONING_LEVELS[testKind] ? (
                          <label className={styles.field}>
                            <span className={styles.label}>Raciocínio <span className={styles.mono}>({k.reasoningEnv})</span></span>
                            <select className={styles.select} value={draft.reasoning} onChange={e => setDraft({ ...draft, reasoning: e.target.value })}>
                              <option value="">Padrão do modelo</option>
                              {REASONING_LEVELS[testKind]!.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                            </select>
                          </label>
                        ) : null}
                      </>
                    ) : null}
                    <label className={styles.field}><span className={styles.label}>Validade</span><input className={styles.input} type="date" value={draft.expires} onChange={e => setDraft({ ...draft, expires: e.target.value })} /></label>
                    <label className={styles.field} style={{ gridColumn: "1 / -1" }}><span className={styles.label}>Notas</span><input className={styles.input} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Projeto, conta, limite…" /></label>
                    <span style={{ display: "flex", gap: 6, gridColumn: "1 / -1" }}>
                      <button type="button" className={`${styles.button} ${styles.primary}`} disabled={busy} onClick={() => save(k.id)}>Salvar</button>
                      {k.console ? <a className={`${styles.button} ${styles.ghost}`} href={k.console} target="_blank" rel="noreferrer"><ExternalIcon />Abrir o painel do provedor</a> : null}
                      <span style={{ flex: 1 }} />
                      {k.set || !k.preset ? <button type="button" className={`${styles.button} ${styles.ghost}`} disabled={busy} onClick={() => remove(k)}><TrashIcon />{k.preset ? "Apagar valor" : "Remover"}</button> : null}
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!shown.length ? <p className={styles.emptyBody}>Nenhuma chave configurada ainda.</p> : null}
        </section>
        {unused.length ? (
          <button type="button" className={`${styles.button} ${styles.ghost}`} style={{ justifySelf: "start" }} aria-expanded={showUnused} onClick={() => setShowUnused(v => !v)}>
            {showUnused ? "Esconder os provedores sem chave" : `Outros provedores (${unused.length})`}
          </button>
        ) : null}
      </div>
      </div>
      <Toast toast={toast} onClose={clear} />
    </AdminShell>
  );
}

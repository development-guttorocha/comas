"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminLeadsPayload } from "@/lib/admin/leadsAdmin";
import type { LeadKind, LeadStatus, SiteLeadRow } from "@/lib/supabase";
import AdminShell from "./AdminShell";
import { api, Toast, useToast } from "./client";
import { AlertIcon, CopyIcon, ExternalIcon, SearchIcon, TrashIcon } from "./icons";
import styles from "./admin.module.css";

type StatusTab = LeadStatus | "all";
type KindTab = LeadKind | "all";

const KIND_LABEL: Record<LeadKind, string> = {
  service: "Serviço",
  material: "Material",
  contact: "Fale comigo",
};

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "novo",
  replied: "respondido",
  archived: "arquivado",
};

const csvCell = (v: string | boolean) => `"${String(v).replace(/"/g, '""')}"`;

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Local management inbox for all site leads (services, materials, and Fale comigo). */
export default function AdminLeads({ initial }: { initial: AdminLeadsPayload }) {
  const [data, setData] = useState(initial);
  const [statusTab, setStatusTab] = useState<StatusTab>("new");
  const [kindTab, setKindTab] = useState<KindTab>("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [copiedSql, setCopiedSql] = useState(false);
  const { toast, show, clear } = useToast();

  const load = async (nextStatus: StatusTab = statusTab, nextKind: KindTab = kindTab) => {
    setBusy(true);
    try {
      const next = await api<AdminLeadsPayload>(`/api/admin/leads?status=${nextStatus}&kind=${nextKind}`);
      setData(next);
      return next;
    } catch (e) {
      show(e);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const changeStatusTab = async (next: StatusTab) => {
    setStatusTab(next);
    setEditingNoteId(null);
    await load(next, kindTab);
  };

  const changeKindTab = async (next: KindTab) => {
    setKindTab(next);
    setEditingNoteId(null);
    await load(statusTab, next);
  };

  const updateLead = async (id: string, patch: { status?: LeadStatus; notes?: string }, message: string) => {
    setBusy(true);
    try {
      const next = await api<AdminLeadsPayload>("/api/admin/leads", {
        method: "PATCH",
        body: { id, ...patch, filterStatus: statusTab, filterKind: kindTab },
      });
      setData(next);
      if (patch.notes !== undefined) setEditingNoteId(null);
      show(message, "good");
    } catch (e) {
      show(e);
    } finally {
      setBusy(false);
    }
  };

  const removeLead = async (lead: SiteLeadRow) => {
    if (!confirm(`Apagar permanentemente o contato de ${lead.name}?`)) return;
    setBusy(true);
    try {
      const next = await api<AdminLeadsPayload>(
        `/api/admin/leads?id=${encodeURIComponent(lead.id)}&status=${statusTab}&kind=${kindTab}`,
        { method: "DELETE" },
      );
      setData(next);
      show("Contato apagado.", "good");
    } catch (e) {
      show(e);
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.leads;
    return data.leads.filter(l =>
      [l.name, l.email, l.company, l.service, l.format, l.message, l.notes, l.page]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [data.leads, query]);

  const copyOptInEmails = async () => {
    setBusy(true);
    try {
      const allMaterials = await api<AdminLeadsPayload>("/api/admin/leads?status=all&kind=material");
      const unique = [...new Set(allMaterials.leads.filter(l => l.opt_in).map(l => l.email.trim()).filter(Boolean))];
      if (!unique.length) {
        show("Nenhum e-mail com opt-in de novos materiais ainda.");
        return;
      }
      await navigator.clipboard?.writeText(unique.join(", "));
      show(`${unique.length} ${unique.length === 1 ? "e-mail copiado" : "e-mails copiados"} para a área de transferência.`, "good");
    } catch (e) {
      show(e);
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    if (!filtered.length) return;
    const headers = ["Data", "Tipo", "Status", "Nome", "E-mail", "Empresa", "Time/Momento", "Serviço", "Interesse", "Página", "Aceitou novos materiais", "Mensagem", "Notas"];
    const rows = filtered.map(l => [
      csvCell(l.created_at),
      csvCell(KIND_LABEL[l.kind]),
      csvCell(STATUS_LABEL[l.status]),
      csvCell(l.name),
      csvCell(l.email),
      csvCell(l.company),
      csvCell(l.team_size),
      csvCell(l.service),
      csvCell(l.format),
      csvCell(l.page),
      csvCell(l.opt_in ? "Sim" : "Não"),
      csvCell(l.message),
      csvCell(l.notes),
    ].join(","));
    const csv = `${headers.map(csvCell).join(",")}\n${rows.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contatos-${statusTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySql = async () => {
    await navigator.clipboard?.writeText(data.sql);
    setCopiedSql(true);
    window.setTimeout(() => setCopiedSql(false), 2400);
  };

  const counts = data.counts;
  const summary = counts
    ? `${counts.new} ${counts.new === 1 ? "novo" : "novos"} · ${counts.replied} ${counts.replied === 1 ? "respondido" : "respondidos"} · ${counts.archived} ${counts.archived === 1 ? "arquivado" : "arquivados"} · ${counts.optIn} aceitaram novos materiais`
    : data.probe.message;

  return (
    <AdminShell
      crumbs={[{ label: "Contatos" }]}
      actions={
        data.probe.schemaReady ? (
          <>
            <button type="button" className={styles.button} disabled={busy} onClick={copyOptInEmails}>
              <CopyIcon />Copiar e-mails opt-in
            </button>
            <button type="button" className={styles.button} disabled={busy || !filtered.length} onClick={exportCsv}>
              Exportar CSV
            </button>
          </>
        ) : undefined
      }
    >
      <div className={styles.sheet}>
        <div className={styles.page}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.title}>Contatos do site</h1>
              <p className={styles.pageSummary}>{summary}</p>
            </div>
            {data.probe.schemaReady ? (
              <label className={styles.search}>
                <SearchIcon />
                <input
                  type="search"
                  placeholder="Buscar nome, e-mail, empresa…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </label>
            ) : null}
          </div>

          {!data.probe.schemaReady ? (
            <section className={styles.surveySetup} aria-label="Configuração do Supabase">
              <div className={styles.banner} data-tone="warn">
                <span className={styles.bannerIcon}><AlertIcon /></span>
                <span>
                  <strong>Tabela de contatos pendente:</strong> {data.probe.message} Enquanto isso, os envios continuam
                  chegando por e-mail via Resend.
                </span>
              </div>

              {!data.probe.configured ? (
                <div className={styles.surveyStep}>
                  <div className={styles.surveyStepHead}>
                    <strong>1. Cadastrar URL e chave do projeto Supabase</strong>
                    <span className={styles.chip} data-tone="warn">Falta configurar</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link href="/admin/chaves?abrir=supabase-url" className={styles.button}>
                      Abrir Chaves de API →
                    </Link>
                  </div>
                </div>
              ) : null}

              <div className={styles.surveyStep}>
                <div className={styles.surveyStepHead}>
                  <strong>Criar a tabela <code>site_leads</code> no SQL Editor do Supabase</strong>
                  <button type="button" className={`${styles.button} ${styles.small}`} onClick={copySql}>
                    <CopyIcon />{copiedSql ? "SQL copiado" : "Copiar SQL"}
                  </button>
                </div>
                <pre className={styles.surveySql}>{data.sql}</pre>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.primary}`}
                    disabled={busy}
                    aria-busy={busy || undefined}
                    onClick={async () => {
                      const next = await load("new", "all");
                      if (next?.probe.schemaReady) show("Tabela pronta!", "good");
                      else if (next) show(next.probe.message, "bad");
                    }}
                  >
                    Verificar conexão
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <>
              <div className={styles.toolbar}>
                <nav className={styles.tabs} role="tablist" aria-label="Status dos contatos">
                  <button type="button" role="tab" className={styles.tab} aria-selected={statusTab === "new"} onClick={() => changeStatusTab("new")}>
                    Novos <span className={styles.tabCount}>{counts?.new ?? 0}</span>
                  </button>
                  <button type="button" role="tab" className={styles.tab} aria-selected={statusTab === "replied"} onClick={() => changeStatusTab("replied")}>
                    Respondidos <span className={styles.tabCount}>{counts?.replied ?? 0}</span>
                  </button>
                  <button type="button" role="tab" className={styles.tab} aria-selected={statusTab === "archived"} onClick={() => changeStatusTab("archived")}>
                    Arquivados <span className={styles.tabCount}>{counts?.archived ?? 0}</span>
                  </button>
                  <button type="button" role="tab" className={styles.tab} aria-selected={statusTab === "all"} onClick={() => changeStatusTab("all")}>
                    Todos <span className={styles.tabCount}>{counts?.total ?? 0}</span>
                  </button>
                </nav>

                <nav className={styles.tabs} role="tablist" aria-label="Tipo de contato">
                  <button type="button" role="tab" className={styles.tab} aria-selected={kindTab === "all"} onClick={() => changeKindTab("all")}>
                    Todos
                  </button>
                  <button type="button" role="tab" className={styles.tab} aria-selected={kindTab === "service"} onClick={() => changeKindTab("service")}>
                    Serviços <span className={styles.tabCount}>{counts?.byKind.service ?? 0}</span>
                  </button>
                  <button type="button" role="tab" className={styles.tab} aria-selected={kindTab === "material"} onClick={() => changeKindTab("material")}>
                    Materiais <span className={styles.tabCount}>{counts?.byKind.material ?? 0}</span>
                  </button>
                  <button type="button" role="tab" className={styles.tab} aria-selected={kindTab === "contact"} onClick={() => changeKindTab("contact")}>
                    Fale comigo <span className={styles.tabCount}>{counts?.byKind.contact ?? 0}</span>
                  </button>
                </nav>
              </div>

              <section className={styles.rows} aria-label="Lista de contatos">
                {filtered.map(lead => {
                  const isEditingNote = editingNoteId === lead.id;
                  const replySubject = encodeURIComponent(`Re: ${lead.service}`);
                  return (
                    <article key={lead.id} className={styles.leadRow}>
                      <div className={styles.leadMain}>
                        <div className={styles.leadMetaTop}>
                          <span className={styles.chip}>{KIND_LABEL[lead.kind]}</span>
                          <span className={styles.leadService}>
                            {lead.service}{lead.format ? ` · ${lead.format}` : ""}
                          </span>
                          {lead.opt_in ? <span className={styles.chip} data-tone="good">Aceitou novos materiais</span> : null}
                          {lead.source === "import" ? <span className={styles.chip}>Importado</span> : null}
                          <span className={styles.when}>{formatDateTime(lead.created_at)}</span>
                        </div>

                        <div className={styles.leadPerson}>
                          <strong>{lead.name}</strong>
                          <span> · </span>
                          <a href={`mailto:${lead.email}?subject=${replySubject}`} className={styles.leadMail}>
                            {lead.email}
                          </a>
                          {lead.company ? <span> · {lead.company}</span> : null}
                          {lead.team_size ? <span> · {lead.team_size}</span> : null}
                          {lead.page ? <span className={styles.rowMeta}> · {lead.page}</span> : null}
                        </div>

                        {lead.message ? <p className={styles.leadMsg}>{lead.message}</p> : null}

                        {isEditingNote ? (
                          <div className={styles.leadNoteBox}>
                            <textarea
                              className={styles.textarea}
                              rows={2}
                              placeholder="Anotação privada (só aparece no admin)…"
                              value={noteDraft}
                              onChange={e => setNoteDraft(e.target.value)}
                            />
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                type="button"
                                className={`${styles.button} ${styles.small} ${styles.primary}`}
                                disabled={busy}
                                onClick={() => updateLead(lead.id, { notes: noteDraft.trim() }, "Nota salva.")}
                              >
                                Salvar nota
                              </button>
                              <button
                                type="button"
                                className={`${styles.button} ${styles.small} ${styles.ghost}`}
                                onClick={() => setEditingNoteId(null)}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : lead.notes ? (
                          <p className={styles.leadNotePreview}>Nota: {lead.notes}</p>
                        ) : null}
                      </div>

                      <div className={styles.surveyActions}>
                        <a
                          href={`mailto:${lead.email}?subject=${replySubject}`}
                          className={`${styles.button} ${styles.small} ${lead.status === "new" ? styles.primary : ""}`}
                        >
                          <ExternalIcon />Responder
                        </a>
                        {lead.status !== "replied" ? (
                          <button
                            type="button"
                            className={`${styles.button} ${styles.small}`}
                            disabled={busy}
                            onClick={() => updateLead(lead.id, { status: "replied" }, "Contato marcado como respondido.")}
                          >
                            Respondido
                          </button>
                        ) : null}
                        {lead.status !== "archived" ? (
                          <button
                            type="button"
                            className={`${styles.button} ${styles.small}`}
                            disabled={busy}
                            onClick={() => updateLead(lead.id, { status: "archived" }, "Contato arquivado.")}
                          >
                            Arquivar
                          </button>
                        ) : null}
                        {lead.status !== "new" ? (
                          <button
                            type="button"
                            className={`${styles.button} ${styles.small} ${styles.ghost}`}
                            disabled={busy}
                            onClick={() => updateLead(lead.id, { status: "new" }, "Contato reaberto.")}
                          >
                            Reabrir
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={`${styles.button} ${styles.small} ${styles.ghost}`}
                          onClick={() => {
                            if (isEditingNote) { setEditingNoteId(null); return; }
                            setEditingNoteId(lead.id);
                            setNoteDraft(lead.notes ?? "");
                          }}
                        >
                          {lead.notes ? "Editar nota" : "Nota"}
                        </button>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.small} ${styles.ghost} ${styles.danger}`}
                          disabled={busy}
                          aria-label={`Apagar contato de ${lead.name}`}
                          onClick={() => removeLead(lead)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </article>
                  );
                })}
                {!filtered.length ? (
                  <p className={styles.emptyBody}>
                    {query.trim()
                      ? "Nenhum contato encontrado com essa busca."
                      : statusTab === "new"
                        ? "Nenhum contato novo aguardando leitura."
                        : statusTab === "replied"
                          ? "Nenhum contato marcado como respondido."
                          : statusTab === "archived"
                            ? "Nenhum contato arquivado."
                            : "Nenhum contato registrado ainda."}
                  </p>
                ) : null}
              </section>
            </>
          )}
        </div>
      </div>
      <Toast toast={toast} onClose={clear} />
    </AdminShell>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AdminSurveyPayload } from "@/lib/admin/salarySurveyAdmin";
import { brl } from "@/lib/salaryBands";
import type { SurveyAnswer } from "@/lib/salarySurvey";
import type { ImportFailure } from "@/lib/salarySurveyImport";
import type { SurveyResponseStatus } from "@/lib/supabase";
import AdminShell from "./AdminShell";
import { api, Toast, useToast } from "./client";
import { AlertIcon, CheckIcon, CopyIcon, ExternalIcon, TrashIcon, UploadIcon } from "./icons";
import styles from "./admin.module.css";

type Tab = SurveyResponseStatus | "bands";

type ImportPreview = {
  preview: true;
  validCount: number;
  invalid: ImportFailure[];
  outliers: number;
  sample: SurveyAnswer[];
};

const statusLabel: Record<SurveyResponseStatus, string> = {
  pending: "pendente",
  approved: "aprovada",
  rejected: "rejeitada",
};

/** Local moderation workbench for the anonymous salary survey and live salary band blending. */
export default function AdminSurvey({ initial }: { initial: AdminSurveyPayload }) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<Tab>("pending");
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRaw, setImportRaw] = useState("");
  const [approveImmediately, setApproveImmediately] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { toast, show, clear } = useToast();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (importOpen && !dialog.open) dialog.showModal();
    else if (!importOpen && dialog.open) dialog.close();
  }, [importOpen]);

  const activeFilter: SurveyResponseStatus = tab === "bands" ? "pending" : tab;

  const refresh = async (filter: SurveyResponseStatus = activeFilter) => {
    setBusy(true);
    try {
      const next = await api<AdminSurveyPayload>(`/api/admin/salary-survey?status=${filter}`);
      setData(next);
      return next;
    } catch (e) {
      show(e);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const switchTab = async (nextTab: Tab) => {
    setTab(nextTab);
    if (nextTab === "bands") return;
    await refresh(nextTab);
  };

  const moderate = async (ids: string[], status: SurveyResponseStatus) => {
    setBusy(true);
    try {
      const next = await api<AdminSurveyPayload>("/api/admin/salary-survey", {
        method: "PATCH",
        body: { ids, status, filter: activeFilter },
      });
      setData(next);
      show(
        ids.length === 1
          ? `Resposta marcada como ${statusLabel[status]}.`
          : `${ids.length} respostas marcadas como ${statusLabel[status]}s.`,
        "good",
      );
    } catch (e) {
      show(e);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Apagar esta resposta permanentemente do Supabase?")) return;
    setBusy(true);
    try {
      const next = await api<AdminSurveyPayload>(
        `/api/admin/salary-survey?id=${encodeURIComponent(id)}&status=${activeFilter}`,
        { method: "DELETE" },
      );
      setData(next);
      show("Resposta apagada.", "good");
    } catch (e) {
      show(e);
    } finally {
      setBusy(false);
    }
  };

  const analyzeImport = async () => {
    setBusy(true);
    try {
      const res = await api<ImportPreview>("/api/admin/salary-survey", {
        method: "POST",
        body: { raw: importRaw, dryRun: true },
      });
      setPreview(res);
    } catch (e) {
      show(e);
    } finally {
      setBusy(false);
    }
  };

  const commitImport = async () => {
    setBusy(true);
    try {
      const res = await api<{ inserted: number; invalid: ImportFailure[]; payload: AdminSurveyPayload }>(
        "/api/admin/salary-survey",
        {
          method: "POST",
          body: { raw: importRaw, approveImmediately, filter: activeFilter },
        },
      );
      setData(res.payload);
      setImportOpen(false);
      setImportRaw("");
      setPreview(null);
      if (approveImmediately) setTab("approved");
      show(
        `${res.inserted} ${res.inserted === 1 ? "resposta importada" : "respostas importadas"}${
          res.invalid.length ? ` (${res.invalid.length} ignoradas)` : ""
        }.`,
        "good",
      );
    } catch (e) {
      show(e);
    } finally {
      setBusy(false);
    }
  };

  const copySql = async () => {
    await navigator.clipboard?.writeText(data.sql);
    setCopiedSql(true);
    window.setTimeout(() => setCopiedSql(false), 2400);
  };

  const counts = data.counts;
  const cleanPendingIds = tab === "pending" ? data.responses.filter(r => !r.outlier_flag).map(r => r.id) : [];

  const summary = counts
    ? `${counts.pending} pendentes · ${counts.approved} aprovadas · ${counts.rejected} rejeitadas · ${counts.emails} e-mails`
    : data.probe.message;

  return (
    <AdminShell
      crumbs={[{ label: "Pesquisa salarial" }]}
      actions={
        <>
          {data.probe.schemaReady ? (
            <button type="button" className={styles.button} onClick={() => setImportOpen(true)}>
              <UploadIcon />Importar respostas
            </button>
          ) : null}
          <a href="/recursos/salario-em-design" target="_blank" rel="noreferrer" className={styles.button}>
            <ExternalIcon />Ver página de salários
          </a>
        </>
      }
    >
      <div className={styles.sheet}>
        <div className={styles.page}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.title}>Pesquisa salarial · edição {data.edition}</h1>
              <p className={styles.pageSummary}>{summary}</p>
            </div>
            {data.probe.schemaReady && tab === "pending" && cleanPendingIds.length > 0 ? (
              <button
                type="button"
                className={`${styles.button} ${styles.primary}`}
                disabled={busy}
                onClick={() => moderate(cleanPendingIds, "approved")}
              >
                <CheckIcon />Aprovar {cleanPendingIds.length} sem alerta
              </button>
            ) : null}
          </div>

          {!data.probe.schemaReady ? (
            <section className={styles.surveySetup} aria-label="Configuração do Supabase">
              <div className={styles.banner} data-tone="warn">
                <span className={styles.bannerIcon}><AlertIcon /></span>
                <span>
                  <strong>Conexão com o Supabase pendente:</strong> {data.probe.message} Enquanto isso, o formulário
                  público continua enviando as respostas por e-mail (Resend) e a página de salários mostra a base inicial.
                </span>
              </div>

              <div className={styles.surveyStep}>
                <div className={styles.surveyStepHead}>
                  <strong>1. Cadastrar URL e chave do projeto Supabase</strong>
                  <span className={styles.chip} data-tone={data.probe.configured ? "good" : "warn"}>
                    {data.probe.configured ? "Chaves salvas no .env.local" : "Falta configurar"}
                  </span>
                </div>
                <p className={styles.hint}>
                  Em Chaves de API, preencha <code>SUPABASE_URL</code> e <code>SUPABASE_SERVICE_ROLE_KEY</code> (Secret Key).
                  Para funcionar em produção, cadastre as mesmas duas variáveis também na Vercel.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link href="/admin/chaves?abrir=supabase-url" className={styles.button}>
                    Abrir Chaves de API →
                  </Link>
                </div>
              </div>

              <div className={styles.surveyStep}>
                <div className={styles.surveyStepHead}>
                  <strong>2. Criar as tabelas e a função de cálculo no SQL Editor</strong>
                  <button type="button" className={`${styles.button} ${styles.small}`} onClick={copySql}>
                    <CopyIcon />{copiedSql ? "SQL copiado" : "Copiar SQL"}
                  </button>
                </div>
                <p className={styles.hint}>
                  No painel do Supabase, abra <strong>SQL Editor → New query</strong>, cole o script abaixo e clique em Run.
                  Depois, clique em Verificar conexão.
                </p>
                <pre className={styles.surveySql}>{data.sql}</pre>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.primary}`}
                    disabled={busy}
                    aria-busy={busy || undefined}
                    onClick={async () => {
                      const next = await refresh("pending");
                      if (next?.probe.schemaReady) show("Supabase pronto!", "good");
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
              <nav className={styles.tabs} role="tablist" aria-label="Visão da pesquisa">
                <button type="button" role="tab" className={styles.tab} aria-selected={tab === "pending"} onClick={() => switchTab("pending")}>
                  Pendentes <span className={styles.tabCount}>{counts?.pending ?? 0}</span>
                </button>
                <button type="button" role="tab" className={styles.tab} aria-selected={tab === "approved"} onClick={() => switchTab("approved")}>
                  Aprovadas <span className={styles.tabCount}>{counts?.approved ?? 0}</span>
                </button>
                <button type="button" role="tab" className={styles.tab} aria-selected={tab === "rejected"} onClick={() => switchTab("rejected")}>
                  Rejeitadas <span className={styles.tabCount}>{counts?.rejected ?? 0}</span>
                </button>
                <button type="button" role="tab" className={styles.tab} aria-selected={tab === "bands"} onClick={() => switchTab("bands")}>
                  Faixas ao vivo
                </button>
              </nav>

              {tab === "bands" ? (
                <section aria-label="Faixas salariais calculadas">
                  <p className={styles.hint} style={{ marginBottom: 12 }}>
                    Abaixo de {data.bands.minGroup} respostas aprovadas por papel, vale 100% da base inicial.
                    A partir de {data.bands.minGroup}, a pesquisa ganha peso progressivo (w = n / (n + 15)) até atingir 100% em 60 respostas.
                    Em produção, a página pública atualiza em até 5 minutos após a aprovação.
                  </p>
                  <div className={styles.surveyTableWrap}>
                    <table className={styles.surveyTable}>
                      <thead>
                        <tr>
                          <th scope="col">Papel</th>
                          <th scope="col">Base inicial (P50)</th>
                          <th scope="col">Ao vivo · Começo (P25)</th>
                          <th scope="col">Ao vivo · Mediana (P50)</th>
                          <th scope="col">Ao vivo · Topo (P75)</th>
                          <th scope="col">Aprovadas</th>
                          <th scope="col">Peso da pesquisa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.bands.roles.map(r => (
                          <tr key={r.id}>
                            <td><strong>{r.label}</strong></td>
                            <td>{brl(r.baseP50)}</td>
                            <td>{brl(r.p25)}</td>
                            <td><strong>{brl(r.p50)}</strong></td>
                            <td>{brl(r.p75)}</td>
                            <td>{r.sampleCount} / {data.bands.minGroup}</td>
                            <td>
                              <span className={styles.chip} data-tone={r.surveyWeight > 0 ? "good" : undefined}>
                                {Math.round(r.surveyWeight * 100)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : (
                <section className={styles.rows} aria-label="Respostas">
                  {data.responses.map(r => (
                    <div key={r.id} className={styles.surveyRow}>
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.rowTitle}>
                          {r.role} · {brl(r.salary)} · {r.regime}
                        </div>
                        <div className={styles.rowMeta} style={{ whiteSpace: "normal" }}>
                          {r.specialty} · {r.experience} anos · {r.company_size} · {r.sector} · {r.state} · {r.work_model}
                          {r.gender ? ` · ${r.gender}` : ""} · Bônus: {r.bonus} · {r.submitted_date}
                        </div>
                      </div>

                      <div className={styles.surveyChips}>
                        {r.outlier_flag ? <span className={styles.chip} data-tone="warn">Fora da faixa esperada</span> : null}
                        {!r.role_band_id || (r.regime !== "CLT" && r.regime !== "PJ") ? (
                          <span className={styles.chip}>Não entra na régua CLT/PJ</span>
                        ) : null}
                        {r.source === "import" ? <span className={styles.chip}>Importada</span> : null}
                      </div>

                      <div className={styles.surveyActions}>
                        {tab !== "approved" ? (
                          <button
                            type="button"
                            className={`${styles.button} ${styles.small} ${tab === "pending" ? styles.primary : ""}`}
                            disabled={busy}
                            onClick={() => moderate([r.id], "approved")}
                          >
                            Aprovar
                          </button>
                        ) : null}
                        {tab !== "rejected" ? (
                          <button
                            type="button"
                            className={`${styles.button} ${styles.small}`}
                            disabled={busy}
                            onClick={() => moderate([r.id], "rejected")}
                          >
                            Rejeitar
                          </button>
                        ) : null}
                        {tab !== "pending" ? (
                          <button
                            type="button"
                            className={`${styles.button} ${styles.small} ${styles.ghost}`}
                            disabled={busy}
                            onClick={() => moderate([r.id], "pending")}
                          >
                            Pendente
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={`${styles.button} ${styles.small} ${styles.ghost} ${styles.danger}`}
                          disabled={busy}
                          aria-label="Apagar resposta"
                          onClick={() => remove(r.id)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                  {!data.responses.length ? (
                    <p className={styles.emptyBody}>
                      {tab === "pending"
                        ? "Nenhuma resposta aguardando aprovação."
                        : tab === "approved"
                          ? "Nenhuma resposta aprovada ainda."
                          : "Nenhuma resposta rejeitada."}
                    </p>
                  ) : null}
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="import-title"
        onClose={() => setImportOpen(false)}
      >
        <div className={styles.dialogHead}>
          <h2 id="import-title">Importar respostas antigas</h2>
          <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={() => setImportOpen(false)}>
            Fechar
          </button>
        </div>
        <div className={styles.surveyDialogBody}>
          <p className={styles.hint}>
            Cole um array JSON, o texto dos e-mails que chegaram pelo Resend (com ou sem a linha <code>JSON:</code>)
            ou uma tabela CSV/TSV com cabeçalho.
          </p>
          <textarea
            className={`${styles.textarea} ${styles.mono}`}
            rows={8}
            placeholder='[{"role":"Pleno","specialty":"Product design","experience":"2 a 4","regime":"CLT","salary":8500,...}]'
            value={importRaw}
            onChange={e => { setImportRaw(e.target.value); setPreview(null); }}
          />
          <label className={styles.switchRow}>
            <span>Já aprovar as respostas válidas na importação</span>
            <input
              type="checkbox"
              className={styles.switch}
              checked={approveImmediately}
              onChange={e => setApproveImmediately(e.target.checked)}
            />
          </label>

          {preview ? (
            <div className={styles.group}>
              <div className={styles.groupHead}>
                <strong>
                  {preview.validCount} {preview.validCount === 1 ? "válida" : "válidas"} · {preview.invalid.length} com erro
                  {preview.outliers ? ` · ${preview.outliers} fora da faixa esperada` : ""}
                </strong>
              </div>
              {preview.sample.length ? (
                <div className={styles.list}>
                  {preview.sample.map((s, idx) => (
                    <div key={idx} className={styles.rowMeta}>
                      {s.role} · {brl(s.salary)} · {s.regime} · {s.companySize} · {s.state} · {s.createdAt}
                    </div>
                  ))}
                  {preview.validCount > preview.sample.length ? (
                    <div className={styles.hint}>… e mais {preview.validCount - preview.sample.length}.</div>
                  ) : null}
                </div>
              ) : null}
              {preview.invalid.length ? (
                <div className={styles.list}>
                  {preview.invalid.slice(0, 6).map(err => (
                    <div key={err.index} className={styles.error}>
                      Item {err.index}: {err.reason}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              className={styles.button}
              disabled={busy || !importRaw.trim()}
              onClick={analyzeImport}
            >
              Pré-visualizar
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              disabled={busy || !importRaw.trim() || (preview !== null && preview.validCount === 0)}
              onClick={commitImport}
            >
              {preview ? `Importar ${preview.validCount} respostas` : "Importar agora"}
            </button>
          </div>
        </div>
      </dialog>

      <Toast toast={toast} onClose={clear} />
    </AdminShell>
  );
}

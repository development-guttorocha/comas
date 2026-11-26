"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FixJob, Notice } from "@/lib/admin/notices";
import { load, publish, usePending, type PendingData } from "./usePending";
import AdminShell from "./AdminShell";
import { api } from "./client";
import { ArrowIcon } from "./icons";
import styles from "./admin.module.css";

type Draft = { href: string; label: string; meta: string; image?: string };

/** Pendências: the admin's first screen. What asks for something comes first; what is in order goes last, as one line. */
export default function AdminPending({ drafts }: { drafts: Draft[] }) {
  const { notices, jobs, ready } = usePending();
  const [error, setError] = useState("");
  const running = Object.values(jobs).some(j => j.state === "running");

  // A fix runs on the server: follow it until it ends, even after a reload of the admin.
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => void load().catch(() => {}), 2000);
    return () => clearInterval(timer);
  }, [running]);

  const fix = useCallback(async (id: string) => {
    setError("");
    try { publish(await api<PendingData>("/api/admin/notices", { method: "POST", body: { id } })); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível resolver."); }
  }, []);

  // Finished fixes whose item is gone still say what happened.
  const results = Object.entries(jobs).filter(([id, job]) => job.state !== "running" && !notices.some(n => n.id === id));
  const english = notices.filter(n => n.area === "Traduções");
  const warnings = notices.filter(n => n.area !== "Traduções");
  const summary = [
    english.length ? `${english.length} ${english.length === 1 ? "item" : "itens"} de inglês` : "Inglês em dia",
    `${drafts.length} ${drafts.length === 1 ? "rascunho" : "rascunhos"}`,
    `${warnings.length} ${warnings.length === 1 ? "aviso" : "avisos"}`,
  ].join(" · ");

  const sections: Array<{ title: string; count: number; waiting: boolean; empty: string; body: React.ReactNode }> = [
    { title: "Avisos", count: warnings.length, waiting: !ready, empty: "Nenhum aviso.", body: warnings.map(n => <NoticeRow key={n.id} notice={n} job={jobs[n.id]} onFix={fix} />) },
    {
      title: "Rascunhos", count: drafts.length, waiting: false, empty: "Nenhum rascunho: tudo o que existe está no site.",
      body: (
        <section className={styles.rows} aria-label="Rascunhos">
          {drafts.map(d => (
            <div key={d.href} className={styles.row} style={{ gridTemplateColumns: "64px minmax(0, 1fr) 32px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a local admin thumbnail, as in the case list */}
              <span className={styles.thumb}>{d.image ? <img src={d.image} alt="" loading="lazy" /> : null}</span>
              <span style={{ minWidth: 0 }}>
                <span className={styles.rowTitle} style={{ display: "block" }}>{d.label}</span>
                <span className={styles.rowMeta} style={{ display: "block" }}>{d.meta}</span>
              </span>
              <span className={styles.rowArrow} aria-hidden><ArrowIcon /></span>
              <Link href={d.href} className={styles.rowLink} aria-label={`Abrir ${d.label}`} />
            </div>
          ))}
        </section>
      ),
    },
    { title: "Inglês para revisar", count: english.length, waiting: !ready, empty: "Em dia em todo o site.", body: english.map(n => <NoticeRow key={n.id} notice={n} job={jobs[n.id]} onFix={fix} />) },
  ];
  // What asks for something first; a section still being checked keeps its place.
  const ordered = [...sections].sort((a, b) => Number(!a.count && !a.waiting) - Number(!b.count && !b.waiting));

  return (
    <AdminShell crumbs={[{ label: "Pendências" }]}>
      <div className={styles.sheet}>
        <div className={styles.page}>
          <div className={styles.screenHead}>
            <div>
              <h1 className={styles.title}>Pendências</h1>
              <p className={styles.pageSummary} aria-live="polite">{ready ? summary : "Conferindo o site…"}</p>
            </div>
          </div>
          {error ? <p className={styles.noticesResult} role="alert">{error}</p> : null}
          {results.map(([id, job]) => <p key={id} className={`${styles.noticesResult} ${styles.arrive}`} data-ok={job.state === "done" || undefined} role="status">{job.message}</p>)}
          {ordered.map(section => (
            <section key={section.title} className={styles.pendingSection} aria-label={section.title} aria-busy={section.waiting || undefined}>
              <h2 className={styles.pendingTitle}>{section.title}{section.count ? <span>{section.count}</span> : null}</h2>
              {section.waiting ? <div aria-hidden><div className={styles.skeleton}><i /><span><i /><i /></span></div><div className={styles.skeleton}><i /><span><i /><i /></span></div></div>
                : section.count ? <div className={styles.pendingList}>{section.body}</div>
                : <p className={styles.emptyLine}>{section.empty}</p>}
            </section>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

/** One notice as a row: a dot and its title say the state, the body says what it means, the action sits on the right. */
function NoticeRow({ notice: n, job, onFix }: { notice: Notice; job?: FixJob; onFix: (id: string) => void }) {
  return (
    <div className={styles.noticeRow} data-tone={n.tone}>
      <span className={styles.noticeDot} aria-label={n.tone === "bad" ? "Quebrado" : "Pede atenção"} role="img" />
      <div>
        <strong>{n.title}</strong>
        <p>{n.body}</p>
        {job && job.state !== "running" ? <span className={styles.noticeJob} data-ok={job.state === "done" || undefined}>{job.message}</span> : null}
      </div>
      <div className={styles.noticeRowActions}>
        {n.fix ? <button type="button" className={`${styles.button} ${styles.small}`} aria-busy={job?.state === "running" || undefined} disabled={job?.state === "running"} onClick={() => onFix(n.id)}>{job?.state === "running" ? "Resolvendo…" : n.fix}</button> : null}
        {n.href ? <Link href={n.href} className={styles.noticeLink}>{n.action ?? "Abrir"} →</Link> : null}
        {!n.fix && !n.href ? <span className={styles.noticeManual}>Fora do admin</span> : null}
      </div>
    </div>
  );
}

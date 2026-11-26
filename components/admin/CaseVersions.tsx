"use client";

import { useEffect, useRef, useState } from "react";
import type { CaseVersion } from "@/lib/admin/caseVersions";
import { api } from "./client";
import { CloseIcon } from "./icons";
import Skeleton from "./Skeleton";
import styles from "./admin.module.css";
import c from "./caseEditor.module.css";

// Versões (audit R6): the case saves on its own, so every editing session leaves the case as it was
// before it, here (lib/admin/caseVersions.ts, `.content-history/<slug>/`). Going back saves that
// version as the case, and the case of now becomes a version too: going back can be undone.

const DAY = 24 * 60 * 60 * 1000;
export function versionLabel(iso: string) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const start = new Date(); start.setHours(0, 0, 0, 0);
  if (date.getTime() >= start.getTime()) return `Hoje, ${time}`;
  if (date.getTime() >= start.getTime() - DAY) return `Ontem, ${time}`;
  return `${date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "")}, ${time}`;
}
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export default function CaseVersions({ slug, open, onClose, onRestore }: {
  slug: string; open: boolean; onClose: () => void;
  /** Goes back to a version; resolves when the case on screen is that version. */
  onRestore: (version: CaseVersion) => Promise<boolean>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [versions, setVersions] = useState<CaseVersion[] | null>(null);
  const [failed, setFailed] = useState("");
  const [asking, setAsking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
    if (!open) return;
    setAsking(null);
    setFailed("");
    api<{ versions: CaseVersion[] }>(`/api/admin/cases/${slug}/versions`).then(r => setVersions(r.versions), error => setFailed(error instanceof Error ? error.message : "Não foi possível ler as versões."));
  }, [open, slug]);

  async function restore(version: CaseVersion) {
    setBusy(true);
    const ok = await onRestore(version);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <dialog
      ref={dialog} className={c.drawer} aria-labelledby="versions-title"
      onCancel={e => { e.preventDefault(); onClose(); }}
      onClick={e => { if (e.target === dialog.current) onClose(); }}
    >
      <header className={c.drawerHead}>
        <h2 id="versions-title">Versões</h2>
        <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton}`} aria-label="Fechar" title="Fechar" onClick={onClose}><CloseIcon /></button>
      </header>
      <p className={c.drawerHint}>O case salva sozinho. Cada sessão de edição deixa aqui o case como estava antes dela, até 30 versões.</p>
      {failed ? <p className={c.drawerHint} role="alert">{failed}</p> : null}
      {versions && !versions.length ? <p className={c.drawerHint}>Ainda não há versões: a primeira aparece depois da próxima edição.</p> : null}
      {!versions && !failed ? <Skeleton kind="rows" label="Lendo as versões" count={4} /> : null}
      <ol className={c.versions}>
        {versions?.map(version => (
          <li key={version.id} className={c.version} data-asking={asking === version.id || undefined}>
            <div className={c.versionText}>
              <b>{versionLabel(version.at)}</b>
              <span>{version.title || "Sem título"}</span>
              <small>{plural(version.blocks, "bloco", "blocos")} · {plural(version.sections, "seção", "seções")}{version.video ? " · com vídeo" : ""}</small>
            </div>
            {asking === version.id ? (
              <div className={c.versionAsk}>
                <span>O case volta a como estava em {versionLabel(version.at).toLowerCase()}. A versão de agora fica guardada aqui.</span>
                <div>
                  <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} disabled={busy} onClick={() => setAsking(null)}>Cancelar</button>
                  <button type="button" className={`${styles.button} ${styles.primary} ${styles.small}`} disabled={busy} autoFocus onClick={() => void restore(version)}>{busy ? "Voltando…" : "Voltar a esta versão"}</button>
                </div>
              </div>
            ) : (
              <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => setAsking(version.id)}>Voltar a esta versão</button>
            )}
          </li>
        ))}
      </ol>
    </dialog>
  );
}

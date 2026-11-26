"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./admin.module.css";
import g from "./leaveGuard.module.css";

// Work on screen is never lost by changing screens. While a screen has unsaved edits:
// - a copy of them is kept in this browser (localStorage) and comes back when the screen opens again;
// - a click on a link inside the admin (menu, crumbs, "Trocar imagem"…) asks first;
// - closing or reloading the tab asks the browser's own question.
// A bridge until the admin saves on its own (audit R3 → R6).

type Kept<T> = { at: string; base: string; value: T };
const PREFIX = "admin-unsaved:";
const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function read<T>(key: string): Kept<T> | null {
  try {
    const raw = localStorage.getItem(key);
    const kept = raw ? (JSON.parse(raw) as Kept<T>) : null;
    return kept && typeof kept.at === "string" && typeof kept.base === "string" ? kept : null;
  } catch { return null; }
}
function write(key: string, kept: Kept<unknown> | null) {
  try { if (kept) localStorage.setItem(key, JSON.stringify(kept)); else localStorage.removeItem(key); } catch { /* storage off or full: the warning still guards */ }
}

/** The internal link a click would follow, or null when the click leaves the admin alone. */
function internalLink(event: MouseEvent): string | null {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const a = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || a.target === "_blank" || a.hasAttribute("download")) return null;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return null;
  if (url.pathname === location.pathname && url.search === location.search) return null; // same page, a hash at most
  return url.pathname + url.search + url.hash;
}

export function useLeaveGuard<T>({ id, dirty, value, base, onRestore, onDiscard, onSave, restore: restoreMode = "auto" }: {
  /** One per screen and item, e.g. "case:picpay". */
  id: string;
  dirty: boolean;
  /** Everything needed to put the screen back as it is. */
  value: T;
  /** The saved version the edits were made on (the revision): a copy made on another version is offered, not applied. */
  base: string;
  onRestore: (value: T) => void;
  /** Back to the saved version. */
  onDiscard: () => void;
  /** Saves; true when it worked. */
  onSave?: () => Promise<boolean>;
  /**
   * "auto" puts kept edits back on opening; "offer" only offers them (Recuperar / Descartar). A screen
   * that saves on its own uses "offer": opening it never writes anything, and edits kept by another
   * tab of the same screen (the browser shares this storage) are never applied behind its back.
   */
  restore?: "auto" | "offer";
}) {
  const key = PREFIX + id;
  const router = useRouter();
  const [note, setNote] = useState<{ kind: "restored" | "older"; at: string; value?: T } | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const latest = useRef({ dirty, value, base });
  latest.current = { dirty, value, base };
  const checked = useRef(false);
  const older = useRef(false);
  const restore = useRef(onRestore);
  restore.current = onRestore;

  // Opening the screen: edits kept from a previous visit come back.
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    const kept = read<T>(key);
    if (!kept) return;
    // A copy equal to the screen has nothing to bring back.
    if (JSON.stringify(kept.value) === JSON.stringify(latest.current.value)) { write(key, null); return; }
    if (kept.base === latest.current.base && restoreMode === "auto") { restore.current(kept.value); setNote({ kind: "restored", at: kept.at }); }
    else { older.current = true; setNote({ kind: "older", at: kept.at, value: kept.value }); }
  }, [key]);

  // Each change is kept a moment later; a clean screen keeps nothing (unless an older copy waits for a choice).
  useEffect(() => {
    if (!checked.current) return;
    if (!dirty) { if (!older.current) write(key, null); return; }
    older.current = false;
    const timer = window.setTimeout(() => write(key, { at: new Date().toISOString(), base, value }), 400);
    return () => window.clearTimeout(timer);
  }, [base, dirty, key, value]);

  // Once the restored edits are saved (or undone), the line about them has nothing left to say.
  useEffect(() => { if (!dirty && note?.kind === "restored") setNote(null); }, [dirty, note]);

  // Leaving by any road (back button included) keeps the last state at once.
  useEffect(() => () => {
    const { dirty: d, value: v, base: b } = latest.current;
    if (d) write(key, { at: new Date().toISOString(), base: b, value: v });
  }, [key]);

  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent) => {
      if (!latest.current.dirty) return;
      write(key, { at: new Date().toISOString(), base: latest.current.base, value: latest.current.value });
      event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      if (!latest.current.dirty) return;
      const href = internalLink(event);
      if (!href) return;
      event.preventDefault();
      event.stopPropagation(); // the link's own router never sees the click
      setLeaving(href);
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener("beforeunload", onUnload); document.removeEventListener("click", onClick, true); };
  }, [key]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (leaving && !el.open) el.showModal();
    if (!leaving && el.open) el.close();
  }, [leaving]);

  function go(href: string) {
    const { dirty: d, value: v, base: b } = latest.current;
    if (d) write(key, { at: new Date().toISOString(), base: b, value: v });
    setLeaving(null);
    router.push(href);
  }
  async function saveAndGo(href: string) {
    if (!onSave) return;
    setSaving(true);
    const ok = await onSave().catch(() => false);
    setSaving(false);
    if (ok) { write(key, null); setLeaving(null); router.push(href); }
  }

  const noteUi = note ? (
        <div className={g.note} role="status">
          {note.kind === "restored" ? <>
            <span>Voltaram as alterações que não tinham sido salvas ({when(note.at)}).</span>
            <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={() => { onDiscard(); write(key, null); setNote(null); }}>Voltar à versão salva</button>
            <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => setNote(null)}>Ok</button>
          </> : <>
            <span>{restoreMode === "offer" ? `Há alterações de ${when(note.at)} guardadas neste navegador que não chegaram a ser salvas.` : `Há alterações não salvas de ${when(note.at)}, feitas antes de a versão salva mudar.`}</span>
            <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={() => { older.current = false; write(key, null); setNote(null); }}>Descartar</button>
            <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => { older.current = false; if (note.value !== undefined) onRestore(note.value); setNote(null); }}>Recuperar</button>
          </>}
        </div>
      ) : null;
  const dialogUi = (
      <dialog ref={dialog} className={g.dialog} aria-labelledby="leave-title" onCancel={e => { e.preventDefault(); setLeaving(null); }}>
        <h2 id="leave-title">Sair sem salvar?</h2>
        <p>As alterações ficam guardadas neste navegador e voltam quando você abrir esta tela de novo.</p>
        <div className={g.actions}>
          <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={() => setLeaving(null)} autoFocus={!onSave}>Ficar</button>
          <button type="button" className={styles.button} onClick={() => leaving && go(leaving)}>Sair</button>
          {onSave ? <button type="button" className={`${styles.button} ${styles.primary}`} disabled={saving} autoFocus onClick={() => leaving && void saveAndGo(leaving)}>{saving ? "Salvando…" : "Salvar e sair"}</button> : null}
        </div>
      </dialog>
  );

  /** `ui` is both; a screen that places them apart uses `note` (in the flow) and `dialog` (anywhere). */
  return { ui: <>{noteUi}{dialogUi}</>, note: noteUi, dialog: dialogUi };
}

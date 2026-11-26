"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./admin.module.css";

const KEY = "admin-locked";
const IDLE_MS = 10 * 60 * 1000;
const WARN_MS = 30 * 1000;
const HOLD_MS = 900;
const LOCK_EVENT = "admin:lock";

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

/** The rail's padlock: covers the admin (see `AdminLock`). */
export function LockButton() {
  return <button type="button" className={styles.railButton} title="Travar o admin (⌘⇧L)" onClick={() => window.dispatchEvent(new Event(LOCK_EVENT))}><LockIcon /><span className={styles.navLabel}>Travar</span></button>;
}

/** A slow action is on screen (the busy overlay, or anything marked aria-busy): idleness waits for it. */
const working = () => !!document.querySelector("[popover]:popover-open, [aria-busy='true']");

/**
 * A privacy lock for the admin: blur and a padlock over everything. Set by the padlock, ⌘⇧L, or
 * 10 minutes without use, with a warning 30 seconds before. Opening the admin never starts locked.
 * Holding the button unlocks. Locking hides; it never discards what is on screen.
 */
export default function AdminLock() {
  const [locked, setLocked] = useState(false);
  const [warning, setWarning] = useState(false);
  const [holding, setHolding] = useState(false);
  const timer = useRef(0);
  const panel = useRef<HTMLDivElement>(null);

  const lock = useCallback((value: boolean) => {
    setWarning(false);
    setLocked(value);
  }, []);

  // Lock on the event, the shortcut, or idleness; a reload starts unlocked.
  useEffect(() => {
    try { localStorage.removeItem(KEY); } catch { /* an older admin kept the lock across reloads */ }
    let warn = 0, idle = 0;
    const schedule = () => {
      window.clearTimeout(warn); window.clearTimeout(idle);
      setWarning(false);
      warn = window.setTimeout(() => {
        if (working()) return schedule();
        setWarning(true);
        idle = window.setTimeout(() => (working() ? schedule() : lock(true)), WARN_MS);
      }, IDLE_MS - WARN_MS);
    };
    schedule();
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "l") { event.preventDefault(); lock(true); }
    };
    const onLock = () => lock(true);
    const events = ["pointerdown", "keydown", "wheel"] as const;
    events.forEach(name => window.addEventListener(name, schedule, { passive: true }));
    window.addEventListener("keydown", onKey);
    window.addEventListener(LOCK_EVENT, onLock);
    return () => {
      window.clearTimeout(warn); window.clearTimeout(idle);
      events.forEach(name => window.removeEventListener(name, schedule));
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(LOCK_EVENT, onLock);
    };
  }, [lock]);

  // Everything behind the lock is out of reach, keyboard included.
  useEffect(() => {
    const siblings = panel.current?.parentElement ? Array.from(panel.current.parentElement.children).filter(el => el !== panel.current) : [];
    siblings.forEach(el => el.toggleAttribute("inert", locked));
    if (locked) panel.current?.querySelector("button")?.focus();
    return () => siblings.forEach(el => el.removeAttribute("inert"));
  }, [locked]);

  const start = () => {
    setHolding(true);
    timer.current = window.setTimeout(() => { setHolding(false); lock(false); }, HOLD_MS);
  };
  const stop = () => { window.clearTimeout(timer.current); setHolding(false); };

  return (
    <>
    {warning && !locked ? (
      <div className={styles.lockWarning} role="status">
        <span>O admin trava em 30 segundos por falta de uso.</span>
        {/* Any click already counts as use; the button says so. */}
        <button type="button" className={`${styles.button} ${styles.primary} ${styles.small}`}>Continuar usando</button>
      </div>
    ) : null}
    <div ref={panel} className={styles.lock} data-locked={locked} aria-hidden={!locked}>
      {locked ? (
        <div className={styles.lockCard} role="dialog" aria-label="Admin travado">
          <span className={styles.lockBadge}><LockIcon /></span>
          <strong>Admin travado</strong>
          <span className={styles.hint}>Segure o botão para destravar.</span>
          <button type="button" className={styles.lockHold} data-holding={holding} style={{ ["--hold" as string]: `${HOLD_MS}ms` }}
            onPointerDown={start} onPointerUp={stop} onPointerLeave={stop}
            onKeyDown={event => { if ((event.key === "Enter" || event.key === " ") && !event.repeat) { event.preventDefault(); start(); } }}
            onKeyUp={stop}>
            <span>Segure para destravar</span>
          </button>
        </div>
      ) : null}
    </div>
    </>
  );
}

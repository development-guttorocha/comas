"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./admin.module.css";

// Quick actions finish before this and never flash the screen.
const DELAY_MS = 250;

/**
 * While a slow action runs: the admin's lock blur over everything, with a spinner and what is happening
 * in the middle. It sits in the top layer (a popover), so it also covers an open dialog.
 */
export default function BusyOverlay({ label }: { label: string }) {
  const panel = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState("");

  useEffect(() => {
    if (!label) { setShown(""); return; }
    const timer = window.setTimeout(() => setShown(label), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [label]);

  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const open = el.matches(":popover-open");
    if (shown && !open) el.showPopover();
    if (!shown && open) el.hidePopover();
  }, [shown]);

  return (
    <div ref={panel} popover="manual" className={styles.busy} role="status" aria-live="polite">
      {shown ? (
        <div className={styles.busyCard}>
          <span className={styles.spinner} aria-hidden />
          <strong>{shown}</strong>
          <span className={styles.hint}>Isso pode levar alguns segundos.</span>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { FixJob, Notice } from "@/lib/admin/notices";
import { api } from "./client";
import styles from "./admin.module.css";

export type PendingData = { notices: Notice[]; jobs: Record<string, FixJob> };

// One read serves the screens opened within a minute; the admin moves between them often.
let cached: (PendingData & { at: number }) | null = null;
const listeners = new Set<(data: PendingData) => void>();
export const publish = (data: PendingData) => { cached = { ...data, at: Date.now() }; listeners.forEach(listener => listener(data)); };
export const load = () => api<PendingData>("/api/admin/notices").then(publish);

/** Everything that needs attention, shared by the menu's count and the Pendências screen. */
export function usePending() {
  const [data, setPendingData] = useState<PendingData>(cached ?? { notices: [], jobs: {} });
  const [ready, setReady] = useState(!!cached);
  useEffect(() => {
    const listener = (next: PendingData) => { setPendingData(next); setReady(true); };
    listeners.add(listener);
    if (!cached || Date.now() - cached.at > 60_000) load().catch(() => setReady(true));
    return () => { listeners.delete(listener); };
  }, []);
  return { ...data, ready };
}

/** The number next to Pendências in the menu: the problems (drafts are listed there, not counted). */
export function PendingCount() {
  const { notices } = usePending();
  if (!notices.length) return null;
  return <span className={styles.railCount} data-tone={notices.some(n => n.tone === "bad") ? "bad" : undefined} aria-label={`${notices.length} pendentes`}>{notices.length}</span>;
}


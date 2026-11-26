"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./admin.module.css";

/** JSON (or form) request to the admin API; throws the server's message. */
export async function api<T = Record<string, unknown>>(url: string, { method = "GET", body }: { method?: string; body?: unknown } = {}): Promise<T> {
  const form = body instanceof FormData;
  const response = await fetch(url, {
    method, cache: "no-store",
    ...(body === undefined ? {} : form ? { body } : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error((data as { error?: string }).error || "Não foi possível concluir."), { status: response.status });
  return data as T;
}

const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
export function relativeTime(ms: number) {
  if (!ms) return "—";
  const minutes = Math.round((ms - Date.now()) / 60000);
  if (Math.abs(minutes) < 1) return "agora";
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return relative.format(days, "day");
  return new Date(ms).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

export type ToastState = { text: string; tone: "good" | "bad" } | null;

/** One message at a time; errors stay until the next action, confirmations fade. */
export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef(0);
  const show = useCallback((value: unknown, tone?: "good" | "bad") => {
    window.clearTimeout(timer.current);
    const error = value instanceof Error;
    setToast({ text: error ? value.message : String(value), tone: tone ?? (error ? "bad" : "good") });
    if (!error && tone !== "bad") timer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { toast, show, clear: () => setToast(null) };
}

export function Toast({ toast, onClose }: { toast: ToastState; onClose?: () => void }) {
  if (!toast) return null;
  return (
    <div className={styles.toast} data-tone={toast.tone} role={toast.tone === "bad" ? "alert" : "status"}>
      <span>{toast.text}</span>
      {onClose ? <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={onClose}>Fechar</button> : null}
    </div>
  );
}

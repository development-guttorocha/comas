"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LogoMark } from "./icons";
import styles from "./admin.module.css";

type SessionInfo = {
  authMode: "email" | "pin" | "none";
  authRequired: boolean;
  authenticated: boolean;
  email?: string;
};

let cachedSession: SessionInfo | null = null;

export function clearCachedSession() {
  cachedSession = null;
}

export default function AdminAuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(cachedSession);
  const [emailInput, setEmailInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/social/posts?session=1", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as Partial<SessionInfo>;
      const next: SessionInfo = {
        authMode: data.authMode ?? "none",
        authRequired: Boolean(data.authRequired),
        authenticated: res.status !== 401 && data.authenticated !== false,
        email: data.email,
      };
      cachedSession = next;
      setSession(next);
    } catch {
      setSession({ authMode: "none", authRequired: false, authenticated: true });
    }
  }, []);

  useEffect(() => {
    if (!cachedSession) void loadSession();
  }, [loadSession]);

  useEffect(() => {
    const onLogout = async () => {
      await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      cachedSession = null;
      setChallengeToken("");
      setCodeInput("");
      await loadSession();
    };
    window.addEventListener("admin:logout", onLogout);
    return () => window.removeEventListener("admin:logout", onLogout);
  }, [loadSession]);

  if (!session) {
    return (
      <div className={styles.lock} data-locked="true" style={{ background: "var(--bg, #0e0e0e)" }}>
        <div className={styles.lockCard}>
          <span className={styles.lockBadge}><LogoMark /></span>
          <span className={styles.hint}>Carregando…</span>
        </div>
      </div>
    );
  }

  if (!session.authRequired || session.authenticated) {
    return <>{children}</>;
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_code", email: emailInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível enviar o código.");
      setChallengeToken(data.challengeToken);
      setCodeInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar o código.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_code", challengeToken, code: codeInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Código inválido.");
      cachedSession = null;
      await loadSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyPin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auth", pin: pinInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "PIN incorreto.");
      cachedSession = null;
      await loadSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "PIN incorreto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.app} style={{ gridTemplateColumns: "1fr", gridTemplateRows: "1fr" }}>
      <div className={styles.lock} data-locked="true" style={{ background: "var(--bg)" }}>
        <div
          className={styles.panel}
          style={{ width: "min(380px, 92vw)", padding: 24, display: "grid", gap: 14, textAlign: "left" }}
          role="dialog"
          aria-label="Entrar no Admin"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className={styles.logo}><LogoMark /></span>
            <div>
              <strong style={{ display: "block", fontSize: 15, fontWeight: 500 }}>Texto em Ciclo · Admin</strong>
              <span className={styles.hint}>Acesso protegido</span>
            </div>
          </div>

          {session.authMode === "email" ? (
            !challengeToken ? (
              <form onSubmit={requestCode} style={{ display: "grid", gap: 12 }}>
                <p className={styles.hint} style={{ margin: 0 }}>
                  Informe seu e-mail autorizado para receber um código de 6 dígitos via Resend.
                </p>
                <label className={styles.field}>
                  <span className={styles.label}>E-mail</span>
                  <input
                    type="email"
                    className={styles.input}
                    placeholder="renata@textoemciclo.com.br"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    required
                    autoFocus
                  />
                </label>
                {error ? <span className={styles.chip} data-tone="bad">{error}</span> : null}
                <button type="submit" className={`${styles.button} ${styles.primary}`} aria-busy={busy} disabled={busy}>
                  {busy ? "Enviando…" : "Enviar código"}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyCode} style={{ display: "grid", gap: 12 }}>
                <p className={styles.hint} style={{ margin: 0 }}>
                  Enviamos um código para <strong style={{ color: "var(--ink)" }}>{emailInput}</strong>.
                </p>
                <label className={styles.field}>
                  <span className={styles.label}>Código de 6 dígitos</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className={`${styles.input} ${styles.mono}`}
                    placeholder="000000"
                    value={codeInput}
                    onChange={e => setCodeInput(e.target.value)}
                    required
                    autoFocus
                  />
                </label>
                {error ? <span className={styles.chip} data-tone="bad">{error}</span> : null}
                <button type="submit" className={`${styles.button} ${styles.primary}`} aria-busy={busy} disabled={busy}>
                  {busy ? "Verificando…" : "Entrar"}
                </button>
                <button
                  type="button"
                  className={`${styles.button} ${styles.ghost} ${styles.small}`}
                  onClick={() => {
                    setChallengeToken("");
                    setError("");
                  }}
                >
                  Trocar e-mail ou reenviar
                </button>
              </form>
            )
          ) : (
            <form onSubmit={verifyPin} style={{ display: "grid", gap: 12 }}>
              <p className={styles.hint} style={{ margin: 0 }}>Digite o PIN de acesso.</p>
              <input
                type="password"
                inputMode="numeric"
                className={styles.input}
                placeholder="PIN"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                required
                autoFocus
              />
              {error ? <span className={styles.chip} data-tone="bad">{error}</span> : null}
              <button type="submit" className={`${styles.button} ${styles.primary}`} aria-busy={busy} disabled={busy}>
                {busy ? "Entrando…" : "Entrar"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

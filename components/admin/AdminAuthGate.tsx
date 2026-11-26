"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { SocialSession } from "@/lib/social/auth";
import { LogoMark } from "./icons";
import styles from "./admin.module.css";

let cachedSession: SocialSession | null = null;

export function clearCachedSession() {
  cachedSession = null;
}

export function getCachedEmail(): string | undefined {
  return cachedSession?.email;
}

export async function logoutAdminSession() {
  try {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
      cache: "no-store",
    });
  } catch {
    // Even if network fails, clear client state and navigate to /admin/login.
  }
  cachedSession = null;
  window.location.replace("/admin/login");
}

function safeClientNextPath(raw: string | undefined): string {
  const candidate = (raw ?? "").trim();
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.startsWith("/\\") ||
    candidate === "/admin/login" ||
    candidate.startsWith("/admin/login?")
  ) {
    return "/admin/carrosseis";
  }
  return candidate;
}

const ENV_HINTS: Record<string, string> = {
  ALLOWED_ADMIN_EMAILS: "Lista de e-mails autorizados separados por vírgula (ex.: voce@dominio.com).",
  RESEND_API_KEY: "Chave da API do Resend para envio do código de 6 dígitos por e-mail.",
};

export function AdminLoginScreen({
  initialSession,
  nextPath = "/admin/carrosseis",
  onAuthenticated,
}: {
  initialSession?: SocialSession;
  nextPath?: string;
  onAuthenticated?: () => void;
}) {
  const router = useRouter();
  const [session, setSession] = useState<SocialSession | null>(initialSession ?? null);
  const [emailInput, setEmailInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const refreshConfig = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as SocialSession | null;
      if (data) {
        setSession(data);
        if (data.authenticated) {
          cachedSession = data;
          if (onAuthenticated) {
            onAuthenticated();
          } else {
            window.location.replace(safeClientNextPath(nextPath));
          }
        }
      }
    } catch {
      setError("Não foi possível verificar o status da autenticação.");
    } finally {
      setBusy(false);
    }
  }, [nextPath, onAuthenticated]);

  useEffect(() => {
    if (!initialSession) {
      void refreshConfig();
    }
  }, [initialSession, refreshConfig]);

  async function sendCode(emailToUse: string) {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_code", email: emailToUse }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        challengeToken?: string;
        error?: string;
      };
      if (!res.ok || !data.challengeToken) {
        throw new Error(data.error || "Não foi possível enviar o código.");
      }
      setChallengeToken(data.challengeToken);
      setCodeInput("");
      setInfo("Código enviado! Verifique sua caixa de entrada e o spam.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar o código.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    await sendCode(emailInput);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_code",
          challengeToken,
          code: codeInput,
        }),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        email?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Código inválido.");
      }
      cachedSession = null;
      if (onAuthenticated) {
        onAuthenticated();
      } else {
        const destination = safeClientNextPath(nextPath);
        router.replace(destination);
        router.refresh();
        window.location.replace(destination);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido.");
      setBusy(false);
    }
  }

  const missingEnv = session?.missingEnv ?? [];
  const configured = session ? session.configured : true;

  return (
    <div className={styles.app} style={{ gridTemplateColumns: "1fr", gridTemplateRows: "1fr" }}>
      <div className={styles.lock} data-locked="true" style={{ background: "var(--bg)" }}>
        <div
          className={styles.panel}
          style={{
            width: "min(410px, 92vw)",
            padding: 24,
            display: "grid",
            gap: 16,
            textAlign: "left",
            borderRadius: 12,
            border: "1px solid var(--line-strong)",
          }}
          role="dialog"
          aria-label="Entrar no Admin"
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className={styles.logo}><LogoMark /></span>
              <div>
                <strong style={{ display: "block", fontSize: 15, fontWeight: 500 }}>
                  Texto em Ciclo · Admin
                </strong>
                <span className={styles.hint}>Acesso protegido por código de 6 dígitos</span>
              </div>
            </div>
          </div>

          {!session ? (
            <p className={styles.hint} style={{ margin: 0 }}>
              Verificando sessão…
            </p>
          ) : !configured ? (
            <div style={{ display: "grid", gap: 12 }}>
              <span className={styles.chip} data-tone="warn" style={{ justifySelf: "start" }}>
                Configuração necessária
              </span>
              <p className={styles.hint} style={{ margin: 0, lineHeight: 1.55 }}>
                O acesso ao painel está bloqueado até que as variáveis de autenticação estejam definidas no{" "}
                <code className={styles.mono}>.env.local</code> (ambiente local) ou na Vercel (produção):
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {missingEnv.map(envName => (
                  <div
                    key={envName}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "var(--field)",
                      border: "1px solid var(--line)",
                      display: "grid",
                      gap: 4,
                    }}
                  >
                    <code className={styles.mono} style={{ fontSize: 12, color: "var(--ink)" }}>
                      {envName}
                    </code>
                    <span className={styles.hint} style={{ fontSize: 12 }}>
                      {ENV_HINTS[envName] ?? "Obrigatória para autenticação."}
                    </span>
                  </div>
                ))}
              </div>
              {error ? <span className={styles.chip} data-tone="bad">{error}</span> : null}
              <button
                type="button"
                className={`${styles.button} ${styles.primary}`}
                disabled={busy}
                aria-busy={busy}
                onClick={() => void refreshConfig()}
              >
                {busy ? "Verificando…" : "Verificar novamente"}
              </button>
            </div>
          ) : !challengeToken ? (
            <form onSubmit={handleRequestCode} style={{ display: "grid", gap: 12 }}>
              <p className={styles.hint} style={{ margin: 0 }}>
                Informe seu e-mail autorizado para receber um código de acesso de 6 dígitos.
              </p>
              <label className={styles.field}>
                <span className={styles.label}>E-mail</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  className={styles.input}
                  placeholder="voce@textoemciclo.com.br"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  required
                  autoFocus
                />
              </label>
              {error ? <span className={styles.chip} data-tone="bad">{error}</span> : null}
              <button
                type="submit"
                className={`${styles.button} ${styles.primary}`}
                aria-busy={busy}
                disabled={busy || !emailInput.trim()}
              >
                {busy ? "Enviando código…" : "Enviar código"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} style={{ display: "grid", gap: 12 }}>
              <p className={styles.hint} style={{ margin: 0 }}>
                Enviamos um código de 6 dígitos para{" "}
                <strong style={{ color: "var(--ink)" }}>{emailInput.trim()}</strong>.
              </p>
              <label className={styles.field}>
                <span className={styles.label}>Código de 6 dígitos</span>
                <input
                  type="text"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={7}
                  className={`${styles.input} ${styles.mono}`}
                  placeholder="000000"
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value.replace(/[^\d\s-]/g, ""))}
                  required
                  autoFocus
                />
              </label>
              {info && !error ? <span className={styles.chip} data-tone="good">{info}</span> : null}
              {error ? <span className={styles.chip} data-tone="bad">{error}</span> : null}
              <button
                type="submit"
                className={`${styles.button} ${styles.primary}`}
                aria-busy={busy}
                disabled={busy || codeInput.replace(/\D+/g, "").length !== 6}
              >
                {busy ? "Verificando…" : "Entrar no painel"}
              </button>
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.ghost} ${styles.small}`}
                  disabled={busy}
                  onClick={() => void sendCode(emailInput)}
                >
                  Reenviar código
                </button>
                <button
                  type="button"
                  className={`${styles.button} ${styles.ghost} ${styles.small}`}
                  disabled={busy}
                  onClick={() => {
                    setChallengeToken("");
                    setCodeInput("");
                    setError("");
                    setInfo("");
                  }}
                >
                  Trocar e-mail
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminAuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SocialSession | null>(cachedSession);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as Partial<SocialSession> | null;
      const next: SocialSession = {
        authMode: data?.authMode === "email" ? "email" : "unconfigured",
        authRequired: true,
        configured: Boolean(data?.configured),
        missingEnv: Array.isArray(data?.missingEnv) ? data.missingEnv : [],
        authenticated: res.ok && data?.authenticated === true,
        email: data?.email,
      };
      cachedSession = next;
      setSession(next);
    } catch {
      // Fail closed on network/server failure — never grant unauthenticated access.
      const fallback: SocialSession = {
        authMode: "unconfigured",
        authRequired: true,
        configured: false,
        missingEnv: [],
        authenticated: false,
      };
      cachedSession = null;
      setSession(fallback);
    }
  }, []);

  useEffect(() => {
    if (!cachedSession || !cachedSession.authenticated) {
      void loadSession();
    }
  }, [loadSession]);

  useEffect(() => {
    const onLogout = () => {
      void logoutAdminSession();
    };
    window.addEventListener("admin:logout", onLogout);
    return () => window.removeEventListener("admin:logout", onLogout);
  }, []);

  if (!session) {
    return (
      <div className={styles.app} style={{ gridTemplateColumns: "1fr", gridTemplateRows: "1fr" }}>
        <div className={styles.lock} data-locked="true" style={{ background: "var(--bg)" }}>
          <div className={styles.lockCard}>
            <span className={styles.lockBadge}><LogoMark /></span>
            <span className={styles.hint}>Verificando acesso…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!session.authenticated) {
    const currentPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/admin/carrosseis";
    return (
      <AdminLoginScreen
        initialSession={session}
        nextPath={currentPath}
        onAuthenticated={() => {
          cachedSession = null;
          void loadSession();
        }}
      />
    );
  }

  return <>{children}</>;
}

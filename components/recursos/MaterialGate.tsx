"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useState } from "react";
import {
  requestCareerKitTokenAction,
  verifyCareerKitTokenAction,
  type CareerAuthActionState,
} from "@/app/actions/careerKit";
import type { CareerTrackContent } from "@/lib/resources";
import styles from "@/app/(pt)/servicos/service-shell.module.css";

/**
 * Orchestrated Email OTP gate for the Career Clarity Kit.
 * Step 1 sends a 6-digit access code to the designer's inbox; Step 2 verifies it,
 * opens an HttpOnly cloud session, and navigates to the saved interactive kit.
 */
export default function MaterialGate({
  copy,
  material,
  page,
  href,
  consultingHref,
  id,
  defaultMode = "signup",
  variant = "dark",
}: {
  copy: CareerTrackContent["gate"];
  material: string;
  page: string;
  href: string;
  consultingHref: string;
  id?: string;
  defaultMode?: "signup" | "login";
  variant?: "dark" | "paper";
}) {
  const router = useRouter();
  const uid = useId();
  const prefix = `${id ?? "gate"}-${uid}`;

  const [mode, setMode] = useState<"signup" | "login">(defaultMode);
  const [stageOverride, setStageOverride] = useState<"auto" | "request">("auto");
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftOptIn, setDraftOptIn] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [startedAt] = useState(() => Date.now());

  const [reqState, reqAction, reqPending] = useActionState<CareerAuthActionState, FormData>(
    requestCareerKitTokenAction,
    { status: "idle", mode: defaultMode },
  );

  const [verifyState, verifyAction, verifyPending] = useActionState<CareerAuthActionState, FormData>(
    verifyCareerKitTokenAction,
    { status: "idle", mode: defaultMode },
  );

  const cooldownUntil = reqState.status === "code_sent" ? (reqState.cooldownUntil ?? 0) : 0;
  const cooldown = cooldownUntil > nowMs ? Math.max(1, Math.ceil((cooldownUntil - nowMs) / 1000)) : 0;

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (current >= cooldownUntil) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  useEffect(() => {
    if (verifyState.status !== "authenticated") return;
    track("material_signup", { page, material });
    router.push(verifyState.redirectTo || href);
    router.refresh();
  }, [verifyState, page, material, href, router]);

  if (verifyState.status === "authenticated") {
    return (
      <div className={styles.formSent} role="status">
        <span aria-hidden="true">✓</span>
        <h3>{copy.sentTitle}</h3>
        <p>{copy.sentBody}</p>
        <Link href={verifyState.redirectTo || href} className={styles.btn} data-variant="primary" data-cta="material-abrir">
          {copy.open}
          <span aria-hidden="true">→</span>
        </Link>
        <p>
          {copy.consulting}{" "}
          <Link
            href={consultingHref}
            data-cta="material-consultoria"
            style={{ color: "var(--color-ink)", textDecoration: "underline", textUnderlineOffset: 4 }}
          >
            {copy.consultingCta}
          </Link>
        </p>
      </div>
    );
  }

  const surfaceAttr = variant === "paper" ? "paper" : undefined;
  const step = reqState.status === "code_sent" && reqState.email && stageOverride !== "request" ? "verify" : "request";
  const activeEmail = draftEmail || reqState.email || "";
  const activeName = draftName || reqState.name || "";
  const activeOptIn = draftOptIn || Boolean(reqState.optIn);

  if (step === "verify") {
    const codeErr = verifyState.errors?.code;
    const codeId = `${prefix}-code`;
    const codeErrorId = `${prefix}-code-error`;

    return (
      <div className={styles.form} data-surface={surfaceAttr}>
        <p className={styles.otpLead}>
          Enviamos um código de 6 dígitos para <strong>{activeEmail}</strong>. Ele vale por 15 minutos.
        </p>

        <form action={verifyAction} className={styles.form} data-surface={surfaceAttr} noValidate>
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="email" value={activeEmail} />
          <input type="hidden" name="name" value={activeName} />
          <input type="hidden" name="optIn" value={activeOptIn ? "on" : ""} />
          <div className={styles.honeypot} aria-hidden="true">
            <label>Site<input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>

          <label className={styles.field} htmlFor={codeId}>
            <span>Código de acesso (6 dígitos)</span>
            <input
              id={codeId}
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={12}
              placeholder="000 000"
              required
              autoFocus
              className={styles.otpInput}
              aria-invalid={codeErr ? true : undefined}
              aria-describedby={codeErr ? codeErrorId : undefined}
            />
            {codeErr ? <small id={codeErrorId}>{codeErr}</small> : null}
          </label>

          {reqState.message && !codeErr ? (
            <p className={styles.formError} role="status">{reqState.message}</p>
          ) : null}

          <div className={styles.formFoot}>
            <button type="submit" className={styles.btn} data-variant="primary" disabled={verifyPending} data-cta="material-verify">
              {verifyPending ? "Validando…" : "Entrar e abrir a trilha"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>

        <form
          action={reqAction}
          onSubmit={() => setStageOverride("auto")}
          className={styles.otpSecondaryRow}
        >
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="email" value={activeEmail} />
          <input type="hidden" name="name" value={activeName} />
          <input type="hidden" name="optIn" value={activeOptIn ? "on" : ""} />
          <input type="hidden" name="startedAt" value={startedAt} />
          <div className={styles.honeypot} aria-hidden="true">
            <label>Site<input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>

          <button
            type="submit"
            className={styles.otpLinkBtn}
            disabled={reqPending || cooldown > 0}
          >
            {reqPending
              ? "Reenviando…"
              : cooldown > 0
                ? `Reenviar código em ${cooldown}s`
                : "Reenviar código"}
          </button>

          <button
            type="button"
            className={styles.otpLinkBtn}
            onClick={() => setStageOverride("request")}
          >
            Trocar e-mail
          </button>
        </form>
      </div>
    );
  }

  const err = reqState.errors ?? {};
  const isLogin = mode === "login";

  return (
    <form
      id={id}
      action={reqAction}
      onSubmit={() => setStageOverride("auto")}
      className={styles.form}
      data-surface={surfaceAttr}
      noValidate
    >
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="startedAt" value={startedAt} />
      <div className={styles.honeypot} aria-hidden="true">
        <label>Site<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className={styles.formRow} data-single={isLogin ? "true" : undefined}>
        {!isLogin ? (
          <label className={styles.field} htmlFor={`${prefix}-name`}>
            <span>{copy.name}</span>
            <input
              id={`${prefix}-name`}
              name="name"
              type="text"
              autoComplete="name"
              required
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              aria-invalid={err.name ? true : undefined}
              aria-describedby={err.name ? `${prefix}-name-error` : undefined}
            />
            {err.name ? <small id={`${prefix}-name-error`}>{err.name}</small> : null}
          </label>
        ) : null}

        <label className={styles.field} htmlFor={`${prefix}-email`}>
          <span>{copy.email}</span>
          <input
            id={`${prefix}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            value={draftEmail}
            onChange={e => setDraftEmail(e.target.value)}
            aria-invalid={err.email ? true : undefined}
            aria-describedby={err.email ? `${prefix}-email-error` : undefined}
          />
          {err.email ? <small id={`${prefix}-email-error`}>{err.email}</small> : null}
        </label>
      </div>

      {!isLogin ? (
        <label className={styles.check}>
          <input
            type="checkbox"
            name="optIn"
            checked={draftOptIn}
            onChange={e => setDraftOptIn(e.target.checked)}
          />
          <span>{copy.optIn}</span>
        </label>
      ) : null}

      {reqState.message ? (
        <p className={styles.formError} role="alert">{reqState.message}</p>
      ) : null}

      <div className={styles.formFoot}>
        <button type="submit" className={styles.btn} data-variant="primary" disabled={reqPending} data-cta="material-submit">
          {reqPending ? copy.sending : copy.submit}
          <span aria-hidden="true">→</span>
        </button>
        <p>
          {copy.privacy} Veja os{" "}
          <Link href="/termos-de-uso" target="_blank" rel="noopener noreferrer">termos de uso</Link>.
        </p>
      </div>

      <button
        type="button"
        className={styles.gateSwitch}
        onClick={() => setMode(m => (m === "signup" ? "login" : "signup"))}
      >
        {isLogin ? "Primeira vez aqui? Informar nome" : "Já tem acesso? Entrar só com e-mail"}
      </button>
    </form>
  );
}

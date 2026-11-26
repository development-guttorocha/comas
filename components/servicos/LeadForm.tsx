"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitLead, type LeadState } from "@/app/actions/lead";
import CalendlyInline from "@/components/servicos/CalendlyInline";
import { TEAM_SIZES } from "@/lib/leadOptions";
import type { ServicesHubContent } from "@/lib/services";
import styles from "@/app/(pt)/servicos/service-shell.module.css";

/**
 * The contact form at the end of each service page. Any element with `data-format` on the
 * page (the format cards' buttons) picks that option here before scrolling down to it.
 * With a Calendly link, a second tab books the call directly, and once the form is sent the
 * scheduler opens below the confirmation, already filled with the name and e-mail.
 */
export default function LeadForm({ copy, stages, open, defaultChoice, arrivalChoice, service, page, options, calendlyUrl }: {
  copy: ServicesHubContent["form"];
  /** For designers: their career stage replaces the team size, and there is no company to ask about. */
  stages?: readonly string[];
  /** The open contact page: no company or team questions, and the message becomes required. */
  open?: boolean;
  /** The option picked before the person chooses. */
  defaultChoice?: string;
  /** The option picked on arrival from the address (`?assunto=` on the contact page), read in the browser so the page stays static. */
  arrivalChoice?: { param: string; labels: Record<string, string> };
  service: string;
  page: string;
  options: { label: string; items: string[] };
  calendlyUrl?: string;
}) {
  const [state, action, pending] = useActionState<LeadState, FormData>(submitLead, { status: "idle" });
  const [choice, setChoice] = useState(state.values?.format ?? defaultChoice ?? "");
  const [startedAt] = useState(() => Date.now());
  const [mode, setMode] = useState<"form" | "calendar">("form");
  const [prefill, setPrefill] = useState<{ name?: string; email?: string }>();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!arrivalChoice) return;
    const picked = arrivalChoice.labels[new URLSearchParams(window.location.search).get(arrivalChoice.param) ?? ""];
    if (picked) setChoice(current => current || picked);
  }, [arrivalChoice]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-format]");
      if (!el?.dataset.format) return;
      setChoice(el.dataset.format);
      setMode("form");
      window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 600);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (state.status === "sent") track("lead_submit", { page, choice: choice || "—" });
  }, [state.status, page, choice]);

  if (state.status === "sent") {
    return (
      <div className={styles.formSent} role="status">
        <span aria-hidden="true">✓</span>
        <h3>{copy.sentTitle}</h3>
        <p>{calendlyUrl ? copy.sentBody : copy.sentBodyNoCalendar}</p>
        {calendlyUrl ? <CalendlyInline url={calendlyUrl} page={page} prefill={prefill} /> : null}
      </div>
    );
  }

  const tabs = calendlyUrl ? (
    <div className={styles.formTabs} role="tablist" aria-label={copy.tabsLabel}>
      <button type="button" role="tab" aria-selected={mode === "form"} onClick={() => setMode("form")}>{copy.tabForm}</button>
      <button type="button" role="tab" aria-selected={mode === "calendar"} onClick={() => setMode("calendar")} data-cta="tab-agendar">{copy.tabCalendar}</button>
    </div>
  ) : null;

  if (mode === "calendar" && calendlyUrl) {
    return <>{tabs}<CalendlyInline url={calendlyUrl} page={page} /></>;
  }

  const v = state.values ?? {};
  const err = state.errors ?? {};
  const field = (name: "name" | "email" | "company", label: string, type: string, autoComplete: string) => (
    <label className={styles.field}>
      <span>{label}</span>
      <input ref={name === "name" ? nameRef : undefined} name={name} type={type} autoComplete={autoComplete} required defaultValue={v[name]} aria-invalid={err[name] ? true : undefined} aria-describedby={err[name] ? `${name}-error` : undefined} />
      {err[name] ? <small id={`${name}-error`}>{err[name]}</small> : null}
    </label>
  );

  return (
    <>
    {tabs}
    {/* The key remounts the fields with what was typed when the server sends errors back. */}
    <form key={JSON.stringify(v)} action={action} className={styles.form} noValidate
      onSubmit={e => { const data = new FormData(e.currentTarget); setPrefill({ name: String(data.get("name") ?? ""), email: String(data.get("email") ?? "") }); }}>
      <input type="hidden" name="service" value={service} />
      <input type="hidden" name="page" value={page} />
      {stages || open ? <input type="hidden" name="audience" value={open ? "geral" : "designer"} /> : null}
      <input type="hidden" name="startedAt" value={startedAt} />
      <div className={styles.honeypot} aria-hidden="true">
        <label>Site<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className={styles.formRow}>
        {field("name", copy.name, "text", "name")}
        {field("email", copy.email, "email", "email")}
      </div>
      {open ? null : <div className={styles.formRow} data-single={stages ? true : undefined}>
        {stages ? null : field("company", copy.company, "text", "organization")}
        <label className={styles.field}>
          <span>{copy.teamSize}</span>
          <select name="teamSize" required defaultValue={v.teamSize ?? ""} aria-invalid={err.teamSize ? true : undefined} aria-describedby={err.teamSize ? "teamSize-error" : undefined}>
            <option value="" disabled>{copy.teamSizePlaceholder}</option>
            {(stages ?? TEAM_SIZES).map(t => <option key={t}>{t}</option>)}
          </select>
          {err.teamSize ? <small id="teamSize-error">{err.teamSize}</small> : null}
        </label>
      </div>}
      <label className={styles.field}>
        <span>{options.label}</span>
        <select name="format" value={choice} onChange={e => setChoice(e.target.value)}>
          <option value="">{copy.optionUnsure}</option>
          {options.items.map(o => <option key={o}>{o}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span>{copy.message} {copy.messageHint ? <em>{copy.messageHint}</em> : null}</span>
        <textarea name="message" rows={open ? 6 : 4} required={open} defaultValue={v.message} aria-invalid={err.message ? true : undefined} aria-describedby={err.message ? "message-error" : undefined} />
        {err.message ? <small id="message-error">{err.message}</small> : null}
      </label>

      {state.message ? <p className={styles.formError} role="alert">{state.message}</p> : null}
      <div className={styles.formFoot}>
        <button type="submit" className={styles.btn} data-variant="primary" disabled={pending} data-cta="form-submit">
          {pending ? copy.sending : copy.submit}<span aria-hidden="true">→</span>
        </button>
        <p>
          {copy.privacy} Veja os{" "}
          <Link href="/termos-de-uso" target="_blank" rel="noopener noreferrer">termos de uso</Link>.
        </p>
      </div>
    </form>
    </>
  );
}

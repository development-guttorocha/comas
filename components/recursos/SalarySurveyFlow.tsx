"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { submitSurvey, type SurveyState } from "@/app/actions/salarySurvey";
import ResponseSheet from "@/components/recursos/ResponseSheet";
import SalaryRuler, { ZONE } from "@/components/recursos/SalaryRuler";
import { salaryGuide, type SalarySurveyContent } from "@/lib/resources";
import { bandFor, brl, defaultSalaryBands, SURVEY_ROLE_TO_BAND, verdictOf, type SalaryBandsData } from "@/lib/salaryBands";
import { UFS } from "@/lib/salarySurveyOptions";
import styles from "@/app/(pt)/recursos/survey.module.css";

type Field = keyof SalarySurveyContent["flow"]["questions"];
type Step = { name: Field; options?: readonly string[]; optional?: boolean; wide?: boolean };

const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");

/**
 * The salary survey. On the page: a board with the first question and the blank response sheet.
 * Answering opens one question per screen, full screen, with the sheet filling in beside it.
 * Choices advance on their own; the salary and the e-mail wait for Continue. Everything posts at
 * the end as one form, and a server error sends the person back to the question it is about. The
 * ending puts the answer on the salary ruler. `#responder` opens it.
 */
export default function SalarySurveyFlow({ content: s, heading, guideHref, showBands, bandsData }: { content: SalarySurveyContent; heading: ReactNode; guideHref: string; showBands: boolean; bandsData?: SalaryBandsData }) {
  const live = bandsData ?? defaultSalaryBands;
  const f = s.form, q = s.flow;
  const g = salaryGuide.check;
  const steps: Step[] = [
    { name: "role", options: f.roles, wide: true }, { name: "specialty", options: f.specialties }, { name: "experience", options: f.experiences },
    { name: "regime", options: f.regimes, wide: true }, { name: "salary" }, { name: "bonus", options: f.bonuses },
    { name: "companySize", options: f.companySizes }, { name: "sector", options: f.sectors }, { name: "state", options: UFS },
    { name: "workModel", options: f.workModels }, { name: "gender", options: f.genders, optional: true }, { name: "email", optional: true },
  ];

  const [state, action, pending] = useActionState<SurveyState, FormData>(submitSurvey, { status: "idle" });
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [startedAt] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const step = steps[i]!;
  const last = i === steps.length - 1;

  const start = useCallback(() => { setOpen(true); track("survey_start", { survey: "salarios" }); }, []);
  // The first question lives on the page: answering it opens the rest, already on question two.
  const startWith = (role: string) => { setValues(v => ({ ...v, role })); setI(1); start(); };

  // The reward: where this answer sits in the reference band of its role.
  const reward = (() => {
    const id = SURVEY_ROLE_TO_BAND[values.role ?? ""];
    const salary = Number((values.salary ?? "").replace(/[^\d,.]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")) || 0;
    if (!showBands || !id || salary < 500) return null;
    const size = Math.max(0, f.companySizes.indexOf(values.companySize ?? ""));
    const band = bandFor(id, size, values.regime === "PJ" ? "PJ" : "CLT", live)!;
    const verdict = verdictOf(salary, band);
    const gap = verdict === "below" ? band.p25 - salary : verdict === "low" ? band.p50 - salary : verdict === "above" ? salary - band.p75 : 0;
    const money = { role: values.role ?? "", p25: brl(band.p25), p50: brl(band.p50), p75: brl(band.p75) };
    return { band, salary, verdict, money, explain: fill(g.explain[verdict], { ...money, gap: brl(gap) }) };
  })();
  useEffect(() => {
    const onHash = () => { if (window.location.hash === "#responder") start(); };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [start]);

  // Full screen: the page behind does not scroll.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => { if (open && (step.name === "salary" || step.name === "email")) inputRef.current?.focus(); }, [open, step.name]);

  // A server error returns to the first question it names.
  useEffect(() => {
    if (state.status !== "error" || !state.errors) return;
    const at = steps.findIndex(x => state.errors![x.name as keyof typeof state.errors]);
    if (at >= 0) setI(at);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (state.status === "sent") track("survey_submit", { survey: "salarios" }); }, [state.status]);

  const close = () => { setOpen(false); if (window.location.hash === "#responder") history.replaceState(null, "", window.location.pathname); };
  const next = () => (last ? formRef.current?.requestSubmit() : setI(n => n + 1));
  const back = () => setI(n => Math.max(0, n - 1));
  const choose = (value: string) => {
    setValues(v => ({ ...v, [step.name]: value }));
    window.setTimeout(() => setI(n => (n === i && !last ? n + 1 : n)), 220);
  };
  const filled = Boolean(values[step.name]?.trim());
  const canGo = filled || step.optional;
  const error = state.status === "error" ? state.errors?.[step.name as keyof NonNullable<SurveyState["errors"]>] : undefined;

  useEffect(() => {
    if (!open || state.status === "sent") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "Enter" && canGo && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); next(); }
      else if (step.options && step.options.length <= 9 && /^[1-9]$/.test(e.key) && !(e.target instanceof HTMLInputElement)) {
        const o = step.options[Number(e.key) - 1];
        if (o) choose(o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <>
      <section id="responder" className={styles.hero} aria-labelledby="survey-title">
        <div className={styles.canvas}>
          <span className={styles.boardTab} aria-hidden="true">{s.hero.boardTab}</span>
          <div className={styles.heroCopy}>
            {heading}
            <div className={styles.inline}>
              <p className={styles.inlineCount}>1 {q.of} {steps.length} · {q.questions.role}</p>
              <div className={styles.inlineOptions}>
                {f.roles.map(r => <button key={r} type="button" onClick={() => startWith(r)} data-cta="pesquisa-comecar">{r}</button>)}
              </div>
              <p className={styles.facts}>{s.hero.facts}</p>
            </div>
          </div>
          <div className={styles.heroSheet}>
            <p className={styles.sheetLead}>{s.hero.cardLead}</p>
            <ResponseSheet copy={s.sheet} values={values} />
          </div>
        </div>
      </section>

      {open ? (
        <div className={styles.screen} role="dialog" aria-modal="true" aria-label={s.serviceName}>
          <header className={styles.top}>
            <span className={styles.brand}>{s.serviceName}</span>
            <button type="button" className={styles.close} onClick={close} aria-label={q.close}>×</button>
          </header>

          {state.status === "sent" ? (
            <div className={styles.done} role="status">
              <div className={styles.doneText}>
                <span aria-hidden="true">✓</span>
                <h2>{f.sentTitle}</h2>
                {reward ? (
                  <div className={styles.reward}>
                    <p className={styles.rewardLabel}>{q.reward.title} · {values.role}</p>
                    <strong data-verdict={reward.verdict}>{g.verdicts[reward.verdict]}</strong>
                    <p>{reward.explain}</p>
                    <small>{q.reward.lead}</small>
                  </div>
                ) : null}
                <p>{f.sentBody}</p>
                <div className={styles.doneActions}>
                  <button type="button" className={styles.primary} onClick={() => { void navigator.clipboard?.writeText(`${window.location.origin}${window.location.pathname}`).then(() => setCopied(true)); }} data-cta="pesquisa-compartilhar">
                    {copied ? f.copied : f.share}
                  </button>
                  <Link href={guideHref} className={styles.secondary} onClick={close}>{reward ? q.reward.cta : f.guide} →</Link>
                </div>
              </div>
              {reward ? (
                <div className={styles.doneRuler}>
                  <SalaryRuler compact lit={ZONE[reward.verdict]} bubbleKey={reward.verdict} youLabel={q.reward.you} band={reward.band} mine={reward.salary}
                    bubble={<><small>{q.reward.you}</small>{g.verdicts[reward.verdict]}</>}
                    zones={salaryGuide.zones.map((z, n) => ({ label: z.label, read: fill(g.zoneReads[n]!, reward.money) }))}
                    medianRead={fill(g.medianRead, reward.money)} />
                </div>
              ) : null}
            </div>
          ) : (
            <div className={styles.flowGrid}>
            <form ref={formRef} action={action} className={styles.flow} noValidate onSubmit={e => { if (!canGo) e.preventDefault(); }}>
              <input type="hidden" name="startedAt" value={startedAt} />
              <div className={styles.honeypot} aria-hidden="true"><label>Site<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
              {steps.filter(x => x.name !== step.name).map(x => <input key={x.name} type="hidden" name={x.name} value={values[x.name] ?? ""} />)}

              <div className={styles.progress} aria-hidden="true"><span style={{ width: `${((i + (filled ? 1 : 0)) / steps.length) * 100}%` }} /></div>

              <div key={step.name} className={styles.question}>
                <p className={styles.count}>{i + 1} {q.of} {steps.length}</p>
                <h2 id="q-title">{q.questions[step.name]}</h2>
                {q.hints[step.name as keyof typeof q.hints] ? <p className={styles.hint}>{q.hints[step.name as keyof typeof q.hints]}</p> : null}

                {step.options ? (
                  <div className={styles.options} role="radiogroup" aria-labelledby="q-title" data-wide={step.wide || undefined} data-dense={step.options.length > 12 || undefined}>
                    <input type="hidden" name={step.name} value={values[step.name] ?? ""} />
                    {step.options.map((o, n) => (
                      <button key={o} type="button" role="radio" aria-checked={values[step.name] === o} onClick={() => choose(o)}>
                        {step.options!.length <= 9 ? <kbd>{n + 1}</kbd> : null}{o}
                      </button>
                    ))}
                  </div>
                ) : step.name === "salary" ? (
                  <label className={styles.money}>
                    <span>R$</span>
                    <input ref={inputRef} name="salary" inputMode="decimal" autoComplete="off" placeholder="8.500" value={values.salary ?? ""}
                      onChange={e => setValues(v => ({ ...v, salary: e.target.value }))} aria-labelledby="q-title" aria-invalid={error ? true : undefined} />
                  </label>
                ) : (
                  <label className={styles.money} data-email>
                    <input ref={inputRef} name="email" type="email" autoComplete="email" placeholder="voce@email.com" value={values.email ?? ""}
                      onChange={e => setValues(v => ({ ...v, email: e.target.value }))} aria-labelledby="q-title" aria-invalid={error ? true : undefined} />
                  </label>
                )}
                {error ? <p className={styles.error} role="alert">{error}</p> : null}
                {last ? (
                  <p className={styles.privacy}>
                    {f.privacy} Ao enviar, você concorda com os{" "}
                    <Link href="/termos-de-uso" target="_blank" rel="noopener noreferrer">termos de uso</Link>.
                  </p>
                ) : null}
                {state.message && last ? <p className={styles.error} role="alert">{state.message}</p> : null}
              </div>

              <footer className={styles.nav}>
                <button type="button" className={styles.secondary} onClick={back} disabled={i === 0}>← {q.back}</button>
                <p className={styles.keys}>{q.keyboard}</p>
                {last ? (
                  <button type="submit" className={styles.primary} disabled={pending} data-cta="pesquisa-enviar">{pending ? f.sending : f.submit} →</button>
                ) : (
                  <button type="button" className={styles.primary} onClick={next} disabled={!canGo}>{!filled && step.optional ? q.skip : q.next} →</button>
                )}
              </footer>
            </form>
            <aside className={styles.flowSheet} aria-label={s.sheet.title}>
              <ResponseSheet copy={s.sheet} values={values} active={step.name} compact />
            </aside>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}

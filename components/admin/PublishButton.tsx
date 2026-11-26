"use client";

import { useRef, useState } from "react";
import type { LineState, PublishPlan } from "@/lib/admin/publish/plan";
import { UploadIcon } from "./icons";
import LastPublish from "./LastPublish";
import styles from "./admin.module.css";
import own from "./publish.module.css";

/**
 * "Publicar": first the list of what would change on the site (no AI, nothing written), then the
 * publish itself. Words: Rascunho (stays in the admin), Pronto (goes with this publish), No ar (live).
 */
const CHIP: Record<LineState, { text: string; tone?: "good" | "warn" | "bad" }> = {
  pronto: { text: "Pronto", tone: "good" },
  rascunho: { text: "Rascunho" },
  "sem-uso": { text: "Sem uso" },
  "sem-revisao": { text: "Sem revisão", tone: "warn" },
  trabalho: { text: "Só no admin" },
};

type Step = "loading" | "review" | "running" | "ok" | "error";

/** Reads a streamed log (one line each, `::ok` / `::erro` at the end); true when it ended well. */
async function stream(url: string, body: unknown, onLine: (line: string) => void): Promise<boolean> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.body) throw new Error("Sem resposta do servidor.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", ok = false;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      if (line === "::ok") ok = true;
      else if (line !== "::erro") onLine(line);
    }
  }
  return ok;
}

/** Code files grouped by folder, so 140 files read as a few lines. */
function folders(paths: string[]) {
  const groups = new Map<string, number>();
  for (const p of paths) {
    const parts = p.split("/");
    const key = parts.length > 2 ? `${parts[0]}/${parts[1]}/` : parts.length === 2 ? `${parts[0]}/` : p;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  return [...groups].sort((a, b) => b[1] - a[1]);
}

export default function PublishButton() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>("loading");
  const [plan, setPlan] = useState<PublishPlan | null>(null);
  const [planError, setPlanError] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [test, setTest] = useState(false);
  const [preparing, setPreparing] = useState("");
  const [preparingRun, setPreparingRun] = useState(false);
  const [copied, setCopied] = useState(false);
  // Bumped after a publish so the bar reads the new deploy instead of the cached one.
  const [published, setPublished] = useState(0);

  async function load() {
    setStep("loading");
    setPlanError("");
    try {
      const response = await fetch("/api/admin/publish", { cache: "no-store" });
      const data = await response.json() as PublishPlan & { error?: string };
      if (!response.ok || data.error) throw new Error(data.error ?? "Não foi possível montar a lista.");
      setPlan(data);
    } catch (error) {
      setPlan(null);
      setPlanError((error as Error).message);
    }
    setStep("review");
  }

  function open() {
    setLines([]);
    setTest(false);
    dialog.current?.showModal();
    void load();
  }

  async function publish(dryRun: boolean) {
    setTest(dryRun);
    setStep("running");
    setLines([]);
    try {
      const ok = await stream("/api/admin/publish", { dryRun }, line => setLines(current => [...current, line]));
      setStep(ok ? "ok" : "error");
      if (ok && !dryRun) setPublished(Date.now());
    } catch (error) {
      setLines(current => [...current, (error as Error).message]);
      setStep("error");
    }
  }

  async function prepare() {
    setPreparingRun(true);
    setPreparing("Preparando…");
    try {
      const out: string[] = [];
      const ok = await stream("/api/admin/publish/prepare", {}, line => { out.push(line); setPreparing(line); });
      setPreparing(ok ? "" : out.at(-1) ?? "Não foi possível preparar as telas.");
    } catch (error) {
      setPreparing((error as Error).message);
    }
    setPreparingRun(false);
    void load();
  }

  const blocked = !!plan?.blocked.length;
  const busy = step === "running" || step === "loading" || preparingRun;

  return (
    <>
      <button type="button" className={styles.button} onClick={open}><UploadIcon />Publicar o site</button>
      <dialog ref={dialog} className={styles.dialog} style={{ width: "min(660px, 94vw)" }} onCancel={event => { if (step === "running") event.preventDefault(); }}>
        <div className={styles.dialogHead}><h2>{step === "ok" ? (test ? "Teste concluído" : "No ar") : "Publicar o site"}</h2></div>

        {step === "loading" ? <div className={own.body}><p className={own.note}>Conferindo o que vai ao ar…</p></div> : null}

        {step === "review" ? (
          <div className={own.body}>
            {planError ? <p className={styles.error} style={{ margin: 0 }}>{planError}</p> : null}
            {plan ? (
              <>
                {plan.blocked.length ? (
                  <div className={own.blocked} role="alert">
                    {plan.blocked.map(line => <p key={line}>✕ {line}</p>)}
                  </div>
                ) : null}

                {plan.tasks.map(task => (
                  <div key={task.id} className={own.task}>
                    <span>{task.label}<span className={own.detail}>{preparing || task.detail}</span></span>
                    <button type="button" className={`${styles.button} ${styles.small}`} disabled={preparingRun} onClick={() => void prepare()}>Preparar agora</button>
                  </div>
                ))}

                <section className={own.section}>
                  <h3>Vai ao ar</h3>
                  {plan.goes.length ? (
                    <ul className={own.list}>
                      {plan.goes.map(line => (
                        <li key={line.label + line.detail} className={own.row} data-kind="goes">
                          <span className={own.mark}>✓</span>
                          <span>{line.label}{line.detail ? <span className={own.detail}>{line.detail}</span> : null}</span>
                          <span className={styles.chip} data-tone={CHIP[line.state].tone}>{CHIP[line.state].text}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className={own.note}>Nada novo para o site desde a última publicação. Publicar agora refaz o deploy do último commit.</p>}
                </section>

                {plan.out.length ? (
                  <section className={own.section}>
                    <h3>Fica de fora</h3>
                    <ul className={own.list}>
                      {plan.out.map(line => (
                        <li key={line.label + line.detail} className={own.row}>
                          <span className={own.mark}>·</span>
                          <span>{line.label}{line.detail ? <span className={own.detail}>{line.detail}</span> : null}</span>
                          <span className={styles.chip} data-tone={CHIP[line.state].tone}>{CHIP[line.state].text}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {plan.code.length ? (
                  <details className={own.code}>
                    <summary>Código que vai junto ({plan.code.length}): só é registrado se os tipos e os testes passarem.</summary>
                    <ul>{folders(plan.code).map(([folder, n]) => <li key={folder}>{folder}{n > 1 ? ` (${n})` : ""}</li>)}</ul>
                  </details>
                ) : null}
                {plan.left.length ? (
                  <details className={own.code}>
                    <summary>{plan.left.length} {plan.left.length === 1 ? "arquivo que não é do site fica" : "arquivos que não são do site ficam"} de fora (ferramentas, anotações).</summary>
                    <ul>{folders(plan.left).map(([folder, n]) => <li key={folder}>{folder}{n > 1 ? ` (${n})` : ""}</li>)}</ul>
                  </details>
                ) : null}

                {plan.unchanged.length ? (
                  <p className={own.note}><span className={styles.chip} data-tone="good">No ar</span>&ensp;sem mudanças: {plan.unchanged.join(", ")}.</p>
                ) : null}
                {plan.live.note ? <p className={own.note}>{plan.live.note}</p> : null}
              </>
            ) : null}
            <LastPublish refresh={published} />
          </div>
        ) : null}

        {step === "running" || step === "ok" || step === "error" ? (
          <div className={own.body}>
            {/* The last six lines, as they pass: white while running, green when done, red on error. */}
            <div className={styles.log} data-state={step === "running" ? "running" : step} aria-live="polite">
              {(lines.length ? lines : ["Começando…"]).slice(-6).map((line, i) => <div key={lines.length + i}>{line}</div>)}
            </div>
            {step === "ok" && !test ? <LastPublish refresh={published} /> : null}
            {step === "error" ? <p className={styles.error} style={{ margin: 0 }}>{test ? "O teste parou." : "Não foi possível publicar."} Copie o registro para ver tudo.</p> : null}
          </div>
        ) : null}

        <div className={own.foot}>
          {lines.length ? (
            <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={() => { void navigator.clipboard.writeText(lines.join("\n")); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }}>{copied ? "Copiado" : "Copiar registro"}</button>
          ) : <span />}
          <button type="button" className={`${styles.button} ${styles.ghost}`} disabled={step === "running"} onClick={() => dialog.current?.close()}>{step === "review" || step === "loading" ? "Cancelar" : "Fechar"}</button>
          {step === "review" && plan ? (
            <>
              <button type="button" className={`${styles.button} ${styles.ghost}`} disabled={busy} title="Monta a cópia do deploy e lista o que ficaria de fora, sem commit e sem publicar" onClick={() => void publish(true)}>Testar</button>
              <button type="button" className={`${styles.button} ${styles.primary}`} disabled={busy || blocked} onClick={() => void publish(false)}>Publicar</button>
            </>
          ) : null}
          {step === "error" || (step === "ok" && test) ? <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => void load()}>Voltar à lista</button> : null}
          {step === "running" ? <button type="button" className={`${styles.button} ${styles.primary}`} disabled>{test ? "Testando…" : "Publicando…"}</button> : null}
        </div>
      </dialog>
    </>
  );
}

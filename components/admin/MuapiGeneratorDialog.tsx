"use client";

import { useEffect, useRef, useState } from "react";
import { MUAPI_PRESETS, type MuapiJobResponse, type MuapiMediaKind } from "@/lib/social/muapi";
import { SparkIcon } from "./icons";
import styles from "./admin.module.css";

type Props = {
  open: boolean;
  kindFilter?: MuapiMediaKind;
  defaultPrompt?: string;
  inlineDataUrl?: boolean;
  onResult: (url: string, meta: { costUsd?: number }) => void;
  onClose: () => void;
};

export default function MuapiGeneratorDialog({
  open,
  kindFilter = "image",
  defaultPrompt = "",
  inlineDataUrl = false,
  onResult,
  onClose,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const presets = MUAPI_PRESETS.filter(p => p.kind === kindFilter);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [balance, setBalance] = useState<string | number | null>(null);
  const [model, setModel] = useState(presets[0]?.slug ?? "z-image-turbo");
  const [customModel, setCustomModel] = useState("");
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (defaultPrompt) setPrompt(defaultPrompt);
  }, [defaultPrompt]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setError("");
      fetch("/api/social/muapi", { cache: "no-store" })
        .then(r => r.json())
        .then(d => {
          setConfigured(Boolean(d.configured));
          setBalance(d.balance ?? null);
        })
        .catch(() => setConfigured(false));
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function pollUntilDone(requestId: string): Promise<MuapiJobResponse> {
    const inlineParam = inlineDataUrl ? "&inline=1" : "";
    for (let attempt = 0; attempt < 45; attempt++) {
      await new Promise(r => setTimeout(r, 2000));
      const res = await fetch(`/api/social/muapi?id=${encodeURIComponent(requestId)}${inlineParam}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as MuapiJobResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Erro ao consultar tarefa na MuAPI.");
      if (data.status === "completed") return data;
      if (data.status === "failed" || data.status === "cancelled") {
        throw new Error(data.error || `A geração falhou (${data.status}).`);
      }
      setStatusText(`Processando na MuAPI… (${(attempt + 1) * 2}s)`);
    }
    throw new Error("Tempo limite atingido aguardando a MuAPI.");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    setStatusText("Enviando pedido para a MuAPI…");
    try {
      const chosenModel = customModel.trim() || model;
      const res = await fetch("/api/social/muapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: chosenModel,
          prompt,
          inline: inlineDataUrl,
        }),
      });
      const job = (await res.json()) as MuapiJobResponse & { error?: string };
      if (!res.ok) throw new Error(job.error || "Erro ao iniciar geração.");

      const done = job.status === "completed" ? job : await pollUntilDone(job.requestId);
      const url = done.outputs?.[0];
      if (!url) throw new Error("A MuAPI concluiu sem retornar arquivo.");

      onResult(url, { costUsd: done.cost?.amount_usd });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar mídia.");
    } finally {
      setBusy(false);
      setStatusText("");
    }
  }

  const activePreset = presets.find(p => p.slug === model);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      style={{ width: "min(540px, 94vw)" }}
      onCancel={e => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={e => {
        if (e.target === ref.current && !busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        <div className={styles.dialogHead} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <h2>Gerar {kindFilter === "video" ? "vídeo" : "imagem"} · MuAPI</h2>
          {balance !== null && balance !== undefined ? (
            <span className={styles.chip} data-tone="good">Saldo: {String(balance)}</span>
          ) : null}
        </div>

        <div className={styles.form} style={{ padding: 16 }}>
          {configured === false ? (
            <p className={styles.hint} style={{ gridColumn: "1 / -1", color: "var(--warn)", margin: 0 }}>
              <code>MUAPI_API_KEY</code> não configurada. Gere uma chave (ou Sandbox Key gratuita para testes) em{" "}
              <a href="https://muapi.ai/dashboard" target="_blank" rel="noreferrer" style={{ color: "var(--ink)" }}>
                muapi.ai/dashboard
              </a>{" "}
              e salve em <strong>Chaves</strong> ou na Vercel.
            </p>
          ) : null}

          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Modelo</span>
            <select
              className={styles.select}
              value={model}
              onChange={e => setModel(e.target.value)}
              disabled={busy}
            >
              {presets.map(p => (
                <option key={p.slug} value={p.slug}>{p.label}</option>
              ))}
            </select>
            {activePreset ? <span className={styles.hint}>{activePreset.hint}</span> : null}
          </label>

          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Ou slug exato do catálogo MuAPI (opcional)</span>
            <input
              className={`${styles.input} ${styles.mono}`}
              placeholder="Ex: midjourney-v7, nano-banana-2, veo3.1-text-to-video…"
              value={customModel}
              onChange={e => setCustomModel(e.target.value)}
              disabled={busy}
            />
          </label>

          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Descrição visual (Prompt)</span>
            <textarea
              className={styles.textarea}
              rows={4}
              required
              disabled={busy}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={
                kindFilter === "video"
                  ? "Ex: Close-up suave de uma caneta-tinteiro escrevendo em papel creme texturizado, luz natural da manhã, estética editorial minimalista…"
                  : "Ex: Fotografia editorial minimalista vista de cima de um caderno aberto, xícara de café e livro em tons creme e terracota suave, sem texto escrito…"
              }
            />
          </label>

          {statusText ? <span className={styles.hint} style={{ gridColumn: "1 / -1" }}>{statusText}</span> : null}
          {error ? <span className={styles.chip} data-tone="bad" style={{ gridColumn: "1 / -1" }}>{error}</span> : null}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 16px", borderTop: "1px solid var(--line)" }}>
          <button type="button" className={`${styles.button} ${styles.ghost}`} disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={`${styles.button} ${styles.primary}`} aria-busy={busy} disabled={busy || configured === false}>
            <SparkIcon />{busy ? "Gerando…" : "Gerar com MuAPI"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

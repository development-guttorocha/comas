"use client";

import { useEffect, useRef, useState } from "react";
import AdminShell, { AreaTabs, MEDIA_TABS } from "./AdminShell";
import styles from "./admin.module.css";

type Result = {
  id: string;
  family: string;
  groups: number;
  deepseekTokens: number;
  notes: string;
  score: { mean: number; farShare: number };
  tokens: { colors: string[]; sizes: number[]; radii: number[] };
};

/**
 * Image → editable layout: drop a screenshot, and the Mac reads its texts, measures its shapes,
 * DeepSeek names and groups the layers, and FigCraft builds a file with colour and text styles.
 * The comparison shows the original, the rebuilt screen and where they differ.
 */
export default function AdminScreenDesign() {
  const [lines, setLines] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "busy" | "ok" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [pluginKey, setPluginKey] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    fetch("/api/admin/figma-import?key=1").then(r => r.json()).then(d => setPluginKey(d.key ?? "")).catch(() => {});
  }, []);

  async function convert(file: File) {
    setState("busy"); setLines([]); setResult(null); setPreview(URL.createObjectURL(file));
    const body = new FormData();
    body.append("image", file);
    try {
      const response = await fetch("/api/admin/screen-design", { method: "POST", body });
      if (!response.body) throw new Error("Sem resposta do servidor.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";
        for (const line of parts) {
          if (line.startsWith("::result ")) { setResult(JSON.parse(line.slice(9))); setState("ok"); }
          else if (line === "::erro") setState("error");
          else if (line) setLines(current => [...current, line]);
        }
      }
    } catch (error) {
      setLines(current => [...current, (error as Error).message]);
      setState("error");
    }
  }

  const file = (f: string) => `/api/admin/screen-design?id=${result?.id}&f=${f}`;

  return (
    <AdminShell crumbs={[{ label: "Mídia", href: "/admin/midia" }, { label: "Figma" }]}>
      <div className={styles.page}>
        <AreaTabs tabs={MEDIA_TABS} />
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Figma</h1>
            <p className={styles.subtitle}>Envie telas direto do Figma para a mídia de um case, já exportadas em alta (2× ou 3×), com o plugin do projeto.</p>
          </div>
        </div>

        <section className={styles.panel} style={{ padding: 16, display: "grid", gap: 10 }} aria-label="Plugin do Figma">
          <span className={styles.rowTitle}>Chave do plugin</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <code className={styles.mono} style={{ padding: "6px 10px", borderRadius: 6, background: "var(--admin-surface-2, rgba(127,127,127,.12))" }}>{pluginKey ? `${pluginKey.slice(0, 8)}…${pluginKey.slice(-4)}` : "…"}</code>
            <button type="button" className={`${styles.button} ${styles.small}`} disabled={!pluginKey} onClick={() => { void navigator.clipboard.writeText(pluginKey).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}>{copied ? "Copiada" : "Copiar chave"}</button>
          </div>
          <p className={styles.rowMeta} style={{ margin: 0 }}>
            Instalar uma vez no Figma para desktop: Plugins → Development → Import plugin from manifest → <span className={styles.mono}>tools/figma-plugin/manifest.json</span>.
            Depois: selecione as telas, rode “Gutto · Enviar para o admin”, cole a chave, escolha o case e envie. As imagens entram em <span className={styles.mono}>public/cases/&lt;case&gt;/</span>, prontas para o case e para os vídeos.
          </p>
        </section>

        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.title} style={{ fontSize: 16 }}>Imagem para layout (experimental)</h2>
            <p className={styles.subtitle}>Um print de tela vira um arquivo editável: textos de verdade, formas, recortes, grupos com nome e estilos de cor e texto. Abre no FigCraft e, como .fig, no Figma.</p>
          </div>
        </div>

        <section
          className={styles.panel}
          style={{ padding: 24, display: "grid", gap: 12, justifyItems: "start" }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && state !== "busy") void convert(f); }}
          aria-label="Enviar imagem"
        >
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void convert(f); e.target.value = ""; }} />
          <button type="button" className={`${styles.button} ${styles.primary}`} disabled={state === "busy"} onClick={() => input.current?.click()}>
            {state === "busy" ? "Convertendo…" : "Escolher imagem"}
          </button>
          <p className={styles.subtitle} style={{ margin: 0 }}>Ou arraste o arquivo para cá. Funciona melhor com o print puro de uma tela, sem moldura de aparelho.</p>
        </section>

        {lines.length ? (
          <section className={styles.panel} style={{ padding: 16 }} aria-label="Andamento">
            {lines.map((l, i) => <p key={i} className={styles.rowMeta} style={{ margin: "2px 0" }}>{l}</p>)}
          </section>
        ) : null}

        {state === "busy" && preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Imagem enviada" style={{ maxHeight: 360, borderRadius: 12, opacity: 0.6 }} />
        ) : null}

        {result ? (
          <section className={styles.panel} style={{ padding: 16, display: "grid", gap: 16 }} aria-label="Resultado">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a className={`${styles.button} ${styles.primary}`} href={file("layout-figma.json")} title="Abra no Figma com o plugin Imagem para layout (tools/figma-plugin)">Baixar para o Figma (.json)</a>
              <a className={styles.button} href={file("tela.fig")}>Baixar .fig</a>
              <a className={styles.button} href={file("tela.figcraft")}>Baixar .figcraft</a>
            </div>
            <p className={styles.rowMeta} style={{ margin: 0 }}>
              Diferença para o original: {result.score.mean}/255, {result.score.farShare}% dos pixels bem diferentes · {result.groups} grupos · fonte {result.family} · {result.deepseekTokens} tokens da DeepSeek
            </p>
            <p className={styles.rowMeta} style={{ margin: 0 }}>
              Estilos: {result.tokens.colors.length} cores · tamanhos {result.tokens.sizes.join(", ")} px · cantos {result.tokens.radii.join(", ")} px
            </p>
            <p className={styles.rowMeta} style={{ margin: 0 }}>No Figma: Plugins → Development → Imagem para layout (Gutto), e arraste o .json. Para instalar o plugin uma vez: Import plugin from manifest → tools/figma-plugin/manifest.json.</p>
            {result.notes ? <p className={styles.rowMeta} style={{ margin: 0 }}>Observação da IA: {result.notes}</p> : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={file("comparacao.png")} alt="Original, tela reconstruída e diferença entre as duas" style={{ width: "100%", maxWidth: 1100, borderRadius: 8 }} />
            <p className={styles.rowMeta} style={{ margin: 0 }}>Original · reconstruída · diferença (vermelho onde as duas não batem)</p>
          </section>
        ) : null}
      </div>
    </AdminShell>
  );
}

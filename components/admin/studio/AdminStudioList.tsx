"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ART_DIRECTIONS, STARTER_STUDIO_DOC, type ArtDirection } from "@/lib/social/studioTypes";
import { compileDocToSlides } from "@/lib/social/compileDoc";
import type { SocialPost, SocialStatus } from "@/lib/social/types";
import AdminShell from "../AdminShell";
import BusyOverlay from "../BusyOverlay";
import { Toast, useToast } from "../client";
import { ArrowIcon, PlusIcon, SearchIcon, SparkIcon } from "../icons";
import Skeleton from "../Skeleton";
import styles from "../admin.module.css";
import st from "./studioEditor.module.css";

const STATUS_CHIP: Record<SocialStatus, { label: string; tone?: "good" | "warn" | "bad" }> = {
  draft_ai: { label: "Proposta IA", tone: "warn" },
  in_review: { label: "Em revisão" },
  exported: { label: "Exportado", tone: "good" },
};

const dayLabel = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
};

export default function AdminStudioList() {
  const router = useRouter();
  const aiDialog = useRef<HTMLDialogElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [docs, setDocs] = useState<SocialPost[] | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busyLabel, setBusyLabel] = useState("");

  const [idea, setIdea] = useState("");
  const [artDirection, setArtDirection] = useState<ArtDirection>("notebook");
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);

  const { toast, show } = useToast();

  useEffect(() => {
    fetch("/api/social/posts", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        const all = Array.isArray(data.posts) ? (data.posts as SocialPost[]) : [];
        const studioDocs = all.filter(p => p.format === "studio_doc" || p.studioDoc);
        setAiProvider(data.aiProvider ?? null);
        if (studioDocs.length === 0) {
          const now = new Date().toISOString();
          const starter: SocialPost = {
            id: "studio_demo_que",
            title: "Pare de repetir 'que' na sua redação",
            format: "studio_doc",
            status: "in_review",
            slides: [],
            studioDoc: STARTER_STUDIO_DOC,
            caption:
              "Você relê um parágrafo e percebe que usou 'que' quatro vezes?\n\nIsso não é falta de vocabulário — é só falta de um checklist rápido de revisão.\n\nSalva esse guia de caderno para aplicar no seu próximo texto!\n\n#textoemciclo #escrita #redacao #revisaodetexto",
            createdAt: now,
            updatedAt: now,
          };
          setDocs([starter]);
          void fetch("/api/social/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ post: starter }),
          }).catch(() => {});
        } else {
          setDocs(studioDocs);
        }
      })
      .catch(err => {
        show(err);
        setDocs([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setRecSeconds(s => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  const visible = useMemo(() => {
    const list = docs ?? [];
    const q = query.trim().toLowerCase();
    return list.filter(d => !q || `${d.title} ${d.caption}`.toLowerCase().includes(q));
  }, [docs, query]);

  async function createBlank() {
    setBusyLabel("Abrindo novo documento…");
    try {
      const now = new Date().toISOString();
      const post: SocialPost = {
        id: `studio_${Date.now().toString(36)}`,
        title: "Novo documento editorial",
        format: "studio_doc",
        status: "in_review",
        slides: [],
        studioDoc: {
          artDirection: "editorial",
          aspect: "carousel",
          blocks: [
            {
              type: "socialCover",
              props: {
                eyebrow: "TEXTO EM CICLO",
                title: "Escreva aqui a ideia principal",
                subtitle: "Digite '/' abaixo para adicionar Antes × Depois, Passo, Checklist, Nota ou Imagem IA.",
                cta: "Arraste para ver →",
                imageUrl: "",
                imageOverlay: 0.78,
              },
            },
            { type: "paragraph" },
          ],
        },
        caption: "",
        createdAt: now,
        updatedAt: now,
      };
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post }),
      });
      if (!res.ok) throw new Error("Erro ao criar documento");
      router.push(`/admin/estudio/${post.id}`);
    } catch (err) {
      show(err);
      setBusyLabel("");
    }
  }

  async function createWithAi(e: React.FormEvent) {
    e.preventDefault();
    aiDialog.current?.close();
    setBusyLabel("A IA está montando o documento BlockNote completo + legenda…");
    try {
      const res = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "studio_doc", idea, artDirection, save: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar documento");
      router.push(`/admin/estudio/${data.post.id}`);
    } catch (err) {
      show(err);
      setBusyLabel("");
    }
  }

  async function toggleVoiceCapture() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        setBusyLabel("Transcrevendo sua voz e montando o post completo…");
        try {
          const form = new FormData();
          form.append("audio", blob, "ideia.webm");
          form.append("generate", "1");
          const res = await fetch("/api/social/generate", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Erro ao processar áudio");
          router.push(`/admin/estudio/${data.post.id}`);
        } catch (err) {
          show(err);
          setBusyLabel("");
        }
      };
      recorderRef.current = rec;
      setRecSeconds(0);
      setRecording(true);
      rec.start();
    } catch {
      show("Permita o acesso ao microfone no navegador para gravar sua ideia.");
    }
  }

  return (
    <AdminShell
      crumbs={[{ label: "Estúdio (Editor de Blocos)" }]}
      actions={
        <>
          <button
            type="button"
            className={styles.button}
            onClick={toggleVoiceCapture}
          >
            {recording ? (
              <>
                <span className={st.recDot} />
                Parar e gerar ({recSeconds}s)
              </>
            ) : (
              "🎙️ Gravar ideia"
            )}
          </button>
          <button type="button" className={styles.button} onClick={createBlank}>
            <PlusIcon />Novo documento
          </button>
          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => aiDialog.current?.showModal()}>
            <SparkIcon />Multiplicar com IA
          </button>
        </>
      }
    >
      <div className={styles.sheet}>
        <div className={styles.page}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.title}>Estúdio · Texto em Ciclo</h1>
              <p className={styles.pageSummary}>
                Escreva uma vez como no Notion (use <code>/</code> para inserir blocos sociais) e exporte para Carrossel 4:5, Stories 9:16 e Reels.
              </p>
            </div>
            <label className={styles.search}>
              <SearchIcon />
              <input
                type="search"
                placeholder="Buscar documento…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                aria-label="Buscar documento"
              />
            </label>
          </div>

          {!docs ? (
            <Skeleton kind="rows" count={3} label="Carregando documentos" />
          ) : (
            <section className={styles.rows} aria-label="Documentos do Estúdio">
              {visible.map(doc => {
                const compiled = doc.studioDoc ? compileDocToSlides(doc.studioDoc.blocks) : [];
                const art = ART_DIRECTIONS.find(a => a.id === doc.studioDoc?.artDirection)?.label ?? "Editorial";
                const chip = STATUS_CHIP[doc.status];
                return (
                  <div
                    key={doc.id}
                    className={styles.row}
                    style={{ gridTemplateColumns: "minmax(0, 1fr) 130px 110px 32px" }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span className={styles.rowTitle} style={{ display: "block" }}>{doc.title}</span>
                      <span className={styles.rowMeta} style={{ display: "block" }}>
                        {compiled.length} {compiled.length === 1 ? "slide" : "slides"} · Estilo {art} · {dayLabel(doc.updatedAt)}
                      </span>
                    </span>
                    <span>
                      <span className={styles.chip} data-tone={chip.tone}>{chip.label}</span>
                    </span>
                    <span className={styles.chip}>4:5 · 9:16 · Reel</span>
                    <span className={styles.rowArrow} aria-hidden><ArrowIcon /></span>
                    <Link href={`/admin/estudio/${doc.id}`} className={styles.rowLink} aria-label={`Abrir ${doc.title}`} />
                  </div>
                );
              })}
              {!visible.length ? (
                <p className={styles.emptyBody}>Nenhum documento encontrado.</p>
              ) : null}
            </section>
          )}
        </div>
      </div>

      <dialog
        ref={aiDialog}
        className={styles.dialog}
        style={{ width: "min(540px, 94vw)" }}
        onClick={e => {
          if (e.target === aiDialog.current) aiDialog.current.close();
        }}
      >
        <form onSubmit={createWithAi}>
          <div className={styles.dialogHead}>
            <h2>Multiplicar ideia em documento BlockNote</h2>
          </div>
          <div className={styles.form} style={{ padding: 16 }}>
            {!aiProvider ? (
              <p className={styles.hint} style={{ gridColumn: "1 / -1", color: "var(--warn)", margin: 0 }}>
                Configure <code>OPENAI_API_KEY</code>, <code>GEMINI_API_KEY</code> ou <code>ANTHROPIC_API_KEY</code> para ativar a IA.
              </p>
            ) : null}
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>Ideia bruta, dúvida de aluno ou texto de aula</span>
              <textarea
                className={styles.textarea}
                rows={5}
                required
                autoFocus
                placeholder="Ex: Hoje corrigi 10 redações com o mesmo problema de conectivos repetidos no desenvolvimento. Quero ensinar como variar os conectivos sem parecer artificial…"
                value={idea}
                onChange={e => setIdea(e.target.value)}
              />
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>Direção de arte inicial</span>
              <select
                className={styles.select}
                value={artDirection}
                onChange={e => setArtDirection(e.target.value as ArtDirection)}
              >
                {ART_DIRECTIONS.map(a => (
                  <option key={a.id} value={a.id}>{a.label} — {a.hint}</option>
                ))}
              </select>
            </label>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 16px", borderTop: "1px solid var(--line)" }}>
            <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={() => aiDialog.current?.close()}>
              Cancelar
            </button>
            <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={!aiProvider}>
              <SparkIcon />Gerar documento completo
            </button>
          </div>
        </form>
      </dialog>

      <BusyOverlay label={busyLabel} />
      <Toast toast={toast} />
    </AdminShell>
  );
}

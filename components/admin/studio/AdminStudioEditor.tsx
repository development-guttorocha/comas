"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { domToPng } from "modern-screenshot";
import JSZip from "jszip";
import { DEFAULT_SOCIAL_THEME } from "@/lib/social/presets";
import { compileDocToSlides, compileSlidesToReel } from "@/lib/social/compileDoc";
import {
  ART_DIRECTIONS,
  ASPECT_DIMENSIONS,
  STARTER_STUDIO_DOC,
  type ArtDirection,
  type CompiledSlide,
  type StudioAspect,
  type StudioBlockJson,
  type StudioDocumentData,
} from "@/lib/social/studioTypes";
import type { SocialPost, SocialStatus, SocialTheme } from "@/lib/social/types";
import StudioSlideCanvas from "@/components/social/StudioSlideCanvas";
import AdminShell from "../AdminShell";
import BusyOverlay from "../BusyOverlay";
import { Toast, useToast } from "../client";
import { CopyIcon, PlayIcon, SparkIcon, TrashIcon } from "../icons";
import Skeleton from "../Skeleton";
import styles from "../admin.module.css";
import c from "../caseEditor.module.css";
import st from "./studioEditor.module.css";

const SocialDocEditor = dynamic(() => import("./SocialDocEditor"), {
  ssr: false,
  loading: () => <Skeleton kind="text" label="Abrindo editor de blocos" />,
});

type Tab = "documento" | "legenda";

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "texto-em-ciclo"
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Responsive scaled tile for a single compiled slide inside the Storyboard. */
function ScaledSlideTile({
  slide,
  index,
  total,
  theme,
  artDirection,
  aspect,
  active,
  onClick,
}: {
  slide: CompiledSlide;
  index: number;
  total: number;
  theme: SocialTheme;
  artDirection: ArtDirection;
  aspect: StudioAspect;
  active: boolean;
  onClick: () => void;
}) {
  const boxRef = useRef<HTMLButtonElement>(null);
  const [boxWidth, setBoxWidth] = useState(200);
  const dim = ASPECT_DIMENSIONS[aspect];

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setBoxWidth(el.clientWidth || 200);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect]);

  const scale = boxWidth / dim.width;

  return (
    <button
      ref={boxRef}
      type="button"
      className={st.slideTile}
      data-active={active || undefined}
      style={{ aspectRatio: dim.ratio }}
      onClick={onClick}
      aria-label={`Slide ${index + 1}`}
    >
      <span className={st.slideTileBadge}>{String(index + 1).padStart(2, "0")}</span>
      <div
        style={{
          width: dim.width,
          height: dim.height,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
          pointerEvents: "none",
        }}
      >
        <StudioSlideCanvas
          slide={slide}
          index={index}
          total={total}
          theme={theme}
          artDirection={artDirection}
          aspect={aspect}
        />
      </div>
    </button>
  );
}

export default function AdminStudioEditor({ id }: { id: string }) {
  const router = useRouter();
  const aiDialog = useRef<HTMLDialogElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const exportRefs = useRef<Array<HTMLDivElement | null>>([]);

  const [post, setPost] = useState<SocialPost | null>(null);
  const [theme, setTheme] = useState<SocialTheme>(DEFAULT_SOCIAL_THEME);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [editorRevision, setEditorRevision] = useState(0);

  const [tab, setTab] = useState<Tab>("documento");
  const [viewMode, setViewMode] = useState<"grid" | "focus">("grid");
  const [focusIndex, setFocusIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");

  // AI Proposal + Undo + Voice capture
  const [proposal, setProposal] = useState<SocialPost | null>(null);
  const [undoPost, setUndoPost] = useState<SocialPost | null>(null);
  const [aiIdea, setAiIdea] = useState("");
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);

  const { toast, show } = useToast();

  useEffect(() => {
    fetch("/api/social/posts", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data.posts) ? (data.posts as SocialPost[]) : [];
        const found = list.find(p => p.id === id);
        if (!found) {
          router.replace("/admin/estudio");
          return;
        }
        const normalized: SocialPost = {
          ...found,
          format: "studio_doc",
          studioDoc: found.studioDoc ?? STARTER_STUDIO_DOC,
        };
        setPost(normalized);
        setAiIdea(found.sourceIdea ?? "");
        if (data.theme) setTheme(data.theme as SocialTheme);
        setAiProvider(data.aiProvider ?? null);
      })
      .catch(err => show(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!recording) return;
    const t = window.setInterval(() => setRecSeconds(s => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [recording]);

  const studioDoc: StudioDocumentData = post?.studioDoc ?? STARTER_STUDIO_DOC;
  const activeDoc = proposal?.studioDoc ?? studioDoc;

  const compiledSlides = useMemo(
    () => compileDocToSlides(activeDoc.blocks),
    [activeDoc.blocks],
  );

  useEffect(() => {
    if (focusIndex >= compiledSlides.length) {
      setFocusIndex(Math.max(0, compiledSlides.length - 1));
    }
  }, [compiledSlides.length, focusIndex]);

  const updateStudioDoc = useCallback((patch: Partial<StudioDocumentData>) => {
    setPost(prev => {
      if (!prev) return prev;
      const base = prev.studioDoc ?? STARTER_STUDIO_DOC;
      return { ...prev, studioDoc: { ...base, ...patch } };
    });
    setDirty(true);
  }, []);

  const handleBlocksChange = useCallback(
    (blocks: StudioBlockJson[]) => {
      updateStudioDoc({ blocks });
    },
    [updateStudioDoc],
  );

  async function save(override?: SocialPost) {
    const target = override ?? post;
    if (!target) return;
    setSaving(true);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: { ...target, format: "studio_doc" } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar");
      if (data.post) setPost(data.post as SocialPost);
      setDirty(false);
      show("Documento salvo!", "good");
    } catch (err) {
      show(err);
    } finally {
      setSaving(false);
    }
  }

  async function runMultiplier(ideaText: string) {
    if (!post) return;
    setBusyLabel("A IA está multiplicando sua ideia em blocos BlockNote + legenda…");
    try {
      const res = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "studio_doc",
          idea: ideaText,
          artDirection: studioDoc.artDirection,
          save: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar proposta");
      setProposal(data.post as SocialPost);
      show("Proposta pronta no storyboard! Revise e clique em Aplicar.", "good");
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  function applyProposal() {
    if (!post || !proposal?.studioDoc) return;
    setUndoPost(post);
    setPost({
      ...post,
      title: proposal.title,
      caption: proposal.caption,
      sourceIdea: proposal.sourceIdea ?? aiIdea,
      studioDoc: {
        ...proposal.studioDoc,
        aspect: studioDoc.aspect,
      },
      status: "in_review",
    });
    setProposal(null);
    setEditorRevision(r => r + 1);
    setDirty(true);
  }

  async function toggleVoice() {
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
        setBusyLabel("Transcrevendo áudio com Whisper…");
        try {
          const form = new FormData();
          form.append("audio", blob, "voz.webm");
          const res = await fetch("/api/social/generate", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Erro na transcrição");
          const transcript = String(data.transcript ?? "");
          setAiIdea(transcript);
          await runMultiplier(transcript);
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
      show("Permita o microfone no navegador para gravar.");
    }
  }

  async function convertToReel() {
    if (!post || compiledSlides.length === 0) return;
    setBusyLabel("Convertendo os blocos do documento em cenas de Reel…");
    try {
      const reelDoc = compileSlidesToReel(compiledSlides, {
        title: post.title,
        accent: theme.palette.accent,
        handle: theme.handle,
      });
      const now = new Date().toISOString();
      const reelPost: SocialPost = {
        id: `reel_from_${post.id}`,
        title: `${post.title} (Reel)`,
        format: "reel",
        status: "in_review",
        slides: [],
        reel: reelDoc,
        caption: post.caption,
        createdAt: now,
        updatedAt: now,
      };
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: reelPost }),
      });
      if (!res.ok) throw new Error("Erro ao salvar Reel");
      router.push("/admin/reels");
    } catch (err) {
      show(err);
      setBusyLabel("");
    }
  }

  async function exportZip() {
    if (!post || compiledSlides.length === 0) return;
    const dim = ASPECT_DIMENSIONS[studioDoc.aspect];
    setBusyLabel(`Exportando ${compiledSlides.length} slides em ${dim.width}×${dim.height} (.zip)…`);
    try {
      const zip = new JSZip();
      const slug = slugify(post.title);
      for (let i = 0; i < compiledSlides.length; i++) {
        const node = exportRefs.current[i];
        if (!node) continue;
        const dataUrl = await domToPng(node, { width: dim.width, height: dim.height, scale: 1 });
        zip.file(`${String(i + 1).padStart(2, "0")}-${slug}-${studioDoc.aspect}.png`, dataUrl.split(",")[1] ?? "", {
          base64: true,
        });
      }
      if (post.caption.trim()) zip.file("legenda.txt", post.caption);
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${slug}-${studioDoc.aspect}.zip`);
      await save({ ...post, status: "exported" as SocialStatus });
      show("Pacote .zip exportado!", "good");
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  async function exportSingle(index: number) {
    if (!post) return;
    const node = exportRefs.current[index];
    if (!node) return;
    const dim = ASPECT_DIMENSIONS[studioDoc.aspect];
    setBusyLabel(`Renderizando PNG ${dim.width}×${dim.height}…`);
    try {
      const dataUrl = await domToPng(node, { width: dim.width, height: dim.height, scale: 1 });
      const blob = await (await fetch(dataUrl)).blob();
      downloadBlob(blob, `${slugify(post.title)}-slide-${String(index + 1).padStart(2, "0")}.png`);
      show(`Slide ${index + 1} exportado!`, "good");
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  async function removeDoc() {
    if (!post || !confirm(`Excluir "${post.title}"?`)) return;
    await fetch(`/api/social/posts?id=${encodeURIComponent(post.id)}`, { method: "DELETE" });
    router.push("/admin/estudio");
  }

  if (!post) {
    return (
      <AdminShell crumbs={[{ label: "Estúdio", href: "/admin/estudio" }, { label: "Carregando…" }]}>
        <div className={styles.sheet}>
          <Skeleton kind="text" label="Abrindo documento" />
        </div>
      </AdminShell>
    );
  }

  const dim = ASPECT_DIMENSIONS[studioDoc.aspect];

  return (
    <AdminShell
      crumbs={[{ label: "Estúdio", href: "/admin/estudio" }, { label: post.title }]}
      actions={
        <>
          <span className={styles.saveState} data-dirty={dirty ? "true" : undefined} data-saving={saving || undefined}>
            {saving ? "Salvando…" : dirty ? "Não salvo" : "Salvo"}
          </span>
          <button type="button" className={styles.button} onClick={convertToReel}>
            <PlayIcon />Virar Reel
          </button>
          <button type="button" className={styles.button} onClick={exportZip}>
            Baixar .zip ({compiledSlides.length})
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            disabled={saving}
            onClick={() => void save()}
          >
            Salvar
          </button>
        </>
      }
    >
      <div className={c.tool} data-side="preview">
        {/* LEFT: BlockNote Document Editor + Voice + AI Multiplier */}
        <section className={c.card} aria-label="Editor de blocos">
          <div className={c.head}>
            <input
              className={st.inlineTitle}
              style={{ fontSize: 18 }}
              value={post.title}
              onChange={e => {
                setPost(p => (p ? { ...p, title: e.target.value } : p));
                setDirty(true);
              }}
              aria-label="Título do documento"
            />
          </div>

          <div className={c.bar}>
            <div className={styles.tabs} role="tablist" aria-label="Visão do editor">
              <button
                type="button"
                role="tab"
                className={styles.tab}
                aria-selected={tab === "documento"}
                onClick={() => setTab("documento")}
              >
                <span className={c.step}>1</span>Documento
              </button>
              <button
                type="button"
                role="tab"
                className={styles.tab}
                aria-selected={tab === "legenda"}
                onClick={() => setTab("legenda")}
              >
                <span className={c.step}>2</span>Legenda & Dados
              </button>
            </div>

            <div className={c.barEnd}>
              <button type="button" className={`${styles.button} ${styles.small}`} onClick={toggleVoice}>
                {recording ? (
                  <>
                    <span className={st.recDot} />
                    Parar ({recSeconds}s)
                  </>
                ) : (
                  "🎙️ Voz"
                )}
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.small}`}
                onClick={() => aiDialog.current?.showModal()}
              >
                <SparkIcon />Multiplicar IA
              </button>
            </div>
          </div>

          {/* Art direction bar + AI Proposal banner */}
          <div className={c.notes}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div className={styles.tabs} role="tablist" aria-label="Direção de arte">
                {ART_DIRECTIONS.map(art => (
                  <button
                    key={art.id}
                    type="button"
                    role="tab"
                    className={styles.tab}
                    title={art.hint}
                    aria-selected={studioDoc.artDirection === art.id}
                    onClick={() => updateStudioDoc({ artDirection: art.id })}
                  >
                    {art.label}
                  </button>
                ))}
              </div>
              <span className={styles.hint} style={{ fontSize: 12 }}>
                Digite <code>/</code> no texto para inserir blocos sociais
              </span>
            </div>

            {proposal ? (
              <div className={styles.panel} style={{ padding: 10, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, background: "var(--raised)" }}>
                <span style={{ fontSize: 13 }}>
                  <SparkIcon /> <strong>Proposta da IA:</strong> {compiledSlides.length} slides (“{proposal.title}”) pré-visualizados ao lado.
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={() => setProposal(null)}>
                    Ignorar
                  </button>
                  <button type="button" className={`${styles.button} ${styles.primary} ${styles.small}`} onClick={applyProposal}>
                    Aplicar no documento
                  </button>
                </div>
              </div>
            ) : undoPost ? (
              <div className={styles.panel} style={{ padding: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "var(--raised)" }}>
                <span className={styles.hint}>O documento foi atualizado pela IA.</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.small}`}
                    onClick={() => {
                      setPost(undoPost);
                      setUndoPost(null);
                      setEditorRevision(r => r + 1);
                      setDirty(true);
                    }}
                  >
                    Desfazer IA
                  </button>
                  <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={() => setUndoPost(null)}>
                    Ok
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className={c.body} data-tab={tab === "documento" ? "conteudo" : undefined}>
            {tab === "documento" ? (
              <SocialDocEditor
                key={`${post.id}-${editorRevision}`}
                initialBlocks={studioDoc.blocks}
                onChange={handleBlocksChange}
              />
            ) : (
              <div className={c.groups}>
                <div className={c.group}>
                  <h2>Legenda pronta para o Instagram</h2>
                  <div className={styles.form}>
                    <label className={`${styles.field} ${styles.fieldWide}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className={styles.label}>Gancho + Desenvolvimento + Hashtags</span>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.small}`}
                          onClick={() => {
                            void navigator.clipboard.writeText(post.caption);
                            show("Legenda copiada!", "good");
                          }}
                        >
                          <CopyIcon />Copiar
                        </button>
                      </div>
                      <textarea
                        className={styles.textarea}
                        rows={9}
                        value={post.caption}
                        onChange={e => {
                          setPost(p => (p ? { ...p, caption: e.target.value } : p));
                          setDirty(true);
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className={c.group}>
                  <h2>Ações</h2>
                  <div>
                    <button type="button" className={`${styles.button} ${styles.ghost} ${styles.danger}`} onClick={removeDoc}>
                      <TrashIcon />Excluir documento
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: Multi-Slide & Multi-Format Live Storyboard */}
        <aside className={c.side} aria-label="Storyboard ao vivo">
          <div className={st.storyboard}>
            <div className={st.storyboardBar}>
              <div className={styles.tabs} role="tablist" aria-label="Formato de saída">
                <button
                  type="button"
                  role="tab"
                  className={styles.tab}
                  aria-selected={studioDoc.aspect === "carousel"}
                  onClick={() => updateStudioDoc({ aspect: "carousel" })}
                >
                  Carrossel 4:5
                </button>
                <button
                  type="button"
                  role="tab"
                  className={styles.tab}
                  aria-selected={studioDoc.aspect === "story"}
                  onClick={() => updateStudioDoc({ aspect: "story" })}
                >
                  Stories 9:16
                </button>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.small}`}
                  onClick={() => setViewMode(m => (m === "grid" ? "focus" : "grid"))}
                >
                  {viewMode === "grid" ? "Zoom 1 slide" : `Grade (${compiledSlides.length})`}
                </button>
                {viewMode === "focus" && compiledSlides[focusIndex] ? (
                  <button
                    type="button"
                    className={`${styles.button} ${styles.small}`}
                    onClick={() => void exportSingle(focusIndex)}
                  >
                    Baixar PNG
                  </button>
                ) : null}
              </div>
            </div>

            {compiledSlides.length === 0 ? (
              <p className={styles.hint} style={{ margin: 0 }}>
                Comece escrevendo à esquerda ou digite <code>/</code> para inserir um bloco de slide.
              </p>
            ) : viewMode === "grid" ? (
              <div className={st.storyboardGrid}>
                {compiledSlides.map((sl, i) => (
                  <ScaledSlideTile
                    key={`${sl.id}-${i}`}
                    slide={sl}
                    index={i}
                    total={compiledSlides.length}
                    theme={theme}
                    artDirection={studioDoc.artDirection}
                    aspect={studioDoc.aspect}
                    active={i === focusIndex}
                    onClick={() => {
                      setFocusIndex(i);
                      setViewMode("focus");
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className={st.storyboardSingle}>
                <div style={{ width: "min(380px, 100%)", display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className={styles.label}>
                      Slide {focusIndex + 1} de {compiledSlides.length} · {dim.width}×{dim.height}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.ghost} ${styles.small}`}
                        disabled={focusIndex === 0}
                        onClick={() => setFocusIndex(i => Math.max(0, i - 1))}
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.ghost} ${styles.small}`}
                        disabled={focusIndex >= compiledSlides.length - 1}
                        onClick={() => setFocusIndex(i => Math.min(compiledSlides.length - 1, i + 1))}
                      >
                        →
                      </button>
                    </div>
                  </div>
                  <ScaledSlideTile
                    slide={compiledSlides[focusIndex]!}
                    index={focusIndex}
                    total={compiledSlides.length}
                    theme={theme}
                    artDirection={studioDoc.artDirection}
                    aspect={studioDoc.aspect}
                    active
                    onClick={() => setViewMode("grid")}
                  />
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Offscreen native-res export stage */}
      <div style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden>
        {compiledSlides.map((sl, i) => (
          <div
            key={`${sl.id}-exp-${i}`}
            ref={el => {
              exportRefs.current[i] = el;
            }}
          >
            <StudioSlideCanvas
              slide={sl}
              index={i}
              total={compiledSlides.length}
              theme={theme}
              artDirection={studioDoc.artDirection}
              aspect={studioDoc.aspect}
            />
          </div>
        ))}
      </div>

      {/* AI Multiplier Modal */}
      <dialog
        ref={aiDialog}
        className={styles.dialog}
        style={{ width: "min(520px, 94vw)" }}
        onClick={e => {
          if (e.target === aiDialog.current) aiDialog.current.close();
        }}
      >
        <form
          onSubmit={e => {
            e.preventDefault();
            aiDialog.current?.close();
            void runMultiplier(aiIdea);
          }}
        >
          <div className={styles.dialogHead}>
            <h2>Multiplicar ideia com IA</h2>
          </div>
          <div className={styles.form} style={{ padding: 16 }}>
            {!aiProvider ? (
              <p className={styles.hint} style={{ gridColumn: "1 / -1", color: "var(--warn)", margin: 0 }}>
                Configure <code>OPENAI_API_KEY</code>, <code>GEMINI_API_KEY</code> ou <code>ANTHROPIC_API_KEY</code>.
              </p>
            ) : null}
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>Ideia bruta, dúvida de aluno ou transcrição</span>
              <textarea
                className={styles.textarea}
                rows={5}
                required
                value={aiIdea}
                onChange={e => setAiIdea(e.target.value)}
                placeholder="Descreva o tema ou cole uma anotação de aula…"
              />
            </label>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 16px", borderTop: "1px solid var(--line)" }}>
            <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={() => aiDialog.current?.close()}>
              Cancelar
            </button>
            <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={!aiProvider}>
              <SparkIcon />Propor documento
            </button>
          </div>
        </form>
      </dialog>

      <BusyOverlay label={busyLabel} />
      <Toast toast={toast} />
    </AdminShell>
  );
}

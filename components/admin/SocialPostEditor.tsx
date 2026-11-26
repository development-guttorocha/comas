"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { domToPng } from "modern-screenshot";
import JSZip from "jszip";
import { DEFAULT_SOCIAL_THEME } from "@/lib/social/presets";
import {
  createEmptySlide,
  SLIDE_HEIGHT,
  SLIDE_LIMITS,
  SLIDE_WIDTH,
  type SlideKind,
  type SocialPost,
  type SocialSlide,
  type SocialStatus,
  type SocialTheme,
  type TemplatePreset,
} from "@/lib/social/types";
import SlideCanvas from "@/components/social/SlideCanvas";
import AdminShell from "./AdminShell";
import BusyOverlay from "./BusyOverlay";
import { Toast, useToast } from "./client";
import { move } from "./Fields";
import { CopyIcon, DownIcon, ImageIcon, PlusIcon, SparkIcon, TrashIcon, UpIcon } from "./icons";
import MuapiGeneratorDialog from "./MuapiGeneratorDialog";
import Skeleton from "./Skeleton";
import styles from "./admin.module.css";
import c from "./caseEditor.module.css";

type Tab = "slides" | "legenda" | "material";
const TABS: { id: Tab; label: string }[] = [
  { id: "material", label: "Material & IA" },
  { id: "slides", label: "Slides" },
  { id: "legenda", label: "Legenda & Dados" },
];

const KIND_LABELS: Record<SlideKind, string> = {
  cover: "Capa",
  content: "Conteúdo",
  comparison: "Antes × Depois",
  quote: "Citação / Nota",
  cta: "CTA Final",
};

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "carrossel"
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

export default function SocialPostEditor({ id }: { id: string }) {
  const router = useRouter();
  const [post, setPost] = useState<SocialPost | null>(null);
  const [theme, setTheme] = useState<SocialTheme>(DEFAULT_SOCIAL_THEME);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("slides");
  const [slideIndex, setSlideIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [muapiOpen, setMuapiOpen] = useState(false);

  // AI Proposal & Undo (same pattern as CaseEditor)
  const [proposal, setProposal] = useState<SocialPost | null>(null);
  const [undoPost, setUndoPost] = useState<SocialPost | null>(null);
  const [ideaInput, setIdeaInput] = useState("");
  const [preset, setPreset] = useState<TemplatePreset>("cycle_steps");
  const [slideCount, setSlideCount] = useState(6);

  const previewRef = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(380);
  const exportRefs = useRef<Array<HTMLDivElement | null>>([]);
  const { toast, show } = useToast();

  useEffect(() => {
    fetch("/api/social/posts", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data.posts) ? (data.posts as SocialPost[]) : [];
        const found = list.find(p => p.id === id);
        if (!found) {
          router.replace("/admin/carrosseis");
          return;
        }
        setPost(found);
        setIdeaInput(found.sourceIdea ?? "");
        if (data.theme) setTheme(data.theme as SocialTheme);
        setAiProvider(data.aiProvider ?? null);
      })
      .catch(err => show(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => setPreviewWidth(el.clientWidth || 380);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [post, tab]);

  const activeSlide = post?.slides[slideIndex] ?? post?.slides[0] ?? null;

  const patchPost = useCallback((updater: (p: SocialPost) => SocialPost) => {
    setPost(prev => (prev ? updater(prev) : prev));
    setDirty(true);
  }, []);

  const patchSlide = (patch: Partial<SocialSlide>) => {
    patchPost(p => ({
      ...p,
      slides: p.slides.map((sl, i) => (i === slideIndex ? { ...sl, ...patch } : sl)),
    }));
  };

  async function save(override?: SocialPost) {
    const target = override ?? post;
    if (!target) return;
    setSaving(true);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar");
      if (data.post) setPost(data.post as SocialPost);
      setDirty(false);
      show("Salvo.", "good");
    } catch (err) {
      show(err);
    } finally {
      setSaving(false);
    }
  }

  async function generateProposal(e: React.FormEvent) {
    e.preventDefault();
    if (!post) return;
    setBusyLabel("A IA está escrevendo uma proposta de slides e legenda…");
    try {
      const res = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: ideaInput, preset, slideCount, save: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar proposta");
      setProposal(data.post as SocialPost);
      setTab("slides");
      show("Proposta da IA pronta: revise e escolha se quer aplicar.", "good");
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  function applyProposal() {
    if (!post || !proposal) return;
    setUndoPost(post);
    setPost({
      ...post,
      title: proposal.title,
      slides: proposal.slides,
      caption: proposal.caption,
      sourceIdea: ideaInput,
      status: "in_review",
    });
    setProposal(null);
    setSlideIndex(0);
    setDirty(true);
  }

  async function exportSingle() {
    const node = exportRefs.current[slideIndex];
    if (!node || !post) return;
    setBusyLabel("Renderizando PNG 1080×1350…");
    try {
      const dataUrl = await domToPng(node, { width: SLIDE_WIDTH, height: SLIDE_HEIGHT, scale: 1 });
      const blob = await (await fetch(dataUrl)).blob();
      const num = String(slideIndex + 1).padStart(2, "0");
      downloadBlob(blob, `${slugify(post.title)}-slide-${num}.png`);
      show(`Slide ${num} baixado em 1080×1350.`, "good");
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  async function exportZip() {
    if (!post) return;
    setBusyLabel("Exportando todos os slides + legenda (.zip)…");
    try {
      const zip = new JSZip();
      const slug = slugify(post.title);
      for (let i = 0; i < post.slides.length; i++) {
        const node = exportRefs.current[i];
        if (!node) continue;
        const dataUrl = await domToPng(node, { width: SLIDE_WIDTH, height: SLIDE_HEIGHT, scale: 1 });
        zip.file(`${String(i + 1).padStart(2, "0")}-${slug}.png`, dataUrl.split(",")[1] ?? "", { base64: true });
      }
      if (post.caption.trim()) zip.file("legenda.txt", post.caption);
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${slug}-texto-em-ciclo.zip`);
      const next = { ...post, status: "exported" as SocialStatus };
      await save(next);
      show("Pacote .zip exportado!", "good");
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  async function removePost() {
    if (!post || !confirm(`Excluir "${post.title}"?`)) return;
    setBusyLabel("Excluindo…");
    try {
      const res = await fetch(`/api/social/posts?id=${encodeURIComponent(post.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
      router.push("/admin/carrosseis");
    } catch (err) {
      show(err);
      setBusyLabel("");
    }
  }

  if (!post || !activeSlide) {
    return (
      <AdminShell crumbs={[{ label: "Carrosséis", href: "/admin/carrosseis" }, { label: "Carregando…" }]}>
        <div className={styles.sheet}>
          <Skeleton kind="text" label="Abrindo o carrossel" />
        </div>
      </AdminShell>
    );
  }

  const scale = previewWidth / SLIDE_WIDTH;

  return (
    <AdminShell
      crumbs={[{ label: "Carrosséis", href: "/admin/carrosseis" }, { label: post.title }]}
      actions={
        <>
          <span className={styles.saveState} data-dirty={dirty ? "true" : undefined} data-saving={saving || undefined}>
            {saving ? "Salvando…" : dirty ? "Alterações não salvas" : "Salvo"}
          </span>
          <button type="button" className={styles.button} onClick={exportSingle}>
            Slide PNG
          </button>
          <button type="button" className={styles.button} onClick={exportZip}>
            Exportar .zip
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
        {/* Left card: tabs + editor (same frame as CaseEditor) */}
        <section className={c.card} aria-label="Editor do carrossel">
          <div className={c.head}>
            <h1 className={c.title}>{post.title}</h1>
          </div>

          <div className={c.bar}>
            <div className={styles.tabs} role="tablist" aria-label="Etapas do carrossel">
              {TABS.map((t, idx) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  className={styles.tab}
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                >
                  <span className={c.step}>{idx + 1}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className={c.notes}>
            {proposal ? (
              <div className={styles.panel} style={{ padding: 12, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, background: "var(--raised)" }}>
                <span style={{ fontSize: 13 }}>
                  <SparkIcon /> <strong>Proposta da IA:</strong> {proposal.slides.length} slides (“{proposal.title}”) prontos para revisão.
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={() => setProposal(null)}>
                    Ignorar
                  </button>
                  <button type="button" className={`${styles.button} ${styles.primary} ${styles.small}`} onClick={applyProposal}>
                    Usar proposta
                  </button>
                </div>
              </div>
            ) : undoPost ? (
              <div className={styles.panel} style={{ padding: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "var(--raised)" }}>
                <span className={styles.hint}>A proposta da IA substituiu os slides anteriores.</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.small}`}
                    onClick={() => {
                      setPost(undoPost);
                      setUndoPost(null);
                      setSlideIndex(0);
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

          <div className={c.body}>
            {tab === "material" ? (
              <form onSubmit={generateProposal} className={styles.form} style={{ maxWidth: 680 }}>
                <p className={styles.hint} style={{ gridColumn: "1 / -1", margin: 0 }}>
                  Cole aqui a ideia bruta, resumo de aula ou transcrição de áudio da Renata. A IA gera uma proposta calibrada para 1080×1350 sem sobrescrever nada sem sua aprovação.
                </p>
                {!aiProvider ? (
                  <p className={styles.hint} style={{ gridColumn: "1 / -1", color: "var(--warn)", margin: 0 }}>
                    Configure <code>OPENAI_API_KEY</code>, <code>GEMINI_API_KEY</code> ou <code>ANTHROPIC_API_KEY</code> nas variáveis de ambiente para ativar a IA.
                  </p>
                ) : null}
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>Material bruto / Ideia</span>
                  <textarea
                    className={styles.textarea}
                    rows={6}
                    required
                    value={ideaInput}
                    onChange={e => {
                      setIdeaInput(e.target.value);
                      patchPost(p => ({ ...p, sourceIdea: e.target.value }));
                    }}
                    placeholder="Ex: Explicar a diferença entre 'onde' e 'aonde' com frases do cotidiano e um macete rápido no final…"
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Formato</span>
                  <select className={styles.select} value={preset} onChange={e => setPreset(e.target.value as TemplatePreset)}>
                    <option value="cycle_steps">Ciclo / Passo a passo</option>
                    <option value="before_after">Antes × Depois</option>
                    <option value="quick_tip">Card único (Citação / Dica)</option>
                  </select>
                </label>
                {preset !== "quick_tip" ? (
                  <label className={styles.field}>
                    <span className={styles.label}>Slides</span>
                    <select className={styles.select} value={slideCount} onChange={e => setSlideCount(Number(e.target.value))}>
                      {[4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n}>{n} slides</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <div className={styles.fieldWide}>
                  <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={!aiProvider}>
                    <SparkIcon />Propor slides e legenda com IA
                  </button>
                </div>
              </form>
            ) : null}

            {tab === "slides" ? (
              <div style={{ display: "grid", gap: 18 }}>
                {/* Slide selector pills + add */}
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div className={styles.tabs} role="tablist" aria-label="Slides">
                    {post.slides.map((sl, i) => (
                      <button
                        key={sl.id}
                        type="button"
                        role="tab"
                        className={styles.tab}
                        aria-selected={i === slideIndex}
                        onClick={() => setSlideIndex(i)}
                      >
                        <span className={c.step}>{String(i + 1).padStart(2, "0")}</span>
                        {KIND_LABELS[sl.kind]}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className={`${styles.button} ${styles.small}`}
                    onClick={() => {
                      const next = createEmptySlide("content", post.slides.length);
                      const list = [...post.slides, next];
                      patchPost(p => ({ ...p, slides: list }));
                      setSlideIndex(list.length - 1);
                    }}
                  >
                    <PlusIcon />Slide
                  </button>
                </div>

                {/* Slide toolbar */}
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <select
                      aria-label="Template do slide"
                      className={styles.select}
                      style={{ width: "auto" }}
                      value={activeSlide.kind}
                      onChange={e => patchSlide({ kind: e.target.value as SlideKind })}
                    >
                      {Object.entries(KIND_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>Template: {label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={`${styles.button} ${styles.ghost} ${styles.iconButton}`}
                      disabled={slideIndex === 0}
                      title="Mover para trás"
                      onClick={() => {
                        patchPost(p => ({ ...p, slides: move(p.slides, slideIndex, slideIndex - 1) }));
                        setSlideIndex(slideIndex - 1);
                      }}
                    >
                      <UpIcon />
                    </button>
                    <button
                      type="button"
                      className={`${styles.button} ${styles.ghost} ${styles.iconButton}`}
                      disabled={slideIndex >= post.slides.length - 1}
                      title="Mover para frente"
                      onClick={() => {
                        patchPost(p => ({ ...p, slides: move(p.slides, slideIndex, slideIndex + 1) }));
                        setSlideIndex(slideIndex + 1);
                      }}
                    >
                      <DownIcon />
                    </button>
                  </div>

                  <button
                    type="button"
                    className={`${styles.button} ${styles.ghost} ${styles.small} ${styles.danger}`}
                    disabled={post.slides.length <= 1}
                    onClick={() => {
                      const list = post.slides.filter((_, i) => i !== slideIndex);
                      patchPost(p => ({ ...p, slides: list }));
                      setSlideIndex(Math.max(0, slideIndex - 1));
                    }}
                  >
                    <TrashIcon />Remover slide
                  </button>
                </div>

                {/* Slide fields using admin form tokens */}
                <div className={styles.form}>
                  <label className={styles.field}>
                    <span className={styles.label}>
                      Etiqueta superior ({(activeSlide.eyebrow ?? "").length}/{SLIDE_LIMITS.eyebrow})
                    </span>
                    <input
                      className={styles.input}
                      value={activeSlide.eyebrow ?? ""}
                      onChange={e => patchSlide({ eyebrow: e.target.value })}
                      placeholder="Ex: PASSO 01, ANTES × DEPOIS"
                    />
                  </label>

                  {activeSlide.kind === "content" ? (
                    <label className={styles.field}>
                      <span className={styles.label}>Número do passo</span>
                      <input
                        className={`${styles.input} ${styles.mono}`}
                        value={activeSlide.stepNumber ?? ""}
                        onChange={e => patchSlide({ stepNumber: e.target.value })}
                        placeholder="01"
                      />
                    </label>
                  ) : null}

                  <label className={`${styles.field} ${styles.fieldWide}`}>
                    <span className={styles.label}>
                      {activeSlide.kind === "quote" ? "Texto da citação / nota" : "Título do slide"} ({activeSlide.title.length}/
                      {activeSlide.kind === "cover"
                        ? SLIDE_LIMITS.coverTitle
                        : activeSlide.kind === "quote"
                          ? SLIDE_LIMITS.quoteTitle
                          : SLIDE_LIMITS.contentTitle}
                      )
                    </span>
                    <textarea
                      className={styles.textarea}
                      rows={activeSlide.kind === "quote" ? 4 : 2}
                      value={activeSlide.title}
                      onChange={e => patchSlide({ title: e.target.value })}
                    />
                  </label>

                  {activeSlide.kind === "comparison" ? (
                    <>
                      <label className={`${styles.field} ${styles.fieldWide}`}>
                        <span className={styles.label}>
                          Antes / Evite ({(activeSlide.wrongText ?? "").length}/{SLIDE_LIMITS.wrongText})
                        </span>
                        <textarea
                          className={styles.textarea}
                          rows={2}
                          value={activeSlide.wrongText ?? ""}
                          onChange={e => patchSlide({ wrongText: e.target.value })}
                        />
                      </label>
                      <label className={`${styles.field} ${styles.fieldWide}`}>
                        <span className={styles.label}>
                          Depois / Prefira ({(activeSlide.rightText ?? "").length}/{SLIDE_LIMITS.rightText})
                        </span>
                        <textarea
                          className={styles.textarea}
                          rows={2}
                          value={activeSlide.rightText ?? ""}
                          onChange={e => patchSlide({ rightText: e.target.value })}
                        />
                      </label>
                    </>
                  ) : null}

                  {activeSlide.kind !== "quote" ? (
                    <label className={`${styles.field} ${styles.fieldWide}`}>
                      <span className={styles.label}>
                        {activeSlide.kind === "comparison" ? "Explicação curta" : "Texto de apoio"} ({(activeSlide.body ?? "").length}/{SLIDE_LIMITS.contentBody})
                      </span>
                      <textarea
                        className={styles.textarea}
                        rows={3}
                        value={activeSlide.body ?? ""}
                        onChange={e => patchSlide({ body: e.target.value })}
                      />
                    </label>
                  ) : (
                    <label className={`${styles.field} ${styles.fieldWide}`}>
                      <span className={styles.label}>Assinatura</span>
                      <input
                        className={styles.input}
                        value={activeSlide.author ?? ""}
                        onChange={e => patchSlide({ author: e.target.value })}
                      />
                    </label>
                  )}

                  {activeSlide.kind === "cover" || activeSlide.kind === "content" || activeSlide.kind === "cta" ? (
                    <label className={`${styles.field} ${styles.fieldWide}`}>
                      <span className={styles.label}>
                        Destaque / Chamada ({(activeSlide.highlight ?? "").length}/{SLIDE_LIMITS.highlight})
                      </span>
                      <input
                        className={styles.input}
                        value={activeSlide.highlight ?? ""}
                        onChange={e => patchSlide({ highlight: e.target.value })}
                      />
                    </label>
                  ) : null}

                  <div className={`${styles.field} ${styles.fieldWide}`} style={{ paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span className={styles.label}>Imagem de fundo editorial (MuAPI)</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.small}`}
                          onClick={() => setMuapiOpen(true)}
                        >
                          <ImageIcon />Gerar imagem com MuAPI
                        </button>
                        {activeSlide.imageUrl ? (
                          <button
                            type="button"
                            className={`${styles.button} ${styles.ghost} ${styles.small}`}
                            onClick={() => patchSlide({ imageUrl: undefined })}
                          >
                            Remover imagem
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {activeSlide.imageUrl ? (
                      <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
                        <label className={styles.rangeField}>
                          <span className={styles.rangeHead}>
                            <span>Véu de leitura sobre a imagem</span>
                            <strong>{Math.round((activeSlide.imageOverlay ?? 0.78) * 100)}%</strong>
                          </span>
                          <input
                            type="range"
                            min={0.25}
                            max={0.92}
                            step={0.03}
                            value={activeSlide.imageOverlay ?? 0.78}
                            onChange={e => patchSlide({ imageOverlay: Number(e.target.value) })}
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "legenda" ? (
              <div className={c.groups}>
                <div className={c.group}>
                  <h2>Legenda do Instagram</h2>
                  <div className={styles.form}>
                    <label className={`${styles.field} ${styles.fieldWide}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className={styles.label}>Texto + Hashtags</span>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.small}`}
                          onClick={() => {
                            void navigator.clipboard.writeText(post.caption);
                            show("Legenda copiada!", "good");
                          }}
                        >
                          <CopyIcon />Copiar legenda
                        </button>
                      </div>
                      <textarea
                        className={styles.textarea}
                        rows={8}
                        value={post.caption}
                        onChange={e => patchPost(p => ({ ...p, caption: e.target.value }))}
                      />
                    </label>
                  </div>
                </div>

                <div className={c.group}>
                  <h2>Dados internos</h2>
                  <div className={styles.form}>
                    <label className={`${styles.field} ${styles.fieldWide}`}>
                      <span className={styles.label}>Título interno</span>
                      <input
                        className={styles.input}
                        value={post.title}
                        onChange={e => patchPost(p => ({ ...p, title: e.target.value }))}
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.label}>Estado</span>
                      <select
                        className={styles.select}
                        value={post.status}
                        onChange={e => patchPost(p => ({ ...p, status: e.target.value as SocialStatus }))}
                      >
                        <option value="draft_ai">Proposta IA</option>
                        <option value="in_review">Em revisão</option>
                        <option value="exported">Exportado</option>
                      </select>
                    </label>
                  </div>
                  <div>
                    <button type="button" className={`${styles.button} ${styles.ghost} ${styles.danger}`} onClick={removePost}>
                      <TrashIcon />Excluir carrossel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Right card: Live 1080×1350 preview (same split slot as CaseEditor) */}
        <aside className={c.side} aria-label="Prévia 1080×1350">
          <div className={styles.panel} style={{ padding: 16, display: "grid", alignContent: "start", gap: 12, overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className={styles.label}>
                Prévia · Slide {slideIndex + 1} de {post.slides.length} (1080×1350)
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.ghost} ${styles.small}`}
                  disabled={slideIndex === 0}
                  onClick={() => setSlideIndex(i => Math.max(0, i - 1))}
                >
                  ←
                </button>
                <button
                  type="button"
                  className={`${styles.button} ${styles.ghost} ${styles.small}`}
                  disabled={slideIndex >= post.slides.length - 1}
                  onClick={() => setSlideIndex(i => Math.min(post.slides.length - 1, i + 1))}
                >
                  →
                </button>
              </div>
            </div>

            <div
              ref={previewRef}
              style={{
                width: "100%",
                maxWidth: 420,
                margin: "0 auto",
                aspectRatio: "4 / 5",
                borderRadius: 10,
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 0 0 1px var(--line)",
              }}
            >
              <div
                style={{
                  width: SLIDE_WIDTH,
                  height: SLIDE_HEIGHT,
                  transformOrigin: "top left",
                  transform: `scale(${scale})`,
                }}
              >
                <SlideCanvas
                  slide={(proposal ?? post).slides[slideIndex] ?? activeSlide}
                  index={slideIndex}
                  total={(proposal ?? post).slides.length}
                  theme={theme}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Offscreen full-res stage for crisp 1080x1350 PNG/ZIP export */}
      <div style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden>
        {post.slides.map((sl, i) => (
          <div
            key={sl.id}
            ref={el => {
              exportRefs.current[i] = el;
            }}
          >
            <SlideCanvas slide={sl} index={i} total={post.slides.length} theme={theme} />
          </div>
        ))}
      </div>

      <MuapiGeneratorDialog
        open={muapiOpen}
        kindFilter="image"
        inlineDataUrl
        defaultPrompt={`Fotografia editorial minimalista e acolhedora sobre escrita e leitura, papel creme texturizado, luz suave da manhã, estética ${theme.brandName}, sem palavras escritas`}
        onResult={(url, meta) => {
          patchSlide({ imageUrl: url });
          show(
            meta.costUsd ? `Imagem gerada na MuAPI ($${meta.costUsd.toFixed(4)}).` : "Imagem gerada na MuAPI!",
            "good",
          );
        }}
        onClose={() => setMuapiOpen(false)}
      />

      <BusyOverlay label={busyLabel} />
      <Toast toast={toast} />
    </AdminShell>
  );
}

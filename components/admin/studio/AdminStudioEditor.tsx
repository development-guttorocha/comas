"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { domToPng } from "modern-screenshot";
import JSZip from "jszip";
import {
  applyLayout,
  blankSlide,
  blocksFromCanvas,
  buildSlide,
  CANVAS_PALETTES,
  CANVAS_SIZE,
  canvasFromCompiled,
  cloneSlide,
  DEFAULT_PALETTE_ID,
  ELEMENT_PRESETS,
  layoutById,
  layoutsFor,
  paletteById,
  readCanvas,
  reflowCanvas,
  remixLayoutId,
  syncContent,
  type CanvasColor,
  type CanvasElement,
  type CanvasFont,
  type CanvasSlide,
  type CanvasTextEl,
  type CanvasTexture,
  type StudioCanvas,
  type TextVariant,
} from "@/lib/social/canvas";
import { compileDocToSlides, compileSlidesToReel } from "@/lib/social/compileDoc";
import { DEFAULT_SOCIAL_THEME } from "@/lib/social/presets";
import {
  ASPECT_DIMENSIONS,
  STARTER_STUDIO_DOC,
  type StudioAspect,
  type StudioBlockJson,
  type StudioDocumentData,
} from "@/lib/social/studioTypes";
import type { SocialPost, SocialStatus, SocialTheme } from "@/lib/social/types";
import CanvasSlideView, { type TextSelectionRange } from "@/components/social/CanvasSlideView";
import AdminShell from "../AdminShell";
import BusyOverlay from "../BusyOverlay";
import { Toast, useToast } from "../client";
import { CropProvider } from "../CropDialog";
import { move } from "../Fields";
import { CopyIcon, ImageIcon, PlayIcon, PlusIcon, SparkIcon, TrashIcon } from "../icons";
import { MediaProvider, useMediaPicker } from "../MediaPicker";
import MuapiGeneratorDialog from "../MuapiGeneratorDialog";
import Skeleton from "../Skeleton";
import { useLeaveGuard } from "../useLeaveGuard";
import styles from "../admin.module.css";
import st from "./studioEditor.module.css";

const SocialDocEditor = dynamic(() => import("./SocialDocEditor"), {
  ssr: false,
  loading: () => <Skeleton kind="text" label="Abrindo roteiro em blocos" />,
});

type ToolPanel = null | "palette" | "elements" | "ai";
type SideTab = "roteiro" | "legenda";

const AI_CHIPS = [
  { label: "Encurtar", prompt: "Deixe o texto mais curto, direto e escaneável, sem perder a precisão pedagógica." },
  { label: "Mais tom de Prô", prompt: "Reescreva com mais oralidade calorosa de sala de aula da Prô Renata (parênteses cúmplices, acolhimento e rigor)." },
  { label: "Virar exemplo real", prompt: "Traga um exemplo concreto de frase de redação dissertativa de vestibulando (evitando qualquer exemplo corporativo)." },
  { label: "Grifar palavra-chave", prompt: "Mantenha o texto quase idêntico, mas envolva 1 ou 2 expressões mais fortes com ==duplo igual== para grifar em mostarda." },
];

const TEXTURES: Array<{ id: CanvasTexture; label: string }> = [
  { id: "paper", label: "Papel" },
  { id: "grid", label: "Quadriculado" },
  { id: "lines", label: "Pauta" },
  { id: "dots", label: "Pontilhado" },
  { id: "none", label: "Liso" },
];

const BG_TOKENS: Array<{ id: CanvasColor; label: string }> = [
  { id: "background", label: "Fundo claro/base" },
  { id: "surface", label: "Cartão" },
  { id: "accent", label: "Destaque" },
  { id: "primary", label: "Profundo" },
  { id: "accentSoft", label: "Lavanda/Suave" },
];

const COLOR_TOKENS: Array<{ id: CanvasColor; label: string }> = [
  { id: "contrast", label: "Auto" },
  { id: "primary", label: "Primária" },
  { id: "accent", label: "Destaque" },
  { id: "note", label: "Mostarda" },
  { id: "white", label: "Branco" },
  { id: "black", label: "Escuro" },
];

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

function ensureCanvas(doc: StudioDocumentData): StudioCanvas {
  const existing = readCanvas(doc.canvas);
  if (existing && existing.slides.length > 0) return existing;
  const compiled = compileDocToSlides(doc.blocks?.length ? doc.blocks : STARTER_STUDIO_DOC.blocks);
  return canvasFromCompiled(
    compiled.length ? compiled : compileDocToSlides(STARTER_STUDIO_DOC.blocks),
    doc.aspect || "carousel",
    DEFAULT_PALETTE_ID,
  );
}

function StudioInner({
  post,
  setPost,
  savedRevision,
  setSavedRevision,
  theme,
}: {
  post: SocialPost;
  setPost: React.Dispatch<React.SetStateAction<SocialPost | null>>;
  savedRevision: string;
  setSavedRevision: (rev: string) => void;
  theme: SocialTheme;
}) {
  const router = useRouter();
  const pickMedia = useMediaPicker();
  const { toast, show, clear } = useToast();

  const exportRefs = useRef<Array<HTMLDivElement | null>>([]);
  const layoutStripRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState<SocialPost>(post);

  const [selectedSlideIdx, setSelectedSlideIdx] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [selectionRange, setSelectionRange] = useState<TextSelectionRange | null>(null);

  const [toolPanel, setToolPanel] = useState<ToolPanel>(null);
  const [showRoteiro, setShowRoteiro] = useState(false);
  const [sideTab, setSideTab] = useState<SideTab>("roteiro");
  const [roteiroRevision, setRoteiroRevision] = useState(0);
  const [pendingBlocks, setPendingBlocks] = useState<StudioBlockJson[] | null>(null);

  const [customAiPrompt, setCustomAiPrompt] = useState("");
  const [undoCanvas, setUndoCanvas] = useState<StudioCanvas | null>(null);
  const [muapiTarget, setMuapiTarget] = useState<{ mode: "element"; elementId: string } | { mode: "new" } | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);

  const [artboardWidth, setArtboardWidth] = useState(330);

  useEffect(() => {
    const updateWidth = () => {
      if (typeof window === "undefined") return;
      const vw = window.innerWidth;
      if (vw < 640) setArtboardWidth(Math.min(340, vw - 52));
      else if (vw < 1100) setArtboardWidth(300);
      else setArtboardWidth(showRoteiro ? 310 : 350);
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [showRoteiro]);

  useEffect(() => {
    if (!recording) return;
    const t = window.setInterval(() => setRecSeconds(s => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [recording]);

  const studioDoc: StudioDocumentData = useMemo(
    () => post.studioDoc ?? STARTER_STUDIO_DOC,
    [post.studioDoc],
  );
  const aspect: StudioAspect = studioDoc.aspect || "carousel";
  const canvas: StudioCanvas = useMemo(() => ensureCanvas(studioDoc), [studioDoc]);
  const palette = useMemo(() => paletteById(canvas.paletteId), [canvas.paletteId]);
  const slides = canvas.slides;
  const safeIdx = Math.min(selectedSlideIdx, Math.max(0, slides.length - 1));
  const activeSlide = slides[safeIdx] ?? slides[0]!;
  const selectedElement = activeSlide?.elements.find(e => e.id === selectedElementId) ?? null;

  const { width: W, height: H } = CANVAS_SIZE[aspect];
  const scale = artboardWidth / W;
  const thumbWidth = 80;
  const thumbScale = thumbWidth / W;

  const commitCanvas = useCallback(
    (nextCanvas: StudioCanvas, syncBlocks = true) => {
      setPost(prev => {
        if (!prev) return prev;
        const baseDoc = prev.studioDoc ?? STARTER_STUDIO_DOC;
        return {
          ...prev,
          studioDoc: {
            ...baseDoc,
            canvas: nextCanvas,
            blocks: syncBlocks ? blocksFromCanvas(nextCanvas) : baseDoc.blocks,
          },
        };
      });
      setDirty(true);
    },
    [setPost],
  );

  const updateSlideAt = useCallback(
    (idx: number, updater: (slide: CanvasSlide) => CanvasSlide) => {
      const nextSlides = slides.map((s, i) => (i === idx ? syncContent(updater(s)) : s));
      commitCanvas({ ...canvas, slides: nextSlides });
    },
    [canvas, commitCanvas, slides],
  );

  // Delete selected free/decor element on Backspace/Delete when not editing text
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingElementId) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement | null)?.isContentEditable) {
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedElementId) {
        e.preventDefault();
        updateSlideAt(safeIdx, s => ({
          ...s,
          elements: s.elements.filter(el => el.id !== selectedElementId),
        }));
        setSelectedElementId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingElementId, safeIdx, selectedElementId, updateSlideAt]);

  async function save(override?: SocialPost): Promise<boolean> {
    const target = override ?? post;
    const syncedCanvas: StudioCanvas = {
      ...ensureCanvas(target.studioDoc ?? STARTER_STUDIO_DOC),
      slides: ensureCanvas(target.studioDoc ?? STARTER_STUDIO_DOC).slides.map(syncContent),
    };
    const payload: SocialPost = {
      ...target,
      format: "studio_doc",
      studioDoc: {
        ...(target.studioDoc ?? STARTER_STUDIO_DOC),
        canvas: syncedCanvas,
        blocks: pendingBlocks ?? blocksFromCanvas(syncedCanvas),
      },
    };
    setSaving(true);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar");
      const saved = (data.post as SocialPost) ?? payload;
      setPost(saved);
      setSavedSnapshot(saved);
      setSavedRevision(saved.updatedAt);
      setDirty(false);
      show("Salvo no Estúdio!", "good");
      return true;
    } catch (err) {
      show(err);
      return false;
    } finally {
      setSaving(false);
    }
  }

  const leaveGuard = useLeaveGuard<SocialPost>({
    id: `studio:${post.id}`,
    dirty,
    value: post,
    base: savedRevision,
    restore: "offer",
    onRestore: restored => {
      setPost(restored);
      setRoteiroRevision(r => r + 1);
      setDirty(true);
    },
    onDiscard: () => {
      setPost(savedSnapshot);
      setRoteiroRevision(r => r + 1);
      setDirty(false);
    },
    onSave: () => save(),
  });

  function handleAspectChange(nextAspect: StudioAspect) {
    if (nextAspect === aspect) return;
    const reflowed = reflowCanvas(canvas, aspect, nextAspect);
    setPost(prev =>
      prev
        ? {
            ...prev,
            studioDoc: {
              ...(prev.studioDoc ?? STARTER_STUDIO_DOC),
              aspect: nextAspect,
              canvas: reflowed,
            },
          }
        : prev,
    );
    setDirty(true);
  }

  function handlePaletteChange(paletteId: string) {
    commitCanvas({ ...canvas, paletteId }, false);
  }

  function handleRemixSlide(idx = safeIdx) {
    updateSlideAt(idx, s => applyLayout(s, remixLayoutId(s), aspect));
  }

  function handleRemixAll() {
    setUndoCanvas(canvas);
    let prev = "";
    const remixed = slides.map(s => {
      const nextLayout = remixLayoutId(s, Math.random, prev ? [prev] : []);
      prev = nextLayout;
      return applyLayout(s, nextLayout, aspect);
    });
    commitCanvas({ ...canvas, slides: remixed }, false);
    show("Composições remixadas mantendo todo o seu texto!", "good");
  }

  function handleHighlight() {
    const target =
      selectedElement?.type === "text"
        ? selectedElement
        : (activeSlide.elements.find(e => e.type === "text" && e.role !== "chrome" && e.role !== "decor") as CanvasTextEl | undefined);
    if (!target) {
      show("Selecione um texto na arte para grifar.");
      return;
    }

    let nextText = target.text;
    if (selectionRange && selectionRange.elementId === target.id && selectionRange.end > selectionRange.start) {
      const before = target.text.slice(0, selectionRange.start);
      const mid = target.text.slice(selectionRange.start, selectionRange.end);
      const after = target.text.slice(selectionRange.end);
      nextText = /^==.*==$/.test(mid) ? `${before}${mid.slice(2, -2)}${after}` : `${before}==${mid}==${after}`;
    } else if (/==[^=]+==/.test(target.text)) {
      nextText = target.text.replace(/==([^=]+)==/g, "$1");
    } else {
      nextText = target.text.replace(/(\S+)(\s*[.!?…:)]*)$/, "==$1==$2");
    }

    updateSlideAt(safeIdx, s => ({
      ...s,
      elements: s.elements.map(e => (e.id === target.id && e.type === "text" ? { ...e, text: nextText } : e)),
    }));
  }

  async function handleAddElement(presetId: string) {
    const preset = ELEMENT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const made = preset.make(aspect);
    if (made.type === "image") {
      const url = await pickMedia("");
      if (!url) return;
      made.src = url;
    }
    updateSlideAt(safeIdx, s => ({ ...s, elements: [...s.elements, made] }));
    setSelectedElementId(made.id);
    setToolPanel(null);
  }

  async function handlePickElementImage(elementId: string, currentSrc: string) {
    const url = await pickMedia(currentSrc);
    if (url === null) return;
    updateSlideAt(safeIdx, s => ({
      ...s,
      elements: s.elements.map(el => (el.id === elementId && el.type === "image" ? { ...el, src: url } : el)),
    }));
  }

  async function handleSlideAi(instruction: string) {
    if (!activeSlide || !instruction.trim()) return;
    setBusyLabel("Ajustando o slide com a voz da Prô…");
    try {
      const synced = syncContent(activeSlide);
      const res = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "slide_rewrite",
          content: synced.content,
          instruction,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao ajustar slide");
      setUndoCanvas(canvas);
      const freeEls = activeSlide.elements.filter(e => e.role === "free");
      const rebuilt = buildSlide(data.content, activeSlide.layoutId, aspect, freeEls, activeSlide.id);
      const nextSlides = slides.map((s, i) => (i === safeIdx ? rebuilt : s));
      commitCanvas({ ...canvas, slides: nextSlides });
      setCustomAiPrompt("");
      show("Slide atualizado pela IA!", "good");
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  async function toggleVoiceForSlide() {
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
        setBusyLabel("Ouvindo instrução com Whisper…");
        try {
          const form = new FormData();
          form.append("audio", blob, "instrucao.webm");
          const res = await fetch("/api/social/generate", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Erro na transcrição");
          await handleSlideAi(String(data.transcript ?? ""));
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

  function applyRoteiroToCanvas() {
    const blocks = pendingBlocks ?? studioDoc.blocks;
    const compiled = compileDocToSlides(blocks);
    if (!compiled.length) {
      show("Escreva pelo menos um bloco no roteiro antes de montar os slides.");
      return;
    }
    setUndoCanvas(canvas);
    const rebuilt = canvasFromCompiled(compiled, aspect, canvas.paletteId);
    setPost(prev =>
      prev
        ? {
            ...prev,
            studioDoc: {
              ...(prev.studioDoc ?? STARTER_STUDIO_DOC),
              blocks,
              canvas: rebuilt,
            },
          }
        : prev,
    );
    setPendingBlocks(null);
    setDirty(true);
    show(`${rebuilt.slides.length} slides atualizados a partir do roteiro!`, "good");
  }

  async function convertToReel() {
    const blocks = blocksFromCanvas(canvas);
    const compiled = compileDocToSlides(blocks);
    if (!compiled.length) return;
    setBusyLabel("Convertendo os slides em cenas de Reel…");
    try {
      const reelDoc = compileSlidesToReel(compiled, {
        title: post.title,
        accent: palette.accent,
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

  async function exportSingle(idx = safeIdx) {
    const node = exportRefs.current[idx];
    if (!node) return;
    setEditingElementId(null);
    setBusyLabel(`Exportando PNG ${W}×${H}…`);
    try {
      const dataUrl = await domToPng(node, { width: W, height: H, scale: 1 });
      const blob = await (await fetch(dataUrl)).blob();
      downloadBlob(blob, `${slugify(post.title)}-slide-${String(idx + 1).padStart(2, "0")}.png`);
      show(`Slide ${idx + 1} exportado em PNG!`, "good");
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  async function exportZip() {
    if (!slides.length) return;
    setEditingElementId(null);
    setBusyLabel(`Exportando ${slides.length} slides em ${W}×${H} (.zip)…`);
    try {
      const zip = new JSZip();
      const slug = slugify(post.title);
      for (let i = 0; i < slides.length; i++) {
        const node = exportRefs.current[i];
        if (!node) continue;
        const dataUrl = await domToPng(node, { width: W, height: H, scale: 1 });
        zip.file(`${String(i + 1).padStart(2, "0")}-${slug}-${aspect}.png`, dataUrl.split(",")[1] ?? "", {
          base64: true,
        });
      }
      if (post.caption.trim()) zip.file("legenda.txt", post.caption);
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${slug}-${aspect}.zip`);
      await save({ ...post, status: "exported" as SocialStatus });
      show("Pacote .zip exportado!", "good");
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  async function removeDoc() {
    if (!confirm(`Excluir "${post.title}"?`)) return;
    await fetch(`/api/social/posts?id=${encodeURIComponent(post.id)}`, { method: "DELETE" });
    router.push("/admin/estudio");
  }

  const candidateLayouts = useMemo(
    () => layoutsFor(activeSlide.content.kind),
    [activeSlide.content.kind],
  );

  const previewAlternatives = useMemo(() => {
    const synced = syncContent(activeSlide);
    const freeEls = activeSlide.elements.filter(e => e.role === "free");
    return candidateLayouts.map(l => ({
      layout: l,
      slide: buildSlide(synced.content, l.id, aspect, freeEls, `preview_${l.id}`),
    }));
  }, [activeSlide, aspect, candidateLayouts]);

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
          <button type="button" className={styles.button} onClick={() => void exportSingle(safeIdx)}>
            Exportar PNG
          </button>
          <button type="button" className={styles.button} onClick={exportZip}>
            Baixar .zip ({slides.length})
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
      {leaveGuard.note}

      <div className={st.studioWorkspace} data-roteiro={showRoteiro ? "true" : undefined}>
        {/* MAIN STUDIO CANVAS */}
        <section className={st.canvasBoard} aria-label="Mesa de criação do Estúdio">
          <div className={st.canvasTopBar}>
            <input
              className={st.titleInput}
              value={post.title}
              onChange={e => {
                const val = e.target.value;
                setPost(p => (p ? { ...p, title: val } : p));
                setDirty(true);
              }}
              aria-label="Título do post"
            />

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <div className={styles.tabs} role="tablist" aria-label="Formato">
                {(["carousel", "story"] as const).map(a => (
                  <button
                    key={a}
                    type="button"
                    role="tab"
                    className={styles.tab}
                    aria-selected={aspect === a}
                    onClick={() => handleAspectChange(a)}
                  >
                    {ASPECT_DIMENSIONS[a].label}
                  </button>
                ))}
              </div>

              <select
                className={styles.select}
                style={{ width: "auto" }}
                value={canvas.paletteId}
                onChange={e => handlePaletteChange(e.target.value)}
                aria-label="Paleta editorial"
              >
                {CANVAS_PALETTES.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>

              <button type="button" className={`${styles.button} ${styles.small}`} onClick={handleRemixAll}>
                Remixar tudo
              </button>

              {undoCanvas ? (
                <button
                  type="button"
                  className={`${styles.button} ${styles.ghost} ${styles.small}`}
                  onClick={() => {
                    commitCanvas(undoCanvas);
                    setUndoCanvas(null);
                  }}
                >
                  Desfazer
                </button>
              ) : null}

              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--soft)", cursor: "pointer" }}>
                Roteiro (BlockNote)
                <input
                  type="checkbox"
                  className={styles.switch}
                  checked={showRoteiro}
                  onChange={e => {
                    const open = e.target.checked;
                    if (open) {
                      setPost(prev =>
                        prev
                          ? {
                              ...prev,
                              studioDoc: {
                                ...(prev.studioDoc ?? STARTER_STUDIO_DOC),
                                canvas,
                                blocks: blocksFromCanvas(canvas),
                              },
                            }
                          : prev,
                      );
                      setRoteiroRevision(r => r + 1);
                    }
                    setShowRoteiro(open);
                  }}
                />
              </label>
            </div>
          </div>

          {/* FLOATING CONTEXTUAL TOOLBAR FOR SELECTED SLIDE */}
          <div className={st.floatingBarWrap}>
            <div className={st.floatingBar} role="toolbar" aria-label="Ferramentas do slide selecionado">
              <button
                type="button"
                className={st.toolBtn}
                onClick={() => layoutStripRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })}
              >
                ⊞ Layout
              </button>
              <button
                type="button"
                className={st.toolBtn}
                aria-expanded={toolPanel === "palette"}
                onClick={() => setToolPanel(p => (p === "palette" ? null : "palette"))}
              >
                🎨 Paleta & Fundo
              </button>
              <button
                type="button"
                className={st.toolBtn}
                aria-expanded={toolPanel === "elements"}
                onClick={() => setToolPanel(p => (p === "elements" ? null : "elements"))}
              >
                <PlusIcon />Elemento
              </button>
              <button type="button" className={st.toolBtn} onClick={handleHighlight} title="Selecione uma palavra no texto ou clique para grifar em mostarda">
                🖍 Grifar
              </button>
              <button
                type="button"
                className={st.toolBtn}
                aria-expanded={toolPanel === "ai"}
                onClick={() => setToolPanel(p => (p === "ai" ? null : "ai"))}
              >
                <SparkIcon />IA
              </button>
              <button type="button" className={st.toolBtn} onClick={() => handleRemixSlide(safeIdx)}>
                ⟳ Remixar
              </button>
            </div>
          </div>

          {/* EXPANDED SUB-TOOLBARS */}
          {toolPanel === "palette" ? (
            <div className={st.popoverRow}>
              {BG_TOKENS.map(bg => (
                <button
                  key={bg.id}
                  type="button"
                  className={st.chipBtn}
                  aria-pressed={activeSlide.background === bg.id}
                  onClick={() => updateSlideAt(safeIdx, s => ({ ...s, background: bg.id }))}
                >
                  {bg.label}
                </button>
              ))}
              <span style={{ color: "var(--line)" }}>|</span>
              {TEXTURES.map(tex => (
                <button
                  key={tex.id}
                  type="button"
                  className={st.chipBtn}
                  aria-pressed={activeSlide.texture === tex.id}
                  onClick={() => updateSlideAt(safeIdx, s => ({ ...s, texture: tex.id }))}
                >
                  {tex.label}
                </button>
              ))}
            </div>
          ) : null}

          {toolPanel === "elements" ? (
            <div className={st.popoverRow}>
              {ELEMENT_PRESETS.map(el => (
                <button
                  key={el.id}
                  type="button"
                  className={st.chipBtn}
                  onClick={() => void handleAddElement(el.id)}
                >
                  + {el.label}
                </button>
              ))}
              <button
                type="button"
                className={st.chipBtn}
                onClick={() => setMuapiTarget({ mode: "new" })}
              >
                <SparkIcon />Arte IA (MuAPI)
              </button>
            </div>
          ) : null}

          {toolPanel === "ai" ? (
            <div className={st.popoverRow}>
              {AI_CHIPS.map(chip => (
                <button
                  key={chip.label}
                  type="button"
                  className={st.chipBtn}
                  onClick={() => void handleSlideAi(chip.prompt)}
                >
                  ✦ {chip.label}
                </button>
              ))}
              <button type="button" className={st.chipBtn} onClick={toggleVoiceForSlide}>
                {recording ? `⏹ Parar (${recSeconds}s)` : "🎙 Pedir por voz"}
              </button>
              <form
                style={{ display: "inline-flex", gap: 6 }}
                onSubmit={e => {
                  e.preventDefault();
                  void handleSlideAi(customAiPrompt);
                }}
              >
                <input
                  className={styles.input}
                  style={{ height: 29, width: 220, fontSize: 12 }}
                  value={customAiPrompt}
                  onChange={e => setCustomAiPrompt(e.target.value)}
                  placeholder="Pedir ajuste neste slide…"
                />
                <button type="submit" className={`${styles.button} ${styles.small}`} disabled={!customAiPrompt.trim()}>
                  Aplicar
                </button>
              </form>
            </div>
          ) : null}

          {/* SELECTED ELEMENT INSPECTOR BAR */}
          {selectedElement ? (
            <div className={st.popoverRow} style={{ borderBottom: "1px solid var(--line)" }}>
              {selectedElement.type === "text" ? (
                <>
                  {(["serif", "sans", "display", "hand"] as CanvasFont[]).map(f => (
                    <button
                      key={f}
                      type="button"
                      className={st.chipBtn}
                      aria-pressed={selectedElement.font === f}
                      onClick={() =>
                        updateSlideAt(safeIdx, s => ({
                          ...s,
                          elements: s.elements.map(el => (el.id === selectedElement.id && el.type === "text" ? { ...el, font: f } : el)),
                        }))
                      }
                    >
                      {f === "serif" ? "Serif" : f === "sans" ? "Sans" : f === "display" ? "Impacto" : "Mão"}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={st.chipBtn}
                    onClick={() =>
                      updateSlideAt(safeIdx, s => ({
                        ...s,
                        elements: s.elements.map(el =>
                          el.id === selectedElement.id && el.type === "text" ? { ...el, size: Math.max(20, el.size - 6) } : el,
                        ),
                      }))
                    }
                  >
                    A−
                  </button>
                  <button
                    type="button"
                    className={st.chipBtn}
                    onClick={() =>
                      updateSlideAt(safeIdx, s => ({
                        ...s,
                        elements: s.elements.map(el =>
                          el.id === selectedElement.id && el.type === "text" ? { ...el, size: Math.min(240, el.size + 6) } : el,
                        ),
                      }))
                    }
                  >
                    A+
                  </button>
                  {(["plain", "pill", "tarja", "note", "card"] as TextVariant[]).map(v => (
                    <button
                      key={v}
                      type="button"
                      className={st.chipBtn}
                      aria-pressed={selectedElement.variant === v}
                      onClick={() =>
                        updateSlideAt(safeIdx, s => ({
                          ...s,
                          elements: s.elements.map(el =>
                            el.id === selectedElement.id && el.type === "text"
                              ? {
                                  ...el,
                                  variant: v,
                                  fill: v === "note" ? "note" : v === "plain" ? undefined : el.fill ?? "accent",
                                  color: v === "note" ? "black" : "contrast",
                                }
                              : el,
                          ),
                        }))
                      }
                    >
                      {v === "plain" ? "Solto" : v === "pill" ? "Pílula" : v === "tarja" ? "Tarja" : v === "note" ? "Post-it" : "Cartão"}
                    </button>
                  ))}
                  {COLOR_TOKENS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={st.chipBtn}
                      aria-pressed={selectedElement.color === c.id}
                      onClick={() =>
                        updateSlideAt(safeIdx, s => ({
                          ...s,
                          elements: s.elements.map(el => (el.id === selectedElement.id && el.type === "text" ? { ...el, color: c.id } : el)),
                        }))
                      }
                    >
                      {c.label}
                    </button>
                  ))}
                </>
              ) : null}

              {selectedElement.type === "image" ? (
                <>
                  <button
                    type="button"
                    className={st.chipBtn}
                    onClick={() => void handlePickElementImage(selectedElement.id, selectedElement.src)}
                  >
                    <ImageIcon />Escolher da Mídia
                  </button>
                  <button
                    type="button"
                    className={st.chipBtn}
                    onClick={() => setMuapiTarget({ mode: "element", elementId: selectedElement.id })}
                  >
                    <SparkIcon />Gerar com IA
                  </button>
                </>
              ) : null}

              {selectedElement.rotation !== 0 ? (
                <button
                  type="button"
                  className={st.chipBtn}
                  onClick={() =>
                    updateSlideAt(safeIdx, s => ({
                      ...s,
                      elements: s.elements.map(el => (el.id === selectedElement.id ? { ...el, rotation: 0 } : el)),
                    }))
                  }
                >
                  Endireitar (0°)
                </button>
              ) : null}

              <button
                type="button"
                className={st.chipBtn}
                onClick={() => {
                  updateSlideAt(safeIdx, s => ({
                    ...s,
                    elements: s.elements.filter(el => el.id !== selectedElement.id),
                  }));
                  setSelectedElementId(null);
                }}
              >
                <TrashIcon />Remover elemento
              </button>
            </div>
          ) : null}

          {/* FILMSTRIP OF ARTBOARDS */}
          <div className={st.filmstrip}>
            {slides.map((slide, idx) => {
              const isActive = idx === safeIdx;
              const layoutInfo = layoutById(slide.layoutId);
              return (
                <div key={slide.id} className={st.artboardCol} style={{ width: artboardWidth }}>
                  <div className={st.artboardHead}>
                    <span>
                      <strong>Slide {idx + 1}</strong> · {layoutInfo.label}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {idx > 0 ? (
                        <button
                          type="button"
                          className={`${styles.button} ${styles.ghost} ${styles.small}`}
                          style={{ padding: "0 6px", height: 22 }}
                          title="Mover para trás"
                          onClick={() => {
                            commitCanvas({ ...canvas, slides: move(slides, idx, idx - 1) });
                            setSelectedSlideIdx(idx - 1);
                          }}
                        >
                          ←
                        </button>
                      ) : null}
                      {idx < slides.length - 1 ? (
                        <button
                          type="button"
                          className={`${styles.button} ${styles.ghost} ${styles.small}`}
                          style={{ padding: "0 6px", height: 22 }}
                          title="Mover para frente"
                          onClick={() => {
                            commitCanvas({ ...canvas, slides: move(slides, idx, idx + 1) });
                            setSelectedSlideIdx(idx + 1);
                          }}
                        >
                          →
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`${styles.button} ${styles.ghost} ${styles.small}`}
                        style={{ padding: "0 6px", height: 22 }}
                        title="Duplicar slide"
                        onClick={() => {
                          const copy = cloneSlide(slide);
                          const next = [...slides.slice(0, idx + 1), copy, ...slides.slice(idx + 1)];
                          commitCanvas({ ...canvas, slides: next });
                          setSelectedSlideIdx(idx + 1);
                        }}
                      >
                        ⧉
                      </button>
                      {slides.length > 1 ? (
                        <button
                          type="button"
                          className={`${styles.button} ${styles.ghost} ${styles.small}`}
                          style={{ padding: "0 6px", height: 22 }}
                          title="Excluir slide"
                          onClick={() => {
                            const next = slides.filter((_, i) => i !== idx);
                            commitCanvas({ ...canvas, slides: next });
                            setSelectedSlideIdx(Math.max(0, idx - 1));
                          }}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={st.artboardFrame}
                    data-selected={isActive || undefined}
                    style={{ width: artboardWidth, height: Math.round(H * scale) }}
                    onPointerDown={() => {
                      if (!isActive) {
                        setSelectedSlideIdx(idx);
                        setSelectedElementId(null);
                        setEditingElementId(null);
                      }
                    }}
                  >
                    <div
                      style={{
                        width: W,
                        height: H,
                        transformOrigin: "top left",
                        transform: `scale(${scale})`,
                      }}
                    >
                      <CanvasSlideView
                        slide={slide}
                        index={idx}
                        total={slides.length}
                        handle={theme.handle}
                        palette={palette}
                        aspect={aspect}
                        scale={scale}
                        interactive={isActive}
                        selectedElementId={isActive ? selectedElementId : null}
                        editingElementId={isActive ? editingElementId : null}
                        showSafeGuides={isActive && Boolean(selectedElementId)}
                        onSelectElement={elId => {
                          setSelectedSlideIdx(idx);
                          setSelectedElementId(elId);
                          if (elId !== editingElementId) setEditingElementId(null);
                        }}
                        onStartEditing={elId => {
                          setSelectedSlideIdx(idx);
                          setSelectedElementId(elId);
                          setEditingElementId(elId);
                        }}
                        onStopEditing={() => setEditingElementId(null)}
                        onSelectionRange={setSelectionRange}
                        onPickImage={(elId, src) => void handlePickElementImage(elId, src)}
                        onChangeElement={(elId, patch) => {
                          updateSlideAt(idx, s => ({
                            ...s,
                            elements: s.elements.map(el => (el.id === elId ? ({ ...el, ...patch } as CanvasElement) : el)),
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              className={styles.button}
              style={{ flexShrink: 0, height: 120, padding: "0 18px", borderStyle: "dashed" }}
              onClick={() => {
                const added = blankSlide(aspect, remixLayoutId(activeSlide));
                commitCanvas({ ...canvas, slides: [...slides, added] });
                setSelectedSlideIdx(slides.length);
              }}
            >
              <PlusIcon />Novo slide
            </button>
          </div>

          {/* BOTTOM LIVE LAYOUT COMPOSITIONS STRIP */}
          <div ref={layoutStripRef} className={st.layoutStrip}>
            <div className={st.layoutStripHead}>
              <span>
                <strong>Trocar layout do Slide {safeIdx + 1}</strong> — clique para mudar a composição mantendo o texto e os elementos soltos
              </span>
              <span style={{ fontSize: 11.5 }}>
                Dica: clique duas vezes em qualquer texto na arte para editar, ou arraste dentro da margem de respiro
              </span>
            </div>
            <div className={st.layoutThumbs}>
              {previewAlternatives.map(({ layout, slide: previewSlide }) => (
                <button
                  key={layout.id}
                  type="button"
                  className={st.layoutThumbBtn}
                  aria-pressed={activeSlide.layoutId === layout.id}
                  title={layout.hint}
                  onClick={() => updateSlideAt(safeIdx, s => applyLayout(s, layout.id, aspect))}
                >
                  <div style={{ width: thumbWidth, height: Math.round(H * thumbScale), overflow: "hidden", pointerEvents: "none" }}>
                    <div style={{ width: W, height: H, transformOrigin: "top left", transform: `scale(${thumbScale})` }}>
                      <CanvasSlideView
                        slide={previewSlide}
                        index={safeIdx}
                        total={slides.length}
                        handle={theme.handle}
                        palette={palette}
                        aspect={aspect}
                      />
                    </div>
                  </div>
                  <span className={st.layoutThumbLabel}>{layout.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT DRAWER: ROTEIRO (BLOCKNOTE) + LEGENDA */}
        {showRoteiro ? (
          <aside className={st.roteiroDrawer} aria-label="Roteiro e legenda">
            <div className={st.canvasTopBar}>
              <div className={styles.tabs} role="tablist">
                <button
                  type="button"
                  role="tab"
                  className={styles.tab}
                  aria-selected={sideTab === "roteiro"}
                  onClick={() => setSideTab("roteiro")}
                >
                  Roteiro (BlockNote)
                </button>
                <button
                  type="button"
                  role="tab"
                  className={styles.tab}
                  aria-selected={sideTab === "legenda"}
                  onClick={() => setSideTab("legenda")}
                >
                  Legenda & Dados
                </button>
              </div>
              {sideTab === "roteiro" ? (
                <button
                  type="button"
                  className={`${styles.button} ${styles.primary} ${styles.small}`}
                  onClick={applyRoteiroToCanvas}
                >
                  Montar slides ✦
                </button>
              ) : null}
            </div>

            <div className={st.roteiroBody}>
              {sideTab === "roteiro" ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <p className={styles.hint} style={{ margin: 0, fontSize: 12 }}>
                    Escreva livremente, cole imagens ou digite <code>/</code> para inserir blocos, imagens da Mídia, comparativos e gráficos. Clique em <strong>Montar slides</strong> para aplicar no canvas.
                  </p>
                  <SocialDocEditor
                    key={`${post.id}-${roteiroRevision}`}
                    slug={post.id}
                    brandColor={palette.accent}
                    initialBlocks={studioDoc.blocks}
                    onChange={blocks => {
                      setPendingBlocks(blocks);
                      setDirty(true);
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: "grid", gap: 16 }}>
                  <label className={styles.field}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className={styles.label}>Legenda pronta para o Instagram</span>
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
                      rows={11}
                      value={post.caption}
                      onChange={e => {
                        const val = e.target.value;
                        setPost(p => (p ? { ...p, caption: val } : p));
                        setDirty(true);
                      }}
                    />
                  </label>

                  <div>
                    <button type="button" className={`${styles.button} ${styles.ghost} ${styles.danger}`} onClick={removeDoc}>
                      <TrashIcon />Excluir este post
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        ) : null}
      </div>

      {/* Offscreen native-res stage for crisp 1080×1350 / 1080×1920 PNG export */}
      <div style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden>
        {slides.map((sl, i) => (
          <div
            key={`${sl.id}-exp-${i}`}
            ref={el => {
              exportRefs.current[i] = el;
            }}
          >
            <CanvasSlideView
              slide={sl}
              index={i}
              total={slides.length}
              handle={theme.handle}
              palette={palette}
              aspect={aspect}
            />
          </div>
        ))}
      </div>

      <MuapiGeneratorDialog
        open={muapiTarget !== null}
        kindFilter="image"
        inlineDataUrl
        defaultPrompt={`Fotografia ou colagem editorial minimalista sobre escrita, literatura e estudos, paleta ${palette.background} e ${palette.accent}, sem palavras escritas`}
        onClose={() => setMuapiTarget(null)}
        onResult={url => {
          if (muapiTarget?.mode === "element") {
            updateSlideAt(safeIdx, s => ({
              ...s,
              elements: s.elements.map(el => (el.id === muapiTarget.elementId && el.type === "image" ? { ...el, src: url } : el)),
            }));
          } else {
            const imgPreset = ELEMENT_PRESETS.find(p => p.id === "imagem")!;
            const made = imgPreset.make(aspect);
            if (made.type === "image") made.src = url;
            updateSlideAt(safeIdx, s => ({ ...s, elements: [...s.elements, made] }));
            setSelectedElementId(made.id);
          }
          setMuapiTarget(null);
          show("Arte adicionada ao slide!", "good");
        }}
      />

      {leaveGuard.dialog}
      <BusyOverlay label={busyLabel} />
      <Toast toast={toast} onClose={clear} />
    </AdminShell>
  );
}

export default function AdminStudioEditor({ id }: { id: string }) {
  const router = useRouter();
  const [post, setPost] = useState<SocialPost | null>(null);
  const [savedRevision, setSavedRevision] = useState("");
  const [theme, setTheme] = useState<SocialTheme>(DEFAULT_SOCIAL_THEME);

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
        const baseDoc = found.studioDoc ?? STARTER_STUDIO_DOC;
        const normalized: SocialPost = {
          ...found,
          format: "studio_doc",
          studioDoc: {
            ...baseDoc,
            canvas: ensureCanvas(baseDoc),
          },
        };
        setPost(normalized);
        setSavedRevision(normalized.updatedAt);
        if (data.theme) setTheme(data.theme as SocialTheme);
      })
      .catch(() => router.replace("/admin/estudio"));
  }, [id, router]);

  if (!post) {
    return (
      <AdminShell crumbs={[{ label: "Estúdio", href: "/admin/estudio" }, { label: "Carregando…" }]}>
        <div className={styles.sheet}>
          <Skeleton kind="text" label="Abrindo a mesa do Estúdio" />
        </div>
      </AdminShell>
    );
  }

  return (
    <CropProvider>
      <MediaProvider folder="estudio" slug={post.id} source="social">
        <StudioInner
          post={post}
          setPost={setPost}
          savedRevision={savedRevision}
          setSavedRevision={setSavedRevision}
          theme={theme}
        />
      </MediaProvider>
    </CropProvider>
  );
}

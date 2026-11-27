"use client";
/* eslint-disable @next/next/no-img-element -- media thumbnails come from blob, supabase, data URLs or local public. */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { domToPng } from "modern-screenshot";
import JSZip from "jszip";
import type { MediaFile } from "@/lib/admin/caseStore";
import {
  applyFamilyToCanvas,
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
  stripMarks,
  STYLE_FAMILIES,
  syncContent,
  textEl,
  type CanvasColor,
  type CanvasElement,
  type CanvasFont,
  type CanvasSlide,
  type CanvasTextEl,
  type CanvasTexture,
  type StudioCanvas,
  type StyleFamily,
  type TextVariant,
} from "@/lib/social/canvas";
import { compileDocToSlides, compileSlidesToReel } from "@/lib/social/compileDoc";
import { DEFAULT_SOCIAL_THEME } from "@/lib/social/presets";
import {
  STARTER_STUDIO_DOC,
  type StudioAspect,
  type StudioBlockJson,
  type StudioDocumentData,
} from "@/lib/social/studioTypes";
import type { SocialPost, SocialStatus, SocialTheme } from "@/lib/social/types";
import CanvasSlideView, { type TextSelectionRange } from "@/components/social/CanvasSlideView";
import AdminShell from "../AdminShell";
import BusyOverlay from "../BusyOverlay";
import { api, Toast, useToast } from "../client";
import { CropProvider } from "../CropDialog";
import { move } from "../Fields";
import { CopyIcon, PlusIcon, SparkIcon, TrashIcon, UploadIcon } from "../icons";
import { MediaProvider, useMediaPicker } from "../MediaPicker";
import MuapiGeneratorDialog from "../MuapiGeneratorDialog";
import Skeleton from "../Skeleton";
import { useLeaveGuard } from "../useLeaveGuard";
import styles from "../admin.module.css";
import st from "./studioEditor.module.css";

const SocialDocEditor = dynamic(() => import("./SocialDocEditor"), {
  ssr: false,
  loading: () => <Skeleton kind="text" label="Abrindo texto completo" />,
});

type DockTool = "modelos" | "texto" | "elementos" | "fotos" | "cores" | "roteiro" | "ia";
type RoteiroSubTab = "paginas" | "completo" | "legenda";

const STICKER_EMOJIS = ["✍️", "💡", "📌", "🎯", "📚", "❤️", "⭐", "🤔"];

const AI_ACTIONS = [
  {
    title: "Deixar mais curto",
    desc: "Enxuga as frases para caber melhor e ler rápido",
    prompt: "Deixe o texto mais curto, direto e escaneável, sem perder a precisão pedagógica.",
  },
  {
    title: "Mais jeito da Prô",
    desc: "Traz tom acolhedor e bem-humorado de sala de aula",
    prompt: "Reescreva com mais oralidade calorosa de sala de aula da Prô Renata (parênteses cúmplices, acolhimento e rigor).",
  },
  {
    title: "Criar exemplo de redação",
    desc: "Mostra como aparece de verdade na folha do vestibular",
    prompt: "Traga um exemplo concreto de frase de redação dissertativa de vestibulando (evitando qualquer exemplo corporativo).",
  },
  {
    title: "Destacar palavra importante",
    desc: "Marca o termo principal em amarelo-mostarda",
    prompt: "Mantenha o texto quase idêntico, mas envolva 1 ou 2 expressões mais fortes com ==duplo igual== para grifar em mostarda.",
  },
];

const TEXTURES: Array<{ id: CanvasTexture; label: string }> = [
  { id: "paper", label: "Papel suave" },
  { id: "lines", label: "Folha de caderno" },
  { id: "grid", label: "Quadriculado" },
  { id: "dots", label: "Pontilhado" },
  { id: "none", label: "Liso" },
];

const BG_SWATCHES: Array<{ id: CanvasColor; label: string }> = [
  { id: "background", label: "Fundo claro" },
  { id: "surface", label: "Branco" },
  { id: "accent", label: "Cor forte" },
  { id: "primary", label: "Escuro" },
  { id: "accentSoft", label: "Suave" },
];

const TEXT_COLORS: Array<{ id: CanvasColor; label: string }> = [
  { id: "contrast", label: "Automático" },
  { id: "primary", label: "Principal" },
  { id: "accent", label: "Destaque" },
  { id: "note", label: "Mostarda" },
  { id: "white", label: "Branco" },
  { id: "black", label: "Preto" },
];

/* ---------- Ícones simples e amigáveis da barra esquerda ---------- */
const DockIcon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

const DOCK_ITEMS: Array<{ id: DockTool; label: string; title: string; icon: ReactNode }> = [
  {
    id: "modelos",
    label: "Modelos",
    title: "Modelos da página",
    icon: (
      <DockIcon>
        <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" />
        <rect x="13" y="3.5" width="7.5" height="7.5" rx="2" />
        <rect x="3.5" y="13" width="7.5" height="7.5" rx="2" />
        <rect x="13" y="13" width="7.5" height="7.5" rx="2" />
      </DockIcon>
    ),
  },
  {
    id: "texto",
    label: "Texto",
    title: "Adicionar e ajustar texto",
    icon: (
      <DockIcon>
        <path d="M5 6h14M12 6v13M9 19h6" />
      </DockIcon>
    ),
  },
  {
    id: "elementos",
    label: "Elementos",
    title: "Elementos visuais",
    icon: (
      <DockIcon>
        <circle cx="8" cy="8.5" r="4" />
        <rect x="13" y="13" width="7.5" height="7.5" rx="2" />
        <path d="m16.5 4.5 3.5 6h-7z" />
      </DockIcon>
    ),
  },
  {
    id: "fotos",
    label: "Fotos",
    title: "Suas fotos e ilustrações",
    icon: (
      <DockIcon>
        <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
        <circle cx="8.5" cy="10" r="1.6" />
        <path d="m20.5 16-5-5-8 8" />
      </DockIcon>
    ),
  },
  {
    id: "cores",
    label: "Cores",
    title: "Cores e fundo",
    icon: (
      <DockIcon>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="9" cy="10" r="1.3" fill="currentColor" />
        <circle cx="13" cy="8.5" r="1.3" fill="currentColor" />
        <circle cx="15.5" cy="12" r="1.3" fill="currentColor" />
      </DockIcon>
    ),
  },
  {
    id: "roteiro",
    label: "Roteiro",
    title: "Roteiro e legenda",
    icon: (
      <DockIcon>
        <rect x="4" y="4" width="16" height="16" rx="2.5" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </DockIcon>
    ),
  },
  {
    id: "ia",
    label: "Ajuda IA",
    title: "Pedir ajuda para a IA",
    icon: (
      <DockIcon>
        <path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
        <path d="M18 16v4M16 18h4" />
      </DockIcon>
    ),
  },
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

function slideSummary(slide: CanvasSlide): { heading: string; detail: string } {
  const c = syncContent(slide).content;
  const heading = stripMarks(c.title || c.quote || c.eyebrow || "Página sem título");
  const detail = stripMarks(
    [c.subtitle, c.body, c.wrong ? `❌ ${c.wrong}` : "", c.right ? `✔️ ${c.right}` : "", c.items, c.cta]
      .filter(Boolean)
      .join(" · "),
  );
  return { heading, detail };
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

  const stageRef = useRef<HTMLDivElement>(null);
  const exportRefs = useRef<Array<HTMLDivElement | null>>([]);
  const downloadBoxRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState<SocialPost>(post);

  // Active tool & panels
  const [activeTool, setActiveTool] = useState<DockTool>("modelos");
  const [modelFamily, setModelFamily] = useState<StyleFamily | "all">("all");
  const [panelOpen, setPanelOpen] = useState(true);
  const [roteiroTab, setRoteiroTab] = useState<RoteiroSubTab>("paginas");
  const [roteiroRevision, setRoteiroRevision] = useState(0);
  const [pendingBlocks, setPendingBlocks] = useState<StudioBlockJson[] | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);

  // Canvas selection & zoom
  const [selectedSlideIdx, setSelectedSlideIdx] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [selectionRange, setSelectionRange] = useState<TextSelectionRange | null>(null);
  const [stageFitWidth, setStageFitWidth] = useState(400);
  const [zoom, setZoom] = useState(1);

  // Undo / Redo stacks
  const [past, setPast] = useState<StudioCanvas[]>([]);
  const [future, setFuture] = useState<StudioCanvas[]>([]);

  // Media library inside "Fotos" tab + AI state
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [muapiTarget, setMuapiTarget] = useState<{ mode: "element"; elementId: string } | { mode: "new" } | null>(null);
  const [customAiPrompt, setCustomAiPrompt] = useState("");
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);

  // On narrow screens, start with the side card closed so Renata sees the artboard first
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 900) {
      setPanelOpen(false);
    }
  }, []);

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

  // Fit the single centered slide cleanly inside `.stageArea`
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const availW = Math.max(220, el.clientWidth - 36);
      const availH = Math.max(240, el.clientHeight - 32);
      const byH = availH * (W / H);
      setStageFitWidth(Math.round(Math.min(availW, byH, 540)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W, H, panelOpen]);

  // Load saved photos when opening the "Fotos" tool
  const loadPhotos = useCallback(() => {
    if (activeTool !== "fotos") return;
    api<{ items?: MediaFile[] }>("/api/social/media")
      .then(d => setMediaFiles(d.items ?? []))
      .catch(() => {});
  }, [activeTool]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Close Download menu on outside click
  useEffect(() => {
    if (!downloadOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!downloadBoxRef.current?.contains(e.target as Node)) setDownloadOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [downloadOpen]);

  useEffect(() => {
    if (!recording) return;
    const t = window.setInterval(() => setRecSeconds(s => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [recording]);

  const artWidth = Math.round(stageFitWidth * zoom);
  const scale = artWidth / W;

  const commitCanvas = useCallback(
    (nextCanvas: StudioCanvas, { recordHistory = true, syncBlocks = true } = {}) => {
      if (recordHistory) {
        setPast(prev => [...prev.slice(-24), canvas]);
        setFuture([]);
      }
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
    [canvas, setPost],
  );

  const updateSlideAt = useCallback(
    (idx: number, updater: (slide: CanvasSlide) => CanvasSlide, recordHistory = true) => {
      const nextSlides = slides.map((s, i) => (i === idx ? syncContent(updater(s)) : s));
      commitCanvas({ ...canvas, slides: nextSlides }, { recordHistory });
    },
    [canvas, commitCanvas, slides],
  );

  function handleUndo() {
    const prev = past.at(-1);
    if (!prev) return;
    setPast(p => p.slice(0, -1));
    setFuture(f => [canvas, ...f.slice(0, 24)]);
    commitCanvas(prev, { recordHistory: false });
  }

  function handleRedo() {
    const next = future[0];
    if (!next) return;
    setFuture(f => f.slice(1));
    setPast(p => [...p, canvas]);
    commitCanvas(next, { recordHistory: false });
  }

  // Delete selected element on Backspace/Delete when not typing
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

  const save = useCallback(
    async (override?: SocialPost, silent = false): Promise<boolean> => {
      const target = override ?? post;
      const currentCanvas = ensureCanvas(target.studioDoc ?? STARTER_STUDIO_DOC);
      const syncedCanvas: StudioCanvas = {
        ...currentCanvas,
        slides: currentCanvas.slides.map(syncContent),
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
        if (!silent) show("Alterações salvas!", "good");
        return true;
      } catch (err) {
        if (!silent) show(err);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [pendingBlocks, post, setPost, setSavedRevision, show],
  );

  // Quiet auto-save after 1.6s of inactivity so Renata never worries about clicking Save
  useEffect(() => {
    if (!dirty || saving || editingElementId) return;
    const timer = window.setTimeout(() => {
      void save(undefined, true);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [dirty, editingElementId, post, save, saving]);

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

  function selectTool(tool: DockTool) {
    if (activeTool === tool && panelOpen) {
      setPanelOpen(false);
      return;
    }
    if (tool === "roteiro") {
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
    setActiveTool(tool);
    setPanelOpen(true);
  }

  function handleAspectChange(nextAspect: StudioAspect) {
    if (nextAspect === aspect) return;
    setPast(p => [...p.slice(-24), canvas]);
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

  function handleHighlight() {
    const target =
      selectedElement?.type === "text"
        ? selectedElement
        : (activeSlide.elements.find(e => e.type === "text" && e.role !== "chrome" && e.role !== "decor") as CanvasTextEl | undefined);
    if (!target) {
      show("Clique em um texto na página para destacar uma palavra.");
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

  function addPresetElement(presetId: string) {
    const preset = ELEMENT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const made = preset.make(aspect);
    updateSlideAt(safeIdx, s => ({ ...s, elements: [...s.elements, made] }));
    setSelectedElementId(made.id);
    if (typeof window !== "undefined" && window.innerWidth <= 900) setPanelOpen(false);
  }

  function addEmojiSticker(emoji: string) {
    const { width, height } = CANVAS_SIZE[aspect];
    const made = {
      ...textEl("free", emoji, { x: width / 2 - 80, y: height / 2 - 80, w: 160, h: 160 }, { size: 112, align: "center", lineHeight: 1 }),
      rotation: -6,
    };
    updateSlideAt(safeIdx, s => ({ ...s, elements: [...s.elements, made] }));
    setSelectedElementId(made.id);
    if (typeof window !== "undefined" && window.innerWidth <= 900) setPanelOpen(false);
  }

  function insertImageOnSlide(url: string) {
    const existingImg = activeSlide.elements.find(e => e.type === "image");
    if (selectedElement?.type === "image") {
      updateSlideAt(safeIdx, s => ({
        ...s,
        elements: s.elements.map(el => (el.id === selectedElement.id && el.type === "image" ? { ...el, src: url } : el)),
      }));
    } else if (existingImg && !existingImg.src) {
      updateSlideAt(safeIdx, s => ({
        ...s,
        elements: s.elements.map(el => (el.id === existingImg.id && el.type === "image" ? { ...el, src: url } : el)),
      }));
    } else {
      const imgPreset = ELEMENT_PRESETS.find(p => p.id === "imagem")!;
      const made = imgPreset.make(aspect);
      if (made.type === "image") made.src = url;
      updateSlideAt(safeIdx, s => ({ ...s, elements: [...s.elements, made] }));
      setSelectedElementId(made.id);
    }
    if (typeof window !== "undefined" && window.innerWidth <= 900) setPanelOpen(false);
  }

  async function handleDirectPhotoUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploadingPhoto(true);
    try {
      let lastUrl = "";
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("slug", post.id);
        form.set("folder", "estudio");
        form.set("file", file);
        const saved = (await api<{ file: MediaFile }>("/api/social/media", { method: "POST", body: form })).file;
        lastUrl = saved.url;
      }
      loadPhotos();
      if (lastUrl) insertImageOnSlide(lastUrl);
      show("Foto adicionada na página!", "good");
    } catch (err) {
      show(err);
    } finally {
      setUploadingPhoto(false);
    }
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
    setBusyLabel("Reescrevendo esta página com o jeito da Prô…");
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
      if (!res.ok) throw new Error(data.error || "Erro ao ajustar página");
      const freeEls = activeSlide.elements.filter(e => e.role === "free");
      const rebuilt = buildSlide(data.content, activeSlide.layoutId, aspect, freeEls, activeSlide.id);
      const nextSlides = slides.map((s, i) => (i === safeIdx ? rebuilt : s));
      commitCanvas({ ...canvas, slides: nextSlides });
      setCustomAiPrompt("");
      show("Pronto! Se quiser voltar atrás, clique na seta Desfazer no topo.", "good");
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
        setBusyLabel("Ouvindo seu pedido…");
        try {
          const form = new FormData();
          form.append("audio", blob, "pedido.webm");
          const res = await fetch("/api/social/generate", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Erro ao ouvir áudio");
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
      show("Permita o uso do microfone no navegador.");
    }
  }

  function applyRoteiroToCanvas() {
    const blocks = pendingBlocks ?? studioDoc.blocks;
    const compiled = compileDocToSlides(blocks);
    if (!compiled.length) {
      show("Escreva algum conteúdo antes de atualizar as páginas.");
      return;
    }
    const rebuilt = canvasFromCompiled(compiled, aspect, canvas.paletteId);
    commitCanvas(rebuilt, { syncBlocks: false });
    setPendingBlocks(null);
    show(`${rebuilt.slides.length} páginas atualizadas!`, "good");
  }

  async function convertToReel() {
    setDownloadOpen(false);
    const compiled = compileDocToSlides(blocksFromCanvas(canvas));
    if (!compiled.length) return;
    setBusyLabel("Transformando seu post em vídeo (Reel)…");
    try {
      const reelDoc = compileSlidesToReel(compiled, {
        title: post.title,
        accent: palette.accent,
        handle: theme.handle,
      });
      const now = new Date().toISOString();
      const reelPost: SocialPost = {
        id: `reel_from_${post.id}`,
        title: `${post.title} (Vídeo)`,
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
      if (!res.ok) throw new Error("Erro ao criar vídeo");
      router.push("/admin/reels");
    } catch (err) {
      show(err);
      setBusyLabel("");
    }
  }

  async function exportSingle(idx = safeIdx) {
    setDownloadOpen(false);
    const node = exportRefs.current[idx];
    if (!node) return;
    setEditingElementId(null);
    setBusyLabel("Preparando sua imagem em alta qualidade…");
    try {
      const dataUrl = await domToPng(node, { width: W, height: H, scale: 1 });
      const blob = await (await fetch(dataUrl)).blob();
      downloadBlob(blob, `${slugify(post.title)}-pagina-${String(idx + 1).padStart(2, "0")}.png`);
      show(`Página ${idx + 1} baixada!`, "good");
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  async function exportZip() {
    setDownloadOpen(false);
    if (!slides.length) return;
    setEditingElementId(null);
    setBusyLabel(`Preparando suas ${slides.length} páginas para baixar…`);
    try {
      const zip = new JSZip();
      const slug = slugify(post.title);
      for (let i = 0; i < slides.length; i++) {
        const node = exportRefs.current[i];
        if (!node) continue;
        const dataUrl = await domToPng(node, { width: W, height: H, scale: 1 });
        zip.file(`${String(i + 1).padStart(2, "0")}-${slug}.png`, dataUrl.split(",")[1] ?? "", {
          base64: true,
        });
      }
      if (post.caption.trim()) zip.file("legenda-instagram.txt", post.caption);
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${slug}.zip`);
      await save({ ...post, status: "exported" as SocialStatus }, true);
      show("Todas as páginas e a legenda foram baixadas!", "good");
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  async function removeDoc() {
    setDownloadOpen(false);
    if (!confirm(`Apagar "${post.title}"?`)) return;
    await fetch(`/api/social/posts?id=${encodeURIComponent(post.id)}`, { method: "DELETE" });
    router.push("/admin/estudio");
  }

  const candidateLayouts = useMemo(
    () => layoutsFor(activeSlide.content.kind, modelFamily),
    [activeSlide.content.kind, modelFamily],
  );
  const previewAlternatives = useMemo(() => {
    const synced = syncContent(activeSlide);
    const freeEls = activeSlide.elements.filter(e => e.role === "free");
    return candidateLayouts.map(l => ({
      layout: l,
      slide: buildSlide(synced.content, l.id, aspect, freeEls, `preview_${l.id}`),
    }));
  }, [activeSlide, aspect, candidateLayouts]);

  const modelThumbW = 116;
  const modelThumbScale = modelThumbW / W;
  const stripThumbW = aspect === "story" ? 44 : 58;
  const stripThumbScale = stripThumbW / W;

  const toolTitle = DOCK_ITEMS.find(d => d.id === activeTool)?.title ?? "Ferramentas";

  return (
    <>
      <div className={st.veedShell}>
        {/* ==================== ZONA A: TOPO MINIMALISTA ==================== */}
        <header className={st.veedTop}>
          <div className={st.veedTopLeft}>
            <Link href="/admin/estudio" className={st.backBtn}>
              ← Meus posts
            </Link>
            <input
              className={st.projectTitle}
              value={post.title}
              onChange={e => {
                const val = e.target.value;
                setPost(p => (p ? { ...p, title: val } : p));
                setDirty(true);
              }}
              placeholder="Nome do seu post"
              aria-label="Nome do post"
            />
            <span className={st.savePill}>
              {saving ? "Salvando…" : dirty ? "Salvando já…" : "✓ Salvo"}
            </span>
          </div>

          <div className={st.veedTopRight}>
            <div className={st.aspectPill} role="group" aria-label="Formato do post">
              <button
                type="button"
                className={st.aspectBtn}
                aria-pressed={aspect === "carousel"}
                onClick={() => handleAspectChange("carousel")}
              >
                Post 4:5
              </button>
              <button
                type="button"
                className={st.aspectBtn}
                aria-pressed={aspect === "story"}
                onClick={() => handleAspectChange("story")}
              >
                Stories
              </button>
            </div>

            <button
              type="button"
              className={st.iconAction}
              title="Desfazer"
              aria-label="Desfazer"
              disabled={!past.length}
              onClick={handleUndo}
            >
              ↶
            </button>
            <button
              type="button"
              className={st.iconAction}
              title="Refazer"
              aria-label="Refazer"
              disabled={!future.length}
              onClick={handleRedo}
            >
              ↷
            </button>

            <div ref={downloadBoxRef} className={st.downloadWrap}>
              <button
                type="button"
                className={st.downloadBtn}
                aria-expanded={downloadOpen}
                onClick={() => setDownloadOpen(o => !o)}
              >
                Baixar
              </button>

              {downloadOpen ? (
                <div className={st.downloadMenu} role="menu">
                  <button type="button" className={st.downloadItem} onClick={exportZip}>
                    <strong>Baixar post completo ({slides.length} {slides.length === 1 ? "página" : "páginas"})</strong>
                    <span>Pacote .zip com todas as imagens + legenda</span>
                  </button>
                  <button type="button" className={st.downloadItem} onClick={() => void exportSingle(safeIdx)}>
                    <strong>Baixar só a página {safeIdx + 1}</strong>
                    <span>Imagem PNG pronta para publicar</span>
                  </button>
                  <button
                    type="button"
                    className={st.downloadItem}
                    onClick={() => {
                      setDownloadOpen(false);
                      void navigator.clipboard.writeText(post.caption || "");
                      show("Legenda copiada!", "good");
                    }}
                  >
                    <strong>Copiar legenda</strong>
                    <span>Copia o texto do Instagram para colar</span>
                  </button>
                  <button type="button" className={st.downloadItem} onClick={convertToReel}>
                    <strong>Transformar em vídeo (Reel)</strong>
                    <span>Cria cenas animadas a partir deste post</span>
                  </button>
                  <hr style={{ border: 0, borderTop: "1px solid #eceef6", margin: "4px 0" }} />
                  <button type="button" className={st.downloadItem} onClick={removeDoc}>
                    <strong style={{ color: "#d9383a" }}>Apagar este post</strong>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {leaveGuard.note}

        {/* ==================== CORPO CENTRAL (DOCK + CARTÃO + PALCO) ==================== */}
        <div className={st.veedBody} data-panel={panelOpen ? "open" : "closed"}>
          {/* ZONA B: COLUNA DE FERRAMENTAS */}
          <nav className={st.toolDock} aria-label="Ferramentas de criação">
            {DOCK_ITEMS.map(item => (
              <button
                key={item.id}
                type="button"
                className={st.dockTile}
                aria-selected={panelOpen && activeTool === item.id}
                onClick={() => selectTool(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* ZONA C: ÚNICO CARTÃO BRANCO FLUTUANTE */}
          {panelOpen ? (
            <aside className={st.sideCard} aria-label={toolTitle}>
              <div className={st.sideCardHead}>
                <h2 className={st.sideCardTitle}>{toolTitle}</h2>
                <button
                  type="button"
                  className={st.sideCardClose}
                  aria-label="Fechar painel lateral"
                  onClick={() => setPanelOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className={st.sideCardScroll}>
                {/* Se houver elemento selecionado, mostra controles simples e diretos no topo */}
                {selectedElement ? (
                  <div className={st.inspectorBox}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: 12.5 }}>
                        {selectedElement.type === "text"
                          ? "Texto selecionado"
                          : selectedElement.type === "image"
                            ? "Foto selecionada"
                            : "Elemento selecionado"}
                      </strong>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.ghost} ${styles.small}`}
                        style={{ color: "#d9383a" }}
                        onClick={() => {
                          updateSlideAt(safeIdx, s => ({
                            ...s,
                            elements: s.elements.filter(el => el.id !== selectedElement.id),
                          }));
                          setSelectedElementId(null);
                        }}
                      >
                        <TrashIcon />Apagar
                      </button>
                    </div>

                    {selectedElement.type === "text" ? (
                      <>
                        <div className={st.pillGrid}>
                          <button type="button" className={st.softChip} onClick={handleHighlight}>
                            🖍 Grifar palavra
                          </button>
                          <button
                            type="button"
                            className={st.softChip}
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
                            className={st.softChip}
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
                        </div>

                        <div>
                          <span className={st.sectionLabel}>Tipo de letra</span>
                          <div className={st.pillGrid}>
                            {(
                              [
                                { id: "serif", label: "Livro" },
                                { id: "sans", label: "Limpa" },
                                { id: "display", label: "Forte" },
                                { id: "hand", label: "Manuscrita" },
                              ] as Array<{ id: CanvasFont; label: string }>
                            ).map(f => (
                              <button
                                key={f.id}
                                type="button"
                                className={st.softChip}
                                aria-pressed={selectedElement.font === f.id}
                                onClick={() =>
                                  updateSlideAt(safeIdx, s => ({
                                    ...s,
                                    elements: s.elements.map(el =>
                                      el.id === selectedElement.id && el.type === "text" ? { ...el, font: f.id } : el,
                                    ),
                                  }))
                                }
                              >
                                {f.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className={st.sectionLabel}>Formato da caixa</span>
                          <div className={st.pillGrid}>
                            {(
                              [
                                { id: "plain", label: "Livre" },
                                { id: "pill", label: "Pílula" },
                                { id: "tarja", label: "Tarja" },
                                { id: "note", label: "Post-it" },
                                { id: "card", label: "Cartão" },
                              ] as Array<{ id: TextVariant; label: string }>
                            ).map(v => (
                              <button
                                key={v.id}
                                type="button"
                                className={st.softChip}
                                aria-pressed={selectedElement.variant === v.id}
                                onClick={() =>
                                  updateSlideAt(safeIdx, s => ({
                                    ...s,
                                    elements: s.elements.map(el =>
                                      el.id === selectedElement.id && el.type === "text"
                                        ? {
                                            ...el,
                                            variant: v.id,
                                            fill: v.id === "note" ? "note" : v.id === "plain" ? undefined : el.fill ?? "accent",
                                            color: v.id === "note" ? "black" : "contrast",
                                          }
                                        : el,
                                    ),
                                  }))
                                }
                              >
                                {v.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className={st.sectionLabel}>Cor do texto</span>
                          <div className={st.pillGrid}>
                            {TEXT_COLORS.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                className={st.softChip}
                                aria-pressed={selectedElement.color === c.id}
                                onClick={() =>
                                  updateSlideAt(safeIdx, s => ({
                                    ...s,
                                    elements: s.elements.map(el =>
                                      el.id === selectedElement.id && el.type === "text" ? { ...el, color: c.id } : el,
                                    ),
                                  }))
                                }
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : null}

                    {selectedElement.type === "image" ? (
                      <div className={st.pillGrid}>
                        <button
                          type="button"
                          className={st.softChip}
                          onClick={() => void handlePickElementImage(selectedElement.id, selectedElement.src)}
                        >
                          Trocar foto
                        </button>
                        <button
                          type="button"
                          className={st.softChip}
                          onClick={() => setMuapiTarget({ mode: "element", elementId: selectedElement.id })}
                        >
                          <SparkIcon />Criar com IA
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* 1. ABA MODELOS */}
                {activeTool === "modelos" ? (
                  <>
                    <div>
                      <span className={st.sectionLabel}>Estilo visual</span>
                      <div className={st.pillGrid} role="tablist" aria-label="Filtrar por estilo gráfico">
                        <button
                          type="button"
                          className={st.softChip}
                          aria-pressed={modelFamily === "all"}
                          onClick={() => setModelFamily("all")}
                        >
                          Todos
                        </button>
                        {STYLE_FAMILIES.map(fam => (
                          <button
                            key={fam.id}
                            type="button"
                            className={st.softChip}
                            aria-pressed={modelFamily === fam.id}
                            onClick={() => setModelFamily(fam.id)}
                          >
                            {fam.shortLabel}
                          </button>
                        ))}
                      </div>
                      {modelFamily !== "all" ? (
                        <p className={styles.hint} style={{ margin: "8px 0 0" }}>
                          {STYLE_FAMILIES.find(f => f.id === modelFamily)?.description}
                        </p>
                      ) : null}
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      {modelFamily !== "all" && slides.length > 1 ? (
                        <button
                          type="button"
                          className={`${styles.button} ${styles.primary} ${st.wrapBtn}`}
                          onClick={() => {
                            commitCanvas(applyFamilyToCanvas(canvas, modelFamily, aspect));
                            show(
                              `Estilo ${STYLE_FAMILIES.find(f => f.id === modelFamily)?.shortLabel} aplicado nas ${slides.length} páginas!`,
                              "good",
                            );
                          }}
                        >
                          ✦ Usar este estilo no post inteiro
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className={`${styles.button} ${st.wrapBtn}`}
                        onClick={() =>
                          updateSlideAt(safeIdx, s => applyLayout(s, remixLayoutId(s, Math.random, [], modelFamily), aspect))
                        }
                      >
                        ⟳ Surpreender nesta página
                      </button>
                    </div>

                    <div>
                      <span className={st.sectionLabel}>
                        Página {safeIdx + 1} · atual: {layoutById(activeSlide.layoutId).label}
                      </span>
                      <div className={st.layoutGrid}>
                        {previewAlternatives.map(({ layout, slide: previewSlide }) => (
                          <button
                            key={layout.id}
                            type="button"
                            className={st.layoutCard}
                            aria-pressed={activeSlide.layoutId === layout.id}
                            onClick={() => updateSlideAt(safeIdx, s => applyLayout(s, layout.id, aspect))}
                          >
                            <div
                              style={{
                                width: modelThumbW,
                                height: Math.round(H * modelThumbScale),
                                borderRadius: 8,
                                overflow: "hidden",
                                pointerEvents: "none",
                              }}
                            >
                              <div style={{ width: W, height: H, transformOrigin: "top left", transform: `scale(${modelThumbScale})` }}>
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
                            <span className={st.layoutCardName}>{layout.label}</span>
                            {modelFamily === "all" ? (
                              <span style={{ fontSize: 10.5, color: "#787d99", marginTop: -3 }}>
                                {STYLE_FAMILIES.find(f => f.id === layout.family)?.shortLabel}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}

                {/* 2. ABA TEXTO */}
                {activeTool === "texto" ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <span className={st.sectionLabel}>Clique para colocar na página</span>
                    <button type="button" className={st.actionCard} onClick={() => addPresetElement("titulo")}>
                      <div>
                        <strong style={{ fontSize: 17, fontFamily: "var(--font-studio-serif), Georgia, serif" }}>Adicionar título grande</strong>
                        <span>Ótimo para aberturas e chamadas</span>
                      </div>
                      <span>+</span>
                    </button>
                    <button type="button" className={st.actionCard} onClick={() => addPresetElement("texto")}>
                      <div>
                        <strong>Adicionar parágrafo curto</strong>
                        <span>Explicação ou complemento</span>
                      </div>
                      <span>+</span>
                    </button>
                    <button type="button" className={st.actionCard} onClick={() => addPresetElement("mao")}>
                      <div>
                        <strong style={{ fontFamily: "var(--font-studio-hand), cursive", fontSize: 20 }}>Recado escrito à mão</strong>
                        <span>Observação carinhosa da Prô</span>
                      </div>
                      <span>+</span>
                    </button>
                    <button type="button" className={st.actionCard} onClick={() => addPresetElement("erro")}>
                      <div>
                        <strong style={{ color: "#b9382c" }}>❌ Exemplo com desvio</strong>
                        <span>Frase como costuma aparecer na prova</span>
                      </div>
                      <span>+</span>
                    </button>
                    <button type="button" className={st.actionCard} onClick={() => addPresetElement("acerto")}>
                      <div>
                        <strong style={{ color: "#15805c" }}>✔️ Forma adequada</strong>
                        <span>Reescrita clara na dissertação</span>
                      </div>
                      <span>+</span>
                    </button>
                  </div>
                ) : null}

                {/* 3. ABA ELEMENTOS (cartões ilustrados como em image_2.png) */}
                {activeTool === "elementos" ? (
                  <>
                    <div className={st.elementBanner}>
                      <span className={st.sectionLabel}>Post-it de caderno</span>
                      <button
                        type="button"
                        className={st.elementShowcase}
                        style={{ background: "#fef3c7", color: "#181926" }}
                        onClick={() => addPresetElement("post-it")}
                      >
                        <span
                          style={{
                            padding: "8px 16px",
                            background: "#f8e07a",
                            borderRadius: 6,
                            transform: "rotate(-3deg)",
                            boxShadow: "0 6px 14px rgba(0,0,0,0.12)",
                            fontFamily: "var(--font-studio-hand), cursive",
                            fontSize: 21,
                          }}
                        >
                          Anota no post-it!
                        </span>
                      </button>
                    </div>

                    <div className={st.elementBanner}>
                      <span className={st.sectionLabel}>Tarjas e etiquetas</span>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <button
                          type="button"
                          className={st.elementShowcase}
                          style={{ background: "#ede9fe", color: "#3e2a8d", minHeight: 62 }}
                          onClick={() => addPresetElement("pilula")}
                        >
                          <span style={{ background: "#3e2a8d", color: "#fff", padding: "5px 14px", borderRadius: 999, fontSize: 12 }}>
                            DESTAQUE
                          </span>
                        </button>
                        <button
                          type="button"
                          className={st.elementShowcase}
                          style={{ background: "#181926", color: "#ffffff", minHeight: 62 }}
                          onClick={() => addPresetElement("tarja")}
                        >
                          <span style={{ background: "#e5b314", color: "#181926", padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 800 }}>
                            TARJA
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className={st.elementBanner}>
                      <span className={st.sectionLabel}>Setas e grifos desenhados</span>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <button
                          type="button"
                          className={st.elementShowcase}
                          style={{ background: "#ffe4e6", color: "#be123c", minHeight: 62 }}
                          onClick={() => addPresetElement("seta")}
                        >
                          <span style={{ fontSize: 26 }}>↷</span> Seta
                        </button>
                        <button
                          type="button"
                          className={st.elementShowcase}
                          style={{ background: "#fef9c3", color: "#854d0e", minHeight: 62 }}
                          onClick={() => addPresetElement("sublinhado")}
                        >
                          <span style={{ textDecoration: "underline wavy #d97706" }}>Grifo</span>
                        </button>
                      </div>
                    </div>

                    <div className={st.elementBanner}>
                      <span className={st.sectionLabel}>Figurinhas rápidas</span>
                      <div className={st.emojiRow}>
                        {STICKER_EMOJIS.map(em => (
                          <button key={em} type="button" className={st.emojiBtn} onClick={() => addEmojiSticker(em)}>
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={st.elementBanner}>
                      <span className={st.sectionLabel}>Formas e colagem</span>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "center",
                          gap: 8,
                          padding: 14,
                          borderRadius: 14,
                          background: "#dcfce7",
                        }}
                      >
                        <button type="button" className={st.softChip} onClick={() => addPresetElement("fita")}>
                          🩹 Fita
                        </button>
                        <button type="button" className={st.softChip} onClick={() => addPresetElement("estrela")}>
                          ✦ Selo Pop
                        </button>
                        <button type="button" className={st.softChip} onClick={() => addPresetElement("circulo")}>
                          ⚪ Círculo
                        </button>
                        <button type="button" className={st.softChip} onClick={() => addPresetElement("cartao")}>
                          ▭ Cartão
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}

                {/* 4. ABA FOTOS */}
                {activeTool === "fotos" ? (
                  <>
                    <div style={{ display: "grid", gap: 8 }}>
                      <label className={`${styles.button} ${styles.primary} ${st.wrapBtn}`} style={{ cursor: "pointer" }}>
                        <UploadIcon />
                        {uploadingPhoto ? "Enviando foto…" : "Enviar foto"}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          hidden
                          disabled={uploadingPhoto}
                          onChange={e => {
                            void handleDirectPhotoUpload(e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        className={`${styles.button} ${st.wrapBtn}`}
                        onClick={async () => {
                          const picked = await pickMedia("");
                          if (picked) {
                            insertImageOnSlide(picked);
                            loadPhotos();
                          }
                        }}
                      >
                        Abrir biblioteca de mídia
                      </button>

                      <button
                        type="button"
                        className={`${styles.button} ${st.wrapBtn}`}
                        onClick={() => setMuapiTarget({ mode: "new" })}
                      >
                        <SparkIcon />Criar imagem com IA
                      </button>
                    </div>

                    <div>
                      <span className={st.sectionLabel}>Suas fotos salvas (clique para usar)</span>
                      {mediaFiles.length === 0 ? (
                        <p className={styles.hint} style={{ margin: 0 }}>
                          Suas fotos enviadas e imagens criadas aparecem aqui para reutilizar quando quiser.
                        </p>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                          {mediaFiles.slice(0, 24).map(file => (
                            <button
                              key={file.url}
                              type="button"
                              onClick={() => insertImageOnSlide(file.url)}
                              style={{
                                padding: 0,
                                border: "1px solid #e6e8f1",
                                borderRadius: 12,
                                overflow: "hidden",
                                aspectRatio: "1 / 1",
                                background: "#f3f4fa",
                              }}
                              title={`Usar ${file.name}`}
                            >
                              <img src={file.url} alt={file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : null}

                {/* 5. ABA CORES */}
                {activeTool === "cores" ? (
                  <>
                    <div>
                      <span className={st.sectionLabel}>Combinação de cores do post inteiro</span>
                      <div className={st.paletteList}>
                        {CANVAS_PALETTES.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            className={st.paletteCard}
                            aria-pressed={canvas.paletteId === p.id}
                            onClick={() => commitCanvas({ ...canvas, paletteId: p.id }, { syncBlocks: false })}
                          >
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#181926" }}>{p.label}</span>
                            <span className={st.swatches}>
                              <i className={st.swatchDot} style={{ background: p.palette.background }} />
                              <i className={st.swatchDot} style={{ background: p.palette.primary }} />
                              <i className={st.swatchDot} style={{ background: p.palette.accent }} />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className={st.sectionLabel}>Fundo só desta página</span>
                      <div className={st.pillGrid}>
                        {BG_SWATCHES.map(bg => (
                          <button
                            key={bg.id}
                            type="button"
                            className={st.softChip}
                            aria-pressed={activeSlide.background === bg.id}
                            onClick={() => updateSlideAt(safeIdx, s => ({ ...s, background: bg.id }))}
                          >
                            {bg.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className={st.sectionLabel}>Textura de papel</span>
                      <div className={st.pillGrid}>
                        {TEXTURES.map(tex => (
                          <button
                            key={tex.id}
                            type="button"
                            className={st.softChip}
                            aria-pressed={activeSlide.texture === tex.id}
                            onClick={() => updateSlideAt(safeIdx, s => ({ ...s, texture: tex.id }))}
                          >
                            {tex.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}

                {/* 6. ABA ROTEIRO (estilo Subtitle Video da image.png + Legenda) */}
                {activeTool === "roteiro" ? (
                  <>
                    <div className={styles.tabs} role="tablist">
                      <button
                        type="button"
                        role="tab"
                        className={styles.tab}
                        aria-selected={roteiroTab === "paginas"}
                        onClick={() => setRoteiroTab("paginas")}
                      >
                        Páginas
                      </button>
                      <button
                        type="button"
                        role="tab"
                        className={styles.tab}
                        aria-selected={roteiroTab === "legenda"}
                        onClick={() => setRoteiroTab("legenda")}
                      >
                        Legenda
                      </button>
                      <button
                        type="button"
                        role="tab"
                        className={styles.tab}
                        aria-selected={roteiroTab === "completo"}
                        onClick={() => setRoteiroTab("completo")}
                      >
                        Texto corrido
                      </button>
                    </div>

                    {roteiroTab === "paginas" ? (
                      <div className={st.scriptList}>
                        {slides.map((sl, idx) => {
                          const sum = slideSummary(sl);
                          const active = idx === safeIdx;
                          return (
                            <div
                              key={sl.id}
                              className={st.scriptBlock}
                              data-active={active || undefined}
                              onClick={() => {
                                setSelectedSlideIdx(idx);
                                setSelectedElementId(null);
                              }}
                            >
                              <span className={st.scriptNum}>{String(idx + 1).padStart(2, "0")}</span>
                              <div className={st.scriptText}>
                                <strong>{sum.heading}</strong>
                                {sum.detail ? <span>{sum.detail}</span> : null}
                              </div>
                              <div style={{ display: "grid", gap: 4 }}>
                                {slides.length > 1 ? (
                                  <button
                                    type="button"
                                    className={st.slideMiniBtn}
                                    title="Remover página"
                                    onClick={e => {
                                      e.stopPropagation();
                                      commitCanvas({ ...canvas, slides: slides.filter((_, i) => i !== idx) });
                                      setSelectedSlideIdx(Math.max(0, idx - 1));
                                    }}
                                  >
                                    ×
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className={st.slideMiniBtn}
                                  title="Duplicar página abaixo"
                                  onClick={e => {
                                    e.stopPropagation();
                                    const copy = cloneSlide(sl);
                                    const next = [...slides.slice(0, idx + 1), copy, ...slides.slice(idx + 1)];
                                    commitCanvas({ ...canvas, slides: next });
                                    setSelectedSlideIdx(idx + 1);
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : roteiroTab === "legenda" ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className={st.sectionLabel} style={{ margin: 0 }}>Legenda do Instagram</span>
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
                          rows={12}
                          value={post.caption}
                          placeholder="Escreva a legenda que vai acompanhar o post…"
                          onChange={e => {
                            const val = e.target.value;
                            setPost(p => (p ? { ...p, caption: val } : p));
                            setDirty(true);
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <span className={styles.hint}>Escreva tudo seguido e clique em Atualizar</span>
                          <button
                            type="button"
                            className={`${styles.button} ${styles.primary} ${styles.small}`}
                            onClick={applyRoteiroToCanvas}
                          >
                            Atualizar páginas
                          </button>
                        </div>
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
                    )}
                  </>
                ) : null}

                {/* 7. ABA AJUDA IA */}
                {activeTool === "ia" ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    <span className={st.sectionLabel}>O que você quer melhorar na Página {safeIdx + 1}?</span>
                    {AI_ACTIONS.map(act => (
                      <button
                        key={act.title}
                        type="button"
                        className={st.actionCard}
                        onClick={() => void handleSlideAi(act.prompt)}
                      >
                        <div>
                          <strong>✦ {act.title}</strong>
                          <span>{act.desc}</span>
                        </div>
                      </button>
                    ))}

                    <button type="button" className={`${styles.button} ${st.wrapBtn}`} onClick={toggleVoiceForSlide}>
                      {recording ? (
                        <>
                          <span className={st.recDot} /> Parar gravação ({recSeconds}s)
                        </>
                      ) : (
                        "🎙 Falar com a voz o que quer mudar"
                      )}
                    </button>

                    <form
                      style={{ display: "grid", gap: 8, marginTop: 4 }}
                      onSubmit={e => {
                        e.preventDefault();
                        void handleSlideAi(customAiPrompt);
                      }}
                    >
                      <textarea
                        className={styles.textarea}
                        rows={3}
                        value={customAiPrompt}
                        onChange={e => setCustomAiPrompt(e.target.value)}
                        placeholder="Ou escreva seu pedido (ex.: cite Sérgio Buarque de Holanda)…"
                      />
                      <button
                        type="submit"
                        className={`${styles.button} ${styles.primary} ${st.wrapBtn}`}
                        disabled={!customAiPrompt.trim()}
                      >
                        <SparkIcon />Pedir para a IA
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            </aside>
          ) : null}

          {/* ZONA D1: PALCO CENTRAL COM UMA ÚNICA ARTE GRANDE */}
          <div
            ref={stageRef}
            className={st.stageArea}
            onPointerDown={e => {
              if (e.target === stageRef.current) {
                setEditingElementId(null);
                setSelectedElementId(null);
              }
            }}
          >
            <div
              className={st.stageArtFrame}
              style={{ width: artWidth, height: Math.round(H * scale) }}
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
                  slide={activeSlide}
                  index={safeIdx}
                  total={slides.length}
                  handle={theme.handle}
                  palette={palette}
                  aspect={aspect}
                  scale={scale}
                  interactive
                  selectedElementId={selectedElementId}
                  editingElementId={editingElementId}
                  showSafeGuides={Boolean(selectedElementId)}
                  onSelectElement={elId => {
                    setSelectedElementId(elId);
                    if (elId !== editingElementId) setEditingElementId(null);
                  }}
                  onStartEditing={elId => {
                    setSelectedElementId(elId);
                    setEditingElementId(elId);
                  }}
                  onStopEditing={() => setEditingElementId(null)}
                  onSelectionRange={setSelectionRange}
                  onPickImage={(elId, src) => void handlePickElementImage(elId, src)}
                  onChangeElement={(elId, patch) => {
                    updateSlideAt(
                      safeIdx,
                      s => ({
                        ...s,
                        elements: s.elements.map(el => (el.id === elId ? ({ ...el, ...patch } as CanvasElement) : el)),
                      }),
                      false,
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ==================== ZONA D2: FITA DE PÁGINAS NO RODAPÉ ==================== */}
        <footer className={st.veedTimeline} aria-label="Páginas do post">
          <div className={st.timelineMeta}>
            <span>
              <strong>Página {safeIdx + 1}</strong> de {slides.length} · Clique em qualquer texto na imagem para editar
            </span>
            <label className={st.zoomControl}>
              <span>Zoom</span>
              <input
                type="range"
                min={0.75}
                max={1.35}
                step={0.05}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                aria-label="Zoom da página"
              />
            </label>
          </div>

          <div className={st.timelineTrack}>
            <button
              type="button"
              className={st.navCircle}
              title="Página anterior"
              aria-label="Página anterior"
              disabled={safeIdx === 0}
              onClick={() => {
                setSelectedSlideIdx(i => Math.max(0, i - 1));
                setSelectedElementId(null);
                setEditingElementId(null);
              }}
            >
              ‹
            </button>

            <div className={st.slidesStrip}>
              {slides.map((sl, idx) => {
                const active = idx === safeIdx;
                return (
                  <div key={sl.id} className={st.slideThumbWrap}>
                    <button
                      type="button"
                      className={st.slideThumbBtn}
                      data-active={active || undefined}
                      style={{ width: stripThumbW, height: Math.round(H * stripThumbScale) }}
                      aria-label={`Ir para página ${idx + 1}`}
                      onClick={() => {
                        setSelectedSlideIdx(idx);
                        setSelectedElementId(null);
                        setEditingElementId(null);
                      }}
                    >
                      <span className={st.slideThumbNum}>{idx + 1}</span>
                      <div style={{ width: W, height: H, transformOrigin: "top left", transform: `scale(${stripThumbScale})`, pointerEvents: "none" }}>
                        <CanvasSlideView
                          slide={sl}
                          index={idx}
                          total={slides.length}
                          handle={theme.handle}
                          palette={palette}
                          aspect={aspect}
                        />
                      </div>

                      {active ? (
                        <span className={st.slideMiniActions} onClick={e => e.stopPropagation()}>
                          {idx > 0 ? (
                            <span
                              role="button"
                              tabIndex={0}
                              className={st.slideMiniBtn}
                              title="Mover para trás"
                              onClick={() => {
                                commitCanvas({ ...canvas, slides: move(slides, idx, idx - 1) });
                                setSelectedSlideIdx(idx - 1);
                              }}
                            >
                              ←
                            </span>
                          ) : null}
                          {idx < slides.length - 1 ? (
                            <span
                              role="button"
                              tabIndex={0}
                              className={st.slideMiniBtn}
                              title="Mover para frente"
                              onClick={() => {
                                commitCanvas({ ...canvas, slides: move(slides, idx, idx + 1) });
                                setSelectedSlideIdx(idx + 1);
                              }}
                            >
                              →
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                className={st.addSlideFab}
                title="Adicionar nova página"
                aria-label="Adicionar nova página"
                onClick={() => {
                  const added = blankSlide(aspect, remixLayoutId(activeSlide));
                  commitCanvas({ ...canvas, slides: [...slides, added] });
                  setSelectedSlideIdx(slides.length);
                  setSelectedElementId(null);
                }}
              >
                <PlusIcon />
              </button>
            </div>

            <button
              type="button"
              className={st.navCircle}
              title="Próxima página"
              aria-label="Próxima página"
              disabled={safeIdx >= slides.length - 1}
              onClick={() => {
                setSelectedSlideIdx(i => Math.min(slides.length - 1, i + 1));
                setSelectedElementId(null);
                setEditingElementId(null);
              }}
            >
              ›
            </button>
          </div>
        </footer>
      </div>

      {/* Palco invisível em resolução real (1080×1350 / 1080×1920) para exportar PNG / ZIP */}
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
        defaultPrompt={`Ilustração ou fotografia editorial delicada sobre escrita, literatura e caderno de estudos, paleta ${palette.background} e ${palette.accent}, sem palavras escritas`}
        onClose={() => setMuapiTarget(null)}
        onResult={url => {
          if (muapiTarget?.mode === "element") {
            updateSlideAt(safeIdx, s => ({
              ...s,
              elements: s.elements.map(el => (el.id === muapiTarget.elementId && el.type === "image" ? { ...el, src: url } : el)),
            }));
          } else {
            insertImageOnSlide(url);
          }
          loadPhotos();
          setMuapiTarget(null);
          show("Imagem criada e colocada na página!", "good");
        }}
      />

      {leaveGuard.dialog}
      <BusyOverlay label={busyLabel} />
      <Toast toast={toast} onClose={clear} />
    </>
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
      <AdminShell crumbs={[]} immersive>
        <div style={{ display: "grid", placeItems: "center", height: "100dvh", background: "#f5f6fa" }}>
          <Skeleton kind="text" label="Abrindo seu post…" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell crumbs={[]} immersive>
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
    </AdminShell>
  );
}

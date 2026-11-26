"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import SlideCanvas from "./SlideCanvas";
import s from "./social.module.css";

type StorageStatus = "supabase" | "supabase_missing_table" | "local";

const KIND_LABELS: Record<SlideKind, string> = {
  cover: "Capa",
  content: "Conteúdo",
  comparison: "Antes × Depois",
  quote: "Citação / Nota",
  cta: "CTA Final",
};

const STATUS_LABELS: Record<SocialStatus, string> = {
  draft_ai: "Rascunho IA",
  in_review: "Em revisão",
  exported: "Exportado",
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

function CharCounter({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span className={`${s.charCount} ${over ? s.charCountOver : ""}`}>
      {value.length}/{max}
    </span>
  );
}

export default function SocialStudio({ initialPostId }: { initialPostId?: string }) {
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [authMode, setAuthMode] = useState<"email" | "pin" | "none">("none");
  const [authenticated, setAuthenticated] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [theme, setTheme] = useState<SocialTheme>(DEFAULT_SOCIAL_THEME);
  const [storage, setStorage] = useState<StorageStatus>("local");
  const [aiProvider, setAiProvider] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string>("");
  const [slideIndex, setSlideIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [showAiModal, setShowAiModal] = useState(false);
  const [aiIdea, setAiIdea] = useState("");
  const [aiPreset, setAiPreset] = useState<TemplatePreset>("cycle_steps");
  const [aiSlideCount, setAiSlideCount] = useState(6);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const [showThemeModal, setShowThemeModal] = useState(false);
  const [toast, setToast] = useState("");

  const frameRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(400);
  const exportRefs = useRef<Array<HTMLDivElement | null>>([]);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(prev => (prev === msg ? "" : prev)), 3000);
  }, []);

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/social/posts", { cache: "no-store" });
      if (res.status === 401) {
        const errData = (await res.json().catch(() => ({}))) as { authMode?: "email" | "pin" | "none" };
        setAuthMode(errData.authMode ?? "pin");
        setAuthRequired(true);
        setAuthenticated(false);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setAuthMode(data.authMode ?? "none");
      setAuthRequired(Boolean(data.authRequired));
      setAuthenticated(true);
      const list = Array.isArray(data.posts) ? (data.posts as SocialPost[]) : [];
      setPosts(list);
      if (data.theme) setTheme(data.theme as SocialTheme);
      if (data.storage) setStorage(data.storage as StorageStatus);
      setAiProvider(data.aiProvider ?? null);
      setSelectedId(prev => {
        if (initialPostId && list.some(p => p.id === initialPostId)) return initialPostId;
        if (prev && list.some(p => p.id === prev)) return prev;
        return list[0]?.id ?? "";
      });
    } catch {
      notify("Erro ao carregar os posts.");
    } finally {
      setLoading(false);
    }
  }, [initialPostId, notify]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setFrameWidth(el.clientWidth || 400);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [selectedId, authenticated]);

  const activePost = useMemo(
    () => posts.find(p => p.id === selectedId) ?? posts[0] ?? null,
    [posts, selectedId],
  );

  const activeSlide = activePost?.slides[slideIndex] ?? activePost?.slides[0] ?? null;

  useEffect(() => {
    if (activePost && slideIndex >= activePost.slides.length) {
      setSlideIndex(Math.max(0, activePost.slides.length - 1));
    }
  }, [activePost, slideIndex]);

  const updateActivePost = (updater: (post: SocialPost) => SocialPost) => {
    if (!activePost) return;
    setPosts(prev => prev.map(p => (p.id === activePost.id ? updater(p) : p)));
    setDirty(true);
  };

  const updateActiveSlide = (patch: Partial<SocialSlide>) => {
    if (!activePost || !activeSlide) return;
    updateActivePost(post => ({
      ...post,
      slides: post.slides.map((sl, i) => (i === slideIndex ? { ...sl, ...patch } : sl)),
    }));
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_code", email: emailInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível enviar o código.");
      setChallengeToken(data.challengeToken);
      setCodeInput("");
      notify("Código enviado para o seu e-mail!");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Erro ao enviar código.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_code", challengeToken, code: codeInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Código inválido.");
      setChallengeToken("");
      setCodeInput("");
      await loadState();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Código inválido.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePinUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auth", pin: pinInput }),
      });
      if (!res.ok) {
        setAuthError("PIN incorreto. Tente novamente.");
        return;
      }
      setPinInput("");
      await loadState();
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/social/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setChallengeToken("");
    await loadState();
  };

  const handleSavePost = async (overridePost?: SocialPost) => {
    const target = overridePost ?? activePost;
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
      if (data.post) {
        setPosts(prev => prev.map(p => (p.id === data.post.id ? data.post : p)));
      }
      setDirty(false);
      notify("Post salvo!");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBlank = async () => {
    const now = new Date().toISOString();
    const newPost: SocialPost = {
      id: `post_${Date.now().toString(36)}`,
      title: "Novo carrossel",
      format: "carousel",
      status: "in_review",
      caption: "Escreva sua legenda aqui...\n\n#textoemciclo #escrita #redacao",
      slides: [
        createEmptySlide("cover", 1),
        createEmptySlide("content", 1),
        createEmptySlide("comparison", 2),
        createEmptySlide("cta", 3),
      ],
      createdAt: now,
      updatedAt: now,
    };
    setPosts(prev => [newPost, ...prev]);
    setSelectedId(newPost.id);
    setSlideIndex(0);
    await handleSavePost(newPost);
  };

  const handleDeletePost = async () => {
    if (!activePost) return;
    if (!window.confirm(`Excluir "${activePost.title}"?`)) return;
    try {
      const res = await fetch(`/api/social/posts?id=${encodeURIComponent(activePost.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir");
      const remaining = posts.filter(p => p.id !== activePost.id);
      setPosts(remaining);
      setSelectedId(remaining[0]?.id ?? "");
      setSlideIndex(0);
      setDirty(false);
      notify("Post excluído.");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro ao excluir");
    }
  };

  const handleGenerateAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiError("");
    setAiLoading(true);
    try {
      const res = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: aiIdea,
          preset: aiPreset,
          slideCount: aiSlideCount,
          save: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar com IA");
      const created = data.post as SocialPost;
      setPosts(prev => [created, ...prev]);
      setSelectedId(created.id);
      setSlideIndex(0);
      setDirty(false);
      setShowAiModal(false);
      setAiIdea("");
      notify("Rascunho gerado com IA!");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Erro ao gerar com IA");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveTheme = async () => {
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_theme", theme }),
      });
      if (!res.ok) throw new Error("Erro ao salvar tema");
      setShowThemeModal(false);
      notify("Tema da Texto em Ciclo salvo!");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro ao salvar tema");
    }
  };

  const handleAddSlide = (kind: SlideKind) => {
    if (!activePost) return;
    const nextSlide = createEmptySlide(kind, activePost.slides.length);
    const nextSlides = [...activePost.slides, nextSlide];
    updateActivePost(p => ({ ...p, slides: nextSlides }));
    setSlideIndex(nextSlides.length - 1);
  };

  const handleMoveSlide = (dir: -1 | 1) => {
    if (!activePost) return;
    const targetIdx = slideIndex + dir;
    if (targetIdx < 0 || targetIdx >= activePost.slides.length) return;
    const copy = [...activePost.slides];
    const [moved] = copy.splice(slideIndex, 1);
    copy.splice(targetIdx, 0, moved!);
    updateActivePost(p => ({ ...p, slides: copy }));
    setSlideIndex(targetIdx);
  };

  const handleRemoveSlide = () => {
    if (!activePost || activePost.slides.length <= 1) return;
    const copy = activePost.slides.filter((_, i) => i !== slideIndex);
    updateActivePost(p => ({ ...p, slides: copy }));
    setSlideIndex(Math.max(0, slideIndex - 1));
  };

  const handleExportSingle = async () => {
    const node = exportRefs.current[slideIndex];
    if (!node || !activePost) return;
    setExporting(true);
    try {
      const dataUrl = await domToPng(node, {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        scale: 1,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const num = String(slideIndex + 1).padStart(2, "0");
      downloadBlob(blob, `${slugify(activePost.title)}-slide-${num}.png`);
      notify(`Slide ${num} exportado em 1080×1350!`);
    } catch {
      notify("Não foi possível exportar a imagem.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportZip = async () => {
    if (!activePost) return;
    setExporting(true);
    try {
      const zip = new JSZip();
      const slug = slugify(activePost.title);
      for (let i = 0; i < activePost.slides.length; i++) {
        const node = exportRefs.current[i];
        if (!node) continue;
        const dataUrl = await domToPng(node, {
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          scale: 1,
        });
        const base64 = dataUrl.split(",")[1] ?? "";
        const num = String(i + 1).padStart(2, "0");
        zip.file(`${num}-${slug}.png`, base64, { base64: true });
      }
      if (activePost.caption.trim()) {
        zip.file("legenda.txt", activePost.caption);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${slug}-texto-em-ciclo.zip`);
      const updated = { ...activePost, status: "exported" as SocialStatus };
      await handleSavePost(updated);
      notify("Carrossel exportado (.zip)!");
    } catch {
      notify("Erro ao gerar o pacote .zip.");
    } finally {
      setExporting(false);
    }
  };

  const handleCopyCaption = async () => {
    if (!activePost) return;
    await navigator.clipboard.writeText(activePost.caption);
    notify("Legenda copiada!");
  };

  if (loading) {
    return (
      <div className={s.shell}>
        <div className={s.pinCard}>Carregando Social Studio…</div>
      </div>
    );
  }

  if (authRequired && !authenticated) {
    return (
      <div className={s.shell}>
        <div className={s.pinCard}>
          <div className={s.brandGroup}>
            <div className={s.brandDot}>TC</div>
            <div>
              <h1 className={s.brandTitle}>Texto em Ciclo</h1>
              <div className={s.brandSub}>Social Studio</div>
            </div>
          </div>

          {authMode === "email" ? (
            !challengeToken ? (
              <form onSubmit={handleRequestCode} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{ margin: 0, fontSize: "14px", color: "#5c6468" }}>
                  Digite seu e-mail autorizado para receber um código de acesso de 6 dígitos.
                </p>
                <input
                  type="email"
                  className={s.input}
                  placeholder="seu@email.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  required
                  autoFocus
                />
                {authError ? <span style={{ color: "#b9382c", fontSize: "13px" }}>{authError}</span> : null}
                <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={authLoading}>
                  {authLoading ? "Enviando código…" : "Enviar código por e-mail"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{ margin: 0, fontSize: "14px", color: "#5c6468" }}>
                  Enviamos um código para <strong>{emailInput}</strong>. Digite abaixo para entrar:
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className={s.input}
                  placeholder="Código de 6 dígitos"
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value)}
                  required
                  autoFocus
                />
                {authError ? <span style={{ color: "#b9382c", fontSize: "13px" }}>{authError}</span> : null}
                <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={authLoading}>
                  {authLoading ? "Verificando…" : "Entrar"}
                </button>
                <button
                  type="button"
                  className={`${s.btn} ${s.btnSmall}`}
                  onClick={() => {
                    setChallengeToken("");
                    setAuthError("");
                  }}
                >
                  Trocar e-mail / reenviar
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handlePinUnlock} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ margin: 0, fontSize: "14px", color: "#5c6468" }}>
                Digite o PIN de acesso para entrar no estúdio de carrosséis.
              </p>
              <input
                type="password"
                inputMode="numeric"
                className={s.input}
                placeholder="PIN de acesso"
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                autoFocus
              />
              {authError ? <span style={{ color: "#b9382c", fontSize: "13px" }}>{authError}</span> : null}
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={authLoading}>
                {authLoading ? "Entrando…" : "Entrar"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const scale = frameWidth / SLIDE_WIDTH;

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <div className={s.brandGroup}>
          <div className={s.brandDot}>TC</div>
          <div>
            <h1 className={s.brandTitle}>{theme.brandName} · Social Studio</h1>
            <div className={s.brandSub}>{theme.handle} · Carrosséis 1080×1350</div>
          </div>
          <span
            className={`${s.badge} ${
              storage === "supabase" ? s.badgeOk : storage === "supabase_missing_table" ? s.badgeWarn : ""
            }`}
          >
            {storage === "supabase"
              ? "Supabase conectado"
              : storage === "supabase_missing_table"
                ? "Falta criar tabela no Supabase"
                : "Modo local"}
          </span>
        </div>

        <div className={s.headerActions}>
          <button type="button" className={s.btn} onClick={() => setShowThemeModal(true)}>
            Tema da Marca
          </button>
          <button type="button" className={s.btn} onClick={handleCreateBlank}>
            + Novo Post
          </button>
          <button type="button" className={`${s.btn} ${s.btnAccent}`} onClick={() => setShowAiModal(true)}>
            ✨ Gerar com IA
          </button>
          {activePost ? (
            <button
              type="button"
              className={`${s.btn} ${s.btnPrimary}`}
              onClick={() => handleSavePost()}
              disabled={saving}
            >
              {saving ? "Salvando…" : dirty ? "Salvar*" : "Salvo"}
            </button>
          ) : null}
          {authRequired ? (
            <button type="button" className={s.btn} onClick={handleLogout}>
              Sair
            </button>
          ) : null}
        </div>
      </header>

      {storage === "supabase_missing_table" ? (
        <div className={s.banner}>
          <strong>Atenção:</strong> As variáveis do Supabase estão configuradas, mas as tabelas{" "}
          <code>social_posts</code> e <code>social_settings</code> ainda não foram criadas. Execute o arquivo{" "}
          <code>supabase/social_studio.sql</code> no SQL Editor do Supabase para salvar seus posts na nuvem.
        </div>
      ) : null}

      <div className={s.workspace}>
        {/* Sidebar: Post list */}
        <aside className={s.sidebar}>
          <div className={s.sidebarHeader}>
            <h2 className={s.sidebarTitle}>Posts ({posts.length})</h2>
          </div>
          {posts.map(post => (
            <button
              key={post.id}
              type="button"
              className={`${s.postItem} ${post.id === activePost?.id ? s.postItemActive : ""}`}
              onClick={() => {
                setSelectedId(post.id);
                setSlideIndex(0);
              }}
            >
              <span className={s.postItemTitle}>{post.title}</span>
              <span className={s.postItemMeta}>
                <span>{post.slides.length} slides</span>
                <span>{STATUS_LABELS[post.status]}</span>
              </span>
            </button>
          ))}
        </aside>

        {/* Main Studio */}
        {activePost && activeSlide ? (
          <main className={s.main}>
            {/* Left column: Preview & Export */}
            <section className={s.card}>
              <div className={s.previewHeader}>
                <div className={s.slideStrip}>
                  {activePost.slides.map((sl, i) => (
                    <button
                      key={sl.id}
                      type="button"
                      className={`${s.slideTab} ${i === slideIndex ? s.slideTabActive : ""}`}
                      onClick={() => setSlideIndex(i)}
                    >
                      {i + 1}. {KIND_LABELS[sl.kind]}
                    </button>
                  ))}
                </div>
              </div>

              <div ref={frameRef} className={s.stageFrame}>
                <div
                  className={s.stageScaler}
                  style={{ transform: `scale(${scale})` }}
                >
                  <SlideCanvas
                    slide={activeSlide}
                    index={slideIndex}
                    total={activePost.slides.length}
                    theme={theme}
                  />
                </div>
              </div>

              <div className={s.exportRow}>
                <button
                  type="button"
                  className={`${s.btn} ${s.btnPrimary}`}
                  onClick={handleExportZip}
                  disabled={exporting}
                >
                  {exporting ? "Exportando…" : "Baixar Carrossel (.zip)"}
                </button>
                <button
                  type="button"
                  className={s.btn}
                  onClick={handleExportSingle}
                  disabled={exporting}
                >
                  Baixar Slide PNG
                </button>
              </div>
            </section>

            {/* Right column: Slide & Caption Editor */}
            <section className={s.card}>
              <div className={s.rowBetween}>
                <div className={s.rowGap}>
                  <select
                    aria-label="Tipo do slide"
                    className={s.select}
                    style={{ width: "auto" }}
                    value={activeSlide.kind}
                    onChange={e => updateActiveSlide({ kind: e.target.value as SlideKind })}
                  >
                    {Object.entries(KIND_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        Template: {label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={`${s.btn} ${s.btnSmall}`}
                    onClick={() => handleMoveSlide(-1)}
                    disabled={slideIndex === 0}
                    title="Mover para trás"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className={`${s.btn} ${s.btnSmall}`}
                    onClick={() => handleMoveSlide(1)}
                    disabled={slideIndex >= activePost.slides.length - 1}
                    title="Mover para frente"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    className={`${s.btn} ${s.btnSmall} ${s.btnDanger}`}
                    onClick={handleRemoveSlide}
                    disabled={activePost.slides.length <= 1}
                  >
                    Remover slide
                  </button>
                </div>

                <select
                  aria-label="Adicionar slide"
                  className={s.select}
                  style={{ width: "auto" }}
                  value=""
                  onChange={e => {
                    if (e.target.value) handleAddSlide(e.target.value as SlideKind);
                  }}
                >
                  <option value="">+ Adicionar slide…</option>
                  {Object.entries(KIND_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      + {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={s.formGrid}>
                <div className={s.field}>
                  <div className={s.fieldLabelRow}>
                    <span>Etiqueta superior (Eyebrow)</span>
                    <CharCounter value={activeSlide.eyebrow ?? ""} max={SLIDE_LIMITS.eyebrow} />
                  </div>
                  <input
                    className={s.input}
                    value={activeSlide.eyebrow ?? ""}
                    onChange={e => updateActiveSlide({ eyebrow: e.target.value })}
                    placeholder="Ex: PASSO 01, ANTES × DEPOIS"
                  />
                </div>

                {activeSlide.kind === "content" ? (
                  <div className={s.field}>
                    <div className={s.fieldLabelRow}>
                      <span>Número do passo</span>
                    </div>
                    <input
                      className={s.input}
                      value={activeSlide.stepNumber ?? ""}
                      onChange={e => updateActiveSlide({ stepNumber: e.target.value })}
                      placeholder="Ex: 01"
                    />
                  </div>
                ) : null}

                <div className={s.field}>
                  <div className={s.fieldLabelRow}>
                    <span>{activeSlide.kind === "quote" ? "Texto da citação / nota" : "Título principal"}</span>
                    <CharCounter
                      value={activeSlide.title}
                      max={
                        activeSlide.kind === "cover"
                          ? SLIDE_LIMITS.coverTitle
                          : activeSlide.kind === "quote"
                            ? SLIDE_LIMITS.quoteTitle
                            : SLIDE_LIMITS.contentTitle
                      }
                    />
                  </div>
                  <textarea
                    className={s.textarea}
                    style={{ minHeight: activeSlide.kind === "quote" ? "110px" : "66px" }}
                    value={activeSlide.title}
                    onChange={e => updateActiveSlide({ title: e.target.value })}
                  />
                </div>

                {activeSlide.kind === "comparison" ? (
                  <>
                    <div className={s.field}>
                      <div className={s.fieldLabelRow}>
                        <span>Texto "Antes / Evite"</span>
                        <CharCounter value={activeSlide.wrongText ?? ""} max={SLIDE_LIMITS.wrongText} />
                      </div>
                      <textarea
                        className={s.textarea}
                        value={activeSlide.wrongText ?? ""}
                        onChange={e => updateActiveSlide({ wrongText: e.target.value })}
                      />
                    </div>
                    <div className={s.field}>
                      <div className={s.fieldLabelRow}>
                        <span>Texto "Depois / Prefira"</span>
                        <CharCounter value={activeSlide.rightText ?? ""} max={SLIDE_LIMITS.rightText} />
                      </div>
                      <textarea
                        className={s.textarea}
                        value={activeSlide.rightText ?? ""}
                        onChange={e => updateActiveSlide({ rightText: e.target.value })}
                      />
                    </div>
                  </>
                ) : null}

                {activeSlide.kind !== "quote" ? (
                  <div className={s.field}>
                    <div className={s.fieldLabelRow}>
                      <span>{activeSlide.kind === "comparison" ? "Explicação curta" : "Texto de apoio"}</span>
                      <CharCounter value={activeSlide.body ?? ""} max={SLIDE_LIMITS.contentBody} />
                    </div>
                    <textarea
                      className={s.textarea}
                      value={activeSlide.body ?? ""}
                      onChange={e => updateActiveSlide({ body: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className={s.field}>
                    <div className={s.fieldLabelRow}>
                      <span>Autor / Assinatura</span>
                    </div>
                    <input
                      className={s.input}
                      value={activeSlide.author ?? ""}
                      onChange={e => updateActiveSlide({ author: e.target.value })}
                    />
                  </div>
                )}

                {activeSlide.kind === "cover" || activeSlide.kind === "content" || activeSlide.kind === "cta" ? (
                  <div className={s.field}>
                    <div className={s.fieldLabelRow}>
                      <span>Destaque / Chamada</span>
                      <CharCounter value={activeSlide.highlight ?? ""} max={SLIDE_LIMITS.highlight} />
                    </div>
                    <input
                      className={s.input}
                      value={activeSlide.highlight ?? ""}
                      onChange={e => updateActiveSlide({ highlight: e.target.value })}
                      placeholder="Ex: Dica prática ou CTA"
                    />
                  </div>
                ) : null}

                <hr style={{ border: 0, borderTop: "1px solid #efece6", margin: "4px 0" }} />

                <div className={s.field}>
                  <div className={s.fieldLabelRow}>
                    <span>Título interno do post</span>
                  </div>
                  <input
                    className={s.input}
                    value={activePost.title}
                    onChange={e => updateActivePost(p => ({ ...p, title: e.target.value }))}
                  />
                </div>

                <div className={s.field}>
                  <div className={s.fieldLabelRow}>
                    <span>Legenda do Instagram + Hashtags</span>
                    <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={handleCopyCaption}>
                      Copiar legenda
                    </button>
                  </div>
                  <textarea
                    className={s.textarea}
                    style={{ minHeight: "120px" }}
                    value={activePost.caption}
                    onChange={e => updateActivePost(p => ({ ...p, caption: e.target.value }))}
                  />
                </div>

                <div className={s.rowBetween}>
                  <select
                    aria-label="Status do post"
                    className={s.select}
                    style={{ width: "auto" }}
                    value={activePost.status}
                    onChange={e => updateActivePost(p => ({ ...p, status: e.target.value as SocialStatus }))}
                  >
                    <option value="draft_ai">Status: Rascunho IA</option>
                    <option value="in_review">Status: Em revisão</option>
                    <option value="exported">Status: Exportado</option>
                  </select>

                  <button type="button" className={`${s.btn} ${s.btnSmall} ${s.btnDanger}`} onClick={handleDeletePost}>
                    Excluir post
                  </button>
                </div>
              </div>
            </section>
          </main>
        ) : null}
      </div>

      {/* Hidden full-resolution 1080x1350 stage for crisp PNG/ZIP export */}
      {activePost ? (
        <div className={s.offscreenStage} aria-hidden="true">
          {activePost.slides.map((sl, i) => (
            <div
              key={sl.id}
              ref={el => {
                exportRefs.current[i] = el;
              }}
            >
              <SlideCanvas slide={sl} index={i} total={activePost.slides.length} theme={theme} />
            </div>
          ))}
        </div>
      ) : null}

      {/* AI Generator Modal */}
      {showAiModal ? (
        <div className={s.modalBackdrop} onClick={() => !aiLoading && setShowAiModal(false)}>
          <form
            className={s.modal}
            onClick={e => e.stopPropagation()}
            onSubmit={handleGenerateAi}
          >
            <div className={s.rowBetween}>
              <h2 className={s.modalTitle}>✨ Gerar Carrossel com IA</h2>
              <button
                type="button"
                className={`${s.btn} ${s.btnSmall}`}
                onClick={() => setShowAiModal(false)}
                disabled={aiLoading}
              >
                Fechar
              </button>
            </div>

            {!aiProvider ? (
              <div className={s.banner} style={{ margin: 0 }}>
                Nenhuma chave de IA detectada no servidor. Adicione <code>OPENAI_API_KEY</code>,{" "}
                <code>GEMINI_API_KEY</code> ou <code>ANTHROPIC_API_KEY</code> nas variáveis de ambiente da Vercel (ou{" "}
                <code>.env.local</code>).
              </div>
            ) : (
              <span className={s.brandSub}>Provedor ativo: {aiProvider.toUpperCase()}</span>
            )}

            <div className={s.field}>
              <div className={s.fieldLabelRow}>
                <span>Cole sua ideia, dúvida de aluno ou transcrição de áudio</span>
              </div>
              <textarea
                className={s.textarea}
                style={{ minHeight: "120px" }}
                placeholder="Ex: Hoje um aluno me perguntou como evitar repetir 'que' toda hora na redação. Quero mostrar 3 jeitos simples de substituir o 'que' com exemplos de antes e depois..."
                value={aiIdea}
                onChange={e => setAiIdea(e.target.value)}
                required
              />
            </div>

            <div className={s.rowBetween}>
              <div className={s.field} style={{ flex: 1 }}>
                <div className={s.fieldLabelRow}>
                  <span>Formato</span>
                </div>
                <select
                  className={s.select}
                  value={aiPreset}
                  onChange={e => setAiPreset(e.target.value as TemplatePreset)}
                >
                  <option value="cycle_steps">Ciclo / Passo a passo</option>
                  <option value="before_after">Antes × Depois</option>
                  <option value="quick_tip">Card Único (Dica rápida)</option>
                </select>
              </div>

              {aiPreset !== "quick_tip" ? (
                <div className={s.field} style={{ width: "120px" }}>
                  <div className={s.fieldLabelRow}>
                    <span>Slides</span>
                  </div>
                  <select
                    className={s.select}
                    value={aiSlideCount}
                    onChange={e => setAiSlideCount(Number(e.target.value))}
                  >
                    {[4, 5, 6, 7, 8].map(n => (
                      <option key={n} value={n}>
                        {n} slides
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            {aiError ? <span style={{ color: "#b9382c", fontSize: "13px" }}>{aiError}</span> : null}

            <div className={s.rowBetween}>
              <span className={s.brandSub}>Os textos já vêm travados no limite do layout 1080×1350.</span>
              <button
                type="submit"
                className={`${s.btn} ${s.btnAccent}`}
                disabled={aiLoading || !aiProvider}
              >
                {aiLoading ? "Gerando…" : "Gerar Carrossel"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Brand Tokens / Theme Modal */}
      {showThemeModal ? (
        <div className={s.modalBackdrop} onClick={() => setShowThemeModal(false)}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.rowBetween}>
              <h2 className={s.modalTitle}>Tema da Marca (Brand Tokens)</h2>
              <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => setShowThemeModal(false)}>
                Fechar
              </button>
            </div>

            <div className={s.field}>
              <div className={s.fieldLabelRow}>
                <span>Nome da marca</span>
              </div>
              <input
                className={s.input}
                value={theme.brandName}
                onChange={e => setTheme(t => ({ ...t, brandName: e.target.value }))}
              />
            </div>

            <div className={s.rowBetween}>
              <div className={s.field} style={{ flex: 1 }}>
                <div className={s.fieldLabelRow}>
                  <span>@ do perfil</span>
                </div>
                <input
                  className={s.input}
                  value={theme.handle}
                  onChange={e => setTheme(t => ({ ...t, handle: e.target.value }))}
                />
              </div>

              <div className={s.field} style={{ flex: 1 }}>
                <div className={s.fieldLabelRow}>
                  <span>Fonte dos títulos</span>
                </div>
                <select
                  className={s.select}
                  value={theme.displayFont}
                  onChange={e => setTheme(t => ({ ...t, displayFont: e.target.value as "serif" | "sans" }))}
                >
                  <option value="serif">Serifada Editorial</option>
                  <option value="sans">Sans Moderna (DM Sans)</option>
                </select>
              </div>
            </div>

            <div className={s.colorGrid}>
              {(
                [
                  ["background", "Fundo"],
                  ["surface", "Cartão"],
                  ["primary", "Texto principal"],
                  ["accent", "Destaque"],
                  ["accentSoft", "Destaque suave"],
                  ["muted", "Texto secundário"],
                  ["wrong", "Cor 'Antes'"],
                  ["right", "Cor 'Depois'"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className={s.colorField}>
                  <input
                    type="color"
                    value={theme.palette[key]}
                    onChange={e =>
                      setTheme(t => ({
                        ...t,
                        palette: { ...t.palette, [key]: e.target.value },
                      }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className={s.rowGap}>
              <label className={s.rowGap} style={{ fontSize: "13px" }}>
                <input
                  type="checkbox"
                  checked={theme.showSlideNumbers}
                  onChange={e => setTheme(t => ({ ...t, showSlideNumbers: e.target.checked }))}
                />
                Mostrar numeração (01 / 05)
              </label>
              <label className={s.rowGap} style={{ fontSize: "13px" }}>
                <input
                  type="checkbox"
                  checked={theme.showFooterHandle}
                  onChange={e => setTheme(t => ({ ...t, showFooterHandle: e.target.checked }))}
                />
                Mostrar @ no rodapé
              </label>
            </div>

            <div className={s.rowBetween}>
              <button
                type="button"
                className={s.btn}
                onClick={() => setTheme(DEFAULT_SOCIAL_THEME)}
              >
                Restaurar padrão
              </button>
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleSaveTheme}>
                Salvar Tema
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className={s.toast}>{toast}</div> : null}
    </div>
  );
}

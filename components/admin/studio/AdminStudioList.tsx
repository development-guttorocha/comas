"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StudioOutputKind } from "@/lib/social/ai";
import {
  applyLayout,
  CANVAS_PALETTES,
  CANVAS_SIZE,
  canvasFromCompiled,
  DEFAULT_PALETTE_ID,
  paletteById,
  readCanvas,
  remixLayoutId,
  type StudioCanvas,
} from "@/lib/social/canvas";
import { compileDocToSlides } from "@/lib/social/compileDoc";
import { DEFAULT_SOCIAL_THEME } from "@/lib/social/presets";
import { STARTER_STUDIO_DOC } from "@/lib/social/studioTypes";
import {
  type SocialPost,
  type SocialTheme,
  type TemplatePreset,
} from "@/lib/social/types";
import CanvasSlideView from "@/components/social/CanvasSlideView";
import AdminShell from "../AdminShell";
import BusyOverlay from "../BusyOverlay";
import { Toast, useToast } from "../client";
import { CopyIcon, PlusIcon, SearchIcon, SparkIcon, TrashIcon } from "../icons";
import Skeleton from "../Skeleton";
import styles from "../admin.module.css";
import st from "./studioEditor.module.css";

const PRESET_FRIENDLY: Array<{ value: TemplatePreset; label: string }> = [
  { value: "repertorio_banca", label: "Repertório e atualidades" },
  { value: "before_after", label: "Erro comum × forma certa" },
  { value: "cycle_steps", label: "Passo a passo de estudo" },
  { value: "radar_temas", label: "Temas de vestibular" },
  { value: "quick_tip", label: "Frase rápida / recado" },
];

const OUTPUT_LABELS: Record<StudioOutputKind, string> = {
  carousel: "Carrossel",
  single: "Imagem única",
  story: "Stories",
};

const dayLabel = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
};

function ensurePostCanvas(post: SocialPost): StudioCanvas {
  const doc = post.studioDoc ?? STARTER_STUDIO_DOC;
  const existing = readCanvas(doc.canvas);
  if (existing && existing.slides.length) return existing;
  const compiled = compileDocToSlides(doc.blocks?.length ? doc.blocks : STARTER_STUDIO_DOC.blocks);
  return canvasFromCompiled(compiled, doc.aspect || "carousel", DEFAULT_PALETTE_ID);
}

export default function AdminStudioList() {
  const router = useRouter();
  const seedInputRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [docs, setDocs] = useState<SocialPost[] | null>(null);
  const [theme, setTheme] = useState<SocialTheme>(DEFAULT_SOCIAL_THEME);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busyLabel, setBusyLabel] = useState("");

  // Simple creation state
  const [idea, setIdea] = useState("");
  const [urlOpen, setUrlOpen] = useState(false);
  const [newsUrl, setNewsUrl] = useState("");
  const [preset, setPreset] = useState<TemplatePreset>("repertorio_banca");
  const [outputs, setOutputs] = useState<StudioOutputKind[]>(["carousel"]);
  const [variations, setVariations] = useState<SocialPost[]>([]);

  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);

  const { toast, show, clear } = useToast();

  useEffect(() => {
    fetch("/api/social/posts", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        const all = Array.isArray(data.posts) ? (data.posts as SocialPost[]) : [];
        const studioDocs = all.filter(p => p.format === "studio_doc" || p.studioDoc);
        if (data.theme) setTheme(data.theme as SocialTheme);
        setAiProvider(data.aiProvider ?? null);
        if (all.length === 0) {
          const now = new Date().toISOString();
          const compiled = compileDocToSlides(STARTER_STUDIO_DOC.blocks);
          const starter: SocialPost = {
            id: "studio_demo_que",
            title: "Pare de repetir 'que' na sua redação",
            format: "studio_doc",
            status: "in_review",
            slides: [],
            studioDoc: {
              ...STARTER_STUDIO_DOC,
              canvas: canvasFromCompiled(compiled, "carousel", "indigo_mostarda"),
            },
            caption:
              "Você relê um parágrafo e percebe que usou 'que' quatro vezes?\n\nIsso não é falta de vocabulário — é falta de um checklist rápido na segunda leitura.\n\nSalva esse post para revisar sua próxima redação :) Vamos juntos?\n\n#textoemciclo #redacao #vestibular #escrita",
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

  function toggleOutput(kind: StudioOutputKind) {
    setOutputs(prev => {
      if (prev.includes(kind)) {
        return prev.length > 1 ? prev.filter(k => k !== kind) : prev;
      }
      return [...prev, kind];
    });
  }

  async function createBlank() {
    setBusyLabel("Preparando um post em branco…");
    try {
      const now = new Date().toISOString();
      const blocks = [
        {
          type: "socialCover",
          props: {
            eyebrow: "TEXTO EM CICLO",
            title: "Escreva o título do seu post",
            subtitle: "Clique em qualquer frase na imagem para trocar o texto.",
            cta: "deslize →",
          },
        },
        {
          type: "socialBeforeAfter",
          props: {
            eyebrow: "[regência verbal]",
            title: "CORROBORAR",
            wrongLabel: "Erro comum",
            wrongText: "As ONGs corroboram com o governo.",
            rightLabel: "Na dissertação",
            rightText: "Os dados corroboram a tese apresentada.",
            note: "Anota no post-it: corroborar é transitivo direto!",
          },
        },
        {
          type: "socialCta",
          props: {
            eyebrow: "SALVE ESSE POST",
            title: "Quer revisar antes da prova?",
            body: "Salve para consultar quando for passar a redação a limpo.",
            buttonLabel: "Vamos juntos? :)",
          },
        },
      ];
      const canvas = canvasFromCompiled(compileDocToSlides(blocks), "carousel", "indigo_mostarda");
      const post: SocialPost = {
        id: `studio_${Date.now().toString(36)}`,
        title: "Novo post",
        format: "studio_doc",
        status: "in_review",
        slides: [],
        studioDoc: {
          artDirection: "editorial",
          aspect: "carousel",
          blocks,
          canvas,
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
      if (!res.ok) throw new Error("Erro ao criar post");
      router.push(`/admin/estudio/${encodeURIComponent(post.id)}`);
    } catch (err) {
      show(err);
      setBusyLabel("");
    }
  }

  async function toggleVoiceSeed() {
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
        setBusyLabel("Ouvindo e escrevendo sua ideia…");
        try {
          const form = new FormData();
          form.append("audio", blob, "ideia.webm");
          const res = await fetch("/api/social/generate", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Erro ao ouvir áudio");
          setIdea(prev => (prev ? `${prev}\n${String(data.transcript ?? "")}` : String(data.transcript ?? "")));
          show("Pronto! Agora clique em Criar post.", "good");
        } catch (err) {
          show(err);
        } finally {
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

  async function handleEssayPhoto(file: File | undefined) {
    if (!file) return;
    setBusyLabel("Lendo a foto da redação…");
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/social/generate", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível ler a foto");
      setIdea(String(data.seed ?? ""));
      show("Foto lida e salva em Fotos! Clique em Criar post.", "good");
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  async function handleFetchUrl() {
    if (!newsUrl.trim()) return;
    setBusyLabel("Lendo o link da notícia…");
    try {
      const res = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "seed_url", url: newsUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível ler o link");
      setIdea(String(data.seed ?? ""));
      setUrlOpen(false);
      setNewsUrl("");
      show("Notícia lida! Agora clique em Criar post.", "good");
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  async function handleGenerate() {
    if (idea.trim().length < 8) {
      show("Conte um pouquinho mais da ideia antes de criar.");
      seedInputRef.current?.focus();
      return;
    }

    // Se escolheu só 1 formato, cria e já abre direto no editor sem etapas extras!
    if (outputs.length === 1) {
      setBusyLabel("Montando seu post com as cores e o jeito do @textoemciclo…");
      try {
        const res = await fetch("/api/social/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "studio_doc",
            idea: idea.trim(),
            preset,
            output: outputs[0],
            save: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao criar post");
        router.push(String(data.editUrl || `/admin/estudio/${encodeURIComponent(data.post.id)}`));
      } catch (err) {
        show(err);
        setBusyLabel("");
      }
      return;
    }

    setBusyLabel(`Preparando ${outputs.length} opções visuais diferentes…`);
    try {
      const res = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "studio_variations",
          idea: idea.trim(),
          preset,
          outputs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar opções");
      setVariations(Array.isArray(data.posts) ? (data.posts as SocialPost[]) : []);
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  function remixVariation(idx: number) {
    setVariations(prev =>
      prev.map((post, i) => {
        if (i !== idx) return post;
        const doc = post.studioDoc ?? STARTER_STUDIO_DOC;
        const canvas = ensurePostCanvas(post);
        const aspect = doc.aspect || "carousel";
        const paletteIdx = CANVAS_PALETTES.findIndex(p => p.id === canvas.paletteId);
        const nextPalette = CANVAS_PALETTES[(paletteIdx + 1) % CANVAS_PALETTES.length]!.id;
        let lastLayout = "";
        const nextSlides = canvas.slides.map(s => {
          const lid = remixLayoutId(s, Math.random, lastLayout ? [lastLayout] : []);
          lastLayout = lid;
          return applyLayout(s, lid, aspect);
        });
        return {
          ...post,
          studioDoc: {
            ...doc,
            canvas: { ...canvas, paletteId: nextPalette, slides: nextSlides },
          },
        };
      }),
    );
  }

  async function openVariationInStudio(variation: SocialPost) {
    setBusyLabel("Abrindo seu post…");
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: variation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao abrir post");
      const saved = (data.post as SocialPost) ?? variation;
      router.push(`/admin/estudio/${encodeURIComponent(saved.id)}`);
    } catch (err) {
      show(err);
      setBusyLabel("");
    }
  }

  async function duplicatePost(doc: SocialPost) {
    setBusyLabel("Duplicando post…");
    try {
      const now = new Date().toISOString();
      const copy: SocialPost = {
        ...structuredClone(doc),
        id: `studio_${Date.now().toString(36)}`,
        title: `${doc.title} (cópia)`,
        createdAt: now,
        updatedAt: now,
      };
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: copy }),
      });
      if (!res.ok) throw new Error("Erro ao duplicar post");
      setDocs(list => [copy, ...(list ?? [])]);
      show("Cópia criada na galeria!", "good");
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  async function deletePost(doc: SocialPost) {
    if (!confirm(`Excluir o post "${doc.title}"?`)) return;
    try {
      const res = await fetch(`/api/social/posts?id=${encodeURIComponent(doc.id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data as { error?: string } | null)?.error || "Não foi possível excluir o post.");
      }
      setDocs(list => (list ?? []).filter(item => item.id !== doc.id));
      show("Post excluído.");
    } catch (err) {
      show(err);
    }
  }

  return (
    <AdminShell
      crumbs={[{ label: "Meus posts" }]}
      actions={
        <button type="button" className={styles.button} onClick={createBlank}>
          <PlusIcon />Começar em branco
        </button>
      }
    >
      <div className={styles.sheet}>
        <div className={styles.page} data-wide>
          {/* CAIXA SIMPLES DE CRIAÇÃO */}
          <section className={st.homeHero} aria-label="Criar novo post">
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <div>
                <h1 className={styles.title} style={{ fontSize: 22, fontWeight: 700 }}>
                  O que vamos publicar hoje?
                </h1>
                <p className={styles.subtitle} style={{ marginTop: 4 }}>
                  Conte sua ideia escrevendo, gravando um áudio ou enviando foto de uma redação.
                </p>
              </div>
              {!aiProvider ? (
                <Link href="/admin/chaves" className={styles.chip} data-tone="warn">
                  Conectar IA em Conexões →
                </Link>
              ) : null}
            </div>

            <div className={st.seedBox}>
              <textarea
                ref={seedInputRef}
                className={st.seedTextarea}
                rows={3}
                value={idea}
                onChange={e => setIdea(e.target.value)}
                placeholder="Ex.: Quero explicar como usar O Bem-Amado e o conceito de Homem Cordial na prova da UERJ…"
              />

              {urlOpen ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className={styles.input}
                    value={newsUrl}
                    onChange={e => setNewsUrl(e.target.value)}
                    placeholder="Cole aqui o link da notícia (https://...)"
                  />
                  <button type="button" className={styles.button} onClick={handleFetchUrl}>
                    Ler link
                  </button>
                </div>
              ) : null}

              <div className={st.seedActionsBar}>
                <div className={st.formatCardsRow}>
                  <button type="button" className={st.softChip} aria-pressed={recording} onClick={toggleVoiceSeed}>
                    {recording ? (
                      <>
                        <span className={st.recDot} /> Parar ({recSeconds}s)
                      </>
                    ) : (
                      "🎙 Falar ideia"
                    )}
                  </button>
                  <button type="button" className={st.softChip} onClick={() => photoInputRef.current?.click()}>
                    📷 Foto de redação
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={e => {
                      void handleEssayPhoto(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <button type="button" className={st.softChip} aria-pressed={urlOpen} onClick={() => setUrlOpen(v => !v)}>
                    🔗 Link de notícia
                  </button>
                </div>

                <div className={st.formatCardsRow}>
                  <select
                    className={styles.select}
                    style={{ width: "auto", height: 34, borderRadius: 999, fontSize: 12.5 }}
                    value={preset}
                    onChange={e => setPreset(e.target.value as TemplatePreset)}
                    aria-label="Tipo de aula"
                  >
                    {PRESET_FRIENDLY.map(p => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>

                  {(["carousel", "single", "story"] as StudioOutputKind[]).map(out => {
                    const active = outputs.includes(out);
                    return (
                      <button
                        key={out}
                        type="button"
                        className={st.softChip}
                        style={{ borderRadius: 999 }}
                        aria-pressed={active}
                        onClick={() => toggleOutput(out)}
                      >
                        {OUTPUT_LABELS[out]}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    className={`${styles.button} ${styles.primary}`}
                    disabled={!aiProvider}
                    onClick={handleGenerate}
                  >
                    <SparkIcon />Criar post
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* OPÇÕES GERADAS (quando marcou mais de um formato) */}
          {variations.length > 0 ? (
            <section style={{ display: "grid", gap: 12 }} aria-label="Opções criadas">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 16 }}>Escolha qual opção você quer abrir</strong>
                <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={() => setVariations([])}>
                  Fechar opções
                </button>
              </div>

              <div className={st.variationsGrid}>
                {variations.map((v, vIdx) => {
                  const doc = v.studioDoc ?? STARTER_STUDIO_DOC;
                  const aspect = doc.aspect || "carousel";
                  const canvas = ensurePostCanvas(v);
                  const palette = paletteById(canvas.paletteId);
                  const { width: W, height: H } = CANVAS_SIZE[aspect];
                  const tileW = canvas.slides.length === 1 ? 210 : aspect === "story" ? 108 : 132;
                  const tileScale = tileW / W;
                  const formatTitle =
                    aspect === "story"
                      ? `Stories (${canvas.slides.length} páginas)`
                      : canvas.slides.length === 1
                        ? "Imagem única"
                        : `Carrossel (${canvas.slides.length} páginas)`;

                  return (
                    <article key={v.id} className={st.variationCard}>
                      <strong style={{ fontSize: 14 }}>{formatTitle}</strong>

                      <div className={st.variationStrip} style={{ justifyContent: canvas.slides.length === 1 ? "center" : "flex-start" }}>
                        {canvas.slides.map((sl, si) => (
                          <div
                            key={sl.id}
                            style={{
                              flex: "0 0 auto",
                              width: tileW,
                              height: Math.round(H * tileScale),
                              borderRadius: 8,
                              overflow: "hidden",
                              pointerEvents: "none",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                            }}
                          >
                            <div style={{ width: W, height: H, transformOrigin: "top left", transform: `scale(${tileScale})` }}>
                              <CanvasSlideView
                                slide={sl}
                                index={si}
                                total={canvas.slides.length}
                                handle={theme.handle}
                                palette={palette}
                                aspect={aspect}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <span style={{ fontSize: 13, color: "var(--soft)", fontWeight: 500 }}>{v.title}</span>

                      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.primary} ${styles.small}`}
                          style={{ flex: 1 }}
                          onClick={() => void openVariationInStudio(v)}
                        >
                          Editar este post
                        </button>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.small}`}
                          onClick={() => remixVariation(vIdx)}
                        >
                          Trocar visual
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* GALERIA VISUAL DE POSTS SALVOS */}
          <section style={{ display: "grid", gap: 14 }} aria-label="Posts salvos">
            <div className={styles.toolbar}>
              <strong style={{ fontSize: 17 }}>Posts recentes</strong>
              {(docs?.length ?? 0) > 3 ? (
                <label className={styles.search}>
                  <SearchIcon />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar um post…"
                  />
                </label>
              ) : null}
            </div>

            {!docs ? (
              <Skeleton kind="rows" count={3} label="Carregando seus posts" />
            ) : visible.length === 0 ? (
              <div className={styles.emptyBody}>
                <p style={{ margin: 0 }}>Nenhum post encontrado.</p>
                <button type="button" className={`${styles.button} ${styles.primary}`} onClick={createBlank}>
                  <PlusIcon />Começar um post em branco
                </button>
              </div>
            ) : (
              <div className={st.postsGrid}>
                {visible.map(doc => {
                  const canvas = ensurePostCanvas(doc);
                  const aspect = doc.studioDoc?.aspect || "carousel";
                  const palette = paletteById(canvas.paletteId);
                  const cover = canvas.slides[0];
                  const { width: W, height: H } = CANVAS_SIZE[aspect];
                  const cardW = aspect === "story" ? 116 : 156;
                  const cardScale = cardW / W;

                  const href = `/admin/estudio/${encodeURIComponent(doc.id)}`;

                  return (
                    <article key={doc.id} className={st.postCard}>
                      <Link href={href} className={st.postCardPreview} aria-label={`Abrir editor de ${doc.title}`}>
                        {cover ? (
                          <div
                            style={{
                              width: cardW,
                              height: Math.round(H * cardScale),
                              borderRadius: 10,
                              overflow: "hidden",
                              pointerEvents: "none",
                              boxShadow: "0 8px 22px rgb(20 22 46 / 14%)",
                            }}
                          >
                            <div style={{ width: W, height: H, transformOrigin: "top left", transform: `scale(${cardScale})` }}>
                              <CanvasSlideView
                                slide={cover}
                                index={0}
                                total={canvas.slides.length}
                                handle={theme.handle}
                                palette={palette}
                                aspect={aspect}
                              />
                            </div>
                          </div>
                        ) : null}
                      </Link>
                      <div className={st.postCardBody}>
                        <Link href={href} className={st.postCardTitle}>{doc.title}</Link>
                        <span className={st.postCardMeta}>
                          {canvas.slides.length} {canvas.slides.length === 1 ? "página" : "páginas"} ·{" "}
                          {aspect === "story" ? "Stories" : "Post 4:5"} · {dayLabel(doc.updatedAt)}
                        </span>
                        <div className={st.postCardActions}>
                          <Link href={href} className={`${styles.button} ${styles.small}`}>
                            Abrir
                          </Link>
                          <button
                            type="button"
                            className={`${styles.button} ${styles.ghost} ${styles.small} ${styles.iconButton}`}
                            title="Duplicar post"
                            aria-label={`Duplicar ${doc.title}`}
                            onClick={() => void duplicatePost(doc)}
                          >
                            <CopyIcon />
                          </button>
                          <button
                            type="button"
                            className={`${styles.button} ${styles.ghost} ${styles.small} ${styles.iconButton} ${styles.danger}`}
                            title="Excluir post"
                            aria-label={`Excluir ${doc.title}`}
                            onClick={() => void deletePost(doc)}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <BusyOverlay label={busyLabel} />
      <Toast toast={toast} onClose={clear} />
    </AdminShell>
  );
}

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
  TEMPLATE_PRESET_OPTIONS,
  type SocialPost,
  type SocialStatus,
  type SocialTheme,
  type TemplatePreset,
} from "@/lib/social/types";
import CanvasSlideView from "@/components/social/CanvasSlideView";
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

const PRESET_SHORT_LABEL: Record<TemplatePreset, string> = {
  repertorio_banca: "Repertório de banca",
  before_after: "Verbete de erro",
  cycle_steps: "Ciclo de estudo",
  radar_temas: "Radar de temas",
  quick_tip: "Pílula / Citação",
};

const OUTPUT_LABELS: Record<StudioOutputKind, string> = {
  carousel: "Carrossel",
  single: "Card único",
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

  // Nova pauta seed state
  const [idea, setIdea] = useState("");
  const [urlOpen, setUrlOpen] = useState(false);
  const [newsUrl, setNewsUrl] = useState("");
  const [preset, setPreset] = useState<TemplatePreset>("repertorio_banca");
  const [outputs, setOutputs] = useState<StudioOutputKind[]>(["carousel", "single", "story"]);
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
        if (studioDocs.length === 0) {
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
    setBusyLabel("Abrindo prancheta em branco…");
    try {
      const now = new Date().toISOString();
      const blocks = [
        {
          type: "socialCover",
          props: {
            eyebrow: "TEXTO EM CICLO",
            title: "Escreva o gancho da sua pauta",
            subtitle: "Clique duas vezes em qualquer texto na arte para editar ou troque o layout abaixo.",
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
        title: "Nova pauta no Estúdio",
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
      if (!res.ok) throw new Error("Erro ao criar prancheta");
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
        setBusyLabel("Transcrevendo seu áudio com Whisper…");
        try {
          const form = new FormData();
          form.append("audio", blob, "pauta.webm");
          const res = await fetch("/api/social/generate", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Erro na transcrição");
          setIdea(prev => (prev ? `${prev}\n${String(data.transcript ?? "")}` : String(data.transcript ?? "")));
          show("Áudio transcrito! Escolha os formatos e clique em Gerar variações.", "good");
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
      show("Permita o microfone no navegador para gravar sua ideia.");
    }
  }

  async function handleEssayPhoto(file: File | undefined) {
    if (!file) return;
    setBusyLabel("Lendo a foto da redação/página e salvando na Mídia…");
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/social/generate", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível ler a foto");
      setIdea(String(data.seed ?? ""));
      show("Foto analisada e salva na aba Mídia!", "good");
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  async function handleFetchUrl() {
    if (!newsUrl.trim()) return;
    setBusyLabel("Lendo notícia para extrair repertório…");
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
      show("Notícia extraída para a pauta!", "good");
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  async function handleGenerateVariations() {
    if (idea.trim().length < 8) {
      show("Escreva, grave ou envie uma pauta com pelo menos 8 caracteres.");
      seedInputRef.current?.focus();
      return;
    }
    setBusyLabel(`Montando ${outputs.length} ${outputs.length === 1 ? "formato visual" : "formatos visuais"} com o repertório do @textoemciclo…`);
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
      if (!res.ok) throw new Error(data.error || "Erro ao gerar variações");
      setVariations(Array.isArray(data.posts) ? (data.posts as SocialPost[]) : []);
      show("Variações prontas! Remix ou abra a que preferir no Estúdio.", "good");
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
    setBusyLabel("Abrindo no Estúdio…");
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: variation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar variação");
      const saved = (data.post as SocialPost) ?? variation;
      router.push(`/admin/estudio/${encodeURIComponent(saved.id)}`);
    } catch (err) {
      show(err);
      setBusyLabel("");
    }
  }

  return (
    <AdminShell
      crumbs={[{ label: "Estúdio" }]}
      actions={
        <button type="button" className={styles.button} onClick={createBlank}>
          <PlusIcon />Em branco
        </button>
      }
    >
      <div className={styles.sheet}>
        <div className={styles.page} data-wide>
          {/* NOVA PAUTA SEED LAUNCHER */}
          <section className={st.seedCard} aria-label="Nova pauta">
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <div>
                <h1 className={styles.title} style={{ fontSize: 22 }}>Nova pauta</h1>
                <p className={styles.subtitle} style={{ marginTop: 2 }}>
                  Parta de um áudio, foto de redação, notícia ou pensamento solto — e gere peças com composições variadas na hora.
                </p>
              </div>
              {!aiProvider ? (
                <Link href="/admin/chaves" className={styles.chip} data-tone="warn">
                  Configure uma chave de IA em Chaves →
                </Link>
              ) : null}
            </div>

            <div className={st.chipRow}>
              <span className={styles.label} style={{ marginRight: 4 }}>De onde vem a ideia?</span>
              <button type="button" className={st.chipBtn} aria-pressed={recording} onClick={toggleVoiceSeed}>
                {recording ? (
                  <>
                    <span className={st.recDot} />
                    Parar gravação ({recSeconds}s)
                  </>
                ) : (
                  "🎙 Gravar áudio"
                )}
              </button>
              <button type="button" className={st.chipBtn} onClick={() => photoInputRef.current?.click()}>
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
              <button type="button" className={st.chipBtn} aria-pressed={urlOpen} onClick={() => setUrlOpen(v => !v)}>
                🔗 Link de notícia
              </button>
              <button type="button" className={st.chipBtn} onClick={() => seedInputRef.current?.focus()}>
                ✍️ Texto solto
              </button>
            </div>

            {urlOpen ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className={styles.input}
                  value={newsUrl}
                  onChange={e => setNewsUrl(e.target.value)}
                  placeholder="https://... cole o link da reportagem ou tema atual"
                />
                <button type="button" className={styles.button} onClick={handleFetchUrl}>
                  Extrair pauta
                </button>
              </div>
            ) : null}

            <textarea
              ref={seedInputRef}
              className={styles.textarea}
              rows={3}
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder="Ex.: Árbitro barrado nos EUA na Copa — globalização como perversidade (Milton Santos) e como articular isso na UERJ/UNESP…"
            />

            <div className={st.chipRow}>
              {TEMPLATE_PRESET_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={st.chipBtn}
                  aria-pressed={preset === opt.value}
                  title={opt.hint}
                  onClick={() => setPreset(opt.value)}
                >
                  {PRESET_SHORT_LABEL[opt.value]}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div className={st.chipRow}>
                {(["carousel", "single", "story"] as StudioOutputKind[]).map(out => {
                  const active = outputs.includes(out);
                  return (
                    <button
                      key={out}
                      type="button"
                      className={st.chipBtn}
                      aria-pressed={active}
                      onClick={() => toggleOutput(out)}
                    >
                      {OUTPUT_LABELS[out]} {active ? "✓" : ""}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className={`${styles.button} ${styles.primary}`}
                disabled={!aiProvider}
                onClick={handleGenerateVariations}
              >
                <SparkIcon />Gerar variações
              </button>
            </div>
          </section>

          {/* GENERATED VARIATIONS BOARD */}
          {variations.length > 0 ? (
            <section style={{ display: "grid", gap: 12 }} aria-label="Variações geradas">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className={styles.rowTitle}>Variações prontas para esta pauta</span>
                <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={() => setVariations([])}>
                  Limpar quadro
                </button>
              </div>

              <div className={st.variationsGrid}>
                {variations.map((v, vIdx) => {
                  const doc = v.studioDoc ?? STARTER_STUDIO_DOC;
                  const aspect = doc.aspect || "carousel";
                  const canvas = ensurePostCanvas(v);
                  const palette = paletteById(canvas.paletteId);
                  const { width: W, height: H } = CANVAS_SIZE[aspect];
                  const tileW = canvas.slides.length === 1 ? 230 : aspect === "story" ? 112 : 138;
                  const tileScale = tileW / W;
                  const formatTitle =
                    aspect === "story"
                      ? `Stories · ${canvas.slides.length} telas`
                      : canvas.slides.length === 1
                        ? "Card único"
                        : `Carrossel · ${canvas.slides.length} slides`;

                  return (
                    <article key={v.id} className={st.variationCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                        <strong style={{ fontSize: 13.5 }}>{formatTitle}</strong>
                        <span className={styles.rowMeta} style={{ fontSize: 11.5 }}>
                          {CANVAS_PALETTES.find(p => p.id === canvas.paletteId)?.label.split("(")[0]?.trim()}
                        </span>
                      </div>

                      <div className={st.variationStrip} style={{ justifyContent: canvas.slides.length === 1 ? "center" : "flex-start" }}>
                        {canvas.slides.map((sl, si) => (
                          <div
                            key={sl.id}
                            style={{
                              flex: "0 0 auto",
                              width: tileW,
                              height: Math.round(H * tileScale),
                              borderRadius: 6,
                              overflow: "hidden",
                              pointerEvents: "none",
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

                      <span className={styles.rowMeta} style={{ fontSize: 12.5, color: "var(--soft)" }}>
                        {v.title}
                      </span>

                      <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.primary} ${styles.small}`}
                          onClick={() => void openVariationInStudio(v)}
                        >
                          Abrir no estúdio
                        </button>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.small}`}
                          onClick={() => remixVariation(vIdx)}
                        >
                          Remixar
                        </button>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.ghost} ${styles.small}`}
                          onClick={() => setVariations(prev => prev.filter((_, i) => i !== vIdx))}
                        >
                          Descartar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* SAVED STUDIO POSTS */}
          <section style={{ display: "grid", gap: 12 }} aria-label="Posts salvos no Estúdio">
            <div className={styles.toolbar}>
              <span className={styles.rowTitle}>Seus posts no Estúdio</span>
              <label className={styles.search}>
                <SearchIcon />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar por título ou legenda…"
                />
              </label>
            </div>

            {!docs ? (
              <Skeleton kind="rows" count={4} label="Carregando o Estúdio" />
            ) : visible.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Nenhum post encontrado.</p>
                <button type="button" className={`${styles.button} ${styles.primary}`} onClick={createBlank}>
                  <PlusIcon />Criar prancheta em branco
                </button>
              </div>
            ) : (
              <div className={styles.rows}>
                {visible.map(doc => {
                  const chip = STATUS_CHIP[doc.status] ?? STATUS_CHIP.in_review;
                  const canvas = ensurePostCanvas(doc);
                  const aspect = doc.studioDoc?.aspect || "carousel";
                  const palette = paletteById(canvas.paletteId);
                  const cover = canvas.slides[0];
                  const { width: W, height: H } = CANVAS_SIZE[aspect];
                  const miniW = 48;
                  const miniScale = miniW / W;

                  return (
                    <Link key={doc.id} href={`/admin/estudio/${encodeURIComponent(doc.id)}`} className={styles.row}>
                      {cover ? (
                        <div
                          style={{
                            width: miniW,
                            height: Math.round(H * miniScale),
                            borderRadius: 5,
                            overflow: "hidden",
                            flexShrink: 0,
                            pointerEvents: "none",
                          }}
                        >
                          <div style={{ width: W, height: H, transformOrigin: "top left", transform: `scale(${miniScale})` }}>
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
                      <div className={styles.rowMain}>
                        <span className={styles.rowTitle}>{doc.title}</span>
                        <span className={styles.rowMeta}>
                          {canvas.slides.length} {canvas.slides.length === 1 ? "slide" : "slides"} ·{" "}
                          {aspect === "story" ? "Stories 9:16" : "Carrossel 4:5"} · {dayLabel(doc.updatedAt)}
                        </span>
                      </div>
                      <span className={styles.chip} data-tone={chip.tone}>
                        {chip.label}
                      </span>
                      <span className={styles.go} aria-hidden>
                        <ArrowIcon />
                      </span>
                    </Link>
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

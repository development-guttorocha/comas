"use client";
/* eslint-disable @next/next/no-img-element -- thumbnail preview of social media assets. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { newReel } from "@/lib/reel/sceneFields";
import { beatTime, type ReelTrack } from "@/lib/reel/tracks";
import type { ReelDoc, ReelScene } from "@/lib/reel/types";
import { DEFAULT_SOCIAL_THEME } from "@/lib/social/presets";
import type { SocialPost, SocialTheme } from "@/lib/social/types";
import AdminShell from "./AdminShell";
import BusyOverlay from "./BusyOverlay";
import { Toast, useToast } from "./client";
import { CopyIcon, PlusIcon, SearchIcon, SparkIcon, TrashIcon } from "./icons";
import Skeleton from "./Skeleton";
import styles from "./admin.module.css";
import g from "./reelsGallery.module.css";

const dayLabel = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
};

function firstSceneCover(reel: ReelDoc | null | undefined): { headline: string; image?: string } {
  const first: ReelScene | undefined = reel?.scenes?.[0];
  if (!first) return { headline: reel?.title || "Novo vídeo" };
  const clean = (text?: string) => (text ?? "").replace(/\*/g, "").replace(/\n/g, " ").trim();
  let headline = "";
  let image: string | undefined;

  switch (first.kind) {
    case "title":
    case "end":
      headline = clean(first.lines?.join(" "));
      if (first.kind === "title") image = first.image;
      break;
    case "image":
      headline = clean(first.lines?.join(" ")) || clean(first.body);
      image = first.src;
      break;
    case "list":
      headline = clean(first.heading);
      image = first.image;
      break;
    case "flow":
    case "cards":
    case "role":
      headline = clean(first.heading);
      break;
    case "quote":
      headline = clean(first.quote);
      image = first.photo;
      break;
    case "number":
      headline = `${first.prefix ?? ""}${first.value}${first.suffix ?? ""} ${clean(first.label)}`.trim();
      break;
    case "metrics":
      headline = `${first.value} ${clean(first.label)}`.trim();
      break;
    case "delta":
      headline = `${first.before?.value ?? ""} → ${first.after?.value ?? ""} ${clean(first.label)}`.trim();
      break;
    case "compare":
      headline = `${first.before?.label ?? ""} → ${first.after?.label ?? ""}`.trim();
      image = first.after?.src || first.before?.src;
      break;
    case "screens":
      headline = clean(first.title);
      image = first.boards?.[0]?.src || first.shots?.[0]?.src;
      break;
  }

  return { headline: headline || reel?.title || "Novo vídeo", image };
}

function durationLabel(reel: ReelDoc | null | undefined, tracks: ReelTrack[]): string {
  if (!reel) return "";
  const track = tracks.find(t => t.id === reel.track) ?? tracks[0];
  if (!track) return "";
  const sec = Math.max(1, Math.round(beatTime(track, reel.end)));
  return `${sec}s`;
}

export default function AdminReelsGallery({ tracks }: { tracks: ReelTrack[] }) {
  const router = useRouter();
  const [reels, setReels] = useState<SocialPost[] | null>(null);
  const [theme, setTheme] = useState<SocialTheme>(DEFAULT_SOCIAL_THEME);
  const [query, setQuery] = useState("");
  const [idea, setIdea] = useState("");
  const [busyLabel, setBusyLabel] = useState("");
  const { toast, show, clear } = useToast();

  useEffect(() => {
    fetch("/api/social/posts", { cache: "no-store" })
      .then(async r => {
        if (r.status === 401) {
          window.location.replace("/admin/login?next=%2Fadmin%2Freels");
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        const all = Array.isArray(data.posts) ? (data.posts as SocialPost[]) : [];
        const onlyReels = all.filter(p => p.format === "reel" || p.reel);
        if (data.theme) setTheme(data.theme as SocialTheme);

        if (onlyReels.length === 0) {
          const now = new Date().toISOString();
          const starter: SocialPost = {
            id: "reel_demo_clareza",
            title: "Dica rápida: Clareza na escrita",
            format: "reel",
            status: "in_review",
            slides: [],
            reel: {
              ...newReel(data.theme?.palette?.accent ?? "#3E2A8D", "Clareza na escrita", tracks[0]?.id ?? "bull"),
              aspect: "9:16",
            },
            caption: "Escrever bem é facilitar o caminho de quem lê.\n\n#textoemciclo #escrita #reels",
            createdAt: now,
            updatedAt: now,
          };
          setReels([starter]);
          void fetch("/api/social/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ post: starter }),
          }).catch(() => {});
        } else {
          setReels(onlyReels);
        }
      })
      .catch(err => {
        show(err);
        setReels([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const list = reels ?? [];
    const q = query.trim().toLowerCase();
    return list.filter(r => !q || `${r.title} ${r.caption}`.toLowerCase().includes(q));
  }, [reels, query]);

  async function createBlankReel() {
    setBusyLabel("Criando vídeo vertical 9:16…");
    try {
      const now = new Date().toISOString();
      const title = idea.trim() ? idea.trim().slice(0, 64) : "Novo vídeo · Texto em Ciclo";
      const doc: ReelDoc = {
        ...newReel(theme.palette.accent || "#3E2A8D", title, tracks[0]?.id ?? "bull"),
        aspect: "9:16",
      };
      const post: SocialPost = {
        id: `reel_${Date.now().toString(36)}`,
        title,
        format: "reel",
        status: "in_review",
        slides: [],
        reel: doc,
        caption: "",
        createdAt: now,
        updatedAt: now,
      };
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post }),
      });
      if (!res.ok) throw new Error("Erro ao criar vídeo");
      router.push(`/admin/reels/${encodeURIComponent(post.id)}`);
    } catch (err) {
      show(err);
      setBusyLabel("");
    }
  }

  async function createWithAI() {
    setBusyLabel("A IA está montando o roteiro vertical (9:16) do seu vídeo…");
    try {
      const genRes = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seconds: 30,
          track: tracks[0]?.id ?? "bull",
          personality: "energetic",
          notes: idea.trim() || "Dica prática de redação e escrita para o Instagram @textoemciclo",
        }),
      });
      const genData = await genRes.json();
      if (!genRes.ok || !genData.reel) {
        throw new Error(genData.error || "Não foi possível gerar o roteiro agora.");
      }

      const generatedReel: ReelDoc = {
        ...(genData.reel as ReelDoc),
        aspect: "9:16",
      };
      const now = new Date().toISOString();
      const post: SocialPost = {
        id: `reel_${Date.now().toString(36)}`,
        title: generatedReel.title || idea.trim().slice(0, 64) || "Novo Reel com IA",
        format: "reel",
        status: "in_review",
        slides: [],
        reel: generatedReel,
        caption: "",
        createdAt: now,
        updatedAt: now,
      };
      const saveRes = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post }),
      });
      if (!saveRes.ok) throw new Error("Erro ao salvar vídeo gerado");
      router.push(`/admin/reels/${encodeURIComponent(post.id)}`);
    } catch (err) {
      show(err);
      setBusyLabel("");
    }
  }

  async function duplicateReel(item: SocialPost) {
    setBusyLabel("Duplicando vídeo…");
    try {
      const now = new Date().toISOString();
      const copyTitle = `${item.title} (cópia)`;
      const copyReel: ReelDoc | undefined = item.reel
        ? { ...structuredClone(item.reel), title: copyTitle, aspect: item.reel.aspect ?? "9:16" }
        : undefined;
      const copy: SocialPost = {
        ...structuredClone(item),
        id: `reel_${Date.now().toString(36)}`,
        title: copyTitle,
        reel: copyReel,
        createdAt: now,
        updatedAt: now,
      };
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: copy }),
      });
      if (!res.ok) throw new Error("Erro ao duplicar vídeo");
      setReels(list => [copy, ...(list ?? [])]);
      show("Cópia criada na galeria!", "good");
    } catch (err) {
      show(err);
    } finally {
      setBusyLabel("");
    }
  }

  async function deleteReel(item: SocialPost) {
    if (!confirm(`Excluir o vídeo "${item.title}"?`)) return;
    try {
      const res = await fetch(`/api/social/posts?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir vídeo");
      setReels(list => (list ?? []).filter(r => r.id !== item.id));
      show("Vídeo excluído.");
    } catch (err) {
      show(err);
    }
  }

  return (
    <AdminShell
      crumbs={[{ label: "Vídeos (Reels)" }]}
      actions={
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => void createBlankReel()}>
          <PlusIcon />Novo vídeo
        </button>
      }
    >
      <div className={styles.sheet}>
        <div className={styles.page}>
          {/* CRIAÇÃO RÁPIDA DE NOVO VÍDEO */}
          <section className={g.heroCard} aria-label="Criar novo vídeo">
            <div className={g.heroHeader}>
              <div>
                <h1 className={g.heroTitle}>Qual vídeo vamos criar hoje?</h1>
                <p className={g.heroSub}>
                  Escreva um tema para a IA montar um Reel vertical (9:16) pronto para editar, ou comece um vídeo em branco.
                </p>
              </div>
            </div>

            <textarea
              className={g.heroInput}
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder="Ex.: 3 erros comuns na introdução da redação do ENEM e como corrigir na hora..."
              aria-label="Tema ou ideia do vídeo"
            />

            <div className={g.heroActions}>
              <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => void createWithAI()}>
                <SparkIcon />Criar roteiro com IA
              </button>
              <button type="button" className={styles.button} onClick={() => void createBlankReel()}>
                <PlusIcon />Começar vídeo em branco
              </button>
            </div>
          </section>

          {/* GALERIA DE VÍDEOS SALVOS */}
          <section style={{ display: "grid", gap: 14 }} aria-label="Vídeos salvos">
            <div className={styles.toolbar}>
              <strong style={{ fontSize: 17 }}>
                Vídeos recentes {reels ? `(${reels.length})` : ""}
              </strong>
              {(reels?.length ?? 0) > 3 ? (
                <label className={styles.search}>
                  <SearchIcon />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar um vídeo…"
                  />
                </label>
              ) : null}
            </div>

            {!reels ? (
              <Skeleton kind="rows" count={3} label="Carregando seus vídeos" />
            ) : visible.length === 0 ? (
              <div className={styles.emptyBody}>
                <p style={{ margin: 0 }}>Nenhum vídeo encontrado.</p>
                <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => void createBlankReel()}>
                  <PlusIcon />Criar primeiro vídeo
                </button>
              </div>
            ) : (
              <div className={g.reelsGrid}>
                {visible.map(item => {
                  const reel = item.reel;
                  const aspect = reel?.aspect ?? "9:16";
                  const accent = reel?.accent || theme.palette.accent || "#3E2A8D";
                  const cover = firstSceneCover(reel);
                  const scenesCount = reel?.scenes?.length ?? 0;
                  const dur = durationLabel(reel, tracks);
                  const href = `/admin/reels/${encodeURIComponent(item.id)}`;

                  return (
                    <article key={item.id} className={g.reelCard}>
                      <Link href={href} className={g.reelPreviewLink} aria-label={`Abrir editor de ${item.title}`}>
                        <div className={g.phoneThumb} data-aspect={aspect}>
                          {cover.image ? <img src={cover.image} alt="" className={g.thumbImg} /> : null}
                          <div
                            className={g.thumbGlow}
                            style={{
                              background: `radial-gradient(circle at 20% 15%, ${accent}66 0%, transparent 65%), linear-gradient(180deg, rgb(12 13 22 / 25%) 0%, rgb(12 13 22 / 78%) 100%)`,
                            }}
                          />
                          <div className={g.thumbTop}>
                            <span className={g.aspectBadge}>{aspect}</span>
                          </div>
                          <p className={g.thumbHeadline}>{cover.headline}</p>
                          <div className={g.thumbBottom}>
                            <span className={g.thumbAccentDot} style={{ background: accent }} />
                            <span className={g.thumbPlay} aria-hidden>
                              <svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
                            </span>
                          </div>
                        </div>
                      </Link>

                      <div className={g.reelBody}>
                        <Link href={href} className={g.reelTitleLink}>
                          {item.title}
                        </Link>
                        <span className={g.reelMeta}>
                          {scenesCount} {scenesCount === 1 ? "cena" : "cenas"}
                          {dur ? ` · ${dur}` : ""} · {aspect} · {dayLabel(item.updatedAt)}
                        </span>
                        <div className={g.reelActions}>
                          <Link href={href} className={`${styles.button} ${styles.small}`}>
                            Abrir editor
                          </Link>
                          <button
                            type="button"
                            className={`${styles.button} ${styles.ghost} ${styles.small} ${styles.iconButton}`}
                            title="Duplicar vídeo"
                            aria-label={`Duplicar ${item.title}`}
                            onClick={() => void duplicateReel(item)}
                          >
                            <CopyIcon />
                          </button>
                          <button
                            type="button"
                            className={`${styles.button} ${styles.ghost} ${styles.small} ${styles.iconButton} ${styles.danger}`}
                            title="Excluir vídeo"
                            aria-label={`Excluir ${item.title}`}
                            onClick={() => void deleteReel(item)}
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

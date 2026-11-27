"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { newReel } from "@/lib/reel/sceneFields";
import type { ReelTrack } from "@/lib/reel/tracks";
import type { ReelDoc } from "@/lib/reel/types";
import { DEFAULT_SOCIAL_THEME } from "@/lib/social/presets";
import type { SocialPost, SocialTheme } from "@/lib/social/types";
import AdminShell from "./AdminShell";
import { Toast, useToast } from "./client";
import { CropProvider } from "./CropDialog";
import { MediaProvider } from "./MediaPicker";
import type { ReelProposal } from "./ReelStudio";
import MuapiGeneratorDialog from "./MuapiGeneratorDialog";
import Skeleton from "./Skeleton";
import { ImageIcon, PlayIcon, PlusIcon, TrashIcon } from "./icons";
import styles from "./admin.module.css";

const ReelStudio = dynamic(() => import("./ReelStudio"), {
  ssr: false,
  loading: () => <Skeleton kind="text" label="Abrindo o estúdio de vídeo" />,
});

export default function AdminSocialReels({ tracks }: { tracks: ReelTrack[] }) {
  const [reels, setReels] = useState<SocialPost[] | null>(null);
  const [theme, setTheme] = useState<SocialTheme>(DEFAULT_SOCIAL_THEME);
  const [selectedId, setSelectedId] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [proposal, setProposal] = useState<ReelProposal | null>(null);
  const [undo, setUndo] = useState<ReelDoc | null>(null);
  const [muapiKind, setMuapiKind] = useState<"image" | "video" | null>(null);
  const [lastMuapiVideo, setLastMuapiVideo] = useState<string>("");
  const { toast, show } = useToast();

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
            reel: { ...newReel(data.theme?.palette?.accent ?? "#3E2A8D", "Clareza na escrita", tracks[0]?.id ?? "bull"), aspect: "9:16" },
            caption: "Escrever bem é facilitar o caminho de quem lê.\n\n#textoemciclo #escrita #reels",
            createdAt: now,
            updatedAt: now,
          };
          setReels([starter]);
          setSelectedId(starter.id);
        } else {
          const normalized = onlyReels.map(p => (p.reel ? { ...p, reel: { ...p.reel, aspect: p.reel.aspect ?? "9:16" as const } } : p));
          setReels(normalized);
          setSelectedId(normalized[0]!.id);
        }
      })
      .catch(err => {
        show(err);
        setReels([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = reels?.find(r => r.id === selectedId) ?? reels?.[0] ?? null;

  function updateCurrentReel(nextReel: ReelDoc | null) {
    if (!current) return;
    setReels(list =>
      (list ?? []).map(item =>
        item.id === current.id ? { ...item, title: nextReel?.title || item.title, reel: nextReel } : item,
      ),
    );
    setDirty(true);
  }

  async function save(target = current) {
    if (!target) return;
    setSaving(true);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: { ...target, format: "reel" } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar vídeo");
      setDirty(false);
      show("Vídeo salvo!", "good");
    } catch (err) {
      show(err);
    } finally {
      setSaving(false);
    }
  }

  async function createNewReel() {
    const now = new Date().toISOString();
    const doc: ReelDoc = {
      ...newReel(theme.palette.accent, "Novo vídeo · Texto em Ciclo", tracks[0]?.id ?? "bull"),
      aspect: "9:16",
    };
    const post: SocialPost = {
      id: `reel_${Date.now().toString(36)}`,
      title: "Novo vídeo · Texto em Ciclo",
      format: "reel",
      status: "in_review",
      slides: [],
      reel: doc,
      caption: "",
      createdAt: now,
      updatedAt: now,
    };
    setReels(list => [post, ...(list ?? [])]);
    setSelectedId(post.id);
    setProposal(null);
    setUndo(null);
    await save(post);
  }

  async function removeReel() {
    if (!current || !confirm(`Excluir "${current.title}"?`)) return;
    try {
      await fetch(`/api/social/posts?id=${encodeURIComponent(current.id)}`, { method: "DELETE" });
      const rest = (reels ?? []).filter(r => r.id !== current.id);
      setReels(rest);
      setSelectedId(rest[0]?.id ?? "");
      setDirty(false);
      show("Vídeo excluído.");
    } catch (err) {
      show(err);
    }
  }

  return (
    <AdminShell
      crumbs={[{ label: "Vídeos (Reels 9:16)" }]}
      actions={
        <>
          {current ? (
            <span className={styles.saveState} data-dirty={dirty ? "true" : undefined} data-saving={saving || undefined}>
              {saving ? "Salvando…" : dirty ? "Alterações não salvas" : "Salvo"}
            </span>
          ) : null}
          <button type="button" className={styles.button} onClick={() => setMuapiKind("image")}>
            <ImageIcon />Imagem IA
          </button>
          <button type="button" className={styles.button} onClick={() => setMuapiKind("video")}>
            <PlayIcon />Clipe IA
          </button>
          <button type="button" className={styles.button} onClick={createNewReel}>
            <PlusIcon />Novo vídeo
          </button>
          {current ? (
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              disabled={saving}
              onClick={() => void save()}
            >
              Salvar
            </button>
          ) : null}
        </>
      }
    >
      <CropProvider>
        <MediaProvider folder="reels" slug="texto-em-ciclo" source="social">
          <div className={styles.sheet}>
            <div className={styles.page} data-wide>
              {lastMuapiVideo ? (
                <div className={styles.panel} style={{ padding: 12, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--raised)" }}>
                  <span style={{ fontSize: 13 }}>
                    <strong>Clipe 9:16 gerado com IA:</strong> pronto para baixar ou usar como B-roll.
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <a href={lastMuapiVideo} target="_blank" rel="noreferrer" download className={`${styles.button} ${styles.primary} ${styles.small}`}>
                      Abrir / Baixar MP4
                    </a>
                    <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={() => setLastMuapiVideo("")}>
                      Fechar
                    </button>
                  </div>
                </div>
              ) : null}

              {reels && reels.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div className={styles.tabs} role="tablist" aria-label="Vídeos salvos">
                    {reels.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        role="tab"
                        className={styles.tab}
                        aria-selected={r.id === current?.id}
                        onClick={() => {
                          setSelectedId(r.id);
                          setProposal(null);
                          setUndo(null);
                        }}
                      >
                        {r.title}
                      </button>
                    ))}
                  </div>
                  {current && reels.length > 1 ? (
                    <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small} ${styles.danger}`} onClick={removeReel}>
                      <TrashIcon />Excluir vídeo
                    </button>
                  ) : null}
                </div>
              ) : null}

              {!reels ? (
                <Skeleton kind="text" label="Carregando vídeos" />
              ) : current ? (
                <ReelStudio
                  slug={current.id}
                  reel={current.reel ?? null}
                  onChange={updateCurrentReel}
                  accent={theme.palette.accent}
                  company={theme.brandName}
                  notify={(msg, tone) => show(msg, tone)}
                  tracks={tracks}
                  proposal={proposal}
                  onProposal={setProposal}
                  undo={undo}
                  onUndo={setUndo}
                  generateUrl="/api/social/generate"
                  socialMode
                />
              ) : null}
            </div>
          </div>

          <MuapiGeneratorDialog
            open={muapiKind !== null}
            kindFilter={muapiKind ?? "image"}
            onResult={(url, meta) => {
              if (muapiKind === "video") {
                setLastMuapiVideo(url);
                show(meta.costUsd ? `Clipe gerado na MuAPI ($${meta.costUsd.toFixed(4)})!` : "Clipe gerado na MuAPI!", "good");
              } else if (current?.reel) {
                const doc = current.reel;
                const nextScene = {
                  id: `muapi-${Date.now().toString(36)}`,
                  kind: "image" as const,
                  at: doc.end,
                  enter: "fade" as const,
                  src: url,
                  body: theme.brandName,
                };
                updateCurrentReel({
                  ...doc,
                  end: doc.end + 12,
                  scenes: [...doc.scenes, nextScene],
                });
                show(meta.costUsd ? `Cena adicionada na timeline ($${meta.costUsd.toFixed(4)})!` : "Cena adicionada na timeline!", "good");
              }
            }}
            onClose={() => setMuapiKind(null)}
          />

          <Toast toast={toast} />
        </MediaProvider>
      </CropProvider>
    </AdminShell>
  );
}

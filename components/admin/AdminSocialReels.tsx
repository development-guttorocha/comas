"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { ImageIcon, PlayIcon, TrashIcon } from "./icons";
import styles from "./admin.module.css";

const ReelStudio = dynamic(() => import("./ReelStudio"), {
  ssr: false,
  loading: () => <Skeleton kind="text" label="Abrindo o estúdio de vídeo" />,
});

export default function AdminSocialReels({ id, tracks }: { id: string; tracks: ReelTrack[] }) {
  const router = useRouter();
  const [current, setCurrent] = useState<SocialPost | null | undefined>(undefined);
  const [theme, setTheme] = useState<SocialTheme>(DEFAULT_SOCIAL_THEME);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [proposal, setProposal] = useState<ReelProposal | null>(null);
  const [undo, setUndo] = useState<ReelDoc | null>(null);
  const [muapiKind, setMuapiKind] = useState<"image" | "video" | null>(null);
  const [lastMuapiVideo, setLastMuapiVideo] = useState<string>("");
  const { toast, show, clear } = useToast();

  useEffect(() => {
    fetch("/api/social/posts", { cache: "no-store" })
      .then(async r => {
        if (r.status === 401) {
          window.location.replace(`/admin/login?next=${encodeURIComponent(`/admin/reels/${id}`)}`);
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        const all = Array.isArray(data.posts) ? (data.posts as SocialPost[]) : [];
        if (data.theme) setTheme(data.theme as SocialTheme);
        const found = all.find(p => p.id === id) ?? null;
        if (found && found.reel) {
          setCurrent({
            ...found,
            reel: { ...found.reel, aspect: found.reel.aspect ?? "9:16" },
          });
        } else {
          setCurrent(found);
        }
      })
      .catch(err => {
        show(err);
        setCurrent(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateCurrentReel(nextReel: ReelDoc | null) {
    setCurrent(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        title: nextReel?.title || prev.title,
        reel: nextReel,
      };
    });
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

  async function removeReel() {
    if (!current || !confirm(`Excluir "${current.title}"?`)) return;
    try {
      const res = await fetch(`/api/social/posts?id=${encodeURIComponent(current.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir vídeo");
      router.push("/admin/reels");
    } catch (err) {
      show(err);
    }
  }

  return (
    <AdminShell
      crumbs={[
        { label: "Vídeos", href: "/admin/reels" },
        { label: current?.title || "Editor de vídeo" },
      ]}
      actions={
        current ? (
          <>
            <span className={styles.saveState} data-dirty={dirty ? "true" : undefined} data-saving={saving || undefined}>
              {saving ? "Salvando…" : dirty ? "Alterações não salvas" : "Salvo"}
            </span>
            <button type="button" className={styles.button} onClick={() => setMuapiKind("image")}>
              <ImageIcon />Imagem IA
            </button>
            <button type="button" className={styles.button} onClick={() => setMuapiKind("video")}>
              <PlayIcon />Clipe IA
            </button>
            <button type="button" className={`${styles.button} ${styles.ghost} ${styles.danger}`} onClick={() => void removeReel()}>
              <TrashIcon />Excluir
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
        ) : null
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

              {current === undefined ? (
                <Skeleton kind="text" label="Carregando vídeo" />
              ) : current === null ? (
                <div className={styles.emptyBody}>
                  <p style={{ margin: 0 }}>Vídeo não encontrado.</p>
                  <Link href="/admin/reels" className={`${styles.button} ${styles.primary}`}>
                    Voltar para a galeria de vídeos
                  </Link>
                </div>
              ) : (
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
              )}
            </div>
          </div>

          <MuapiGeneratorDialog
            open={muapiKind !== null}
            kindFilter={muapiKind ?? "image"}
            onResult={(url, meta) => {
              if (muapiKind === "video") {
                setLastMuapiVideo(url);
                show(meta.costUsd ? `Clipe gerado com IA ($${meta.costUsd.toFixed(4)})!` : "Clipe gerado com IA!", "good");
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

          <Toast toast={toast} onClose={clear} />
        </MediaProvider>
      </CropProvider>
    </AdminShell>
  );
}

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
import Skeleton from "./Skeleton";
import { PlusIcon, TrashIcon } from "./icons";
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
  const { toast, show } = useToast();

  useEffect(() => {
    fetch("/api/social/posts", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
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
            reel: newReel(data.theme?.palette?.accent ?? "#C85A32", "Clareza na escrita", tracks[0]?.id ?? "bull"),
            caption: "Escrever bem é facilitar o caminho de quem lê.\n\n#textoemciclo #escrita #reels",
            createdAt: now,
            updatedAt: now,
          };
          setReels([starter]);
          setSelectedId(starter.id);
        } else {
          setReels(onlyReels);
          setSelectedId(onlyReels[0]!.id);
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
    const doc = newReel(theme.palette.accent, "Novo vídeo · Texto em Ciclo", tracks[0]?.id ?? "bull");
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
      crumbs={[{ label: "Reels (Motor de Vídeo)" }]}
      actions={
        <>
          {current ? (
            <span className={styles.saveState} data-dirty={dirty ? "true" : undefined} data-saving={saving || undefined}>
              {saving ? "Salvando…" : dirty ? "Alterações não salvas" : "Salvo"}
            </span>
          ) : null}
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
        <MediaProvider folder="cases" slug="texto-em-ciclo">
          <div className={styles.sheet}>
            <div className={styles.page} data-wide>
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
                />
              ) : null}
            </div>
          </div>
          <Toast toast={toast} />
        </MediaProvider>
      </CropProvider>
    </AdminShell>
  );
}

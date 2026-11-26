"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createEmptySlide,
  TEMPLATE_PRESET_OPTIONS,
  type SocialPost,
  type SocialStatus,
  type TemplatePreset,
} from "@/lib/social/types";
import AdminShell from "./AdminShell";
import BusyOverlay from "./BusyOverlay";
import { Toast, useToast } from "./client";
import { ArrowIcon, PlusIcon, SearchIcon, SparkIcon } from "./icons";
import Skeleton from "./Skeleton";
import styles from "./admin.module.css";

type Filter = "todos" | "rascunhos" | "revisao" | "exportados";
const FILTERS: { id: Filter; label: string; test: (p: SocialPost) => boolean }[] = [
  { id: "todos", label: "Todos", test: () => true },
  { id: "rascunhos", label: "Propostas IA", test: p => p.status === "draft_ai" },
  { id: "revisao", label: "Em revisão", test: p => p.status === "in_review" },
  { id: "exportados", label: "Exportados", test: p => p.status === "exported" },
];

const STATUS_CHIP: Record<SocialStatus, { label: string; tone?: "good" | "warn" | "bad" }> = {
  draft_ai: { label: "Proposta IA", tone: "warn" },
  in_review: { label: "Em revisão" },
  exported: { label: "Exportado", tone: "good" },
};

const dayLabel = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
};

export default function AdminSocialPosts() {
  const router = useRouter();
  const aiDialog = useRef<HTMLDialogElement>(null);
  const [posts, setPosts] = useState<SocialPost[] | null>(null);
  const [storage, setStorage] = useState<string>("local");
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  const [busyLabel, setBusyLabel] = useState("");

  const [idea, setIdea] = useState("");
  const [preset, setPreset] = useState<TemplatePreset>("repertorio_banca");
  const [slideCount, setSlideCount] = useState(6);

  const { toast, show } = useToast();

  useEffect(() => {
    fetch("/api/social/posts", { cache: "no-store" })
      .then(async r => {
        if (r.status === 401) {
          window.location.replace("/admin/login");
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        const list = Array.isArray(data.posts) ? (data.posts as SocialPost[]) : [];
        setPosts(list.filter(p => p.format !== "studio_doc" && p.format !== "reel"));
        if (data.storage) setStorage(data.storage);
        setAiProvider(data.aiProvider ?? null);
      })
      .catch(err => {
        show(err);
        setPosts([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const list = posts ?? [];
    const q = query.trim().toLowerCase();
    const test = FILTERS.find(f => f.id === filter)!.test;
    return list.filter(p => test(p) && (!q || `${p.title} ${p.caption}`.toLowerCase().includes(q)));
  }, [filter, posts, query]);

  async function createBlank() {
    setBusyLabel("Criando novo carrossel…");
    try {
      const now = new Date().toISOString();
      const post: SocialPost = {
        id: `post_${Date.now().toString(36)}`,
        title: "Novo carrossel",
        format: "carousel",
        status: "in_review",
        caption: "Escreva a legenda aqui…\n\n#textoemciclo #redacao #vestibular #enem #vunesp",
        slides: [
          createEmptySlide("cover", 1),
          createEmptySlide("content", 1),
          createEmptySlide("comparison", 2),
          createEmptySlide("cta", 3),
        ],
        createdAt: now,
        updatedAt: now,
      };
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar post");
      router.push(`/admin/carrosseis/${post.id}`);
    } catch (err) {
      show(err);
      setBusyLabel("");
    }
  }

  async function createWithAi(e: React.FormEvent) {
    e.preventDefault();
    aiDialog.current?.close();
    setBusyLabel("A IA está estruturando os slides e a legenda da Texto em Ciclo…");
    try {
      const res = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, preset, slideCount, save: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar com IA");
      router.push(`/admin/carrosseis/${data.post.id}`);
    } catch (err) {
      show(err);
      setBusyLabel("");
    }
  }

  return (
    <AdminShell
      crumbs={[{ label: "Carrosséis" }]}
      actions={
        <>
          <button type="button" className={styles.button} onClick={createBlank}>
            <PlusIcon />Novo em branco
          </button>
          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => aiDialog.current?.showModal()}>
            <SparkIcon />Gerar com IA
          </button>
        </>
      }
    >
      <div className={styles.sheet}>
        <div className={styles.page}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.title}>Carrosséis</h1>
              <p className={styles.pageSummary}>
                {posts
                  ? [
                      `${posts.length} ${posts.length === 1 ? "post" : "posts"}`,
                      `${posts.filter(p => p.status === "exported").length} exportados`,
                      storage === "supabase" ? "Salvo no Supabase" : storage === "supabase_missing_table" ? "Falta criar tabela no Supabase" : "Modo local",
                    ].join(" · ")
                  : "Carregando…"}
              </p>
            </div>
            <label className={styles.search}>
              <SearchIcon />
              <input
                type="search"
                placeholder="Buscar carrossel…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                aria-label="Buscar carrossel"
              />
            </label>
          </div>

          {storage === "supabase_missing_table" ? (
            <div className={styles.banner} data-tone="warn">
              <span>
                <strong>Banco pendente:</strong> rode <code>supabase/social_studio.sql</code> no SQL Editor do Supabase para gravar os posts na nuvem.
              </span>
            </div>
          ) : null}

          <div className={styles.tabs} role="tablist" aria-label="Filtrar carrosséis">
            {FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                role="tab"
                className={styles.tab}
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
                {posts ? <span className={styles.tabCount}>{posts.filter(f.test).length}</span> : null}
              </button>
            ))}
          </div>

          {!posts ? (
            <Skeleton kind="rows" count={4} label="Carregando carrosséis" />
          ) : (
            <section className={styles.rows} aria-label="Carrosséis">
              {visible.map(post => {
                const st = STATUS_CHIP[post.status];
                return (
                  <div
                    key={post.id}
                    className={styles.row}
                    style={{ gridTemplateColumns: "minmax(0, 1fr) 120px 100px 32px" }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span className={styles.rowTitle} style={{ display: "block" }}>{post.title}</span>
                      <span className={styles.rowMeta} style={{ display: "block" }}>
                        {post.slides.length} {post.slides.length === 1 ? "slide" : "slides"} · 1080×1350 · {dayLabel(post.updatedAt)}
                      </span>
                    </span>
                    <span>
                      <span className={styles.chip} data-tone={st.tone}>{st.label}</span>
                    </span>
                    <span className={styles.chip}>
                      {post.format === "single_card" ? "Card único" : "Carrossel"}
                    </span>
                    <span className={styles.rowArrow} aria-hidden><ArrowIcon /></span>
                    <Link href={`/admin/carrosseis/${post.id}`} className={styles.rowLink} aria-label={`Editar ${post.title}`} />
                  </div>
                );
              })}
              {!visible.length ? (
                <p className={styles.emptyBody}>
                  {query ? "Nenhum carrossel encontrado." : "Nenhum carrossel aqui ainda. Clique em Gerar com IA para criar o primeiro."}
                </p>
              ) : null}
            </section>
          )}
        </div>
      </div>

      <dialog
        ref={aiDialog}
        className={styles.dialog}
        style={{ width: "min(520px, 94vw)" }}
        onClick={e => {
          if (e.target === aiDialog.current) aiDialog.current.close();
        }}
      >
        <form onSubmit={createWithAi}>
          <div className={styles.dialogHead}>
            <h2>Gerar carrossel com IA</h2>
          </div>
          <div className={styles.form} style={{ padding: 16 }}>
            {!aiProvider ? (
              <p className={styles.hint} style={{ color: "var(--warn)", margin: 0 }}>
                Configure <code>OPENAI_API_KEY</code>, <code>GEMINI_API_KEY</code> ou <code>ANTHROPIC_API_KEY</code> na Vercel / .env.local para habilitar a IA.
              </p>
            ) : null}
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>Ideia bruta, notícia, obra ou dúvida de aluno</span>
              <textarea
                className={styles.textarea}
                rows={5}
                required
                autoFocus
                placeholder="Ex: Como usar 'O Bem-Amado' de Dias Gomes e o conceito de 'homem cordial' de Sérgio Buarque de Holanda na redação da UERJ e do ENEM…"
                value={idea}
                onChange={e => setIdea(e.target.value)}
              />
            </label>
            <label className={`${styles.field} ${preset === "quick_tip" ? styles.fieldWide : ""}`}>
              <span className={styles.label}>Formato editorial (@textoemciclo)</span>
              <select className={styles.select} value={preset} onChange={e => setPreset(e.target.value as TemplatePreset)}>
                {TEMPLATE_PRESET_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            {preset !== "quick_tip" ? (
              <label className={styles.field}>
                <span className={styles.label}>Quantidade de slides</span>
                <select className={styles.select} value={slideCount} onChange={e => setSlideCount(Number(e.target.value))}>
                  {[3, 4, 5, 6, 7, 8, 10].map(n => (
                    <option key={n} value={n}>{n} slides</option>
                  ))}
                </select>
              </label>
            ) : null}
            <p className={styles.hint} style={{ gridColumn: "1 / -1", margin: 0 }}>
              {TEMPLATE_PRESET_OPTIONS.find(o => o.value === preset)?.hint}
            </p>
          </div>
          <div className={styles.dialogFoot} style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 16px", borderTop: "1px solid var(--line)" }}>
            <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={() => aiDialog.current?.close()}>
              Cancelar
            </button>
            <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={!aiProvider}>
              <SparkIcon />Gerar rascunho
            </button>
          </div>
        </form>
      </dialog>

      <BusyOverlay label={busyLabel} />
      <Toast toast={toast} />
    </AdminShell>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_SOCIAL_THEME, SOCIAL_PALETTE_PRESETS, STARTER_POSTS } from "@/lib/social/presets";
import { SLIDE_HEIGHT, SLIDE_WIDTH, type SocialTheme } from "@/lib/social/types";
import type { FieldDef, Values } from "@/lib/admin/fields";
import SlideCanvas from "@/components/social/SlideCanvas";
import AdminShell from "./AdminShell";
import { Toast, useToast } from "./client";
import { Fields } from "./Fields";
import styles from "./admin.module.css";
import c from "./caseEditor.module.css";

const BRAND_FIELDS: FieldDef[] = [
  { key: "brandName", label: "Nome da marca", type: "text" },
  { key: "handle", label: "Arroba (@)", type: "text" },
  { key: "tagline", label: "Assinatura / Tagline", type: "text" },
  {
    key: "displayFont",
    label: "Tipografia dos títulos",
    type: "select",
    defaultLabel: "Serifada editorial",
    options: [
      { value: "serif", label: "Serifada editorial" },
      { value: "sans", label: "Sans moderna (DM Sans)" },
    ],
  },
  { key: "showSlideNumbers", label: "Mostrar numeração de slides (01 / 05)", type: "boolean" },
  { key: "showFooterHandle", label: "Mostrar @ no rodapé dos slides", type: "boolean" },
];

const PALETTE_FIELDS: FieldDef[] = [
  { key: "background", label: "Fundo do slide", type: "color" },
  { key: "surface", label: "Superfície de cartões", type: "color" },
  { key: "primary", label: "Texto principal", type: "color" },
  { key: "accent", label: "Destaque da marca", type: "color" },
  { key: "accentSoft", label: "Destaque suave", type: "color" },
  { key: "muted", label: "Texto secundário", type: "color" },
  { key: "wrong", label: "Cor Antes / Erro", type: "color" },
  { key: "right", label: "Cor Depois / Certo", type: "color" },
];

export default function AdminSocialBrand() {
  const [theme, setTheme] = useState<SocialTheme>(DEFAULT_SOCIAL_THEME);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(380);
  const { toast, show } = useToast();

  useEffect(() => {
    fetch("/api/social/posts", { cache: "no-store" })
      .then(async r => {
        if (r.status === 401) {
          window.location.replace("/admin/login?next=%2Fadmin%2Fmarca");
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (data?.theme) setTheme(data.theme as SocialTheme);
      })
      .catch(err => show(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const update = () => setPreviewWidth(el.clientWidth || 380);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_theme", theme }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar tema");
      setDirty(false);
      show("Identidade visual salva!", "good");
    } catch (err) {
      show(err);
    } finally {
      setSaving(false);
    }
  }

  const brandValues: Values = {
    brandName: theme.brandName,
    handle: theme.handle,
    tagline: theme.tagline,
    displayFont: theme.displayFont,
    showSlideNumbers: theme.showSlideNumbers,
    showFooterHandle: theme.showFooterHandle,
  };

  const scale = previewWidth / SLIDE_WIDTH;
  const sampleSlide = STARTER_POSTS[0]!.slides[3]!; // Comparison slide sample

  return (
    <AdminShell
      crumbs={[{ label: "Marca" }]}
      actions={
        <>
          <span className={styles.saveState} data-dirty={dirty ? "true" : undefined} data-saving={saving || undefined}>
            {saving ? "Salvando…" : dirty ? "Alterações não salvas" : "Salvo"}
          </span>
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              setTheme(DEFAULT_SOCIAL_THEME);
              setDirty(true);
            }}
          >
            Restaurar padrão
          </button>
          <button type="button" className={`${styles.button} ${styles.primary}`} disabled={saving} onClick={save}>
            Salvar
          </button>
        </>
      }
    >
      <div className={c.tool} data-side="preview">
        <section className={c.card} aria-label="Identidade visual">
          <div className={c.head}>
            <h1 className={c.title}>Identidade visual · {theme.brandName}</h1>
          </div>
          <div className={c.body}>
            <div className={c.groups}>
              <div className={c.group}>
                <h2>Assinatura e tipografia</h2>
                <Fields
                  defs={BRAND_FIELDS}
                  values={brandValues}
                  onChange={next => {
                    setTheme(t => ({
                      ...t,
                      brandName: String(next.brandName ?? ""),
                      handle: String(next.handle ?? ""),
                      tagline: String(next.tagline ?? ""),
                      displayFont: next.displayFont === "sans" ? "sans" : "serif",
                      showSlideNumbers: Boolean(next.showSlideNumbers),
                      showFooterHandle: Boolean(next.showFooterHandle),
                    }));
                    setDirty(true);
                  }}
                />
              </div>

              <div className={c.group}>
                <h2>Paletas reais do Instagram (@textoemciclo)</h2>
                <div style={{ display: "grid", gap: 8 }}>
                  {SOCIAL_PALETTE_PRESETS.map(p => {
                    const active =
                      theme.palette.background.toLowerCase() === p.palette.background.toLowerCase() &&
                      theme.palette.accent.toLowerCase() === p.palette.accent.toLowerCase();
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setTheme(t => ({ ...t, palette: { ...p.palette } }));
                          setDirty(true);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: active ? "1.5px solid var(--accent, #3E2A8D)" : "1px solid var(--line)",
                          background: active ? "var(--raised)" : "transparent",
                          textAlign: "left",
                          cursor: "pointer",
                          color: "inherit",
                        }}
                      >
                        <span style={{ display: "grid", gap: 2 }}>
                          <strong style={{ fontSize: 13 }}>{p.label}</strong>
                          <span className={styles.hint} style={{ margin: 0 }}>{p.description}</span>
                        </span>
                        <span style={{ display: "inline-flex", gap: 4, flexShrink: 0 }} aria-hidden>
                          {[p.palette.background, p.palette.primary, p.palette.accent, p.palette.accentSoft].map((hex, idx) => (
                            <span
                              key={idx}
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 999,
                                backgroundColor: hex,
                                border: "1px solid rgba(0,0,0,0.14)",
                              }}
                            />
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={c.group}>
                <h2>Ajuste fino (Brand Tokens)</h2>
                <Fields
                  defs={PALETTE_FIELDS}
                  values={theme.palette as unknown as Values}
                  onChange={next => {
                    setTheme(t => ({
                      ...t,
                      palette: {
                        ...t.palette,
                        ...(next as Partial<SocialTheme["palette"]>),
                      },
                    }));
                    setDirty(true);
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <aside className={c.side} aria-label="Prévia da marca">
          <div className={styles.panel} style={{ padding: 16, display: "grid", alignContent: "start", gap: 12 }}>
            <span className={styles.label}>Prévia ao vivo (Antes × Depois)</span>
            <div
              ref={previewRef}
              style={{
                width: "100%",
                maxWidth: 420,
                margin: "0 auto",
                aspectRatio: "4 / 5",
                borderRadius: 10,
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 0 0 1px var(--line)",
              }}
            >
              <div
                style={{
                  width: SLIDE_WIDTH,
                  height: SLIDE_HEIGHT,
                  transformOrigin: "top left",
                  transform: `scale(${scale})`,
                }}
              >
                <SlideCanvas slide={sampleSlide} index={3} total={5} theme={theme} />
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Toast toast={toast} />
    </AdminShell>
  );
}

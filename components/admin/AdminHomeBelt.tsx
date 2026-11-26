"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLeaveGuard } from "./useLeaveGuard";
import { beltRuns, SLOTS } from "@/lib/homeBelt";
import { BELT_LIMITS, DEFAULT_BELT, type BeltMotion } from "@/lib/homeSettingsModel";
import AdminShell from "./AdminShell";
import { HomeTabs } from "./PageEditor";
import BusyOverlay from "./BusyOverlay";
import { api, Toast, useToast } from "./client";
import { DownIcon, ImageIcon, StarIcon, UpIcon } from "./icons";
import styles from "./admin.module.css";

type BeltCase = { slug: string; title: string; company: string; featured: boolean; image: string; ownImage: boolean };

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const turnsLabel = (turns: number) => `${number.format(turns)} ${turns === 1 ? "volta" : "voltas"}`;

/** The Home's belt: which case comes first, and how it turns. The images stay in each case. */
export default function AdminHomeBelt({ cases, belt: saved }: { cases: BeltCase[]; belt: BeltMotion }) {
  const [order, setOrder] = useState(cases);
  const [belt, setBelt] = useState(saved);
  const [base, setBase] = useState({ order: cases.map(c => c.slug).join(), belt: saved });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState("");
  const [dragged, setDragged] = useState<string | null>(null);
  const [screen, setScreen] = useState({ width: 1440, height: 900 });
  const { toast, show, clear } = useToast();

  useEffect(() => {
    const update = () => setScreen({ width: window.innerWidth, height: window.innerHeight });
    update(); addEventListener("resize", update);
    return () => removeEventListener("resize", update);
  }, []);

  const dirty = order.map(c => c.slug).join() !== base.order || belt.turns !== base.belt.turns || belt.speed !== base.belt.speed;
  // How much scrolling the section takes on this screen, the way the Home works it out.
  const screens = useMemo(() => beltRuns(belt, screen.width, screen.height).sectionHeight / screen.height, [belt, screen]);

  // Within a group only: the highlighted cases always come first.
  const move = (slug: string, before: string) => setOrder(list => {
    const from = list.findIndex(c => c.slug === slug), to = list.findIndex(c => c.slug === before);
    if (from < 0 || to < 0 || from === to || list[from].featured !== list[to].featured) return list;
    const next = [...list];
    next.splice(to, 0, next.splice(from, 1)[0]);
    return next;
  });

  // The star is the case's own "Destaque na Home" flag: it is saved at once, like the star in the case list.
  async function feature(c: BeltCase) {
    setToggling(c.featured ? "Tirando da esteira…" : "Colocando na esteira…");
    try {
      await api(`/api/admin/cases/${c.slug}`, { method: "PATCH", body: { featuredOnSite: !c.featured } });
      setOrder(list => {
        const moved = { ...c, featured: !c.featured };
        const rest = list.filter(x => x.slug !== c.slug);
        // It joins the end of the belt, or heads the rest of the list.
        return [...rest.filter(x => x.featured), moved, ...rest.filter(x => !x.featured)];
      });
      show(c.featured ? "Saiu da esteira." : "Entrou na esteira.");
    } catch (error) { show(error); } finally { setToggling(""); }
  }

  async function save(): Promise<boolean> {
    setSaving(true);
    try {
      await api("/api/admin/home", { method: "PUT", body: { order: order.map(c => c.slug), belt } });
      setBase({ order: order.map(c => c.slug).join(), belt });
      show("Home salva: vai ao ar no próximo deploy.");
      return true;
    } catch (error) { show(error); return false; } finally { setSaving(false); }
  }

  // Leaving with an unsaved order or motion asks first ("Trocar imagem" included), and it waits in this browser.
  const unsaved = useMemo(() => ({ order: order.map(c => c.slug), belt }), [order, belt]);
  const leave = useLeaveGuard({
    id: "home-belt", dirty, value: unsaved, base: `${base.order}|${base.belt.turns}|${base.belt.speed}`,
    onRestore: kept => {
      const at = new Map(kept.order.map((slug, i) => [slug, i]));
      const rank = (c: BeltCase) => at.get(c.slug) ?? Number.MAX_SAFE_INTEGER;
      // the stars stay as saved: highlighted cases first, each group in the kept order
      setOrder(list => [...list].sort((a, b) => Number(b.featured) - Number(a.featured) || rank(a) - rank(b)));
      setBelt(kept.belt);
    },
    onDiscard: () => { setOrder(list => [...list].sort((a, b) => Number(b.featured) - Number(a.featured) || base.order.split(",").indexOf(a.slug) - base.order.split(",").indexOf(b.slug))); setBelt(base.belt); },
    onSave: save,
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key === "s") { event.preventDefault(); if (dirty && !saving) void save(); } };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  return (
    <AdminShell
      crumbs={[{ label: "Site", href: "/admin/site" }, { label: "Home", href: "/admin/site/home" }, { label: "Esteira de cases" }]}
      actions={<>
        <span className={styles.saveState} data-dirty={dirty} data-saving={saving || undefined} aria-live="polite">{saving ? "Salvando…" : dirty ? "Alterações não salvas" : "Tudo salvo"}</span>
        <button type="button" className={`${styles.button} ${styles.primary}`} disabled={!dirty || saving} onClick={() => void save()}>Salvar</button>
      </>}
    >
      <div className={styles.sheet}>
      <div className={styles.page}>
        {leave.ui}
        <HomeTabs />
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Home</h1>
            <p className={styles.subtitle}>A esteira de cases: a ordem dos cases e como ela gira com a rolagem.</p>
          </div>
        </div>

        <section className={styles.pendingSection} aria-label="Movimento da esteira">
        <h2 className={styles.pendingTitle}>Movimento</h2>
        <div className={styles.motion}>
          <label className={styles.rangeField}>
            <span className={styles.rangeHead}><span>Voltas</span><strong>{turnsLabel(belt.turns)}</strong></span>
            <input type="range" min={BELT_LIMITS.turns.min} max={BELT_LIMITS.turns.max} step={BELT_LIMITS.turns.step} value={belt.turns}
              onChange={event => setBelt(b => ({ ...b, turns: Number(event.target.value) }))} />
            <span className={styles.hint}>Quantas voltas a esteira dá, de quando aparece na tela até deitar e virar a lista de cases.</span>
          </label>
          <label className={styles.rangeField}>
            <span className={styles.rangeHead}><span>Velocidade</span><strong>{number.format(belt.speed)}×</strong></span>
            <input type="range" min={BELT_LIMITS.speed.min} max={BELT_LIMITS.speed.max} step={BELT_LIMITS.speed.step} value={belt.speed}
              onChange={event => setBelt(b => ({ ...b, speed: Number(event.target.value) }))} />
            <span className={styles.hint}>Quanto ela gira a cada rolagem. 1× acompanha a página; mais rápida faz as mesmas voltas em menos rolagem.</span>
          </label>
          <div className={styles.motionFoot}>
            <span>A seção ocupa cerca de <strong>{number.format(Math.round(screens * 10) / 10)} telas</strong> de rolagem nesta janela.</span>
            {belt.turns !== DEFAULT_BELT.turns || belt.speed !== DEFAULT_BELT.speed
              ? <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={() => setBelt(DEFAULT_BELT)}>Voltar ao padrão</button> : null}
          </div>
        </div>
        </section>

        {([["Na esteira", true], ["Só na lista de cases", false]] as const).map(([heading, onBelt]) => {
          const group = order.filter(c => c.featured === onBelt);
          return (
            <section key={heading} className={styles.pendingSection} aria-label={heading}>
              <h2 className={styles.pendingTitle}>{heading}<span>{group.length}</span></h2>
              {!group.length ? <p className={onBelt ? styles.hint : styles.emptyLine} style={{ margin: 0 }}>{onBelt ? "Nenhum case em destaque: a esteira mostra todos os cases." : "Todos os cases estão na esteira."}</p> : null}
              <div className={styles.rows}>
              {group.map((c, i) => (
                <div key={c.slug} className={`${styles.row} ${styles.beltRow}`} draggable data-dragging={dragged === c.slug || undefined}
                  onDragStart={() => setDragged(c.slug)} onDragEnd={() => setDragged(null)}
                  onDragOver={event => { event.preventDefault(); if (dragged && dragged !== c.slug) move(dragged, c.slug); }}>
                  <span className={styles.beltIndex}>{String(i + 1).padStart(2, "0")}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a small admin thumbnail, as in the case list */}
                  <span className={styles.thumb}>{c.image ? <img src={c.image} alt="" loading="lazy" /> : null}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className={styles.rowTitle} style={{ display: "block" }}>{c.title}</span>
                    <span className={styles.rowMeta} style={{ display: "block" }}>{c.company} · {c.ownImage ? "Imagem própria da Home" : "Usa a capa do case"}</span>
                  </span>
                  <span className={styles.rowActions}>
                    <Link className={`${styles.button} ${styles.ghost} ${styles.small}`} href={`/admin/cases/${c.slug}?aba=dados`}><ImageIcon />Trocar imagem</Link>
                    <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton} ${styles.star}`} data-on={c.featured || undefined} aria-pressed={c.featured}
                      aria-label={c.featured ? `Tirar ${c.title} da esteira` : `Colocar ${c.title} na esteira`} title={c.featured ? "Tirar da esteira" : "Colocar na esteira"}
                      onClick={() => void feature(c)}><StarIcon filled={c.featured} /></button>
                    <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton}`} aria-label={`Subir ${c.title}`} disabled={i === 0} onClick={() => move(c.slug, group[i - 1].slug)}><UpIcon /></button>
                    <button type="button" className={`${styles.button} ${styles.ghost} ${styles.iconButton}`} aria-label={`Descer ${c.title}`} disabled={i === group.length - 1} onClick={() => move(c.slug, group[i + 1].slug)}><DownIcon /></button>
                  </span>
                </div>
              ))}
              </div>
            </section>
          );
        })}
        <p className={styles.hint} style={{ margin: 0 }}>
          A esteira mostra os cases marcados com a estrela desta tela, o único lugar onde se decide quem entra, e tem {SLOTS} posições: com menos cases, ela repete a lista. Abaixo dela, a coluna lista os destaques e depois os demais, nesta ordem. Arraste uma linha ou use as setas para reordenar.
        </p>
      </div>
      </div>
      <BusyOverlay label={saving ? "Salvando a Home…" : toggling} />
      <Toast toast={toast} onClose={toast?.tone === "bad" ? clear : undefined} />
    </AdminShell>
  );
}

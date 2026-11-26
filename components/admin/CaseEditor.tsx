"use client";
/* eslint-disable @next/next/no-img-element -- admin thumbnails: local files on this machine, no optimizer needed. */

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Case } from "@/lib/cases";
import { CASE_FIELD_GROUPS } from "@/lib/admin/caseFields";
import type { Values } from "@/lib/admin/fields";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { readBlock } from "@/lib/admin/caseBlocks";
import { caseHighlight, homeCardHighlight } from "@/lib/homeHighlight";
import AdminShell from "./AdminShell";
import { api, Toast, useToast } from "./client";
import { Fields } from "./Fields";
import { DownIcon, ExternalIcon } from "./icons";
import Skeleton from "./Skeleton";
import MaterialPanel from "./MaterialPanel";
import CasePreview from "./CasePreview";
import CaseVersions, { versionLabel } from "./CaseVersions";
import type { CaseVersion } from "@/lib/admin/caseVersions";
import { parseMaterial, type CaseMaterial } from "@/lib/caseMaterial";
import { mergeCaseData, type DraftCaseData } from "@/lib/caseDraft/caseData";
import { CropProvider } from "./CropDialog";
import { MediaProvider, MediaThumb } from "./MediaPicker";
import TranslationPanel from "./TranslationPanel";
import AiProposal, { type Proposal } from "./AiProposal";
import ai from "./aiProposal.module.css";
import { useLeaveGuard } from "./useLeaveGuard";
import { saveTranslationEdits, type TranslationEdits } from "./translationDraft";
import type { MaterialDraftState } from "./MaterialPanel";
import type { ReelProposal } from "./ReelStudio";
import type { ReelDoc } from "@/lib/reel/types";
import type { ReelTrack } from "@/lib/reel/tracks";
import styles from "./admin.module.css";
import c from "./caseEditor.module.css";

export type EditorTab = "conteudo" | "dados" | "material" | "video" | "traducao";
/** The tab's name in the address (?aba=): the Inglês tab is "ingles" (the page still reads the older "traducao"). */
const tabAddress = (tab: EditorTab) => (tab === "traducao" ? "ingles" : tab);

/** In the order of the work (docs/admin/arquitetura): material, then the text, the cover, the video, the English. */
const TABS: { id: EditorTab; label: string }[] = [
  { id: "material", label: "Material" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "dados", label: "Capa e dados" },
  { id: "video", label: "Vídeo" },
  { id: "traducao", label: "Inglês" },
];

type Saved = { case: string; body: string; reel: string; material: string };
/** What "Desfazer IA" puts back: the case as it was before the AI's proposal went in. */
type Undo = { data: Case; body: NotionBlockNode[] };
/** Everything on screen that is not saved yet, kept in this browser when Gutto leaves (useLeaveGuard). */
type Unsaved = { data: Case; body: NotionBlockNode[]; reel: ReelDoc | null; material: CaseMaterial; translation: TranslationEdits; proposal: Proposal | null; undo: Undo | null; reelProposal: ReelProposal | null; reelUndo: ReelDoc | null };
const materialKey = (m: CaseMaterial) => JSON.stringify(parseMaterial(m));

// The editor needs the browser; it loads with the admin only.
// The video tab carries the reel stage and its preview; it loads only when opened.
const ReelStudio = dynamic(() => import("./ReelStudio"), { ssr: false, loading: () => <Skeleton kind="text" label="Abrindo o vídeo" /> });
const DocumentEditor = dynamic(() => import("./editor/DocumentEditor"), { ssr: false, loading: () => <Skeleton kind="text" label="Abrindo o editor" /> });

/**
 * Whether the published English is behind the Portuguese saved now (missing, or made from an older
 * text). Read again when the case or its English is saved; null until known.
 */
function useEnglishBehind(slug: string, revision: string, version: number) {
  const [behind, setBehind] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    api<{ source: { sourceHash: string }; record: { published?: { sourceHash: string } | null } | null }>(`/api/translations?slug=${slug}`)
      .then(r => { if (live) setBehind(r.record?.published?.sourceHash !== r.source.sourceHash); }, () => {});
    return () => { live = false; };
  }, [slug, revision, version]);
  return behind;
}

/** "Salvo agora", "Salvo há 40 s", "Salvo há 3 min", then the time. */
function savedLabel(at: number) {
  const seconds = Math.round((Date.now() - at) / 1000);
  if (seconds < 10) return "Salvo agora";
  if (seconds < 60) return `Salvo há ${Math.floor(seconds / 10) * 10} s`;
  if (seconds < 3600) return `Salvo há ${Math.round(seconds / 60)} min`;
  return `Salvo às ${new Date(at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

/** Editor and preview side by side from 1200px; below it the preview is a view of the Conteúdo tab. */
function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1200px)");
    const read = () => setWide(query.matches);
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);
  return wide;
}

/** "1 O começo ▾": the section being read, and a jump to any other (it replaces the side index). */
function SectionPicker({ body, scroller }: { body: NotionBlockNode[]; scroller: HTMLElement | null }) {
  const sections = useMemo(() => body.flatMap(block => {
    const model = readBlock(block);
    return model.kind === "section" ? [{ id: block.id, position: model.position, label: model.label }] : [];
  }), [body]);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const marker = useCallback((id: string) => scroller?.querySelector(`[data-id="${CSS.escape(id)}"]`) ?? null, [scroller]);

  // The section whose marker is at or above the top of the text is the one being read.
  useEffect(() => {
    if (!scroller || !sections.length) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const top = scroller.getBoundingClientRect().top + 80;
      let at = 0;
      sections.forEach((section, i) => { const el = marker(section.id); if (el && el.getBoundingClientRect().top <= top) at = i; });
      setCurrent(at);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => { scroller.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [marker, scroller, sections]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); box.current?.querySelector("button")?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function go(id: string) {
    setOpen(false);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    marker(id)?.scrollIntoView({ block: "start", behavior: still ? "auto" : "smooth" });
  }

  const now = sections[current];
  return (
    <div className={c.picker} ref={box}>
      <button type="button" className={c.pickerButton} aria-haspopup="menu" aria-expanded={open} title="Ir para uma seção" onClick={() => setOpen(v => !v)}>
        {now ? <><small>{now.position}</small><span>{now.label || "Sem nome"}</span></> : <span>Seções</span>}<DownIcon />
      </button>
      {open ? (
        <div className={c.pickerMenu} role="menu" aria-label="Seções do case">
          {sections.map((section, i) => (
            <button key={section.id} type="button" role="menuitem" className={c.pickerItem} aria-current={i === current} autoFocus={i === current} onClick={() => go(section.id)}>
              <span>{section.position}</span><span>{section.label || "Sem nome"}</span>
            </button>
          ))}
          {!sections.length ? <p className={c.pickerEmpty}>Digite &quot;/&quot; no texto e escolha Seção para criar o índice.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

/** The case as the Home shows it: each Home field where set, else what the case itself gives. */
function HomeCardPreview({ data, body }: { data: Case; body: NotionBlockNode[] }) {
  const image = data.homeImage || data.heroImage;
  const focus = data.homeImage ? data.homeImageFocus : data.heroImageFocus;
  const highlight = useMemo(() => homeCardHighlight(data, caseHighlight(data, body, "pt")), [data, body]);
  const place = data.archived ? "Arquivado: fora da Home" : data.draft ? "Rascunho: fora da Home" : data.featuredOnSite ? "Destaque: entre os primeiros" : "Na lista de cases da Home";
  return (
    <aside className={`${styles.panel} ${styles.homeCard}`} aria-label="Prévia do card na Home" style={{ ["--panel-color" as string]: data.homeColor || data.brandColor || "#151a1d" }}>
      <span className={c.previewLabel}>Card na Home</span>
      <div className={styles.homeCardImage}>{image ? <img src={image} alt="" style={focus ? { objectPosition: focus } : undefined} /> : null}</div>
      <div className={styles.homeCardBody}>
        <span className={styles.homeCardMeta}><span>{data.homeCompany || data.company}</span><span>{data.homeYear || data.year}</span></span>
        <strong>{data.homeTitle || data.title}</strong>
        <div className={styles.homeCardHighlight}>
          <span className={styles.homeCardLabel}>{highlight.label}</span>
          {highlight.text ? <span className={styles.homeCardText}>{highlight.text}</span> : null}
          {highlight.stats.length ? (
            <dl className={styles.homeCardStats}>
              {highlight.stats.map((stat, i) => <div key={i}><dd>{stat.value}</dd><dt>{stat.label}</dt>{stat.caption ? <small>{stat.caption}</small> : null}</div>)}
            </dl>
          ) : null}
          {highlight.note ? <small className={styles.homeCardNote}>{highlight.note}</small> : null}
        </div>
        <span className={styles.homeCardCta}>Ver case ↗</span>
      </div>
      <span className={styles.chip} data-tone={data.archived || data.draft ? "warn" : "good"} style={{ margin: "0 14px 14px" }}>{place}</span>
    </aside>
  );
}

function DataPanel({ data, body, onChange }: { data: Case; body: NotionBlockNode[]; onChange: (data: Case) => void }) {
  // While a Home field is empty the card uses the case's own value: shown as the placeholder.
  const homeDefaults = useMemo<Values>(() => {
    const base = caseHighlight(data, body, "pt");
    return {
      homeCompany: data.company, homeYear: data.year, homeTitle: data.title, homeColor: data.brandColor,
      homeLabel: base.label, homeSummary: base.text, homeStats: base.stats, homeNote: base.note ?? "",
    };
  }, [data, body]);
  return (
    <div className={styles.dataLayout}>
      <div className={c.groups}>
        {CASE_FIELD_GROUPS.map(group => (
          <section key={group.title} className={c.group}>
            <div><h2>{group.title}</h2><p className={styles.hint} style={{ margin: "2px 0 0" }}>{group.description}</p></div>
            <Fields defs={group.fields} values={data as unknown as Values} onChange={values => onChange(values as unknown as Case)} defaults={homeDefaults} />
          </section>
        ))}
        <section className={c.group}>
          <div><h2>Endereço</h2><p className={styles.hint} style={{ margin: "2px 0 0" }}>Mudar o endereço quebraria links e a tradução; por isso ele fica fixo.</p></div>
          <input className={`${styles.input} ${styles.mono}`} readOnly value={`/cases/${data.slug}`} aria-label="Endereço" />
        </section>
      </div>
      <div className={styles.previews}>
      <aside className={`${styles.panel} ${styles.coverCard}`} aria-label="Prévia da capa">
        <span className={c.previewLabel}>Capa do case</span>
        <div className={styles.coverImage}>
          {data.heroFullBleedVideoUrl ? <MediaThumb src={data.heroFullBleedVideoUrl} /> : data.heroImage ? <img src={data.heroImage} alt="" /> : null}
          <div className={styles.coverText}>
            <small>{data.heroFullBleedEyebrow || data.productTag}</small>
            <strong>{data.title}</strong>
          </div>
        </div>
        <div style={{ display: "grid", gap: 6, padding: 14 }}>
          <span className={styles.label}>{data.company} · {data.year}</span>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>{data.heroFullBleedTagline || data.summary}</span>
          <span style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <span className={styles.chip} style={{ color: data.brandColor }}>Cor da marca</span>
            {data.archived ? <span className={styles.chip} data-tone="warn">Arquivado</span> : data.draft ? <span className={styles.chip} data-tone="warn">Rascunho</span> : <span className={styles.chip} data-tone="good">No site</span>}
          </span>
        </div>
      </aside>
        <HomeCardPreview data={data} body={body} />
      </div>
    </div>
  );
}

export default function CaseEditor({ initial, material: initialMaterial, initialTab, tracks, pendingDraft }: { initial: { case: Case; body: NotionBlockNode[]; reel: ReelDoc | null; revision: string }; material: { material: CaseMaterial; revision: string }; initialTab: EditorTab; tracks: ReelTrack[]; pendingDraft?: { at: string; body: NotionBlockNode[]; data?: DraftCaseData } | null }) {
  const slug = initial.case.slug;
  const [data, setData] = useState(initial.case);
  const [body, setBody] = useState(initial.body);
  const [reel, setReel] = useState(initial.reel);
  const [revision, setRevision] = useState(initial.revision);
  const [material, setMaterial] = useState(initialMaterial.material);
  const [materialRevision, setMaterialRevision] = useState(initialMaterial.revision);
  const [saved, setSaved] = useState<Saved>({ case: JSON.stringify(initial.case), body: JSON.stringify(initial.body), reel: JSON.stringify(initial.reel), material: materialKey(initialMaterial.material) });
  // An empty case opens where its work starts, Material; a case with content opens in Conteúdo.
  // (Without ?aba the page asks for Conteúdo; an AI draft kept for an empty case goes into Conteúdo.)
  const [tab, setTab] = useState<EditorTab>(initialTab === "conteudo" && !initial.body.length && !pendingDraft ? "material" : initialTab);
  const [resetKey, setResetKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const { toast, show, clear } = useToast();
  // The English typed in the Tradução tab: part of the case's unsaved edits, so it survives a tab change.
  const [translation, setTranslation] = useState<TranslationEdits>({});
  const [translationVersion, setTranslationVersion] = useState(0);
  const englishBehind = useEnglishBehind(slug, revision, translationVersion);
  // The AI proposes; nothing goes into the case until Gutto picks it (AiProposal). An AI draft that
  // finished while this page was not there (lib/caseDraft/pending.ts) comes back as a proposal too.
  const [proposal, setProposal] = useState<Proposal | null>(() => pendingDraft && initial.body.length && JSON.stringify(pendingDraft.body) !== JSON.stringify(initial.body) ? pendingDraft : null);
  const [undo, setUndo] = useState<Undo | null>(null);
  const [reelProposal, setReelProposal] = useState<ReelProposal | null>(null);
  const [reelUndo, setReelUndo] = useState<ReelDoc | null>(null);

  const caseDirty = useMemo(() => JSON.stringify(data) !== saved.case, [data, saved.case]);
  const bodyDirty = useMemo(() => JSON.stringify(body) !== saved.body, [body, saved.body]);
  const reelDirty = useMemo(() => JSON.stringify(reel) !== saved.reel, [reel, saved.reel]);
  const materialDirty = useMemo(() => materialKey(material) !== saved.material, [material, saved.material]);
  const translationDirty = Object.keys(translation).length > 0;
  const dirty = caseDirty || bodyDirty || reelDirty || materialDirty || translationDirty;

  // The case saves on its own (audit R6): a moment after the last change, on a tab change, when the
  // page is hidden and on ⌘S. The saves of one visit are one editing session: one version in Versões.
  const session = useRef(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()));
  const inFlight = useRef(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [failure, setFailure] = useState<{ message: string; conflict: boolean; retry: boolean } | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);

  const save = useCallback(async (): Promise<boolean> => {
    if (!dirty || inFlight.current) return !dirty;
    if (failure?.conflict) return false; // the files changed elsewhere: nothing is written over them
    inFlight.current = true;
    setSaving(true);
    try {
      let next = saved;
      if (caseDirty || bodyDirty || reelDirty) {
        const result = await api<{ revision: string }>(`/api/admin/cases/${slug}`, { method: "PUT", body: { revision, session: session.current, ...(caseDirty ? { case: data } : {}), ...(bodyDirty ? { body } : {}), ...(reelDirty ? { reel } : {}) } });
        setRevision(result.revision);
        next = { ...next, case: JSON.stringify(data), body: JSON.stringify(body), reel: JSON.stringify(reel) };
        setSaved(next);
      }
      if (materialDirty) {
        const result = await api<{ revision: string }>(`/api/admin/cases/${slug}/material`, { method: "PUT", body: { revision: materialRevision, material } });
        setMaterialRevision(result.revision);
        setSaved({ ...next, material: materialKey(material) });
      }
      // After the case: the English follows the Portuguese just saved. Half done is fine for a draft.
      if (translationDirty) {
        const sent = translation;
        await saveTranslationEdits(slug, sent);
        // what was typed while it saved stays as an edit
        setTranslation(current => Object.fromEntries(Object.entries(current).filter(([key, value]) => sent[key] !== value)));
        setTranslationVersion(v => v + 1);
      }
      setSavedAt(Date.now());
      setFailure(null);
      return true;
    } catch (error) {
      const status = (error as { status?: number }).status;
      // a server or network hiccup is tried again on its own; a refused case waits for the next change
      setFailure({ message: error instanceof Error ? error.message : "Não foi possível salvar.", conflict: status === 409, retry: !status || status >= 500 });
      return false;
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }, [body, bodyDirty, caseDirty, data, dirty, failure, material, materialDirty, materialRevision, reel, reelDirty, revision, saved, slug, translation, translationDirty]);

  // A moment after the last change. A failed save tries again on the next change (or after 10 s, if the server hiccuped).
  useEffect(() => {
    if (!dirty || saving || failure?.conflict || (failure && !failure.retry)) return;
    const timer = window.setTimeout(() => void save(), failure ? 10_000 : 1_500);
    return () => window.clearTimeout(timer);
  }, [data, body, reel, material, translation, dirty, saving, failure, save]);
  // A change after a failed save is a new try at once.
  useEffect(() => { setFailure(current => (current && !current.conflict ? null : current)); }, [data, body, reel, material, translation]);
  // Hiding the page (another tab, another app) saves what is pending.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") void save(); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [save]);
  // "Salvo há 3 s": the words follow the clock without a re-render per second.
  const [, tick] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => tick(n => n + 1), 10_000); return () => window.clearInterval(timer); }, []);

  function discard() {
    setData(JSON.parse(saved.case));
    setBody(JSON.parse(saved.body));
    setReel(JSON.parse(saved.reel));
    setMaterial(JSON.parse(saved.material));
    setTranslation({});
    setResetKey(k => k + 1);
    clear();
  }

  // The live preview: always next to the text from 1200px; below it, a view of the Conteúdo tab.
  const wide = useWide();
  const [view, setView] = useState<"texto" | "previa">("texto");
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  // the Material tab puts what the AI knows in the side column (MaterialPanel portals it here)
  const [side, setSide] = useState<HTMLDivElement | null>(null);

  // A tab the editor picked itself (Material, for an empty case) goes into the address too, so a reload keeps it.
  useEffect(() => {
    if (tab === initialTab) return;
    const url = new URL(window.location.href);
    url.searchParams.set("aba", tabAddress(tab));
    history.replaceState(null, "", url); // null: the Next router takes the new address as its own (a refresh keeps ?aba)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectTab(next: EditorTab) {
    if (dirty) void save();
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "conteudo") url.searchParams.delete("aba"); else url.searchParams.set("aba", tabAddress(next));
    history.replaceState(null, "", url); // null: the Next router takes the new address as its own (a refresh keeps ?aba)
  }

  /** Each message of the Material conversation saves the material: the editor takes that version as saved. */
  const syncMaterial = useCallback((next: CaseMaterial, nextRevision: string) => {
    setMaterial(next);
    setMaterialRevision(nextRevision);
    setSaved(prev => ({ ...prev, material: materialKey(next) }));
  }, []);

  /** Before the AI's text goes in, the case as it is now is kept once, for "Desfazer IA". */
  function keepForUndo() {
    setUndo(current => current ?? { data, body });
  }
  /** Picks from the proposal go into the editor like any edit, and are saved like one. */
  function putBody(next: NotionBlockNode[]) {
    keepForUndo();
    setBody(next);
    setResetKey(k => k + 1);
  }
  // the Dados tab only where it is empty: what Gutto wrote there is never replaced
  function putData(next?: DraftCaseData) {
    if (!next) return;
    keepForUndo();
    setData(current => mergeCaseData(current, next));
  }
  /** The kept file of the draft is forgotten once Gutto has decided (lib/caseDraft/pending.ts). */
  function forgetPending() {
    void api(`/api/admin/cases/${slug}/draft`, { method: "POST", body: { step: "discard" } }).catch(() => {});
  }

  /** A new AI draft: an empty case takes it at once (nothing to lose); a case with content gets a proposal. */
  function receiveDraft(next: NotionBlockNode[], nextData?: DraftCaseData) {
    const at = new Date().toISOString();
    selectTab("conteudo");
    if (!body.length) {
      putBody(next);
      putData(nextData);
      show("O rascunho da IA entrou no case. Se não quiser, use Desfazer IA.");
      return;
    }
    setProposal({ at, body: next, data: nextData });
    show("A IA trouxe uma proposta. Escolha o que usar: o case não muda até você decidir.");
  }

  // An empty case takes the kept draft at once; a case with content got it as a proposal above.
  useEffect(() => {
    if (!pendingDraft || initial.body.length) return;
    putBody(pendingDraft.body);
    putData(pendingDraft.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Back to a version from Versões: what is pending is saved first, so it becomes a version too. */
  async function restoreVersion(version: CaseVersion): Promise<boolean> {
    if (dirty && !(await save())) return false;
    try {
      const result = await api<{ case: Case; body: NotionBlockNode[]; reel: ReelDoc | null; revision: string; session: string }>(`/api/admin/cases/${slug}/versions`, { method: "POST", body: { id: version.id, revision } });
      setData(result.case); setBody(result.body); setReel(result.reel); setRevision(result.revision);
      setSaved(prev => ({ ...prev, case: JSON.stringify(result.case), body: JSON.stringify(result.body), reel: JSON.stringify(result.reel) }));
      // the editor goes on in the restore's session: the version just restored is not kept twice
      session.current = result.session;
      setUndo(null);
      setFailure(null);
      setSavedAt(Date.now());
      setResetKey(k => k + 1);
      show(`O case voltou à versão de ${versionLabel(version.at).toLowerCase()}. A de antes ficou em Versões.`);
      return true;
    } catch (error) {
      show(error);
      return false;
    }
  }

  function undoAi() {
    if (!undo) return;
    setData(undo.data);
    setBody(undo.body);
    setUndo(null);
    setResetKey(k => k + 1);
    show("A IA foi desfeita: o case voltou a como estava antes da proposta.");
  }

  // ⌘S / Ctrl+S saves.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void save(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  // Leaving with unsaved work (an open proposal counts) asks first, and the work waits in this browser.
  const unsaved: Unsaved = useMemo(() => ({ data, body, reel, material, translation, proposal, undo, reelProposal, reelUndo }), [body, data, material, proposal, reel, reelProposal, reelUndo, translation, undo]);
  const leave = useLeaveGuard<Unsaved>({
    id: `case:${slug}`,
    dirty: dirty || !!proposal || !!reelProposal,
    value: unsaved,
    base: `${revision}:${materialRevision}`,
    onRestore: kept => {
      setData(kept.data); setBody(kept.body); setReel(kept.reel); setMaterial(kept.material); setTranslation(kept.translation ?? {});
      setProposal(kept.proposal ?? null); setUndo(kept.undo ?? null); setReelProposal(kept.reelProposal ?? null); setReelUndo(kept.reelUndo ?? null);
      setResetKey(k => k + 1);
    },
    onDiscard: () => { discard(); setProposal(null); setUndo(null); setReelProposal(null); setReelUndo(null); },
    onSave: save,
    // the case saves on its own: kept edits are offered, never applied (and saved) just by opening it
    restore: "offer",
  });

  // Where the Material conversation stands, from the files: a proposal waiting, an AI draft not saved
  // yet, or a case that already has content (audit MAT-1).
  const materialDraft: MaterialDraftState = proposal ? { kind: "proposal", at: proposal.at }
    : undo && bodyDirty ? { kind: "unsaved" }
      : saved.body !== "[]" ? { kind: "content" } : { kind: "none" };

  const saveWords = failure ? (failure.conflict ? "Os arquivos mudaram fora desta tela" : `Não salvou: ${failure.message}`)
    : saving || dirty ? "Salvando…"
      : savedAt ? savedLabel(savedAt) : "Salvo";
  const previewNarrow = tab === "conteudo" && !wide && view === "previa";
  // What each tab still lacks: a quiet dot on its pill, said in words to screen readers and on hover.
  const missing: Partial<Record<EditorTab, string>> = {
    material: saved.body === "[]" && !proposal ? "rascunho do case" : undefined,
    conteudo: proposal ? "escolher a proposta da IA" : undefined,
    dados: !data.heroImage ? "imagem da capa" : !data.summary?.trim() ? "resumo da capa" : undefined,
    video: !reel?.scenes?.length ? "roteiro do vídeo" : undefined,
    traducao: englishBehind ? "inglês desatualizado" : undefined,
  };
  const preview = <CasePreview slug={slug} data={data} body={body} />;

  return (
    <AdminShell
      crumbs={[{ label: "Cases", href: "/admin/cases" }, { label: data.company }]}
      actions={<>
        {data.archived ? <span className={styles.chip} data-tone="warn">Arquivado, fora do site</span> : data.draft ? <span className={styles.chip} data-tone="warn">Rascunho, fora do site</span> : null}
        <button
          type="button" className={`${styles.button} ${styles.ghost} ${c.saveState}`} aria-live="polite"
          data-state={failure ? "bad" : saving ? "saving" : dirty ? "pending" : "ok"}
          title={failure ? failure.message : "Ver as versões salvas"} onClick={() => setVersionsOpen(true)}
        ><span>{saveWords}</span><span className={c.versionsWord}>· Versões</span></button>
        {failure ? (
          failure.conflict
            ? <button type="button" className={styles.button} onClick={() => window.location.reload()}>Recarregar</button>
            : <button type="button" className={styles.button} onClick={() => { setFailure(null); void save(); }}>Tentar de novo</button>
        ) : null}
        <a className={styles.button} href={`/cases/${slug}`} target="_blank" rel="noreferrer"><ExternalIcon />Ver no site</a>
      </>}
    >
      {/* Inside the admin frame, so the picker's dialog gets the admin colours. */}
      <MediaProvider slug={slug}><CropProvider>
        {/* The whole work area: the case on the left, what is checked against it on the right. */}
        <div className={`${styles.sheet} ${c.tool}`} data-side={wide ? (tab === "conteudo" ? "preview" : tab === "material" ? "facts" : undefined) : undefined}>
          <section className={c.card} aria-label="Editor do case">
            <header className={c.head}>
              <span className={c.thumb}>{data.heroImage ? <img src={data.heroImage} alt="" /> : null}</span>
              <h1 className={c.title}>{data.title || "Sem título"}</h1>
            </header>
            <div className={c.bar}>
              <div className={styles.tabs} role="tablist" aria-label="Partes do case">
                {TABS.map((t, i) => (
                  <button key={t.id} type="button" role="tab" className={styles.tab} aria-selected={tab === t.id} title={missing[t.id] ? `Falta: ${missing[t.id]}` : undefined} onClick={() => selectTab(t.id)}>
                    <small className={c.step} aria-hidden>{i + 1}</small>{t.label}
                    {missing[t.id] ? <><span className={c.dot} aria-hidden /><span className={c.srOnly}>, {missing[t.id]}</span></> : null}
                  </button>
                ))}
              </div>
              {tab === "conteudo" ? (
                <div className={c.barEnd}>
                  {!wide ? (
                    <div className={styles.tabs} role="tablist" aria-label="Ver">
                      <button type="button" role="tab" className={styles.tab} aria-selected={view === "texto"} onClick={() => setView("texto")}>Texto</button>
                      <button type="button" role="tab" className={styles.tab} aria-selected={view === "previa"} onClick={() => setView("previa")}>Prévia</button>
                    </div>
                  ) : null}
                  {!previewNarrow ? <SectionPicker body={body} scroller={scroller} /> : null}
                </div>
              ) : null}
            </div>
            <div className={c.notes}>
              {leave.note}
              {proposal && tab !== "conteudo" && tab !== "material" ? (
                <div className={ai.undo} role="status">
                  <span>A IA trouxe uma proposta para o conteúdo do case.</span>
                  <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => selectTab("conteudo")}>Ver a proposta</button>
                </div>
              ) : null}
              {/* Outside the keyed panel: using a section remounts the editor, not the proposal. */}
              {tab === "conteudo" && proposal ? (
                <AiProposal
                  proposal={proposal} body={body} data={data}
                  onUseAll={() => { putBody(proposal.body); putData(proposal.data); setProposal(null); show("A proposta da IA entrou no case. Se não quiser, use Desfazer IA."); }}
                  onUseSection={putBody}
                  onUseData={() => putData(proposal.data)}
                  onClose={used => { setProposal(null); forgetPending(); if (used) show("Pronto. O que você escolheu já está no case."); }}
                />
              ) : null}
              {tab === "conteudo" && undo && !proposal ? (
                <div className={ai.undo} role="status">
                  <span>O texto da IA entrou no case. A versão de antes ficou guardada.</span>
                  <button type="button" className={`${styles.button} ${styles.small}`} onClick={undoAi}>Desfazer IA</button>
                  <button type="button" className={`${styles.button} ${styles.ghost} ${styles.small}`} onClick={() => setUndo(null)}>Ok</button>
                </div>
              ) : null}
            </div>
            <div role="tabpanel" key={`${tab}:${resetKey}`} ref={setScroller} className={c.body} data-tab={tab}>
              {tab === "conteudo" ? <>
                <div hidden={previewNarrow}><DocumentEditor slug={slug} body={body} onChange={setBody} brandColor={data.brandColor} /></div>
                {previewNarrow ? preview : null}
              </> : null}
              {tab === "dados" ? <DataPanel data={data} body={body} onChange={setData} /> : null}
              {tab === "material" ? (
                <MaterialPanel slug={slug} material={material} revision={materialRevision} onChange={setMaterial} onSynced={syncMaterial} onDraft={receiveDraft} draft={materialDraft} onOpenDraft={() => selectTab("conteudo")} notify={show} side={wide ? side : null} savedOn={data.updatedAt} />
              ) : null}
              {tab === "video" ? <ReelStudio slug={slug} reel={reel} onChange={setReel} accent={data.brandColor || "#ffffff"} company={data.company} notify={show} tracks={tracks} proposal={reelProposal} onProposal={setReelProposal} undo={reelUndo} onUndo={setReelUndo} /> : null}
              {tab === "traducao" ? <TranslationPanel slug={slug} body={body} unsaved={caseDirty || bodyDirty} edits={translation} onEdits={setTranslation} version={translationVersion} /> : null}
            </div>
          </section>
          <div className={c.side} ref={setSide}>{tab === "conteudo" && wide ? preview : null}</div>
        </div>
        {leave.dialog}
        <CaseVersions slug={slug} open={versionsOpen} onClose={() => setVersionsOpen(false)} onRestore={restoreVersion} />
      </CropProvider></MediaProvider>
      <Toast toast={toast} onClose={toast?.tone === "bad" ? clear : undefined} />
    </AdminShell>
  );
}

"use client";

import type { DefaultReactSuggestionItem, SuggestionMenuProps } from "@blocknote/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import styles from "./InsertMenu.module.css";

/**
 * O menu "/" (e o "+" ao lado de cada linha) como uma grade de cartões: um desenho de cada
 * bloco, abas por categoria e a descrição do escolhido no rodapé. As setas andam pela grade,
 * Tab troca de aba, Enter insere.
 */

export type InsertCategory = "texto" | "estrutura" | "destaques" | "conteudo" | "midia";
export type InsertItem = DefaultReactSuggestionItem & { key: string; category: InsertCategory; editor?: boolean };

export const CATEGORIES: { id: InsertCategory; label: string }[] = [
  { id: "texto", label: "Texto" },
  { id: "estrutura", label: "Estrutura" },
  { id: "destaques", label: "Destaques" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "midia", label: "Mídia" },
];
const TABS: { id: InsertCategory | "todos"; label: string }[] = [{ id: "todos", label: "Todos" }, ...CATEGORIES];
const COLUMNS = 4;

/* ---------- Pictures: each block's shape, in line ---------- */

const Pic = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 48 36" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
);
const Label = ({ children, size = 15, x = 24, y = 23, outline }: { children: string; size?: number; x?: number; y?: number; outline?: boolean }) => (
  <text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight={700} letterSpacing={-.5} fill={outline ? "none" : "currentColor"} stroke={outline ? "currentColor" : "none"} strokeWidth={outline ? .9 : 0} fontFamily="inherit">{children}</text>
);
const Photo = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => (
  <>
    <rect x={x} y={y} width={w} height={h} rx={2.5} />
    <path d={`M${x} ${y + h - 3}l${w * .3} ${-h * .35} ${w * .22} ${h * .22} ${w * .16} ${-h * .14} ${w * .32} ${h * .27}`} />
  </>
);
const Browser = ({ y = 7, h = 22 }: { y?: number; h?: number }) => (
  <><rect x={7} y={y} width={34} height={h} rx={3} /><path d={`M7 ${y + 5}h34`} /><path d={`M10.5 ${y + 2.5}h.01M13.5 ${y + 2.5}h.01`} /></>
);

const PICTURES: Record<string, ReactNode> = {
  paragraph: <Pic><path d="M9 11h30M9 17h30M9 23h30M9 29h18" /></Pic>,
  heading: <Pic><Label size={16}>H1</Label></Pic>,
  heading_2: <Pic><Label size={14}>H2</Label></Pic>,
  heading_3: <Pic><Label size={12}>H3</Label></Pic>,
  quote: <Pic><path d="M10 10v16M16 12h22M16 18h22M16 24h14" /></Pic>,
  bullet_list: <Pic><path d="M17 11h22M17 18h22M17 25h16" /><circle cx={11} cy={11} r={1.3} fill="currentColor" /><circle cx={11} cy={18} r={1.3} fill="currentColor" /><circle cx={11} cy={25} r={1.3} fill="currentColor" /></Pic>,
  numbered_list: <Pic><path d="M18 11h21M18 18h21M18 25h15" /><Label size={7} x={11} y={13.5}>1</Label><Label size={7} x={11} y={20.5}>2</Label><Label size={7} x={11} y={27.5}>3</Label></Pic>,
  divider: <Pic><path d="M7 18h34" /><path d="M9 11h14M9 26h18" opacity={.4} /></Pic>,
  image: <Pic><Photo x={8} y={6} w={32} h={24} /><circle cx={16} cy={13} r={2.2} /></Pic>,
  CaseSectionSplit: <Pic><path d="M8 11h10" strokeWidth={2.4} /><path d="M24 11h16M24 17h16M24 23h16M24 29h10" /></Pic>,
  CaseEditorialParagraph: <Pic><path d="M14 9h26M14 15h26M14 21h26M14 27h16" /><path d="M8 9v18" opacity={.4} /></Pic>,
  section: <Pic><rect x={7} y={9} width={8} height={8} rx={2} /><path d="M20 13h20M7 24h34" /></Pic>,
  CaseChapter: <Pic><Label size={22} y={24} outline>01</Label><path d="M15 30h18" strokeWidth={2.2} /></Pic>,
  CaseStatement: <Pic><path d="M9 12h30M13 19h22" strokeWidth={2.6} /><path d="M18 27h12" /></Pic>,
  CaseTitleBox: <Pic><path d="M6 13h15M6 19h11" strokeWidth={2.6} /><rect x={26} y={7} width={16} height={22} rx={3} /><path d="M30 13h8M30 18h8M30 23h5" /></Pic>,
  CaseLightPanel: <Pic><rect x={6} y={6} width={36} height={24} rx={4} fill="currentColor" fillOpacity={.16} /><path d="M15 14h18" strokeWidth={2.2} /><path d="M18 20h12M20 25h8" /></Pic>,
  CaseBigNumber: <Pic><Label size={20} y={25}>+30</Label></Pic>,
  CaseStatBand: <Pic><path d="M7 14h9M20 14h9M33 14h8" strokeWidth={3} /><path d="M7 21h9M20 21h9M33 21h8M7 26h6M20 26h6M33 26h6" /></Pic>,
  CasePullQuote: <Pic><Label size={22} y={22}>“</Label><path d="M13 25h22M17 30h14" /></Pic>,
  CaseResultsQuote: <Pic><Label size={16} x={12} y={18}>“</Label><path d="M18 11h22M18 17h22M18 23h14" /><circle cx={21} cy={30} r={2} /><path d="M26 30h10" /></Pic>,
  CaseFlow: <Pic><rect x={3} y={12} width={10} height={12} rx={2} /><rect x={19} y={12} width={10} height={12} rx={2} /><rect x={35} y={12} width={10} height={12} rx={2} fill="currentColor" fillOpacity={.2} /><path d="M14.5 18h3M16 16.5l1.5 1.5-1.5 1.5M30.5 18h3M32 16.5l1.5 1.5-1.5 1.5" /></Pic>,
  CaseFlowDiagram: <Pic><rect x={4} y={6} width={12} height={9} rx={2} /><rect x={32} y={4} width={12} height={9} rx={2} /><rect x={32} y={23} width={12} height={9} rx={2} fill="currentColor" fillOpacity={.2} /><path d="M16.5 10.5h6c2 0 3-1 3-2.5V8.5h5M25.5 11v12.5c0 1.5 1 2 3 2h2.5" /><path d="M29.5 7l1.5 1.5-1.5 1.5M29.5 24.5l1.5 1.5-1.5 1.5" /></Pic>,
  CaseChart: <Pic><path d="M6 30h36" /><rect x="9" y="18" width="6" height="12" rx="1.2" /><rect x="18.5" y="11" width="6" height="19" rx="1.2" fill="currentColor" fillOpacity={.22} /><rect x="28" y="6" width="6" height="24" rx="1.2" /><path d="M8 15l11-7 9 3 12-7" strokeDasharray="2 2" opacity={.6} /></Pic>,
  CaseIconRatio: <Pic>{[0, 1, 2, 3, 4].map(i => <g key={i} transform={`translate(${5 + i * 8} 9)`} opacity={i < 3 ? 1 : .35}><circle cx={3} cy={3} r={2.3} fill={i < 3 ? "currentColor" : "none"} /><path d="M-.5 13c0-2.4 1.6-4.3 3.5-4.3s3.5 1.9 3.5 4.3" /></g>)}<path d="M10 29h28" opacity={.4} /></Pic>,
  CaseIconStats: <Pic><rect x={4} y={6} width={18} height={24} rx={3} /><rect x={26} y={6} width={18} height={24} rx={3} /><circle cx={10} cy={13} r={3} /><circle cx={32} cy={13} r={3} /><path d="M8 21h10M8 25h6M30 21h10M30 25h6" /></Pic>,
  CaseTimeline: <Pic><path d="M4 14h40" /><circle cx={9} cy={14} r={2.6} /><circle cx={24} cy={14} r={3} fill="currentColor" /><circle cx={39} cy={14} r={2.6} /><path d="M6 21h7M6 25h5M21 21h7M21 25h5M36 21h7M36 25h5" /></Pic>,
  CaseComparison: <Pic><rect x={23} y={4} width={11} height={28} rx={2.5} fill="currentColor" fillOpacity={.16} /><path d="M4 12h40M4 20h40M4 28h40" opacity={.35} /><path d="M6 8h10M6 16h8M6 24h10" /><path d="m26 15.5 1.8 1.8 3.4-3.6M26 23.5l1.8 1.8 3.4-3.6M38 14l3 3M41 14l-3 3M38 22l3 3M41 22l-3 3" /></Pic>,
  CasePanel: <Pic><rect x={4} y={5} width={19} height={26} rx={3} /><rect x={25} y={5} width={19} height={26} rx={3} /><rect x={7} y={10} width={13} height={5} rx={1.5} fill="currentColor" fillOpacity={.15} /><rect x={7} y={17} width={13} height={5} rx={1.5} fill="currentColor" fillOpacity={.3} /><rect x={7} y={24} width={13} height={4} rx={1.5} fill="currentColor" /><path d="M28 12h12M28 18h9M28 24h12" strokeWidth={2.4} opacity={.7} /></Pic>,
  CaseScreens: <Pic>{[0, 1, 2, 3].map(i => <g key={i}><rect x={4 + i * 10.5} y={4} width={8} height={18} rx={2} fill={i === 1 ? "currentColor" : "none"} fillOpacity={.2} /><path d={`M${5.5 + i * 10.5} 28h5`} /></g>)}</Pic>,
  CaseBento: <Pic><rect x={6} y={6} width={21} height={11} rx={2} /><rect x={30} y={6} width={12} height={24} rx={2} /><rect x={6} y={20} width={9} height={10} rx={2} /><rect x={18} y={20} width={9} height={10} rx={2} /></Pic>,
  CaseApproachCards: <Pic><rect x={6} y={6} width={17} height={11} rx={2} /><rect x={25} y={6} width={17} height={11} rx={2} /><rect x={6} y={19} width={17} height={11} rx={2} /><rect x={25} y={19} width={17} height={11} rx={2} /></Pic>,
  CaseBeforeAfter: <Pic><rect x={5} y={8} width={15} height={20} rx={2.5} /><rect x={28} y={8} width={15} height={20} rx={2.5} fill="currentColor" fillOpacity={.16} /><path d="M22 18h4M24.5 16.5 26 18l-1.5 1.5" /></Pic>,
  CaseResultsJourney: <Pic><path d="M10 10v16" opacity={.4} /><circle cx={10} cy={9} r={2.4} /><circle cx={10} cy={18} r={2.4} /><circle cx={10} cy={27} r={2.4} /><path d="M17 9h22M17 18h22M17 27h16" /></Pic>,
  CaseThanksCards: <Pic><rect x={5} y={8} width={11} height={20} rx={2} /><rect x={18.5} y={8} width={11} height={20} rx={2} /><rect x={32} y={8} width={11} height={20} rx={2} /><circle cx={10.5} cy={15} r={2.2} /><circle cx={24} cy={15} r={2.2} /><circle cx={37.5} cy={15} r={2.2} /><path d="M8 22h5M21.5 22h5M35 22h5" /></Pic>,
  imageRow: <Pic><Photo x={5} y={8} w={18} h={20} /><Photo x={25} y={8} w={18} h={20} /></Pic>,
  caseVideo: <Pic><rect x={7} y={6} width={34} height={24} rx={3} /><path d="M21 13v10l8-5z" /></Pic>,
  embedLink: <Pic><Browser /><path d="M21 17l-3 3 3 3M27 17l3 3-3 3" /></Pic>,
  CaseImageCompare: <Pic><Photo x={6} y={6} w={36} h={24} /><path d="M24 4v28" strokeWidth={2} /><circle cx={24} cy={18} r={3.2} fill="currentColor" /></Pic>,
  CaseImageStack: <Pic><rect x={4} y={5} width={24} height={16} rx={2.5} /><rect x={13} y={11} width={24} height={16} rx={2.5} fill="currentColor" fillOpacity={.18} /><rect x={22} y={17} width={22} height={15} rx={2.5} fill="var(--color-card, #111)" /></Pic>,
  CaseMediaFigure: <Pic><Photo x={10} y={5} w={28} h={20} /><path d="M14 30h20" /></Pic>,
  CaseMediaFullWidth: <Pic><Photo x={2} y={8} w={44} h={20} /></Pic>,
  CaseSectionMedia: <Pic><path d="M8 7h16" strokeWidth={2.4} /><path d="M8 12h24" opacity={.5} /><Photo x={8} y={16} w={32} h={15} /></Pic>,
  CaseMediaEmbed: <Pic><path d="M14 5h20" strokeWidth={2.2} /><Browser y={10} h={21} /></Pic>,
  socialCover: <Pic><rect x={11} y={4} width={26} height={28} rx={3} fill="currentColor" fillOpacity={.14} /><rect x={15} y={8} width={10} height={3} rx={1.5} fill="currentColor" /><path d="M15 16h18M15 21h14" strokeWidth={2.4} /><path d="M25 27h8" opacity={.6} /></Pic>,
  socialBeforeAfter: <Pic><rect x={5} y={7} width={17} height={22} rx={2.5} /><rect x={26} y={7} width={17} height={22} rx={2.5} fill="currentColor" fillOpacity={.16} /><path d="M10 13l4 4M14 13l-4 4M31 15l2 2 4-4" /><path d="M9 22h9M30 22h9" /></Pic>,
  socialStep: <Pic><Label size={18} x={14} y={24} outline>01</Label><path d="M25 13h15" strokeWidth={2.2} /><path d="M25 19h15M25 25h10" /></Pic>,
  socialChecklist: <Pic><path d="m9 11 2 2 3.5-3.5M9 19l2 2 3.5-3.5M9 27l2 2 3.5-3.5" /><path d="M18 11h21M18 19h21M18 27h14" /></Pic>,
  socialQuote: <Pic><Label size={22} x={13} y={21}>“</Label><path d="M20 13h20M20 19h18M20 26h10" /></Pic>,
  socialImage: <Pic><Photo x={9} y={5} w={30} h={26} /><circle cx={17} cy={12} r={2} /><path d="M33 8v4M31 10h4" /></Pic>,
  socialCta: <Pic><path d="M12 12h24M15 18h18" strokeWidth={2.2} /><rect x={13} y={23} width={22} height={7} rx={3.5} fill="currentColor" fillOpacity={.22} /></Pic>,
  slideBreak: <Pic><path d="M6 18h36" strokeDasharray="3 3" /><path d="M14 10h20M14 26h20" opacity={.45} /></Pic>,
};
const Fallback = <Pic><rect x={8} y={7} width={32} height={22} rx={3} /><path d="M18 7v22" /></Pic>;

/* ---------- Menu ---------- */

export default function InsertMenu({ items, selectedIndex, onItemClick }: SuggestionMenuProps<InsertItem>) {
  // A new search (new items) starts over on "Todos", so every match shows.
  const [state, setState] = useState({ items, tab: "todos" as InsertCategory | "todos", selected: selectedIndex ?? 0 });
  if (state.items !== items) setState({ items, tab: "todos", selected: 0 });
  const { tab, selected } = state;
  const visible = tab === "todos" ? items : items.filter(item => item.category === tab);
  const current = visible[Math.min(selected, visible.length - 1)];

  // Rows as drawn: a group heading starts a new row in "Todos".
  const groups = (tab === "todos" ? CATEGORIES : CATEGORIES.filter(c => c.id === tab))
    .map(category => ({ category, items: visible.filter(item => item.category === category.id) }))
    .filter(group => group.items.length);
  const rows: number[][] = [];
  let index = 0;
  for (const group of groups) {
    for (let i = 0; i < group.items.length; i += COLUMNS) rows.push(group.items.slice(i, i + COLUMNS).map((_, j) => index + i + j));
    index += group.items.length;
  }
  const ordered = groups.flatMap(group => group.items);

  const select = (next: number) => setState(s => ({ ...s, selected: next }));
  const showTab = (next: InsertCategory | "todos") => setState(s => ({ ...s, tab: next, selected: 0 }));

  // Ahead of the editor's own handler (which only knows up/down), on the window's capture phase.
  const live = useRef({ ordered, rows, selected, tab, onItemClick, select, showTab });
  useLayoutEffect(() => { live.current = { ordered, rows, selected, tab, onItemClick, select, showTab }; });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.isComposing || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Tab"].includes(event.key)) return;
      const { ordered, rows, selected, tab, onItemClick, select, showTab } = live.current;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === "Tab") {
        const at = TABS.findIndex(t => t.id === tab);
        showTab(TABS[(at + (event.shiftKey ? -1 : 1) + TABS.length) % TABS.length]!.id);
        return;
      }
      if (!ordered.length) return;
      const at = Math.min(selected, ordered.length - 1);
      if (event.key === "Enter") { onItemClick?.(ordered[at]!); return; }
      if (event.key === "ArrowLeft") return select((at - 1 + ordered.length) % ordered.length);
      if (event.key === "ArrowRight") return select((at + 1) % ordered.length);
      const row = rows.findIndex(r => r.includes(at));
      const column = rows[row]!.indexOf(at);
      const target = rows[(row + (event.key === "ArrowUp" ? -1 : 1) + rows.length) % rows.length]!;
      select(target[Math.min(column, target.length - 1)]!);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const grid = useRef<HTMLDivElement>(null);
  const currentKey = current?.key;
  useEffect(() => {
    grid.current?.querySelector(`[data-key="${currentKey}"]`)?.scrollIntoView({ block: "nearest" });
  }, [currentKey]);

  return (
    <div className={styles.menu} id="bn-suggestion-menu" role="listbox" aria-label="Inserir bloco">
      <div className={styles.tabs} role="tablist">
        {TABS.map(t => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={styles.tab} onClick={() => showTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <div ref={grid} className={styles.scroll}>
        {groups.length ? groups.map(group => (
          <section key={group.category.id} className={styles.group}>
            {tab === "todos" ? <h3 className={styles.groupTitle}>{group.category.label}</h3> : null}
            <div className={styles.grid}>
              {group.items.map(item => {
                const i = ordered.indexOf(item);
                return (
                  <button key={item.key} type="button" role="option" aria-selected={item === current} data-key={item.key} className={styles.card}
                    onMouseEnter={() => select(i)} onClick={() => onItemClick?.(item)}>
                    {item.editor ? <span className={styles.badge}>editor</span> : null}
                    <span className={styles.picture}>{PICTURES[item.key] ?? Fallback}</span>
                    <span className={styles.name}>{item.title}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )) : <p className={styles.empty}>Nada nesta categoria. Tente “Todos”.</p>}
      </div>
      <footer className={styles.footer}>
        {current ? <><strong>{current.title}</strong><span>{current.subtext}</span></> : <span>Nenhum bloco encontrado</span>}
        <span className={styles.keys}>↑↓←→ navegar · Tab categoria · Enter inserir</span>
      </footer>
    </div>
  );
}

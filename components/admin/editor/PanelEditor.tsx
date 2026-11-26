"use client";

import { COMPONENT_BY_NAME } from "@/lib/admin/componentSchemas";
import type { FieldDef, Values } from "@/lib/admin/fields";
import { PANEL_CARD_KINDS, PANEL_CARD_LABELS, type PanelCardKind } from "@/lib/panel";
import { Fields, move } from "../Fields";
import { DownIcon, PlusIcon, TrashIcon, UpIcon } from "../icons";
import ChartEditor from "./ChartEditor";
import styles from "./PanelEditor.module.css";

/**
 * O painel editado card a card: cada um escolhe o seu tipo (gráfico, imagem e frase, números
 * empilhados ou texto), quantas colunas ocupa e os textos de topo e de pé.
 */

const COMMON: FieldDef[] = [
  { key: "title", label: "Título", type: "text" },
  { key: "subtitle", label: "Subtítulo", type: "text" },
  { key: "source", label: "Fonte ou nota no pé", type: "text", hint: "Ex.: Statista · 2019 / 2022" },
  { key: "span", label: "Largura", type: "select", options: [{ value: 2, label: "2 colunas" }, { value: 3, label: "3 colunas" }], hint: "Padrão: 1 coluna." },
];
const BY_KIND: Record<PanelCardKind, FieldDef[]> = {
  chart: [],
  quote: [
    { key: "src", label: "Imagem", type: "image", hint: "Desbota para o fundo do card na parte de baixo." },
    { key: "alt", label: "Descrição da imagem", type: "text" },
    { key: "quote", label: "Frase em destaque", type: "textarea" },
  ],
  stack: [
    { key: "layout", label: "Direção", type: "select", defaultLabel: "Linhas", options: [{ value: "columns", label: "Colunas" }], hint: "Linhas: um embaixo do outro. Colunas: lado a lado (no celular, voltam a empilhar)." },
    { key: "look", label: "Estilo", type: "select", defaultLabel: "Com fundo", options: [{ value: "plain", label: "Sem fundo" }], hint: "Com fundo: do tom mais claro à cor do case. Sem fundo: separados por linhas finas, o último número na cor do case." },
    { key: "items", label: "Blocos", type: "list", itemLabel: "Bloco", hint: "Do tom mais claro ao último, na cor do case.", item: [
      { key: "label", label: "Rótulo", type: "text" },
      { key: "figure", label: "Número", type: "text" },
      { key: "body", label: "Texto", type: "text" },
    ] },
  ],
  text: [
    { key: "body", label: "Texto", type: "textarea", hint: "Uma linha em branco separa parágrafos." },
    { key: "bullets", label: "Lista", type: "textarea", hint: "Um item por linha." },
  ],
};
const STARTERS: Record<PanelCardKind, Values> = {
  chart: { kind: "chart", title: "Título do gráfico", chart: { type: "progress", tones: true, suffix: "%", categories: ["Item 1", "Item 2", "Item 3"], series: [{ label: "Valor", values: [60, 40, 25] }] } },
  quote: { kind: "quote", title: "Título", quote: "Uma frase que resume o ponto." },
  stack: { kind: "stack", title: "Título", items: [{ label: "Total", figure: "100" }, { label: "Parte", figure: "40" }, { label: "Foco", figure: "12" }] },
  text: { kind: "text", title: "Título", bullets: "Item 1\nItem 2\nItem 3" },
};

export default function PanelEditor({ values, onChange }: { values: Values; onChange: (values: Values) => void }) {
  const def = COMPONENT_BY_NAME.get("CasePanel")!;
  const cards: Values[] = (Array.isArray(values.cards) ? values.cards : []).filter((c): c is Values => !!c && typeof c === "object");
  const save = (next: Values[]) => onChange({ ...values, cards: next });
  const patch = (i: number, card: Values) => save(cards.map((c, j) => (j === i ? card : c)));

  return (
    <div className={styles.editor}>
      <Fields defs={def.fields} values={values} onChange={onChange} />
      <div className={styles.cards}>
        {cards.map((card, i) => {
          const kind = (PANEL_CARD_KINDS as readonly string[]).includes(card.kind as string) ? (card.kind as PanelCardKind) : "text";
          return (
            <section key={i} className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.cardName}>Card {i + 1}</span>
                <div className={styles.kinds} role="radiogroup" aria-label={`Tipo do card ${i + 1}`}>
                  {PANEL_CARD_KINDS.map(k => (
                    <button key={k} type="button" role="radio" aria-checked={kind === k} className={styles.kind} title={PANEL_CARD_LABELS[k].hint}
                      onClick={() => patch(i, k === kind ? card : { ...STARTERS[k], ...pick(card, ["title", "subtitle", "source", "span"]) })}>
                      {PANEL_CARD_LABELS[k].label}
                    </button>
                  ))}
                </div>
                <span className={styles.tools}>
                  <button type="button" className={styles.tool} aria-label="Subir" disabled={i === 0} onClick={() => save(move(cards, i, i - 1))}><UpIcon /></button>
                  <button type="button" className={styles.tool} aria-label="Descer" disabled={i === cards.length - 1} onClick={() => save(move(cards, i, i + 1))}><DownIcon /></button>
                  <button type="button" className={styles.tool} aria-label={`Remover card ${i + 1}`} disabled={cards.length < 2} onClick={() => save(cards.filter((_, j) => j !== i))}><TrashIcon /></button>
                </span>
              </div>
              <Fields defs={[...COMMON, ...BY_KIND[kind]]} values={card} onChange={next => patch(i, next)} />
              {kind === "chart" ? (
                <div className={styles.chart}>
                  <ChartEditor inCard values={(card.chart as Values) ?? (STARTERS.chart.chart as Values)} onChange={chart => patch(i, { ...card, chart })} />
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
      <div className={styles.add}>
        <span>Adicionar card:</span>
        {PANEL_CARD_KINDS.map(k => <button key={k} type="button" className={styles.addButton} onClick={() => save([...cards, STARTERS[k]])}><PlusIcon />{PANEL_CARD_LABELS[k].label}</button>)}
      </div>
    </div>
  );
}

function pick(values: Values, keys: string[]) {
  return Object.fromEntries(keys.filter(k => values[k] !== undefined).map(k => [k, values[k]]));
}

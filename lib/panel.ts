/**
 * Painel: cards lado a lado numa grade de 1 a 3 colunas. Cada card tem título, subtítulo e fonte,
 * e um conteúdo: um gráfico, uma imagem com frase, números empilhados ou texto.
 */
import { parseChartSpec, type ChartSpec } from "@/lib/chartSpec";

export const PANEL_CARD_KINDS = ["chart", "quote", "stack", "text"] as const;
export type PanelCardKind = (typeof PANEL_CARD_KINDS)[number];
export const PANEL_CARD_LABELS: Record<PanelCardKind, { label: string; hint: string }> = {
  chart: { label: "Gráfico", hint: "Qualquer tipo de gráfico, a partir de uma tabela." },
  quote: { label: "Imagem e frase", hint: "Uma imagem (print, gráfico de outra fonte) e uma frase em destaque." },
  stack: { label: "Números empilhados", hint: "Blocos de número, do tom mais claro à cor do case." },
  text: { label: "Texto", hint: "Um parágrafo e, se quiser, uma lista." },
};

export type StackItem = { label: string; figure: string; body?: string };
export type PanelCard = {
  kind: PanelCardKind;
  /** Columns it takes (1–3). */
  span?: number;
  title?: string;
  subtitle?: string;
  source?: string;
  chart?: ChartSpec;
  src?: string;
  alt?: string;
  quote?: string;
  items?: StackItem[];
  /** Stacked figures: one block per row (default) or the blocks side by side. */
  layout?: "columns";
  /** Stacked figures: tinted blocks (default) or no background, divided by hairlines. */
  look?: "plain";
  body?: string;
  /** Text card: one list item per line. */
  bullets?: string;
};
export type Panel = { cards: PanelCard[]; columns: number; sectionLabel?: string; heading?: string; intro?: string; id?: string };

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function parseCard(c: Record<string, unknown>): PanelCard | null {
  const kind = (PANEL_CARD_KINDS as readonly string[]).includes(c.kind as string) ? (c.kind as PanelCardKind) : "text";
  const span = typeof c.span === "number" && c.span >= 1 && c.span <= 3 ? Math.round(c.span) : undefined;
  const base = { kind, span, title: str(c.title), subtitle: str(c.subtitle), source: str(c.source) };
  switch (kind) {
    case "chart": {
      const chart = record(c.chart) ? parseChartSpec(c.chart) : null;
      return chart ? { ...base, chart } : null;
    }
    case "quote":
      return str(c.src) || str(c.quote) ? { ...base, src: str(c.src), alt: str(c.alt), quote: str(c.quote) } : null;
    case "stack": {
      const items = (Array.isArray(c.items) ? c.items : []).filter(record).flatMap(i => (str(i.figure) || str(i.label) ? [{ label: str(i.label) ?? "", figure: str(i.figure) ?? "", body: str(i.body) }] : []));
      return items.length ? { ...base, items, ...(c.layout === "columns" ? { layout: "columns" as const } : {}), ...(c.look === "plain" ? { look: "plain" as const } : {}) } : null;
    }
    default:
      return str(c.body) || str(c.bullets) || base.title ? { ...base, body: str(c.body), bullets: str(c.bullets) } : null;
  }
}

export function parsePanel(obj: Record<string, unknown>): Panel | null {
  const cards = (Array.isArray(obj.cards) ? obj.cards : []).filter(record).flatMap(c => parseCard(c) ?? []);
  if (!cards.length) return null;
  const asked = typeof obj.columns === "number" ? Math.round(obj.columns) : 0;
  const columns = asked >= 1 && asked <= 3 ? asked : Math.min(3, cards.reduce((sum, c) => sum + (c.span ?? 1), 0));
  return { cards, columns, sectionLabel: str(obj.sectionLabel), heading: str(obj.heading), intro: str(obj.intro), id: str(obj.id) };
}

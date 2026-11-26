/**
 * Infográficos do case: proporção com ícones, números com ícone, linha do tempo e comparação lado
 * a lado. Cada um é lido do JSON do componente e ignora o que não reconhece.
 */
import { INFO_ICON_NAMES } from "@/lib/infographicIcons";

export type IconRatio = {
  icon: string;
  /** How many of `total` are filled. */
  value: number;
  total: number;
  label?: string;
  /** The figure shown big; empty → "value de total". */
  display?: string;
  sectionLabel?: string; heading?: string; intro?: string; caption?: string; id?: string;
};
export type IconStat = { icon: string; value: string; label: string; body?: string };
export type IconStats = { items: IconStat[]; columns?: 2 | 3 | 4; sectionLabel?: string; heading?: string; intro?: string; id?: string };
export type TimelineItem = { date: string; title: string; body?: string; highlight?: boolean };
export type Timeline = { items: TimelineItem[]; layout?: "horizontal" | "vertical"; sectionLabel?: string; heading?: string; intro?: string; id?: string };
export type ComparisonColumn = { label: string; highlight?: boolean };
export type ComparisonRow = { label: string; values: string[] };
export type Comparison = { columns: ComparisonColumn[]; rows: ComparisonRow[]; sectionLabel?: string; heading?: string; intro?: string; caption?: string; id?: string };

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v.replace(",", "."))) ? Number(v.replace(",", ".")) : undefined);
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : []);
const icon = (v: unknown) => (typeof v === "string" && (INFO_ICON_NAMES as readonly string[]).includes(v) ? v : "person");
const header = (obj: Record<string, unknown>) => ({ sectionLabel: str(obj.sectionLabel), heading: str(obj.heading), intro: str(obj.intro), id: str(obj.id) });

export function parseIconRatio(obj: Record<string, unknown>): IconRatio | null {
  const total = Math.round(num(obj.total) ?? 10);
  const value = num(obj.value);
  if (value === undefined || total < 1 || total > 200) return null;
  return { ...header(obj), icon: icon(obj.icon), value: Math.max(0, Math.min(total, value)), total, label: str(obj.label), display: str(obj.display), caption: str(obj.caption) };
}

export function parseIconStats(obj: Record<string, unknown>): IconStats | null {
  const items = list(obj.items).flatMap(i => (str(i.value) || str(i.label) ? [{ icon: icon(i.icon), value: str(i.value) ?? "", label: str(i.label) ?? "", body: str(i.body) }] : []));
  if (!items.length) return null;
  const columns = obj.columns === 2 || obj.columns === 3 || obj.columns === 4 ? obj.columns : undefined;
  return { ...header(obj), items, columns };
}

export function parseTimeline(obj: Record<string, unknown>): Timeline | null {
  const items = list(obj.items).flatMap(i => (str(i.title) || str(i.date) ? [{ date: str(i.date) ?? "", title: str(i.title) ?? "", body: str(i.body), highlight: i.highlight === true || undefined }] : []));
  if (!items.length) return null;
  return { ...header(obj), items, layout: obj.layout === "vertical" ? "vertical" : undefined };
}

export function parseComparison(obj: Record<string, unknown>): Comparison | null {
  const columns = list(obj.columns).map(c => ({ label: str(c.label) ?? "", highlight: c.highlight === true || undefined }));
  const rows = list(obj.rows).flatMap(r => (str(r.label) ? [{ label: str(r.label)!, values: columns.map((_, i) => (Array.isArray(r.values) ? String(r.values[i] ?? "") : "")) }] : []));
  if (!columns.length || !rows.length) return null;
  return { ...header(obj), columns, rows, caption: str(obj.caption) };
}

/** A comparison cell: yes, no, partly, or its own text. */
export type CellMark = "yes" | "no" | "partial" | "text" | "empty";
export function cellMark(value: string): CellMark {
  const v = value.trim().toLowerCase();
  if (!v) return "empty";
  if (["sim", "yes", "✓", "✔", "true"].includes(v)) return "yes";
  if (["não", "nao", "no", "✕", "✗", "-", "—", "false"].includes(v)) return "no";
  if (["parcial", "em parte", "partial", "~", "±"].includes(v)) return "partial";
  return "text";
}

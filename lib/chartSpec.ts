/**
 * Gráficos do case como dados: uma tabela (categorias × séries) e as opções de desenho. O mesmo
 * formato serve a todos os tipos; cada tipo lê a parte da tabela que lhe faz sentido.
 */
export const CHART_TYPES = ["column", "bar", "line", "area", "progress", "gauge", "beforeAfter"] as const;
export type ChartType = (typeof CHART_TYPES)[number];
export const CHART_COLORS = ["brand", "ink", "muted", "soft"] as const;
export type ChartColor = (typeof CHART_COLORS)[number];

export type ChartSeries = { label: string; color?: ChartColor | string; values: (number | null)[] };
export type ChartSpec = {
  type: ChartType;
  categories: string[];
  series: ChartSeries[];
  /** Column and bar: one stack per category instead of side by side. */
  stacked?: boolean;
  /** Line and area. */
  curve?: "linear" | "smooth";
  prefix?: string;
  suffix?: string;
  decimals?: number;
  hideValues?: boolean;
  hideGrid?: boolean;
  hideLegend?: boolean;
  /** Line and area: a value on every point, not only on the last one. */
  allValues?: boolean;
  yMin?: number;
  yMax?: number;
  /** Progress and gauge: the whole (default 100). */
  max?: number;
  /** Categories to stand out (1-based); the others go quiet. */
  highlight?: number[];
  /** Single series: each item a shade of the colour, the first one strongest. */
  tones?: boolean;
  size?: "s" | "m" | "l";
  sectionLabel?: string;
  heading?: string;
  intro?: string;
  title?: string;
  caption?: string;
  id?: string;
};

export const CHART_TYPE_LABELS: Record<ChartType, { label: string; hint: string }> = {
  column: { label: "Colunas", hint: "Compare valores entre categorias. Várias séries ficam lado a lado, ou empilhadas." },
  bar: { label: "Barras", hint: "Como colunas, deitadas: bom para rótulos longos." },
  line: { label: "Linha", hint: "Evolução ao longo do tempo; as categorias são os períodos." },
  area: { label: "Área", hint: "Uma linha com o volume preenchido abaixo." },
  progress: { label: "Progresso", hint: "Quanto de um total cada item atingiu. Usa a primeira série e o máximo." },
  gauge: { label: "Medidor", hint: "Um valor sobre o máximo, em semicírculo; cada categoria vira um medidor." },
  beforeAfter: { label: "Antes e depois", hint: "Duas séries: a primeira é o antes, a segunda o depois." },
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined);

/** "1.234,5", "1,234.5", "5.200", "3,5" or "12%" → a number; empty → null. */
export function readNumber(text: string): number | null {
  const clean = text.replace(/[^\d,.\-]/g, "");
  if (!clean || clean === "-") return null;
  const lastComma = clean.lastIndexOf(","), lastDot = clean.lastIndexOf(".");
  let normal: string;
  if (lastComma >= 0 && lastDot >= 0) {
    // Both: the last one is the decimal mark, the other groups thousands.
    normal = lastComma > lastDot ? clean.replace(/\./g, "").replace(",", ".") : clean.replace(/,/g, "");
  } else {
    const sep = lastComma >= 0 ? "," : lastDot >= 0 ? "." : "";
    const parts = sep ? clean.split(sep) : [clean];
    // One kind only: repeated, or with exactly three digits after it (not "0.125"), it groups thousands.
    const grouping = parts.length > 2 || (parts.length === 2 && parts[1]!.length === 3 && !/^-?0$/.test(parts[0]!));
    normal = grouping ? parts.join("") : parts.join(".");
  }
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

/** A table pasted from a spreadsheet: first row = series names, first column = categories. */
export function parsePastedTable(text: string): { categories: string[]; series: ChartSeries[] } | null {
  const lines = text.trim().split(/\r?\n/);
  // Spreadsheets paste tabs; CSV uses ";" where "," is the decimal mark.
  const sep = lines[0]!.includes("\t") ? "\t" : lines[0]!.includes(";") ? ";" : ",";
  const rows = lines.map(line => line.split(sep));
  if (rows.length < 2 || rows[0]!.length < 2) return null;
  const [head, ...body] = rows;
  const series = head!.slice(1).map((label, j) => ({ label: label.trim() || `Série ${j + 1}`, values: body.map(row => readNumber(row[j + 1] ?? "")) }));
  return { categories: body.map(row => (row[0] ?? "").trim()), series };
}

/** 3, "1, 3" or [1, 3] → [1, 3]. */
function readHighlight(value: unknown): number[] | undefined {
  const list = Array.isArray(value) ? value : typeof value === "number" ? [value] : typeof value === "string" ? value.split(/[\s,;e]+/) : [];
  const out = list.map(v => Math.round(Number(v))).filter(n => Number.isFinite(n) && n > 0);
  return out.length ? [...new Set(out)] : undefined;
}

export function parseChartSpec(obj: Record<string, unknown>): ChartSpec | null {
  const type = (CHART_TYPES as readonly string[]).includes(obj.type as string) ? (obj.type as ChartType) : "column";
  const categories = (Array.isArray(obj.categories) ? obj.categories : []).map(c => (typeof c === "string" ? c : String(c ?? "")));
  const series = (Array.isArray(obj.series) ? obj.series : []).flatMap((raw, j) => {
    if (!raw || typeof raw !== "object") return [];
    const s = raw as Record<string, unknown>;
    const values = categories.map((_, i) => (Array.isArray(s.values) ? num(s.values[i]) ?? null : null));
    return [{ label: str(s.label) ?? `Série ${j + 1}`, color: str(s.color), values }];
  });
  if (!categories.length || !series.some(s => s.values.some(v => v !== null))) return null;
  const size = obj.size === "s" || obj.size === "l" ? obj.size : obj.size === "m" ? "m" : undefined;
  return {
    type, categories, series,
    stacked: obj.stacked === true || undefined, curve: obj.curve === "smooth" ? "smooth" : undefined,
    prefix: str(obj.prefix), suffix: str(obj.suffix), decimals: num(obj.decimals),
    hideValues: obj.hideValues === true || undefined, hideGrid: obj.hideGrid === true || undefined,
    hideLegend: obj.hideLegend === true || undefined, allValues: obj.allValues === true || undefined,
    yMin: num(obj.yMin), yMax: num(obj.yMax), max: num(obj.max), highlight: readHighlight(obj.highlight), tones: obj.tones === true || undefined, size,
    sectionLabel: str(obj.sectionLabel), heading: str(obj.heading), intro: str(obj.intro), title: str(obj.title), caption: str(obj.caption), id: str(obj.id),
  };
}

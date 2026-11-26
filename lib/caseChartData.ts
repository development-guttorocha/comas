import type { CaseStat } from "@/lib/cases";

export type BeforeAfterRow = {
  label: string;
  /** Texto original de cada ponta, como escrito no Notion. */
  fromText: string;
  toText: string;
  from: number;
  to: number;
};

const SCALE: Record<string, number> = {
  k: 1e3, mil: 1e3, thousand: 1e3,
  m: 1e6, mi: 1e6, mm: 1e6, million: 1e6, milhões: 1e6, milhão: 1e6,
  b: 1e9, bi: 1e9, billion: 1e9,
};

/** "5,2M", "108 mil", "17.8M", "822K", "30,000" → número; `null` quando não é um número simples. */
export function parseStatNumber(text: string): number | null {
  const m = text.trim().toLowerCase().match(/^([\d.,]+)\s*([a-zà-ú]+)?$/);
  if (!m) return null;
  const [, digits, suffix] = m;
  const scale = suffix ? SCALE[suffix] : 1;
  if (scale === undefined) return null;
  // Grupos de milhar ("30.000", "30,000") só sem sufixo; com sufixo a vírgula ou o ponto é decimal.
  const normalized = !suffix && /^\d{1,3}([.,]\d{3})+$/.test(digits)
    ? digits.replace(/[.,]/g, "")
    : digits.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n * scale : null;
}

/**
 * Uma faixa de stats vira gráfico "antes → depois" quando todos os valores são
 * `A → B` numéricos e crescentes (ex. Webmotors: "5,2M → 17,8M").
 */
export function beforeAfterRowsFromStats(stats: CaseStat[]): BeforeAfterRow[] | null {
  if (stats.length < 2) return null;
  const rows: BeforeAfterRow[] = [];
  for (const stat of stats) {
    const parts = stat.value.split("→").map((s) => s.trim());
    if (parts.length !== 2) return null;
    const from = parseStatNumber(parts[0]!);
    const to = parseStatNumber(parts[1]!);
    if (from === null || to === null || from <= 0 || to <= from) return null;
    rows.push({ label: stat.label, fromText: parts[0]!, toText: parts[1]!, from, to });
  }
  return rows;
}

/** "+99%", "+452%" → 0.99, 4.52; `null` para qualquer outra coisa. */
export function parseGain(text: string): number | null {
  const m = text.trim().match(/^\+\s*([\d.,]+)\s*%$/);
  if (!m) return null;
  const n = parseStatNumber(m[1]!);
  return n === null ? null : n / 100;
}

/** Linhas de ganho (base = 1) a partir de stats "+N%", na ordem dos índices dados. */
export function gainRowsFromStats(stats: CaseStat[], indices: number[]): BeforeAfterRow[] | null {
  const rows: BeforeAfterRow[] = [];
  for (const i of indices) {
    const stat = stats[i];
    const gain = stat ? parseGain(stat.value) : null;
    if (!stat || gain === null || gain <= 0) return null;
    rows.push({ label: stat.label, fromText: "", toText: stat.value, from: 1, to: 1 + gain });
  }
  return rows;
}

// Automatic music analysis for the reels: tempo, where beat 0 falls, and the song's parts.
// Nobody checks it by ear, so it checks itself:
//   1. two independent tempo readings (autocorrelation of the onset envelope, and a comb over
//      the intervals between kicks), each fitted to a full beat grid;
//   2. the grid's phase must stand out and hold through every quarter of the song;
//   3. it must beat chance: grids at deliberately wrong tempos must stand out clearly less
//      (validated on Bull, a click track, a lo-fi song, speech and random clicks).
// When either check fails the song has no steady beat: it gets a plain half-second grid and
// its parts come from energy alone, so cuts follow the mood instead of beats.

export type Tone = "calm" | "build" | "drop" | "break";
export interface Analysis {
  bpm: number;
  t0: number;
  steady: boolean;
  /** 0–1: how clearly and consistently the beat grid lands on the kicks */
  confidence: number;
  sections: { beat: number; label: string; tone: Tone }[];
}

/** analysis frames per second: set from the file's exact sample rate (sr / hop), not rounded */
let FPS = 100;
const MIN_BPM = 70;
const MAX_BPM = 180;

function envelopes(pcm: Float32Array, sr: number) {
  const hop = Math.round(sr / 100);
  FPS = sr / hop;
  const n = Math.floor(pcm.length / hop) - 1;
  const alpha = 1 - Math.exp((-2 * Math.PI * 150) / sr);
  let lp = 0;
  const low = new Float32Array(n);
  const full = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let el = 0;
    let ef = 0;
    for (let i = f * hop; i < (f + 1) * hop; i++) {
      const s = pcm[i];
      lp += alpha * (s - lp);
      el += lp * lp;
      ef += s * s;
    }
    low[f] = Math.sqrt(el / hop);
    full[f] = Math.sqrt(ef / hop);
  }
  const flux = (e: Float32Array) => {
    const out = new Float32Array(e.length);
    for (let i = 1; i < e.length; i++) out[i] = Math.max(0, Math.log1p(e[i] * 32768) - Math.log1p(e[i - 1] * 32768));
    return out;
  };
  return { low, full, onLow: flux(low), onFull: flux(full), n };
}

/** Tempo by autocorrelation of the onset envelope (with its 2× and 4× lags). */
function tempoByAcf(env: Float32Array) {
  let mean = 0;
  for (const v of env) mean += v;
  mean /= env.length;
  const x = env.map((v) => v - mean);
  const score = (bpm: number) => {
    const lag = (60 * FPS) / bpm;
    let s = 0;
    for (const k of [1, 2, 4]) {
      const lk = lag * k;
      const li = Math.floor(lk);
      const fr = lk - li;
      let acc = 0;
      for (let i = 0; i + li + 1 < x.length; i++) acc += x[i] * ((1 - fr) * x[i + li] + fr * x[i + li + 1]);
      s += acc / k;
    }
    return s;
  };
  let best = { bpm: 120, s: -Infinity };
  const scores = new Map<number, number>();
  for (let b = MIN_BPM; b <= MAX_BPM; b += 0.25) {
    const s = score(b);
    scores.set(b, s);
    if (s > best.s) best = { bpm: b, s };
  }
  // octave errors: prefer the 90–160 BPM reading when it scores nearly as well
  for (const c of [best.bpm * 2, best.bpm / 2]) {
    if (c >= 90 && c <= 160 && (best.bpm < 90 || best.bpm > 160)) {
      const s = score(c);
      if (s >= 0.8 * best.s) best = { bpm: c, s };
    }
  }
  return best.bpm;
}

/** Tempo from the intervals between strong kicks: each candidate scores the intervals that
 *  fall on 1 to 4 of its beats (a comb), so off-beat notes do not decide it. */
function tempoByIntervals(on: Float32Array) {
  const sorted = Array.from(on).sort((x, y) => x - y);
  const thr = sorted[Math.floor(sorted.length * 0.9)] ?? 0;
  const peaks: number[] = [];
  for (let i = 2; i < on.length - 2; i++) {
    if (on[i] > thr && on[i] >= on[i - 1] && on[i] >= on[i + 1] && on[i] >= on[i - 2] && on[i] >= on[i + 2]) {
      if (peaks.length && i - peaks[peaks.length - 1] < 20) continue;
      peaks.push(i);
    }
  }
  const hist = new Float32Array(2 * FPS + 2);
  for (let a = 0; a < peaks.length; a++) {
    for (let b = a + 1; b < peaks.length && peaks[b] - peaks[a] <= 2 * FPS; b++) hist[peaks[b] - peaks[a]] += 1;
  }
  const at = (f: number) => {
    const i = Math.floor(f);
    const fr = f - i;
    return (hist[i] ?? 0) * (1 - fr) + (hist[i + 1] ?? 0) * fr + 0.5 * ((hist[i - 1] ?? 0) + (hist[i + 2] ?? 0));
  };
  let best = { bpm: 120, s: -1 };
  for (let bpm = 80; bpm < 160; bpm += 0.25) {
    const beat = (60 * FPS) / bpm;
    let s = 0;
    for (let k = 1; k <= 4 && k * beat <= 2 * FPS; k++) s += at(k * beat);
    if (s > best.s) best = { bpm, s };
  }
  return { bpm: best.bpm, peaks: peaks.length };
}

const fold = (bpm: number) => {
  let b = bpm;
  while (b < 80) b *= 2;
  while (b >= 160) b /= 2;
  return b;
};

/** Fine tempo and phase: the grid that best lands on the kicks. */
function fitGrid(on: Float32Array, around: number, spanPct = 0.4, steps = 40) {
  const hit = (bpm: number, t0: number) => {
    const beat = (60 * FPS) / bpm;
    let s = 0;
    for (let f = t0; f < on.length - 2; f += beat) {
      const i = Math.round(f);
      s += Math.max(on[i - 1] ?? 0, on[i], on[i + 1]);
    }
    return s;
  };
  let best = { bpm: around, t0: 0, s: -Infinity };
  for (let d = -steps; d <= steps; d++) {
    const bpm = around * (1 + (d / steps) * (spanPct / 100));
    const beat = (60 * FPS) / bpm;
    for (let p = 0; p < beat; p += 0.5) {
      const s = hit(bpm, p);
      if (s > best.s) best = { bpm, t0: p, s };
    }
  }
  return { bpm: best.bpm, t0: best.t0 / FPS };
}

/** How the grid's phase stands out: onset strength at each phase of the beat, over a stretch. */
function phaseProfile(on: Float32Array, energy: Float32Array, bpm: number, from: number, to: number, loud: number) {
  const beatF = (60 * FPS) / bpm;
  const steps = Math.floor(beatF);
  const out = new Float32Array(steps);
  for (let p = 0; p < steps; p++) {
    let s = 0;
    let n = 0;
    for (let f = p; f < to - 2; f += beatF) {
      const i = Math.round(f);
      if (i < from || energy[i] < loud * 0.3) continue;
      s += Math.max(on[i - 1] ?? 0, on[i], on[i + 1]);
      n++;
    }
    out[p] = n ? s / n : 0;
  }
  return out;
}

/** The self-check: the beat's phase must stand out, and stay the same through the song. */
function checkGrid(on: Float32Array, energy: Float32Array, bpm: number, t0: number) {
  const loud = Array.from(energy).sort((a, b) => a - b)[Math.floor(energy.length * 0.95)] ?? 1;
  const beatF = (60 * FPS) / bpm;
  const phase = (t0 * FPS) % beatF;
  const whole = phaseProfile(on, energy, bpm, 0, on.length, loud);
  const mean = whole.reduce((a, b) => a + b, 0) / (whole.length || 1);
  const strength = mean ? whole[Math.round(phase) % whole.length] / mean : 0;
  let agreeing = 0;
  let checked = 0;
  for (let q = 0; q < 4; q++) {
    const from = Math.floor((on.length * q) / 4);
    const to = Math.floor((on.length * (q + 1)) / 4);
    const prof = phaseProfile(on, energy, bpm, from, to, loud);
    if (!prof.some((v) => v > 0)) continue;
    let bestP = 0;
    for (let p = 1; p < prof.length; p++) if (prof[p] > prof[bestP]) bestP = p;
    // the same grid, or the same grid half a beat over (an off-beat bass can lead a stretch):
    // what matters is that the tempo does not drift through the song
    const half = beatF / 2;
    const d = Math.abs(bestP - phase) % half;
    checked++;
    if (Math.min(d, half - d) <= 3) agreeing++;
  }
  return { strength, consistency: checked ? agreeing / checked : 0 };
}

/** Song parts from energy per bar (or per two seconds, without a beat). */
function sections(low: Float32Array, full: Float32Array, start: number, unit: number, units: number): Analysis["sections"] {
  const levels: number[] = [];
  for (let b = 0; b < units; b++) {
    const i0 = Math.round((start + b * unit) * FPS);
    const i1 = Math.min(full.length, Math.round((start + (b + 1) * unit) * FPS));
    if (i1 <= i0) break;
    let ef = 0;
    let el = 0;
    for (let i = i0; i < i1; i++) {
      ef += full[i];
      el += low[i];
    }
    levels.push(ef / (i1 - i0), el / (i1 - i0));
  }
  const fullL = levels.filter((_, i) => i % 2 === 0);
  const lowL = levels.filter((_, i) => i % 2 === 1);
  const top = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.95)] || 1;
  const fTop = top(fullL);
  const lTop = top(lowL);
  const level = fullL.map((f, i) => Math.min(1, 0.5 * (f / fTop) + 0.5 * (lowL[i] / lTop)));
  const tones: Tone[] = level.map((v) => (v >= 0.72 ? "drop" : v >= 0.3 ? "build" : "calm"));
  // a short dip right after a drop is a breath, not a new part
  for (let i = 1; i < tones.length; i++) {
    const prev = level.slice(Math.max(0, i - 4), i);
    const avg = prev.reduce((a, b) => a + b, 0) / (prev.length || 1);
    if (tones[i - 1] === "drop" && level[i] < 0.6 * avg && (tones[i + 1] === "drop" || tones[i + 2] === "drop")) tones[i] = "break";
  }
  // runs shorter than two bars join the part before (breaths stay)
  for (let i = 1; i < tones.length - 1; i++) if (tones[i] !== "break" && tones[i] !== tones[i - 1] && tones[i + 1] === tones[i - 1]) tones[i] = tones[i - 1];
  const out: Analysis["sections"] = [];
  tones.forEach((tone, i) => {
    if (i === 0 || tone !== tones[i - 1]) out.push({ beat: i * 4, label: "", tone });
  });
  out.forEach((s, i) => {
    s.label =
      s.tone === "drop" ? "Drop" : s.tone === "build" ? "Build" : s.tone === "break" ? "Respiro" : i === 0 ? "Intro" : i === out.length - 1 ? "Saída" : "Calmo";
  });
  return out;
}

export function analyzeMusic(pcm: Float32Array, sampleRate: number): Analysis {
  const { low, full, onLow, onFull, n } = envelopes(pcm, sampleRate);
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) env[i] = onLow[i] + 0.5 * onFull[i];
  const a = tempoByAcf(env);
  const b = tempoByIntervals(onLow);
  const agree = b.peaks > 16 && Math.abs(fold(a) - b.bpm) / b.bpm < 0.03;
  // Each tempo reading gets a full grid (a wide coarse fit, then a fine one) and the
  // self-check; the grid that holds best through the song wins.
  const candidates = [...new Set([a, fold(a), b.bpm].map((x) => Math.round(x * 4) / 4))].filter((x) => x >= MIN_BPM && x <= MAX_BPM);
  let best: { grid: { bpm: number; t0: number }; check: { strength: number; consistency: number }; score: number } | null = null;
  /** how much grids at deliberately wrong tempos stand out: real music ≈ 1.2, noise far more */
  const offTempo = (bpm: number) =>
    Math.max(...[0.93, 0.955, 1.045, 1.07].map((f) => {
      const g = fitGrid(onLow, bpm * f, 0.2, 8);
      return checkGrid(onLow, low, g.bpm, g.t0).strength;
    }));
  for (const cand of candidates) {
    const coarse = fitGrid(onLow, cand, 1.5, 30);
    const grid = fitGrid(onLow, coarse.bpm, 0.08, 16);
    const check = checkGrid(onLow, low, grid.bpm, grid.t0);
    const score = check.strength * check.consistency;
    if (!best || score > best.score) best = { grid, check, score };
  }
  const { grid, check } = best!;
  // The beat must beat chance: the right tempo has to stand out at least 30% more than
  // grids at deliberately wrong tempos (random hits make every tempo stand out alike).
  // When the two readings disagree (a swung or lo-fi rhythm confuses the interval count),
  // it must also stand out more, and wrong tempos must stay flat (they do not in speech).
  let steady = check.strength >= (agree ? 1.25 : 1.6) && check.consistency >= 0.75;
  if (steady) {
    const off = offTempo(grid.bpm);
    steady = check.strength / off >= 1.3 && (agree || off <= 1.45);
  }
  const confidence = Math.round(Math.min(1, Math.max(0, (check.strength - 1) / 1.5)) * check.consistency * 100) / 100;
  const duration = pcm.length / sampleRate;
  if (steady) {
    const bar = (4 * 60) / grid.bpm;
    return {
      bpm: Math.round(grid.bpm * 10) / 10,
      t0: Math.round(grid.t0 * 1000) / 1000,
      steady: true,
      confidence,
      sections: sections(low, full, grid.t0, bar, Math.floor((duration - grid.t0) / bar)),
    };
  }
  // no steady beat: half-second units, parts every two seconds by energy
  return { bpm: 120, t0: 0, steady: false, confidence, sections: sections(low, full, 0, 2, Math.floor(duration / 2)) };
}

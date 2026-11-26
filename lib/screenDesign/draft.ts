import sharp from "sharp";
import type { OcrBox, OcrLine } from "./tools";

// Stage 1, no AI: what the pixels say, measured on the screenshot enlarged `s` times and brought
// back to its own size at the end.
//   · flat areas of one colour → shapes (edges to the pixel, corner radius, thin border)
//   · outlined boxes (a border on a fill the colour of the page) → shapes, found from edges
//   · thin bars (dividers, tab underlines) → thin shapes
//   · busy areas outside the letters → image crops (photos, icons, logos)
//   · the Mac's text recognition → texts, with ink colour and coverage (for the weight)

export type Box = { x: number; y: number; w: number; h: number };
export type Shape = Box & { color: string; radius: number; stroke?: string };
export type Crop = Box;
export type Text = Box & { text: string; color: string; weight: number; coverage: number };
export type Draft = { width: number; height: number; scale: number; shapes: Shape[]; crops: Crop[]; texts: Text[] };

const dist = (a: number[], b: number[]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
export const hex = (c: number[]) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const rgb = (h: string) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
export const inside = (a: Box, b: Box, pad = 2) => a.x >= b.x - pad && a.y >= b.y - pad && a.x + a.w <= b.x + b.w + pad && a.y + a.h <= b.y + b.h + pad;
const iou = (a: Box, b: Box) => { const o = overlap(a, b); return o / (a.w * a.h + b.w * b.h - o); };

export async function makeDraft(image: string, ocr: { lines: OcrLine[] }, s = 1): Promise<Draft> {
  const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const px = (x: number, y: number) => {
    const i = (Math.max(0, Math.min(H - 1, Math.round(y))) * W + Math.max(0, Math.min(W - 1, Math.round(x)))) * 3;
    return [data[i], data[i + 1], data[i + 2]];
  };

  // An icon glued to the start of a line ("Q Busque…", the search glass read as a letter)
  // leaves the text and becomes a crop of its own.
  const glued: Crop[] = [];
  const lines = ocr.lines.filter((l) => l.w >= 10 * s).map((l) => {
    const m = /^(\S)\s+(\S.*)$/.exec(l.text);
    if (!m || /[\dA-Za-zÀ-ú]{2}/.test(m[1]) || l.text.length < 6) return l;
    const cut = Math.round(l.h * 1.25);
    glued.push({ x: Math.max(0, Math.round(l.x - 2 * s)), y: Math.round(l.y - s), w: Math.round(l.h + 4 * s), h: Math.round(l.h + 2 * s) });
    return { ...l, text: m[2], x: l.x + cut, w: l.w - cut, chars: l.chars?.slice(1) };
  });

  // A line painted on a photo belongs to the photo: it is neither masked nor made a text layer.
  // Photos are found before any masking, as busy areas with many different colours (a block of
  // text on a flat background has two colours and the blends between them).
  const photos: Box[] = [];
  const pieces: Box[] = [];
  {
    const C = 4, cw = Math.floor(W / C), ch = Math.floor(H / C);
    const busy = new Uint8Array(cw * ch);
    for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
      const c0 = px(cx * C, cy * C);
      let dev = 0;
      for (let y = 0; y < C; y += 2) for (let x = 0; x < C; x += 2) dev = Math.max(dev, dist(px(cx * C + x, cy * C + y), c0));
      busy[cy * cw + cx] = dev > 18 ? 1 : 0;
    }
    const seen = new Uint8Array(cw * ch);
    for (let i = 0; i < busy.length; i++) {
      if (!busy[i] || seen[i]) continue;
      const stack = [i]; seen[i] = 1;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
      const bins = new Set<number>();
      while (stack.length) {
        const j = stack.pop()!, cx = j % cw, cy = (j / cw) | 0; n++;
        x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
        const p = px(cx * C + 2, cy * C + 2);
        bins.add(((p[0] >> 4) << 8) | ((p[1] >> 4) << 4) | (p[2] >> 4));
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
          const k = ny * cw + nx;
          if (busy[k] && !seen[k]) { seen[k] = 1; stack.push(k); }
        }
      }
      const comp = { x: x0 * C, y: y0 * C, w: (x1 - x0 + 1) * C, h: (y1 - y0 + 1) * C };
      if (n * C * C > 3000 * s * s && bins.size > 60) photos.push(comp); else pieces.push(comp);
    }
  }
  // a photo grows over the busy pieces and the lines that touch it (a smooth, dark corner of a
  // banner splits it into pieces; text painted on it sits between them)
  const touch = (a: Box, b: Box, gap: number) => a.x - gap < b.x + b.w && b.x - gap < a.x + a.w && a.y - gap < b.y + b.h && b.y - gap < a.y + a.h;
  for (const ph of photos) {
    for (let grown = true; grown; ) {
      grown = false;
      for (const b of [...pieces, ...lines]) {
        if (inside(b, ph, 0) || !touch(ph, b, 4 * s) || b.w * b.h > ph.w * ph.h || overlap(b, ph) / (b.w * b.h) < 0.3) continue;
        const x = Math.min(ph.x, b.x), y = Math.min(ph.y, b.y);
        ph.w = Math.max(ph.x + ph.w, b.x + b.w) - x; ph.h = Math.max(ph.y + ph.h, b.y + b.h) - y; ph.x = x; ph.y = y;
        grown = true;
      }
    }
  }
  const onPhoto = new Set(lines.filter((l) => photos.some((ph) => overlap(l, ph) / (l.w * l.h) > 0.6)));
  const textLines = lines.filter((l) => !onPhoto.has(l));

  // The letters, not the whole line box, are masked: an icon right next to a word stays visible.
  const mask = new Uint8Array(W * H);
  const paint = (b: OcrBox, pad: number) => {
    for (let y = Math.max(0, Math.floor(b.y - pad)); y < Math.min(H, Math.ceil(b.y + b.h + pad)); y++)
      for (let x = Math.max(0, Math.floor(b.x - pad)); x < Math.min(W, Math.ceil(b.x + b.w + pad)); x++) mask[y * W + x] = 1;
  };
  for (const l of textLines) {
    const chars = (l.chars ?? []).filter((c) => c.w > 0 && c.h > 0 && c.w < l.w * 0.8);
    if (chars.length >= Math.max(1, l.text.replace(/\s/g, "").length * 0.6)) chars.forEach((c) => paint({ x: c.x, y: l.y, w: c.w, h: l.h }, s));
    else paint(l, 3 * s);
  }
  const masked = (x: number, y: number) => mask[Math.max(0, Math.min(H - 1, Math.round(y))) * W + Math.max(0, Math.min(W - 1, Math.round(x)))] === 1;

  // 1. 4px cells: flat (one colour) or busy
  const C = 4, cw = Math.floor(W / C), ch = Math.floor(H / C);
  const cell: { flat: boolean; col: number[] }[] = [];
  for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
    const ps: number[][] = [];
    for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) ps.push(px(cx * C + x, cy * C + y));
    const m = [0, 1, 2].map((k) => ps.reduce((acc, p) => acc + p[k], 0) / ps.length);
    cell.push({ flat: Math.max(...ps.map((p) => dist(p, m))) < 18, col: m });
  }
  const cellText = (cx: number, cy: number) => masked(cx * C + 2, cy * C + 2);

  // 2. connected flat areas of one colour
  const label = new Int32Array(cw * ch).fill(-1);
  const areas: (Box & { col: number[]; n: number })[] = [];
  for (let i = 0; i < cell.length; i++) {
    if (label[i] >= 0 || !cell[i].flat) continue;
    const base = cell[i].col, stack = [i], id = areas.length;
    let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    label[i] = id;
    while (stack.length) {
      const j = stack.pop()!, cx = j % cw, cy = (j / cw) | 0;
      n++; x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
        const k = ny * cw + nx;
        if (label[k] >= 0) continue;
        if ((cell[k].flat && dist(cell[k].col, base) < 14) || (!cell[k].flat && cellText(nx, ny))) { label[k] = id; stack.push(k); }
      }
    }
    areas.push({ x: x0 * C, y: y0 * C, w: (x1 - x0 + 1) * C, h: (y1 - y0 + 1) * C, col: base, n });
  }

  // corner radius: where the diagonal from the corner meets the fill (or the border), r = d / (1 - 1/√2)
  const cornerRadius = (x: number, y: number, w: number, h: number, fill: number[], stroke?: number[]) => {
    let d = 0;
    while (d < Math.min(w, h) / 2 && dist(px(x + d, y + d), fill) > 24 && (!stroke || dist(px(x + d, y + d), stroke) > 24)) d++;
    return d <= s ? 0 : Math.round(d / 0.293);
  };

  // 3. shapes from the flat areas: edges walked out to the pixel, a thin border when the edge has a colour of its own
  const shapes: Shape[] = areas.filter((a) => a.n >= 30 * s * s && a.n / ((a.w / C) * (a.h / C)) > 0.6).map((a) => {
    const fill = a.col;
    const cx = Math.round(a.x + a.w / 2), cy = Math.round(a.y + a.h / 2);
    const walk = (x: number, y: number, dx: number, dy: number) => {
      let k = 0;
      while (k < 6 * s && dist(px(x + dx * (k + 1), y + dy * (k + 1)), fill) < 10) k++;
      return k;
    };
    const left = Math.max(0, a.x - walk(a.x, cy, -1, 0)), right = Math.min(W - 1, a.x + a.w - 1 + walk(a.x + a.w - 1, cy, 1, 0));
    const top = Math.max(0, a.y - walk(cx, a.y, 0, -1)), bottom = Math.min(H - 1, a.y + a.h - 1 + walk(cx, a.y + a.h - 1, 0, 1));
    const t = Math.max(1, Math.round(s));
    const edge = [px(left - t, cy), px(right + t, cy), px(cx, top - t), px(cx, bottom + t)];
    const beyond = [px(left - 3 * t, cy), px(right + 3 * t, cy), px(cx, top - 3 * t), px(cx, bottom + 3 * t)];
    const lined = edge.filter((e, i) => dist(e, fill) > 20 && dist(e, beyond[i]) > 12 && left > t && top > t && right < W - 1 - t && bottom < H - 1 - t);
    const stroke = lined.length >= 3 ? hex([0, 1, 2].map((k) => lined.reduce((acc, e) => acc + e[k], 0) / lined.length)) : undefined;
    const x = Math.max(0, stroke ? left - t : left), y = Math.max(0, stroke ? top - t : top);
    const w = (stroke ? right + t : right) - x + 1, h = (stroke ? bottom + t : bottom) - y + 1;
    return { x, y, w, h, color: hex(fill), radius: cornerRadius(x, y, w, h, fill, stroke ? rgb(stroke) : undefined), stroke };
  });

  // 4. edges: long straight runs where the colour changes, away from the letters
  type Seg = { at: number; from: number; to: number };
  const minRun = 24 * s;
  const hSegs: Seg[] = [], vSegs: Seg[] = [];
  for (let y = 1; y < H; y++) {
    let start = -1;
    for (let x = 0; x <= W; x++) {
      const on = x < W && !masked(x, y) && dist(px(x, y), px(x, y - 1)) > 14;
      if (on && start < 0) start = x;
      if (!on && start >= 0) { if (x - start >= minRun) hSegs.push({ at: y, from: start, to: x - 1 }); start = -1; }
    }
  }
  for (let x = 1; x < W; x++) {
    let start = -1;
    for (let y = 0; y <= H; y++) {
      const on = y < H && !masked(x, y) && dist(px(x, y), px(x - 1, y)) > 14;
      if (on && start < 0) start = y;
      if (!on && start >= 0) { if (y - start >= minRun) vSegs.push({ at: x, from: start, to: y - 1 }); start = -1; }
    }
  }
  const spanShare = (a: Seg, b: Seg) => Math.max(0, Math.min(a.to, b.to) - Math.max(a.from, b.from)) / Math.max(a.to - a.from, b.to - b.from);
  const near = (v: number, w: number, tol: number) => Math.abs(v - w) <= tol;

  // 4a. thin bars: two horizontal edges close together over the same span (a divider, an underline)
  const bars: Shape[] = [];
  for (const a of hSegs) for (const b of hSegs) {
    const gap = b.at - a.at;
    // at least a pixel thick at the screenshot's size, and the same colour on both sides (an
    // underline on white); an edge between two different areas is no bar
    if (gap < s || gap > 6 * s || spanShare(a, b) < 0.9) continue;
    const x = Math.max(a.from, b.from), w = Math.min(a.to, b.to) - x + 1;
    const col = px(x + w / 2, a.at + gap / 2 - 0.5);
    const above = px(x + w / 2, a.at - 3 * s), below = px(x + w / 2, b.at + 3 * s);
    if (dist(col, above) < 40 || dist(col, below) < 40 || dist(above, below) > 30) continue;
    if (shapes.some((sh) => near(a.at, sh.y, 3 * s) || near(b.at, sh.y + sh.h, 3 * s))) continue;
    if (bars.some((o) => iou(o, { x, y: a.at, w, h: gap }) > 0.5)) continue;
    bars.push({ x, y: a.at, w, h: gap, color: hex(col), radius: 0 });
  }

  // 4b. outlined boxes: a top and a bottom edge over the same span, with sides near both ends
  const outlined: Shape[] = [];
  for (const top of hSegs) for (const bot of hSegs) {
    const h = bot.at - top.at;
    if (h < 16 * s || spanShare(top, bot) < 0.85) continue;
    const rTol = Math.min(40 * s, h / 2);
    const sideAt = (xEdge: number) => vSegs.some((v) => near(v.at, xEdge, rTol) && v.to - v.from >= h * 0.4 && v.from >= top.at - 2 * s && v.to <= bot.at + 2 * s);
    // rounded corners shorten the straight edges: the box reaches past them by about the radius
    const gapL = Math.max(0, vSegs.filter((v) => v.at < top.from && near(v.at, top.from, rTol) && v.from >= top.at - 2 * s && v.to <= bot.at + 2 * s).map((v) => top.from - v.at).sort((p, q) => q - p)[0] ?? 0);
    const x0 = top.from - gapL, x1 = top.to + gapL;
    if (!sideAt(x0) || !sideAt(x1)) continue;
    const box = { x: x0, y: top.at - 1, w: x1 - x0 + 1, h: h + 1 };
    if (outlined.some((o) => iou(o, box) > 0.8) || bars.some((b) => iou(b, box) > 0.5)) continue;
    // a box is a smooth surface (a card, a field): edges around a photo are not one
    if (photos.some((ph) => overlap(ph, box) / (box.w * box.h) > 0.3)) continue;
    {
      let flat = 0, n = 0;
      for (let cy = Math.ceil((box.y + 3 * s) / C); cy < Math.floor((box.y + box.h - 3 * s) / C); cy++)
        for (let cx = Math.ceil((box.x + 3 * s) / C); cx < Math.floor((box.x + box.w - 3 * s) / C); cx++) {
          if (cellText(cx, cy)) continue;
          n++; if (cell[cy * cw + cx]?.flat) flat++;
        }
      if (n && flat / n < 0.6) continue;
    }
    const inner = px(box.x + box.w / 2, box.y + Math.min(6 * s, box.h / 3));
    const line = px(box.x + box.w / 2, top.at);
    const outer = px(box.x + box.w / 2, top.at - 2 * s);
    const border = dist(line, inner) > 12 && dist(line, outer) > 8;
    outlined.push({ ...box, color: hex(inner), radius: gapL ? Math.round(gapL / 0.3) : 0, stroke: border ? hex(line) : undefined });
  }
  // an outlined box the flat-area search already found only adds its border to it
  for (const o of outlined) {
    const twin = shapes.find((sh) => iou(sh, o) > 0.75);
    if (twin) { if (!twin.stroke && o.stroke) twin.stroke = o.stroke; continue; }
    shapes.push(o);
  }
  for (const b of bars) {
    const onBorder = shapes.some((sh) => sh.stroke && overlap(sh, b) / (b.w * b.h) > 0.8 && (near(b.y, sh.y, 3 * s) || near(b.y + b.h, sh.y + sh.h, 3 * s)));
    if (!onBorder && !shapes.some((sh) => iou(sh, b) > 0.5)) shapes.push(b);
  }

  // 5. busy areas outside the letters: photos, icons, logos
  const seen = new Uint8Array(cw * ch);
  let crops: Crop[] = [];
  for (let i = 0; i < cell.length; i++) {
    if (seen[i] || cell[i].flat || cellText(i % cw, (i / cw) | 0)) continue;
    const stack = [i]; seen[i] = 1;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
    while (stack.length) {
      const j = stack.pop()!, cx = j % cw, cy = (j / cw) | 0; n++;
      x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
        const k = ny * cw + nx;
        if (seen[k] || cell[k].flat || cellText(nx, ny)) continue;
        seen[k] = 1; stack.push(k);
      }
    }
    if (n >= 3 * s) crops.push({ x: x0 * C, y: y0 * C, w: (x1 - x0 + 1) * C, h: (y1 - y0 + 1) * C });
  }
  // a crop that is only a shape's anti-aliased edge or border is no image
  const onEdge = (c: Crop) => shapes.some((sh) => {
    const ring = (c.w <= 8 * s || c.h <= 8 * s)
      && overlap(c, { x: sh.x - 4 * s, y: sh.y - 4 * s, w: sh.w + 8 * s, h: sh.h + 8 * s }) / (c.w * c.h) > 0.9
      && overlap(c, { x: sh.x + 6 * s, y: sh.y + 6 * s, w: Math.max(0, sh.w - 12 * s), h: Math.max(0, sh.h - 12 * s) }) === 0;
    return (overlap(c, sh) / (c.w * c.h) > 0.6 && overlap(c, sh) / (sh.w * sh.h) > 0.6) || ring;
  });
  crops = crops.filter((c) => c.w >= 10 * s && c.h >= 10 * s && !onEdge(c));
  crops.push(...glued, ...photos);
  // a crop inside a larger one goes; of two equal ones, the first stays
  crops = crops.filter((c, i) => !crops.some((d, j) => j !== i && inside(c, d) && (d.w * d.h > c.w * c.h || (d.w * d.h === c.w * c.h && j < i))));
  // texts painted inside a photo or logo stay in it
  const big = crops.filter((c) => c.w * c.h > 2000 * s * s);

  // 6. texts: ink colour (farthest from the box's commonest colour) and the share of the
  // glyphs' own box the ink covers, whatever its contrast (the weight is read from it)
  const texts: Text[] = textLines.filter((l) => !big.some((b) => inside(l, b, 2 * s))).map((l) => {
    const x0 = Math.floor(l.x), y0 = Math.floor(l.y), x1 = Math.ceil(l.x + l.w), y1 = Math.ceil(l.y + l.h);
    const ps: number[][] = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ps.push(px(x, y));
    const bins = new Map<string, { n: number; c: number[] }>();
    for (const p of ps) { const k = p.map((v) => v >> 4).join(","); const b = bins.get(k) ?? { n: 0, c: p }; b.n++; bins.set(k, b); }
    const bg = [...bins.values()].sort((a, b) => b.n - a.n)[0].c;
    const sorted = ps.map((p) => [dist(p, bg), p] as const).sort((a, b) => b[0] - a[0]);
    const top = sorted.slice(0, Math.max(1, (sorted.length * 0.08) | 0)).map((e) => e[1]);
    const share = sorted.filter((e) => e[0] > 120).length / sorted.length;
    const span = Math.max(30, sorted[0][0]);
    const ink = (x: number, y: number) => Math.min(1, dist(px(x, y), bg) / span);
    let tx0 = 1e9, ty0 = 1e9, tx1 = -1, ty1 = -1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (ink(x, y) > 0.15) { tx0 = Math.min(tx0, x); ty0 = Math.min(ty0, y); tx1 = Math.max(tx1, x); ty1 = Math.max(ty1, y); }
    let inkSum = 0;
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) inkSum += ink(x, y);
    const coverage = tx1 < 0 ? 0 : inkSum / ((tx1 - tx0 + 1) * (ty1 - ty0 + 1));
    return { text: l.text, x: l.x, y: l.y, w: l.w, h: l.h, color: hex([0, 1, 2].map((k) => top.reduce((acc, p) => acc + p[k], 0) / top.length)), weight: share > 0.3 ? 700 : share > 0.2 ? 600 : 400, coverage };
  });

  // back to the screenshot's own size
  const k = 1 / s;
  const sb = <T extends Box>(b: T): T => ({ ...b, x: b.x * k, y: b.y * k, w: b.w * k, h: b.h * k });
  return {
    width: Math.round(W * k), height: Math.round(H * k), scale: s,
    shapes: shapes.map((sh) => ({ ...sb(sh), radius: Math.round(sh.radius * k) })),
    crops: crops.map(sb),
    texts: texts.map(sb),
  };
}

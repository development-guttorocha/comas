import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Box, Draft } from "./draft";
import type { Structure } from "./understand";
import { fig } from "./tools";

// Stage 3, no AI: the FigCraft file. Measured values are snapped to a small set of tokens (the
// design-dna idea: a colour palette, a type scale and a few corner radii), which become colour
// and text styles in the file; every layer sits in the group DeepSeek gave it, with its name.

const RADII = [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32];
const dist = (a: string, b: string) => [1, 3, 5].reduce((s, k) => s + Math.abs(parseInt(a.slice(k, k + 2), 16) - parseInt(b.slice(k, k + 2), 16)), 0);

/** Colours closer than `tol` merge into the commonest of them. */
function palette(colors: string[], tol = 14) {
  const count = new Map<string, number>();
  colors.forEach((c) => count.set(c, (count.get(c) ?? 0) + 1));
  const canon: string[] = [];
  const map = new Map<string, string>();
  for (const c of [...count.keys()].sort((a, b) => count.get(b)! - count.get(a)!)) {
    const near = canon.find((k) => dist(k, c) <= tol);
    if (near) map.set(c, near); else { canon.push(c); map.set(c, c); }
  }
  return { canon, of: (c: string) => map.get(c) ?? c };
}

/** Sizes within 0.75px of each other share one whole size. */
function typeScale(sizes: number[]) {
  const sorted = [...sizes].sort((a, b) => a - b);
  const clusters: number[][] = [];
  for (const s of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && s - last[last.length - 1] <= 0.75 && s - last[0] <= 1.5) last.push(s); else clusters.push([s]);
  }
  return (s: number) => Math.round(clusters.find((c) => c.includes(s))!.reduce((a, b) => a + b, 0) / clusters.find((c) => c.includes(s))!.length);
}

const radiusToken = (r: number, w: number, h: number) => (r >= Math.min(w, h) / 2 - 2 && r > 8 ? Math.round(Math.min(w, h) / 2) : RADII.reduce((best, v) => (Math.abs(v - r) < Math.abs(best - r) ? v : best), 0));
const STYLE = (w: number) => (w >= 800 ? "Extra Bold" : w >= 700 ? "Bold" : w >= 600 ? "Semi Bold" : w >= 500 ? "Medium" : "Regular");
const WEIGHT_NAME: Record<number, string> = { 400: "Regular", 500: "Medium", 600: "Semibold", 700: "Bold", 800: "Extrabold" };

export async function buildFile(image: string, d: Draft, st: Structure, family: string, dir: string) {
  await mkdir(path.join(dir, "crops"), { recursive: true });

  // Measure every text at a first guess, drawn twice (regular and bold) on a white board: the
  // widths fit the size, and the ink each one leaves tells the weight, read against the screenshot.
  const guess = (i: number) => Math.round(d.texts[i].h * 1.05);
  const row = (i: number, b: number) => 20 + (i * 2 + b) * Math.ceil(Math.max(...d.texts.map((t) => t.h)) * 2);
  const boardH = row(d.texts.length, 0) + 40;
  const probe = [
    { command: "node.create", as: "root", params: { type: "frame", name: "probe", x: 0, y: 0, width: Math.max(d.width, 2000), height: boardH, props: { fills: ["#ffffff"] } } },
    ...d.texts.flatMap((t, i) => [400, 700].map((w, b) => ({ command: "node.create", as: `t${i}_${b}`, params: { type: "text", parent: { $ref: "root" }, x: 10, y: row(i, b), text: t.text, props: { fontFamily: family, fontStyle: STYLE(w), fontVariations: { wght: w }, fontSize: guess(i), fills: ["#000000"], textAutoResize: "widthAndHeight" } } }))),
    ...d.texts.flatMap((_, i) => [0, 1].map((b) => ({ command: "node.get", params: { id: { $ref: `t${i}_${b}` } } }))),
  ];
  await writeFile(path.join(dir, "probe.json"), JSON.stringify(probe));
  await fig(["run", path.join(dir, "probe.json"), "--out", path.join(dir, "probe.figcraft")]);
  const got = (await fig(["run", path.join(dir, "probe.json")])).split("\n").filter((l) => l.includes('"node.get"')).map((l) => JSON.parse(l).result as { width?: number; height?: number; absoluteBounds?: { x: number; y: number; width: number; height: number } });
  await fig(["export", path.join(dir, "probe.figcraft"), "-o", path.join(dir, "probe.png"), "--node", "probe"]);
  const pr = await sharp(path.join(dir, "probe.png")).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
  // ink share inside the glyphs' own box (the text layer's box has line spacing around it, the
  // screenshot's box from the text recognition does not)
  const ink = (b?: { x: number; y: number; width: number; height: number }) => {
    if (!b) return 0;
    const at = (x: number, y: number) => (x < pr.info.width && y < pr.info.height ? (255 - pr.data[y * pr.info.width + x]) / 255 : 0);
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = Math.floor(b.y); y < Math.ceil(b.y + b.height); y++) for (let x = Math.floor(b.x); x < Math.ceil(b.x + b.width); x++) {
      if (at(x, y) > 0.15) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
    if (x1 < 0) return 0;
    let sum = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sum += at(x, y);
    return sum / ((x1 - x0 + 1) * (y1 - y0 + 1));
  };
  const measured = d.texts.map((_, i) => got[i * 2] ?? {});
  const weights = d.texts.map((t, i) => {
    const lo = ink(got[i * 2]?.absoluteBounds), hi = ink(got[i * 2 + 1]?.absoluteBounds);
    if (!(hi > lo) || !t.coverage) return st.texts?.[`t${i}`]?.weight ?? t.weight;
    const w = 400 + ((t.coverage - lo) / (hi - lo)) * 300;
    return Math.max(400, Math.min(800, Math.round(w / 100) * 100));
  });
  const weight = (i: number) => weights[i];
  const font = (i: number) => ({ fontFamily: family, fontStyle: STYLE(weight(i)), fontVariations: { wght: weight(i) } });
  // the width at the chosen weight lies between the regular and the bold ones
  const widthAt = (i: number) => {
    const a = got[i * 2]?.width, b = got[i * 2 + 1]?.width;
    return a && b ? a + ((b - a) * (weight(i) - 400)) / 300 : a;
  };
  // a very short text ("-", "4,5") has too little width to measure: its height decides
  const rawSizes = d.texts.map((t, i) => (widthAt(i) && t.text.trim().length >= 3 ? guess(i) * (t.w / widthAt(i)!) : guess(i)));

  // tokens
  const colors = palette([...d.shapes.flatMap((s) => [s.color, ...(s.stroke ? [s.stroke] : [])]), ...d.texts.map((t) => t.color)]);
  const size = typeScale(rawSizes);
  const tokens = {
    colors: colors.canon,
    sizes: [...new Set(rawSizes.map(size))].sort((a, b) => b - a),
    radii: [...new Set(d.shapes.map((s) => radiusToken(s.radius, s.w, s.h)))].sort((a, b) => a - b),
  };

  // leaves
  type Leaf = Box & { kind: "s" | "c" | "t"; step: (parent: string, ox: number, oy: number, as: string) => unknown };
  const leaves = new Map<string, Leaf>();
  d.shapes.forEach((s, i) => leaves.set(`s${i}`, { ...s, kind: "s", step: (p, ox, oy, as) => ({ command: "node.create", as, params: { type: "rectangle", parent: { $ref: p }, name: st.names[`s${i}`] ?? `Forma ${i + 1}`, x: s.x - ox, y: s.y - oy, width: s.w, height: s.h, props: { fills: [colors.of(s.color)], cornerRadius: radiusToken(s.radius, s.w, s.h), ...(s.stroke ? { strokes: [colors.of(s.stroke)], strokeWeight: 1, strokeAlign: "inside" } : {}) } } }) }));
  for (const [i, c] of d.crops.entries()) {
    const file = path.join(dir, "crops", `c${i}.png`);
    // cut from the image the measures were taken on (enlarged when the screenshot was small)
    const k = d.scale ?? 1, left = Math.max(0, Math.round(c.x * k)), top = Math.max(0, Math.round(c.y * k));
    const meta = await sharp(image).metadata();
    await sharp(image).extract({ left, top, width: Math.max(1, Math.min(Math.round(c.w * k), (meta.width ?? 0) - left)), height: Math.max(1, Math.min(Math.round(c.h * k), (meta.height ?? 0) - top)) }).png().toFile(file);
    const kind = st.crops[`c${i}`];
    leaves.set(`c${i}`, { ...c, kind: "c", step: (p, ox, oy, as) => ({ command: "image.place", as, params: { path: file, parent: { $ref: p }, x: c.x - ox, y: c.y - oy, width: c.w, height: c.h, mode: "fill", name: st.names[`c${i}`] ?? (kind === "icon" ? `Ícone ${i + 1}` : `Imagem ${i + 1}`) } }) });
  }
  d.texts.forEach((t, i) => {
    const fs = size(rawSizes[i]);
    const h = measured[i]?.height ? measured[i].height! * (fs / guess(i)) : fs * 1.2;
    const y = Math.round(t.y + t.h / 2 - h / 2);
    leaves.set(`t${i}`, { x: t.x, y, w: t.w, h, kind: "t", step: (p, ox, oy, as) => ({ command: "node.create", as, params: { type: "text", parent: { $ref: p }, name: st.names[`t${i}`] ?? t.text.slice(0, 30), x: Math.round(t.x - ox), y: y - oy, text: t.text, props: { ...font(i), fontSize: fs, fills: [colors.of(t.color)], textAutoResize: "widthAndHeight" } } }) });
  });

  // groups; a shape left out of them becomes the background of the largest group it holds
  const groups = new Map(st.groups.map((g) => [g.id, { ...g, children: [...g.children] }]));
  const claimed = new Set(st.groups.flatMap((g) => g.children));
  const box = (id: string): Box | null => {
    const l = leaves.get(id); if (l) return l;
    const g = groups.get(id); if (!g) return null;
    const bs = g.children.map(box).filter(Boolean) as Box[]; if (!bs.length) return null;
    const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y));
    return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y };
  };
  const covered = (inner: Box, outer: Box) => Math.max(0, Math.min(inner.x + inner.w, outer.x + outer.w) - Math.max(inner.x, outer.x)) * Math.max(0, Math.min(inner.y + inner.h, outer.y + outer.h) - Math.max(inner.y, outer.y)) / (inner.w * inner.h);
  for (const [id, l] of leaves) {
    if (claimed.has(id) || l.kind !== "s") continue;
    const host = [...groups.values()].filter((g) => g.role !== "screen").map((g) => ({ g, b: box(g.id) })).filter((x) => x.b && covered(x.b, l) > 0.9).sort((a, b) => b.b!.w * b.b!.h - a.b!.w * a.b!.h)[0];
    if (host) { host.g.children.unshift(id); claimed.add(id); }
  }

  const area = (id: string) => { const b = box(id); return b ? b.w * b.h : 0; };
  // Stacking between overlapping groups is read from the screenshot: where they overlap, if the
  // pixels show one group's background colour, that group lies on top (a sheet over the page);
  // if they show the other's content, it lies underneath (a veil behind the cards).
  const shot = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const k = d.scale ?? 1;
  const pix = (x: number, y: number) => {
    const xi = Math.max(0, Math.min(shot.info.width - 1, Math.round(x * k))), yi = Math.max(0, Math.min(shot.info.height - 1, Math.round(y * k)));
    const i = (yi * shot.info.width + xi) * 3;
    return [shot.data[i], shot.data[i + 1], shot.data[i + 2]];
  };
  const background = (id: string) => {
    const g = groups.get(id), b = box(id);
    if (!g || !b) return null;
    const bg = g.children.map((c) => leaves.get(c)).find((l) => l && l.kind === "s" && l.w * l.h >= b.w * b.h * 0.8);
    return bg ? d.shapes[Number([...leaves.entries()].find(([, v]) => v === bg)![0].slice(1))].color : null;
  };
  const onTop = (a: string, b: string) => {
    const A = box(a), B = box(b), color = background(a);
    if (!A || !B || !color) return null;
    const x0 = Math.max(A.x, B.x), y0 = Math.max(A.y, B.y), x1 = Math.min(A.x + A.w, B.x + B.w), y1 = Math.min(A.y + A.h, B.y + B.h);
    if (x1 - x0 < 4 || y1 - y0 < 4) return null;
    const c = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    let hit = 0, n = 0;
    for (let y = y0; y < y1; y += Math.max(1, (y1 - y0) / 24)) for (let x = x0; x < x1; x += Math.max(1, (x1 - x0) / 24)) {
      const p = pix(x, y); n++;
      if (Math.abs(p[0] - c[0]) + Math.abs(p[1] - c[1]) + Math.abs(p[2] - c[2]) < 24) hit++;
    }
    return hit / n > 0.85;
  };
  const stack = (ids: string[]) => {
    const out = [...ids];
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
      // out[i] is painted before out[j]; swap when the pixels say otherwise
      const iTop = onTop(out[i], out[j]), jTop = onTop(out[j], out[i]);
      if (iTop === true || jTop === false) [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const root = st.groups.find((g) => g.role === "screen") ?? { id: "g0", name: "Tela", children: [] as string[] };
  const reach = new Set<string>();
  const walk = (id: string) => { if (reach.has(id)) return; reach.add(id); groups.get(id)?.children.forEach(walk); };
  walk(root.id);
  const loose = [...groups.keys()].filter((id) => id !== root.id && !reach.has(id) && ![...groups.values()].some((g) => g.children.includes(id)));
  root.children = stack([...root.children, ...loose].sort((a, b) => area(b) - area(a)));
  const steps: unknown[] = [{ command: "node.create", as: "screen", params: { type: "frame", name: root.name, x: 0, y: 0, width: d.width, height: d.height, props: { fills: ["#ffffff"], clip: true } } }];
  const used = new Set<string>();
  const applied: { as: string; paint?: string; text?: string }[] = [];
  const emit = (id: string, parent: string, ox: number, oy: number) => {
    if (used.has(id)) return; used.add(id);
    const l = leaves.get(id);
    if (l) {
      steps.push(l.step(parent, ox, oy, `n_${id}`));
      const i = Number(id.slice(1));
      if (l.kind === "s") applied.push({ as: `n_${id}`, paint: `Cores/${colors.of(d.shapes[i].color)}` });
      if (l.kind === "t") applied.push({ as: `n_${id}`, text: `Texto/${size(rawSizes[i])} ${WEIGHT_NAME[weight(i)] ?? weight(i)}` });
      return;
    }
    const g = groups.get(id); const b = box(id); if (!g || !b) return;
    steps.push({ command: "node.create", as: id, params: { type: "frame", name: g.name, parent: { $ref: parent }, x: Math.round(b.x - ox), y: Math.round(b.y - oy), width: Math.ceil(b.w), height: Math.ceil(b.h), props: { fills: [], clip: false } } });
    const order = (c: string) => ({ s: 0, c: 1, g: 2, t: 3 })[c[0] as "s" | "c" | "g" | "t"] ?? 2;
    const sorted = [...g.children].sort((a, c) => order(a) - order(c) || area(c) - area(a));
    const subgroups = stack(sorted.filter((c) => c[0] === "g"));
    let gi = 0;
    sorted.map((c) => (c[0] === "g" ? subgroups[gi++] : c)).forEach((c) => emit(c, id, Math.round(b.x), Math.round(b.y)));
  };
  // shapes nobody holds go first, at the back; then the groups; then any other leftover
  [...leaves.keys()].filter((k) => !claimed.has(k) && k[0] === "s").sort((a, b) => area(b) - area(a)).forEach((k) => emit(k, "screen", 0, 0));
  root.children.forEach((c) => emit(c, "screen", 0, 0));
  [...leaves.keys()].filter((k) => !used.has(k)).forEach((k) => emit(k, "screen", 0, 0));

  // styles from the tokens, applied where they belong
  const textStyles = new Map<string, unknown>();
  d.texts.forEach((_, i) => textStyles.set(`Texto/${size(rawSizes[i])} ${WEIGHT_NAME[weight(i)] ?? weight(i)}`, { fontFamily: family, fontStyle: STYLE(weight(i)), fontSize: size(rawSizes[i]) }));
  // (style.apply sits at the top level: a $ref inside a batch only sees that batch's own steps)
  steps.push(
    ...colors.canon.map((c) => ({ command: "style.create", params: { type: "paint", name: `Cores/${c}`, value: [{ type: "solid", color: c }] } })),
    ...[...textStyles].map(([name, value]) => ({ command: "style.create", params: { type: "text", name, value } })),
    ...applied.map((a) => ({ command: "style.apply", params: { ids: [{ $ref: a.as }], style: a.paint ?? a.text } })),
  );

  const script = path.join(dir, "script.json");
  await writeFile(script, JSON.stringify(steps, null, 1));
  const file = path.join(dir, "tela.figcraft");
  const out = await fig(["run", script, "--out", file]);
  const failed = out.split("\n").filter((l) => l.includes('"ok":false')).length;
  await fig(["export", file, "-o", path.join(dir, "render.png"), "--node", root.name]);
  await fig(["export", file, "-o", path.join(dir, "tela.fig")]).catch(() => "");
  return { file, tokens, failed, layers: steps.length };
}

import { readFile } from "node:fs/promises";

// The same layout as HTML/CSS: every group a positioned box, every shape a box with its fill,
// border and corners, every text real text in a Google font, every crop an <img>. The browser
// renders it for the comparison, and its DOM is what goes to Figma (as native layers).

type Step = { command: string; as?: string; params: Record<string, unknown> };
type Props = Record<string, unknown>;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const px = (v: unknown) => `${Math.round(Number(v ?? 0) * 100) / 100}px`;

/** Builds the page from the FigCraft script the build step wrote (script.json). */
export async function htmlFromScript(script: Step[], family: string) {
  const children = new Map<string, string[]>();
  const html = new Map<string, string>();
  const order: string[] = [];
  let root = "";
  let n = 0;
  for (const st of script) {
    if (!["node.create", "image.place"].includes(st.command)) continue;
    const p = st.params;
    const id = st.as ?? `n${n++}`;
    const parent = (p.parent as { $ref?: string } | undefined)?.$ref;
    if (!parent) root = id;
    else children.set(parent, [...(children.get(parent) ?? []), id]);
    order.push(id);
    const props = (p.props ?? {}) as Props;
    const box = `left:${px(p.x)};top:${px(p.y)};`;
    const name = esc(String(p.name ?? ""));
    if (st.command === "image.place") {
      const bytes = await readFile(String(p.path));
      html.set(id, `<img data-name="${name}" style="${box}width:${px(p.width)};height:${px(p.height)};object-fit:cover" src="data:image/png;base64,${bytes.toString("base64")}" alt="">`);
      continue;
    }
    if (p.type === "text") {
      const fill = (props.fills as string[] | undefined)?.[0] ?? "#000";
      const w = (props.fontVariations as { wght?: number } | undefined)?.wght ?? 400;
      html.set(id, `<p data-name="${name}" style="${box}margin:0;white-space:pre;font-family:'${esc(family)}',sans-serif;font-size:${px(props.fontSize)};font-weight:${w};line-height:1.21;color:${fill}">${esc(String(p.text ?? ""))}</p>`);
      continue;
    }
    const fill = (props.fills as string[] | undefined)?.[0];
    const stroke = (props.strokes as string[] | undefined)?.[0];
    const r = props.cornerRadius as number | undefined;
    const style = [
      box, `width:${px(p.width)};height:${px(p.height)};`,
      fill ? `background:${fill};` : "",
      stroke ? `box-shadow:inset 0 0 0 ${px(props.strokeWeight ?? 1)} ${stroke};` : "",
      r ? `border-radius:${px(r)};` : "",
      props.clip ? "overflow:hidden;" : "",
    ].join("");
    html.set(id, `<div data-name="${name}" data-kind="${p.type}" style="${style}">{{${id}}}</div>`);
  }
  const fill = (id: string): string => (html.get(id) ?? "").replace(`{{${id}}}`, (children.get(id) ?? []).map(fill).join(""));
  const body = fill(root).replace(/style="left:0px;top:0px;/, 'style="position:relative;left:0;top:0;');
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@100..900&display=block" rel="stylesheet">
<style>html,body{margin:0;background:#fff}div,p,img{position:absolute;box-sizing:border-box}</style></head>
<body>${body}</body></html>`;
}

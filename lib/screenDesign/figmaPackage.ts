import { readFile } from "node:fs/promises";

// The layout as a package for the Figma plugin (tools/figma-plugin): a tree of frames, shapes,
// texts and images with their measures, and the image crops as base64. The plugin builds it
// as native, editable Figma layers. Same source as the FigCraft file (script.json).

export type FigmaNode = {
  type: "frame" | "rect" | "text" | "image";
  name: string;
  x: number; y: number; w: number; h: number;
  fill?: string; stroke?: string; strokeWeight?: number; radius?: number; clip?: boolean;
  text?: string; fontSize?: number; weight?: number;
  image?: string;
  children?: FigmaNode[];
};
export type FigmaPackage = { format: "gutto-screen-layout"; version: 1; name: string; family: string; root: FigmaNode; images: Record<string, string> };

type Step = { command: string; as?: string; params: Record<string, unknown> };
const r2 = (v: unknown) => Math.round(Number(v ?? 0) * 100) / 100;

export async function figmaPackage(script: Step[], family: string, name: string): Promise<FigmaPackage> {
  const byRef = new Map<string, FigmaNode>();
  const images: Record<string, string> = {};
  let root: FigmaNode | null = null;
  let n = 0;
  for (const st of script) {
    if (!["node.create", "image.place"].includes(st.command)) continue;
    const p = st.params;
    const props = (p.props ?? {}) as Record<string, unknown>;
    const base = { name: String(p.name ?? ""), x: r2(p.x), y: r2(p.y), w: r2(p.width), h: r2(p.height) };
    let node: FigmaNode;
    if (st.command === "image.place") {
      const id = `img${n}`;
      images[id] = (await readFile(String(p.path))).toString("base64");
      node = { ...base, type: "image", image: id };
    } else if (p.type === "text") {
      node = { ...base, type: "text", text: String(p.text ?? ""), fontSize: r2(props.fontSize), weight: (props.fontVariations as { wght?: number } | undefined)?.wght ?? 400, fill: (props.fills as string[] | undefined)?.[0] };
    } else {
      node = {
        ...base, type: p.type === "frame" ? "frame" : "rect",
        fill: (props.fills as string[] | undefined)?.[0], stroke: (props.strokes as string[] | undefined)?.[0],
        strokeWeight: props.strokes ? Number(props.strokeWeight ?? 1) : undefined,
        radius: props.cornerRadius ? Number(props.cornerRadius) : undefined, clip: props.clip === true,
        children: p.type === "frame" ? [] : undefined,
      };
    }
    n++;
    if (st.as) byRef.set(st.as, node);
    const parent = (p.parent as { $ref?: string } | undefined)?.$ref;
    if (!parent) root = node;
    else byRef.get(parent)?.children?.push(node);
  }
  if (!root) throw new Error("Layout vazio.");
  return { format: "gutto-screen-layout", version: 1, name, family, root, images };
}

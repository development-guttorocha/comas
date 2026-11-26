import { readFile } from "node:fs/promises";
import { askVisionJson, deepSeekConfig } from "@/lib/reel/deepseek";
import type { Draft } from "./draft";

// Stage 2: one DeepSeek call with the screenshot and the measured layers. It never measures;
// it only says what a designer would: the groups, the names, each text's weight and role,
// which crops are icons or photos, and the closest Google Fonts family.

export type Structure = {
  groups: { id: string; name: string; role: string; children: string[] }[];
  names: Record<string, string>;
  texts: Record<string, { weight?: number; role?: string }>;
  crops: Record<string, string>;
  font?: string;
  notes?: string;
};

/** The ids the structure uses: s0… shapes, c0… crops, t0… texts. */
export const layerIds = (d: Draft) => [...d.shapes.map((_, i) => `s${i}`), ...d.crops.map((_, i) => `c${i}`), ...d.texts.map((_, i) => `t${i}`)];

const SYSTEM = `Você recebe o print de uma tela de app e a lista de camadas que já foram medidas nele (ids, posições em pixels, textos). As medidas estão certas: não as altere. Sua tarefa é só a estrutura, como um designer organizaria o arquivo no Figma.
Responda em JSON:
{
 "groups": [{"id": "g0", "name": "nome em português, como no Figma (ex.: Card da oferta, Botão principal, Barra de busca)", "role": "screen|section|card|button|input|list|listItem|navbar|tabbar|header|sheet|overlay|other", "children": ["ids de camadas ou de outros grupos"]}],
 "names": {"id": "nome curto da camada"},
 "texts": {"id de texto": {"weight": 400|500|600|700|800, "role": "title|subtitle|body|label|button|caption"}},
 "crops": {"id de recorte": "icon|photo|logo|illustration"},
 "font": "a família do Google Fonts mais parecida com a do print (ex.: Inter, Roboto, Nunito Sans)",
 "notes": "o que a lista de camadas deixou passar, em uma frase"
}
Regras: o grupo g0 tem role "screen" e contém, direta ou indiretamente, todas as camadas; cada camada fica em um grupo só; o fundo de um card, botão, campo ou painel (a forma atrás dele) entra no mesmo grupo dele; o que está escurecido por um véu de sobreposição fica num grupo "overlay" separado do que está por cima.`;

export async function understand(image: string, d: Draft): Promise<{ structure: Structure; tokens: number }> {
  const cfg = await deepSeekConfig();
  const items = [
    ...d.shapes.map((s, i) => ({ id: `s${i}`, kind: "shape", x: s.x, y: s.y, w: s.w, h: s.h, color: s.color })),
    ...d.crops.map((c, i) => ({ id: `c${i}`, kind: "crop", x: c.x, y: c.y, w: c.w, h: c.h })),
    ...d.texts.map((t, i) => ({ id: `t${i}`, kind: "text", text: t.text, x: Math.round(t.x), y: Math.round(t.y), w: Math.round(t.w), h: Math.round(t.h) })),
  ];
  const mime = image.endsWith(".png") ? "image/png" : image.endsWith(".webp") ? "image/webp" : "image/jpeg";
  const { data: structure, tokens } = await askVisionJson<Structure>(cfg, SYSTEM, { data: await readFile(image), mime }, `Camadas medidas (tela ${d.width}×${d.height}):\n${JSON.stringify(items)}`);
  return { structure: { ...structure, groups: structure.groups ?? [], names: structure.names ?? {}, texts: structure.texts ?? {}, crops: structure.crops ?? {} }, tokens };
}

import type { FieldDef, Values } from "@/lib/admin/fields";
import type { ReelDoc, ReelScene } from "@/lib/reel/types";
import type { ReelTrack } from "@/lib/reel/tracks";
import { PERSONALITY_LABEL } from "@/components/reel/motion";
import { DIRECTIONS, TRANSITIONS } from "@/components/reel/transitions";

// The video tab's forms, as data (the admin's Fields component draws them). Scenes keep
// a few shapes the generic form does not have (lines as string lists, cameras as
// [zoom, x, y]); toForm / fromForm convert between the stored scene and the form.

export type SceneKind = ReelScene["kind"];

export const SCENE_KINDS: { kind: SceneKind; label: string; description: string }[] = [
  { kind: "title", label: "Título", description: "Frase grande, palavra por palavra, com foto opcional ao fundo." },
  { kind: "flow", label: "Fluxo", description: "Etapas em círculos que entram uma a uma." },
  { kind: "number", label: "Número", description: "Um número que conta, com barras opcionais ao lado." },
  { kind: "list", label: "Lista", description: "Itens que sobem um a um, com imagem vertical ao lado." },
  { kind: "cards", label: "Cards", description: "Até quatro cards; um de cada vez em foco, depois todos juntos." },
  { kind: "screens", label: "Telas", description: "Pranchas de telas com a câmera indo de um ponto a outro." },
  { kind: "compare", label: "Antes e depois", description: "Duas imagens; a segunda entra cobrindo a primeira." },
  { kind: "metrics", label: "Resultado", description: "Um número de destaque e anéis com percentuais." },
  { kind: "image", label: "Imagem", description: "Uma imagem com movimento de câmera, com texto opcional." },
  { kind: "quote", label: "Depoimento", description: "A fala de alguém sobre o trabalho, com nome e cargo." },
  { kind: "role", label: "Seu papel", description: "Seu papel em fatos: função, time, tempo, escopo." },
  { kind: "delta", label: "Antes → depois", description: "Um número antigo riscado e o novo contando a partir dele." },
  { kind: "end", label: "Final", description: "Frase de encerramento e assinatura." },
];
export const kindLabel = (kind: SceneKind) => SCENE_KINDS.find((k) => k.kind === kind)?.label ?? kind;

const ENTER: FieldDef = {
  key: "enter",
  label: "Transição de entrada",
  type: "select",
  defaultLabel: "Corte seco",
  options: TRANSITIONS.filter((t) => t.value !== "cut").map((t) => ({ value: t.value, label: t.label })),
};
const ENTER_DIR: FieldDef = { key: "enterDir", label: "Direção da transição", type: "select", defaultLabel: "Da direita", options: DIRECTIONS.filter((d) => d.value !== "right"), when: { key: "enter", is: ["push", "wipe", "slide"] } };

const COMMON: FieldDef[] = [
  { key: "at", label: "Começa na batida", type: "number", hint: "A música tem 4 batidas por compasso. Mude de cena em múltiplos de 4 para cair no tempo." },
  { key: "chapter", label: "Capítulo", type: "text", hint: "Aparece na barra do player. Vazio continua o capítulo anterior." },
  ENTER,
  ENTER_DIR,
  { key: "backdrop", label: "Produto ao fundo", type: "image", hint: "Uma tela do case, escurecida atrás do texto. Não aparece em cenas que já têm imagem." },
  { key: "enterBeats", label: "Duração da entrada (batidas)", type: "number", advanced: true },
  { key: "id", label: "Identificador", type: "text", advanced: true, hint: "Único no vídeo; não aparece no site." },
];

/** How an image enters, moves, where it aims, its frame and its pace (lib/reel/types ImageFx). */
const imageFields = (of: string, def: { enter: string; motion: string; frame?: string }, frames = true): FieldDef[] => [
  { key: "imgEnter", label: "Imagem: entrada", type: "select", defaultLabel: `Padrão (${def.enter})`, options: [
    { value: "none", label: "Sem entrada" },
    { value: "rise", label: "Máscara de baixo" },
    { value: "side", label: "De lado" },
    { value: "circle", label: "Círculo que abre" },
    { value: "crop", label: "Recorte que se abre" },
    { value: "far", label: "Zoom vindo de longe" },
    { value: "fade", label: "Fade" },
  ] },
  { key: "imgMotion", label: "Imagem: movimento", type: "select", defaultLabel: `Padrão (${def.motion})`, options: [
    { value: "still", label: "Parada" },
    { value: "in", label: "Aproximar" },
    { value: "out", label: "Afastar" },
    { value: "panRight", label: "Panorâmica para a direita" },
    { value: "panLeft", label: "Panorâmica para a esquerda" },
    { value: "scroll", label: "Rolar (print longo de tela)" },
    { value: "focus", label: "Ir até o ponto de foco" },
  ] },
  ...(frames
    ? [{ key: "imgFrame", label: "Imagem: moldura", type: "select", defaultLabel: `Padrão (${def.frame ?? "sem moldura"})`, options: [
        { value: "none", label: "Sem moldura" },
        { value: "phone", label: "Celular" },
        { value: "browser", label: "Navegador" },
        { value: "card", label: "Cartão" },
      ] } as FieldDef]
    : []),
  { key: "imgSpeed", label: "Imagem: velocidade", type: "select", defaultLabel: "Normal", options: [
    { value: "slow", label: "Suave" },
    { value: "fast", label: "Rápida" },
  ] },
  { key: of === "image" ? "imageFocus" : "imgFocus", label: "Imagem: ponto de foco", type: "focus", of, hint: "Clique no ponto que importa: aproximar, ir até o ponto e o círculo miram aqui." },
];

const LINES_HINT = "Uma linha por linha do texto. Use *asteriscos* para destacar palavras na cor do case.";
const CAM_FIELDS: FieldDef[] = [
  { key: "s", label: "Zoom", type: "number" },
  { key: "x", label: "Centro x (0–1920)", type: "number" },
  { key: "y", label: "Centro y (0–1080)", type: "number" },
];

export const SCENE_FIELDS: Record<SceneKind, FieldDef[]> = {
  title: [
    { key: "eyebrow", label: "Sobretítulo", type: "text" },
    { key: "lines", label: "Frase", type: "textarea", hint: LINES_HINT },
    { key: "image", label: "Foto de fundo", type: "image" },
    ...imageFields("image", { enter: "sem entrada", motion: "afastar" }, false),
    { key: "wordsAt", label: "Primeira palavra na batida", type: "number", hint: "Contada do início da cena." },
    { key: "step", label: "Batidas entre palavras", type: "number" },
    { key: "out", label: "Palavras saem na batida", type: "number", advanced: true },
  ],
  flow: [
    { key: "eyebrow", label: "Sobretítulo", type: "text" },
    { key: "heading", label: "Título", type: "textarea", hint: LINES_HINT },
    { key: "marks", label: "Etapas sem número (só marcas)", type: "boolean", hint: "Quando a ordem não importa." },
    { key: "nodes", label: "Etapas", type: "list", itemLabel: "Etapa", item: [
      { key: "title", label: "Nome", type: "text" },
      { key: "body", label: "Detalhe", type: "text" },
      { key: "accent", label: "Na cor do case", type: "boolean" },
    ] },
    { key: "caption", label: "Legenda", type: "textarea" },
    { key: "nodesAt", label: "Primeira etapa na batida", type: "number", advanced: true },
    { key: "step", label: "Batidas entre etapas", type: "number", advanced: true },
    { key: "captionAt", label: "Legenda na batida", type: "number", advanced: true },
  ],
  number: [
    { key: "eyebrow", label: "Sobretítulo", type: "text" },
    { key: "value", label: "Número", type: "number" },
    { key: "prefix", label: "Antes do número", type: "text" },
    { key: "suffix", label: "Depois do número", type: "text" },
    { key: "label", label: "Legenda do número", type: "text" },
    { key: "barsTitle", label: "Título das barras", type: "text" },
    { key: "bars", label: "Barras", type: "list", itemLabel: "Barra", item: [
      { key: "label", label: "Nome", type: "text" },
      { key: "value", label: "Percentual", type: "number" },
    ] },
    { key: "source", label: "Fonte", type: "text" },
    { key: "countBeats", label: "Contagem dura (batidas)", type: "number", advanced: true },
    { key: "barsAt", label: "Barras na batida", type: "number", advanced: true },
    { key: "step", label: "Batidas entre barras", type: "number", advanced: true },
  ],
  list: [
    { key: "eyebrow", label: "Sobretítulo", type: "text" },
    { key: "heading", label: "Título", type: "textarea" },
    { key: "items", label: "Itens", type: "textarea", hint: "Um item por linha." },
    { key: "image", label: "Imagem vertical ao lado", type: "image" },
    ...imageFields("image", { enter: "máscara de baixo", motion: "aproximar", frame: "cartão" }).map((f) => (f.key === "imageFocus" ? { ...f, key: "imgFocus" } : f)),
    { key: "itemsAt", label: "Primeiro item na batida", type: "number", advanced: true },
    { key: "step", label: "Batidas entre itens", type: "number", advanced: true },
  ],
  cards: [
    { key: "eyebrow", label: "Sobretítulo", type: "text" },
    { key: "heading", label: "Título", type: "textarea", hint: LINES_HINT },
    { key: "numbered", label: "Numerar os cards (01, 02…)", type: "boolean", hint: "Só quando a ordem importa." },
    { key: "cards", label: "Cards", type: "list", itemLabel: "Card", item: [
      { key: "title", label: "Título", type: "text" },
      { key: "body", label: "Texto", type: "textarea" },
    ] },
    { key: "cardsAt", label: "Primeiro card na batida", type: "number", advanced: true },
    { key: "step", label: "Batidas entre cards", type: "number", advanced: true },
  ],
  screens: [
    { key: "title", label: "Título sobre as telas", type: "text" },
    { key: "boards", label: "Pranchas", type: "list", itemLabel: "Prancha", hint: "Cada prancha aparece inteira e depois a câmera aproxima da tela escolhida.", item: [
      { key: "src", label: "Imagem larga", type: "image" },
      { key: "focus", label: "Aproximar de", type: "select", defaultLabel: "Tela do centro", options: [{ value: "left", label: "Tela da esquerda" }, { value: "right", label: "Tela da direita" }] },
    ] },
    { key: "titleOut", label: "Título sai na batida", type: "number" },
    { key: "shots", label: "Movimentos de câmera (manual)", type: "list", itemLabel: "Movimento", advanced: true, hint: "Preenchido, substitui as pranchas: cada movimento começa na sua batida e escolher uma imagem faz um corte para ela.", item: [
      { key: "at", label: "Na batida", type: "number" },
      { key: "src", label: "Prancha (opcional)", type: "image" },
      { key: "cam", label: "Câmera", type: "group", fields: CAM_FIELDS },
    ] },
  ],
  compare: [
    { key: "before", label: "Antes", type: "group", fields: [{ key: "src", label: "Imagem", type: "image" }, { key: "label", label: "Rótulo", type: "text" }] },
    { key: "after", label: "Depois", type: "group", fields: [{ key: "src", label: "Imagem", type: "image" }, { key: "label", label: "Rótulo", type: "text" }] },
    { key: "wipeAt", label: "Depois entra na batida", type: "number" },
  ],
  metrics: [
    { key: "value", label: "Destaque", type: "text", hint: "Ex.: +99%" },
    { key: "label", label: "Legenda", type: "textarea", hint: LINES_HINT },
    { key: "gauges", label: "Anéis", type: "list", itemLabel: "Anel", item: [
      { key: "value", label: "Percentual", type: "number" },
      { key: "prefix", label: "Antes", type: "text" },
      { key: "suffix", label: "Depois", type: "text" },
      { key: "label", label: "Nome", type: "text" },
    ] },
    { key: "note", label: "Nota", type: "text" },
    { key: "gaugesAt", label: "Anéis na batida", type: "number", advanced: true },
    { key: "step", label: "Batidas entre anéis", type: "number", advanced: true },
  ],
  image: [
    { key: "src", label: "Imagem", type: "image" },
    { key: "fit", label: "Enquadramento", type: "select", defaultLabel: "Tela cheia", options: [{ value: "contain", label: "Inteira, sobre fundo escuro" }, { value: "split", label: "À esquerda, com texto" }] },
    ...imageFields("src", { enter: "recorte que se abre", motion: "aproximar" }),
    { key: "eyebrow", label: "Sobretítulo", type: "text" },
    { key: "lines", label: "Frase", type: "textarea", hint: LINES_HINT },
    { key: "body", label: "Texto", type: "textarea" },
    { key: "from", label: "Câmera no início", type: "group", fields: CAM_FIELDS, advanced: true },
    { key: "to", label: "Câmera no fim", type: "group", fields: CAM_FIELDS, advanced: true },
    { key: "textAt", label: "Texto na batida", type: "number", advanced: true },
  ],
  quote: [
    { key: "quote", label: "Depoimento", type: "textarea", hint: "As palavras exatas de quem falou. Use *asteriscos* para destacar o trecho que importa." },
    { key: "author", label: "Quem disse", type: "text" },
    { key: "role", label: "Cargo e empresa", type: "text" },
    { key: "photo", label: "Foto de quem disse", type: "image" },
    { key: "quoteAt", label: "Primeira palavra na batida", type: "number", advanced: true },
  ],
  role: [
    { key: "eyebrow", label: "Sobretítulo", type: "text" },
    { key: "heading", label: "Título", type: "textarea", hint: LINES_HINT },
    { key: "facts", label: "Fatos", type: "list", itemLabel: "Fato", hint: "Ex.: Função · Head de Design; Time · 8 designers; Tempo · 18 meses.", item: [
      { key: "label", label: "Rótulo", type: "text" },
      { key: "value", label: "Valor", type: "text" },
    ] },
    { key: "factsAt", label: "Primeiro fato na batida", type: "number", advanced: true },
    { key: "step", label: "Batidas entre fatos", type: "number", advanced: true },
  ],
  delta: [
    { key: "eyebrow", label: "Sobretítulo", type: "text" },
    { key: "label", label: "O que mudou", type: "textarea", hint: LINES_HINT },
    { key: "before", label: "Antes", type: "group", fields: [{ key: "value", label: "Número", type: "number" }, { key: "caption", label: "Legenda", type: "text" }] },
    { key: "after", label: "Depois", type: "group", fields: [{ key: "value", label: "Número", type: "number" }, { key: "caption", label: "Legenda", type: "text" }] },
    { key: "prefix", label: "Antes dos números", type: "text", hint: "Ex.: R$" },
    { key: "suffix", label: "Depois dos números", type: "text", hint: "Ex.: M, %, dias" },
    { key: "note", label: "Nota", type: "text", hint: "Período ou fonte." },
    { key: "changeAt", label: "Mudança na batida", type: "number", advanced: true },
  ],
  end: [
    { key: "lines", label: "Frase", type: "textarea", hint: LINES_HINT },
    { key: "meta", label: "Linha de apoio", type: "text" },
    { key: "signature", label: "Assinatura", type: "text" },
  ],
};

export const sceneFields = (kind: SceneKind) => [...SCENE_FIELDS[kind], ...COMMON];

/** Timing and camera keys: the simple editor sets them for you. */
const TIMING = new Set(["wordsAt", "step", "out", "nodesAt", "captionAt", "countBeats", "barsAt", "itemsAt", "cardsAt", "titleOut", "wipeAt", "gaugesAt", "textAt", "quoteAt", "factsAt", "changeAt", "from", "to", "shots"]);
/** The simple editor's form: only what the scene says and shows, plus its chapter. */
export const simpleFields = (kind: SceneKind): FieldDef[] => [
  ...SCENE_FIELDS[kind].filter((f) => !TIMING.has(f.key)).map((f) => ({ ...f, advanced: false }) as FieldDef),
  { key: "chapter", label: "Capítulo", type: "text", hint: "Nome na barra do player. Vazio continua o capítulo anterior." },
];

/** A song's name in lists: title, artist and what the analysis found. */
export const trackLabel = (t: ReelTrack) => `${t.title}${t.artist ? ` · ${t.artist}` : ""} (${t.steady === false ? "sem batida marcada" : `${t.bpm} BPM`})`;

export const reelFields = (tracks: ReelTrack[]): FieldDef[] => [
  { key: "title", label: "Linha da capa", type: "text", hint: "Aparece sob o botão de play, com a duração." },
  { key: "track", label: "Música", type: "select", defaultLabel: "Escolha", options: tracks.map((t) => ({ value: t.id, label: trackLabel(t) })) },
  { key: "motion", label: "Movimento", type: "select", defaultLabel: "Energética", options: (["premium", "corporate", "playful"] as const).map((v) => ({ value: v, label: PERSONALITY_LABEL[v] })) },
  { key: "accent", label: "Cor de destaque", type: "color" },
  { key: "end", label: "Termina na batida", type: "number" },
  { key: "ctaLabel", label: "Botão do fim", type: "text", hint: "O que o vídeo pede no fim. Vazio usa \"Ver serviços\"." },
  { key: "ctaHref", label: "Link do botão", type: "text", hint: "Ex.: /servicos, /curriculo, #case-doc (o case completo)." },
  { key: "fadeFrom", label: "Música sai a partir da batida", type: "number", advanced: true },
  { key: "cover", label: "Batida da capa", type: "number", advanced: true },
];

// ── stored scene ⇄ form ──────────────────────────────────────────────────────

const LINE_KEYS = new Set(["lines", "items"]);
const CAM_KEYS = new Set(["cam", "from", "to"]);
type Cam = [number, number, number];
const camToForm = (c: unknown) => (Array.isArray(c) ? { s: c[0], x: c[1], y: c[2] } : c);
const camFromForm = (c: unknown): Cam | undefined => {
  if (!c || typeof c !== "object") return undefined;
  const v = c as { s?: number; x?: number; y?: number };
  return [v.s ?? 1, v.x ?? 960, v.y ?? 540];
};

export function toForm(scene: ReelScene): Values {
  const out: Values = {};
  for (const [k, v] of Object.entries(scene)) {
    if (LINE_KEYS.has(k) && Array.isArray(v)) out[k] = v.join("\n");
    else if (CAM_KEYS.has(k)) out[k] = camToForm(v);
    else if (k === "shots" && Array.isArray(v)) out[k] = v.map((shot) => ({ ...shot, cam: camToForm(shot.cam) }));
    else out[k] = v;
  }
  return out;
}

export function fromForm(values: Values): ReelScene {
  const out: Values = {};
  for (const [k, v] of Object.entries(values)) {
    if (LINE_KEYS.has(k)) {
      const list = String(v ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
      if (list.length) out[k] = list;
    } else if (CAM_KEYS.has(k)) {
      const cam = camFromForm(v);
      if (cam) out[k] = cam;
    } else if (k === "shots" && Array.isArray(v)) {
      out[k] = v.map((shot: Values) => ({ ...shot, at: Number(shot.at ?? 0), cam: camFromForm(shot.cam) ?? [1, 960, 540] }));
    } else out[k] = v;
  }
  return out as unknown as ReelScene;
}

export const reelToForm = (doc: ReelDoc): Values => ({ title: doc.title, track: doc.track, motion: doc.motion, ctaLabel: doc.cta?.label, ctaHref: doc.cta?.href, accent: doc.accent, end: doc.end, cover: doc.cover, fadeFrom: doc.fadeOut?.[0] });
export function reelFromForm(doc: ReelDoc, v: Values): ReelDoc {
  const end = Number(v.end ?? doc.end);
  const fadeFrom = v.fadeFrom === undefined ? undefined : Number(v.fadeFrom);
  return {
    ...doc,
    title: String(v.title ?? ""),
    track: String(v.track ?? doc.track),
    motion: (v.motion as ReelDoc["motion"]) || undefined,
    cta: typeof v.ctaLabel === "string" && v.ctaLabel.trim() ? { label: v.ctaLabel.trim(), href: typeof v.ctaHref === "string" && v.ctaHref.trim() ? v.ctaHref.trim() : "/servicos" } : undefined,
    accent: String(v.accent ?? doc.accent),
    end,
    cover: v.cover === undefined ? undefined : Number(v.cover),
    fadeOut: fadeFrom === undefined ? undefined : [fadeFrom, end],
  };
}

// ── new scenes ───────────────────────────────────────────────────────────────

export function newScene(kind: SceneKind, at: number, id: string): ReelScene {
  const base = { id, at, enter: "fade" as const };
  switch (kind) {
    case "title": return { ...base, kind, lines: ["Uma frase", "*de impacto*"], wordsAt: 1, step: 1 };
    case "flow": return { ...base, kind, heading: "Como funciona", nodes: [{ title: "Etapa 1" }, { title: "Etapa 2" }, { title: "Etapa 3", accent: true }] };
    case "number": return { ...base, kind, value: 100, label: "do que importa" };
    case "list": return { ...base, kind, heading: "O que encontramos", items: ["Primeiro achado", "Segundo achado"] };
    case "cards": return { ...base, kind, heading: "Os pilares", cards: [{ title: "Pilar 1", body: "Explicação curta." }, { title: "Pilar 2", body: "Explicação curta." }] };
    case "screens": return { ...base, kind, shots: [], boards: [{ src: "", focus: "center" }] };
    case "compare": return { ...base, kind, before: { src: "", label: "Antes" }, after: { src: "", label: "Depois" }, wipeAt: 2 };
    case "metrics": return { ...base, kind, value: "+50%", label: "no que mais importa", gauges: [] };
    case "image": return { ...base, kind, src: "", fit: "contain" };
    case "quote": return { ...base, kind, quote: "O que alguém disse sobre *o trabalho*.", author: "Nome", role: "Cargo, empresa" };
    case "role": return { ...base, kind, heading: "O que eu *liderei*", facts: [{ label: "Função", value: "Head de Design" }, { label: "Time", value: "8 designers" }, { label: "Tempo", value: "18 meses" }] };
    case "delta": return { ...base, kind, label: "Tempo para *publicar*", before: { value: 14, caption: "antes" }, after: { value: 2, caption: "depois" }, suffix: "dias" };
    case "end": return { ...base, kind, lines: ["Salve este vídeo", "*para revisar*"], signature: "@textoemciclo" };
  }
}

/** A new video starts as a draft: it reaches the site only when published. */
export const newReel = (accent: string, title: string, track: string, signature = "@textoemciclo"): ReelDoc => ({
  draft: true,
  track,
  end: 64,
  fadeOut: [56, 64],
  cover: 4,
  accent,
  title,
  scenes: [
    { ...newScene("title", 0, "abertura"), chapter: "Abertura" },
    { id: "fim", kind: "end", at: 32, enter: "fade", lines: ["Salve este vídeo", "*para revisar*"], signature },
  ],
});

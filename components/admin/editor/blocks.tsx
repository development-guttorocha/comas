"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StaticReveal } from "@/components/ScrollReveal";
import NotionCaseEmbed from "@/components/case/NotionCaseEmbed";
import { tryParseCaseEmbedParagraph } from "@/lib/notionCaseEmbedFromNotion";
import type { ImageItem } from "@/lib/admin/caseBlocks";
import { IMAGE_SIZES, componentRenders } from "@/lib/admin/caseBlocks";
import { COMPONENT_BY_NAME } from "@/lib/admin/componentSchemas";
import { setValue, type Values } from "@/lib/admin/fields";
import { DIVIDER_ALIGNS, DIVIDER_COLORS, DIVIDER_SIZES } from "@/lib/caseDivider";
import { cropFromText, cropVars } from "@/lib/mediaCrop";
import cropStyles from "@/components/case/MediaCrop.module.css";
import { useCropper } from "../CropDialog";
import { SPACE_OPTIONS } from "@/lib/caseEmbedSpace";
import BusyOverlay from "../BusyOverlay";
import { api } from "../client";
import { Fields, ImageInput, move } from "../Fields";
import ChartEditor from "./ChartEditor";
import ComparisonEditor from "./ComparisonEditor";
import PanelEditor from "./PanelEditor";
import FlowEditor from "./FlowEditor";
import { BlockIcon, CodeIcon, DownIcon, EmbedIcon, PlusIcon, TrashIcon, UpIcon } from "../icons";
import { MediaThumb, useMediaPicker } from "../MediaPicker";
import admin from "../admin.module.css";
import styles from "./editor.module.css";

/**
 * Os blocos próprios do case dentro do editor. Cada um guarda seus dados em props de texto
 * (JSON quando são estruturados) e se edita no lugar, sem sair do fluxo do texto.
 */
const parse = <T,>(text: string, fallback: T): T => {
  try { return JSON.parse(text) as T; } catch { return fallback; }
};
const text = (value: unknown) => (typeof value === "string" ? value : typeof value === "number" ? String(value) : "");

/* ---------- Section ---------- */

export const SectionBlock = createReactBlockSpec(
  { type: "section", propSchema: { label: { default: "Nova seção" }, position: { default: 1 }, visible: { default: false } }, content: "none" },
  {
    render: ({ block, editor }) => {
      const set = (props: Partial<typeof block.props>) => editor.updateBlock(block, { props });
      return (
        <div className={styles.section} contentEditable={false}>
          <select className={styles.sectionNumber} value={block.props.position} onChange={e => set({ position: Number(e.target.value) })} aria-label="Posição no índice" title="Posição no índice lateral">
            {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <input className={styles.sectionLabel} value={block.props.label} onChange={e => set({ label: e.target.value })} placeholder="Nome da seção" aria-label="Nome da seção" />
          <label className={styles.sectionToggle} title="Desligado, a seção só marca o índice lateral e a âncora.">
            Mostrar no texto
            <input type="checkbox" className={admin.switch} checked={block.props.visible} onChange={e => set({ visible: e.target.checked })} />
          </label>
        </div>
      );
    },
  },
);

/* ---------- Components ---------- */

/**
 * Previews live in a shadow root, so the editor's text rules (BlockNote sets every heading and
 * paragraph to the body size) never reach them. Each gets the page's own stylesheets, cloned
 * rather than re-serialized: serializing drops shorthands that use variables (the case colour).
 */
const previewStyles = new Set<HTMLElement>();
let headWatch: MutationObserver | null = null;
function fillStyles(holder: HTMLElement) {
  holder.replaceChildren(...[...document.head.querySelectorAll('link[rel="stylesheet"], style')].map(node => node.cloneNode(true)));
}
function watchHead() {
  if (headWatch) return;
  // New CSS (a lazily loaded chunk, a hot reload) reaches every preview.
  let pending = 0;
  headWatch = new MutationObserver(() => { window.clearTimeout(pending); pending = window.setTimeout(() => previewStyles.forEach(fillStyles), 150); });
  headWatch.observe(document.head, { childList: true, subtree: true, characterData: true });
}

/** Rendered at desktop width, as on the site, then scaled to the editor's column. */
const PREVIEW_WIDTH = 1280;
function LivePreview({ name, values }: { name: string; values: Values }) {
  const frame = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(.55);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setZoom(el.clientWidth / PREVIEW_WIDTH));
    observer.observe(el);
    const shadow = el.shadowRoot ?? el.attachShadow({ mode: "open" });
    const holder = document.createElement("div");
    holder.hidden = true;
    fillStyles(holder);
    previewStyles.add(holder);
    watchHead();
    const page = document.createElement("div");
    page.className = "portfolio-case-page font-sans";
    shadow.replaceChildren(holder, page);
    setMount(page);
    return () => { observer.disconnect(); previewStyles.delete(holder); };
  }, []);
  const embed = tryParseCaseEmbedParagraph(`[case:${name}] ${JSON.stringify(values)}`);
  // The frame stays mounted (it holds the shadow root) while the fields are incomplete.
  return (
    <>
      {embed ? null : <span className={admin.hint} style={{ padding: "0 12px 12px" }}>Sem prévia: faltam campos obrigatórios.</span>}
      <div ref={frame} className={styles.livePreview} hidden={!embed} aria-hidden>
        {mount && embed ? createPortal(
          <StaticReveal.Provider value><div style={{ width: PREVIEW_WIDTH, zoom }}><NotionCaseEmbed embed={embed} /></div></StaticReveal.Provider>,
          mount,
        ) : null}
      </div>
    </>
  );
}

/** Space above and below the component on the page; "Padrão" keeps the component's own. */
function SpaceControls({ values, set }: { values: Values; set: (next: Values) => void }) {
  const control = (key: "spaceTop" | "spaceBottom", label: string, icon: string) => (
    <label className={styles.spaceSelect} title={label} data-set={values[key] ? "" : undefined}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={icon} /></svg>
      <select value={text(values[key])} onChange={e => set(setValue(values, key, e.target.value))} aria-label={label}>
        {SPACE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
  return (
    <span className={styles.spaceControls}>
      {control("spaceTop", "Espaço acima", "M3 2.5h10M8 13.5V6M5 9l3-3 3 3")}
      {control("spaceBottom", "Espaço abaixo", "M3 13.5h10M8 2.5V10M5 7l3 3 3-3")}
    </span>
  );
}

function ComponentView({ name, data, onChange }: { name: string; data: string; onChange: (data: string) => void }) {
  const def = COMPONENT_BY_NAME.get(name);
  const values = parse<Values>(data, {});
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState(!def);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(values, null, 2));
  const set = (next: Values) => onChange(JSON.stringify(next));
  const renders = componentRenders({ kind: "component", name, props: values });

  // The text-with-side-title component is the case's prose: edited as text, in place.
  if (name === "CaseSectionSplit" && !json) {
    return (
      <div className={styles.split} contentEditable={false}>
        {values.label === "" ? <span className={styles.splitNoTitle}>Sem título</span> : <textarea className={styles.splitLabel} value={text(values.label)} onChange={e => set({ ...values, label: e.target.value })} placeholder="Título" aria-label="Título" rows={1} />}
        <textarea className={styles.splitBody} value={text(values.body)} onChange={e => set({ ...values, body: e.target.value })} placeholder="Texto. Uma linha em branco separa parágrafos." aria-label="Texto" rows={2} />
        <span className={styles.splitKind}>
          Texto com título lateral{renders ? "" : " · falta texto: não aparece no site"}
          <select className={styles.splitLayout} value={text(values.layout) || "default"} onChange={e => set({ ...values, layout: e.target.value === "default" ? undefined : e.target.value })} aria-label="Disposição">
            <option value="default">Título à esquerda</option>
            <option value="reversed">Título à direita</option>
            <option value="stacked">Título em cima</option>
          </select>
          <label className={styles.splitToggle}>
            Título
            <input type="checkbox" className={admin.switch} checked={values.label !== ""} onChange={e => set({ ...values, label: e.target.checked ? "Título" : "" })} />
          </label>
          <SpaceControls values={values} set={set} />
        </span>
      </div>
    );
  }

  return (
    <div className={styles.card} data-open={open} contentEditable={false}>
      <div className={styles.cardHead}>
        <span className={styles.cardKind}><BlockIcon />{def?.label ?? name}</span>
        {!renders ? <span className={admin.warnDot}>Faltam campos: não aparece no site</span> : null}
        <span className={styles.cardTools}>
          <SpaceControls values={values} set={set} />
          {open && def ? <button type="button" className={`${admin.button} ${admin.ghost} ${admin.small}`} onClick={() => { setJsonText(JSON.stringify(values, null, 2)); setJson(v => !v); }}>{json ? "Formulário" : "JSON"}</button> : null}
          <button type="button" className={`${admin.button} ${admin.small}`} onClick={() => setOpen(v => !v)}>{open ? "Fechar" : "Editar"}</button>
        </span>
      </div>
      {open ? (
        <div className={styles.cardBody}>
          {json || !def ? (
            <textarea className={`${admin.textarea} ${admin.mono}`} value={jsonText} spellCheck={false} aria-label="Propriedades em JSON" onChange={e => {
              setJsonText(e.target.value);
              try { const next = JSON.parse(e.target.value); if (next && typeof next === "object" && !Array.isArray(next)) set(next); } catch { /* keep the last valid version */ }
            }} />
          ) : name === "CaseFlowDiagram" ? <FlowEditor values={values} onChange={set} /> : name === "CaseChart" ? <ChartEditor values={values} onChange={set} /> : name === "CaseComparison" ? <ComparisonEditor values={values} onChange={set} /> : name === "CasePanel" ? <PanelEditor values={values} onChange={set} /> : <Fields defs={def.fields} values={values} onChange={set} />}
          <span className={admin.label}>Prévia</span>
          <LivePreview name={name} values={values} />
        </div>
      ) : <button type="button" className={styles.previewButton} onClick={() => setOpen(true)} aria-label={`Editar ${def?.label ?? name}`}><LivePreview name={name} values={values} /></button>}
    </div>
  );
}

export const ComponentBlock = createReactBlockSpec(
  { type: "caseComponent", propSchema: { name: { default: "CaseSectionSplit" }, data: { default: "{}" } }, content: "none" },
  { render: ({ block, editor }) => <ComponentView name={block.props.name} data={block.props.data} onChange={data => editor.updateBlock(block, { props: { data } })} /> },
);

/* ---------- Divider ---------- */

/** How the line reads in the editor: the case colour is unknown here, so it shows as a warm tint. */
const DIVIDER_PREVIEW: Record<string, string> = { "": "#334047", none: "transparent", brand: "#d9a35b", ink: "#f2f2ef", muted: "#8d8d93" };
const DIVIDER_SPACE: Record<string, number> = { "": 14, none: 2, sm: 8, md: 14, lg: 22, xl: 30 };

export const DividerBlock = createReactBlockSpec(
  { type: "divider", propSchema: { color: { default: "" }, size: { default: "" }, align: { default: "" }, spaceTop: { default: "" }, spaceBottom: { default: "" } }, content: "none" },
  {
    render: ({ block, editor }) => {
      const { color, size, align, spaceTop, spaceBottom } = block.props;
      const custom = color.startsWith("#");
      const set = (props: Partial<typeof block.props>) => editor.updateBlock(block, { props });
      return (
        <div className={styles.divider} contentEditable={false}>
          <div className={styles.dividerLine} data-none={color === "none" || undefined} style={{ paddingTop: DIVIDER_SPACE[spaceTop], paddingBottom: DIVIDER_SPACE[spaceBottom] }}>
            <span data-size={size || undefined} data-align={align || undefined} style={{ background: custom ? color : DIVIDER_PREVIEW[color] }} />
          </div>
          <span className={styles.dividerTools}>
            <label className={styles.spaceSelect} title="Cor da linha" data-set={color ? "" : undefined}>
              <span className={styles.dividerSwatch} data-none={color === "none" || undefined} style={{ background: custom ? color : DIVIDER_PREVIEW[color] }} />
              <select value={custom ? "custom" : color} onChange={e => set({ color: e.target.value === "custom" ? "#ffffff" : e.target.value })} aria-label="Cor da linha">
                {DIVIDER_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            {custom ? <input type="color" className={styles.dividerPicker} value={color} onChange={e => set({ color: e.target.value })} aria-label="Cor personalizada" /> : null}
            <label className={styles.spaceSelect} title="Largura da linha" data-set={size ? "" : undefined}>
              <select value={size} onChange={e => set({ size: e.target.value })} aria-label="Largura da linha">
                {DIVIDER_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <label className={styles.spaceSelect} title="Posição da linha" data-set={align ? "" : undefined}>
              <select value={align} onChange={e => set({ align: e.target.value })} aria-label="Posição da linha">
                {DIVIDER_ALIGNS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </label>
            <SpaceControls values={block.props} set={next => set({ spaceTop: text(next.spaceTop), spaceBottom: text(next.spaceBottom) })} />
          </span>
        </div>
      );
    },
  },
);

/* ---------- Images side by side ---------- */

function ImageRowView({ data, onChange }: { data: string; onChange: (data: string) => void }) {
  const images = parse<ImageItem[]>(data, []);
  const pick = useMediaPicker();
  const set = (next: ImageItem[]) => onChange(JSON.stringify(next));
  return (
    <div className={styles.imageRow} contentEditable={false} style={{ gridTemplateColumns: `repeat(${Math.max(1, images.length)}, minmax(0, 1fr))` }}>
      {images.map((image, i) => (
        <figure key={i} className={styles.rowImage}>
          <button type="button" className={styles.rowThumb} onClick={async () => { const url = await pick(image.src); if (url) set(images.map((img, j) => (j === i ? { ...img, src: url } : img))); }} aria-label={image.src ? "Trocar imagem" : "Escolher imagem"}>
            {image.src ? <MediaThumb src={image.src} /> : <span>Escolher imagem</span>}
          </button>
          <input className={styles.caption} value={image.caption} onChange={e => set(images.map((img, j) => (j === i ? { ...img, caption: e.target.value } : img)))} placeholder="Legenda" aria-label={`Legenda da imagem ${i + 1}`} />
          <span className={styles.rowTools}>
            <button type="button" className={`${admin.button} ${admin.ghost} ${admin.small}`} title="Versão para o celular (opcional)" onClick={async () => { const url = await pick(image.mobileSrc); if (url !== null) set(images.map((img, j) => (j === i ? { ...img, mobileSrc: url } : img))); }}>{image.mobileSrc ? "Mobile ✓" : "Mobile"}</button>
            <button type="button" className={`${admin.button} ${admin.ghost} ${admin.iconButton}`} aria-label="Mover para a esquerda" disabled={i === 0} onClick={() => set(move(images, i, i - 1))}><UpIcon /></button>
            <button type="button" className={`${admin.button} ${admin.ghost} ${admin.iconButton}`} aria-label="Mover para a direita" disabled={i === images.length - 1} onClick={() => set(move(images, i, i + 1))}><DownIcon /></button>
            <button type="button" className={`${admin.button} ${admin.ghost} ${admin.iconButton} ${admin.danger}`} aria-label="Remover imagem" disabled={images.length < 2} onClick={() => set(images.filter((_, j) => j !== i))}><TrashIcon /></button>
          </span>
        </figure>
      ))}
      {images.length < 4 ? <button type="button" className={styles.rowAdd} onClick={() => set([...images, { src: "", caption: "", mobileSrc: "" }])} aria-label="Adicionar imagem"><PlusIcon /></button> : null}
    </div>
  );
}

export const ImageRowBlock = createReactBlockSpec(
  { type: "imageRow", propSchema: { data: { default: '[{"src":"","caption":""},{"src":"","caption":""}]' } }, content: "none" },
  { render: ({ block, editor }) => <ImageRowView data={block.props.data} onChange={data => editor.updateBlock(block, { props: { data } })} /> },
);

/* ---------- Embeds ---------- */

const VARIANTS = [
  { value: "embed", label: "Site incorporado" },
  { value: "link_preview", label: "Protótipo do Figma" },
  { value: "bookmark", label: "Link" },
];

export const EmbedBlock = createReactBlockSpec(
  { type: "embedLink", propSchema: { variant: { default: "embed" }, url: { default: "" }, caption: { default: "" }, poster: { default: "" } }, content: "none" },
  {
    render: ({ block, editor }) => {
      const set = (props: Partial<typeof block.props>) => editor.updateBlock(block, { props });
      return (
        <div className={styles.card} contentEditable={false}>
          <div className={styles.cardHead}>
            <span className={styles.cardKind}><EmbedIcon />Incorporação</span>
            <select className={`${admin.select} ${styles.inlineSelect}`} value={block.props.variant} onChange={e => set({ variant: e.target.value })} aria-label="Tipo">
              {VARIANTS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
          <div className={styles.cardBody}>
            <input className={`${admin.input} ${admin.mono}`} type="url" value={block.props.url} onChange={e => set({ url: e.target.value })} placeholder="https://" aria-label="Endereço" />
            {block.props.variant !== "link_preview" ? <input className={styles.caption} value={block.props.caption} onChange={e => set({ caption: e.target.value })} placeholder="Legenda" aria-label="Legenda" /> : null}
            <span className={admin.label}>Imagem de capa</span>
            <ImageInput value={block.props.poster} onChange={poster => set({ poster })} />
            <span className={admin.hint}>Aparece no lugar do site ou protótipo, com o botão para interagir; ele só carrega quando a pessoa clica. Use um print da tela.</span>
          </div>
        </div>
      );
    },
  },
);

/* ---------- Video ---------- */

/** The video's first frame as a WebP, taken by the browser (no tools needed). */
async function firstFrame(url: string): Promise<Blob> {
  const video = document.createElement("video");
  video.muted = true;
  video.preload = "auto";
  video.src = url;
  await new Promise<void>((resolve, reject) => { video.onloadeddata = () => resolve(); video.onerror = () => reject(new Error("Não foi possível ler o vídeo.")); });
  video.currentTime = Math.min(.1, video.duration || 0);
  await new Promise<void>(resolve => { video.onseeked = () => resolve(); });
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d")!.drawImage(video, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("Não foi possível gerar a capa."))), "image/webp", .85));
}

function VideoView({ props, set, slug }: { props: { url: string; caption: string; poster: string; mp4: string; player: boolean; size: string; crop: string; border: boolean }; set: (next: Partial<typeof props>) => void; slug: string }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const cropper = useCropper();
  const crop = cropFromText(props.crop);
  const base = props.url.split("/").pop()?.replace(/\.[a-z0-9]+$/i, "") || "video";
  async function makePoster() {
    setBusy("poster"); setError("");
    try {
      const form = new FormData();
      form.set("slug", slug);
      form.set("file", new File([await firstFrame(props.url)], `${base}-capa.webp`, { type: "image/webp" }));
      set({ poster: (await api<{ file: { url: string } }>("/api/admin/media", { method: "POST", body: form })).file.url });
    } catch (e) { setError((e as Error).message); } finally { setBusy(""); }
  }
  async function makeMp4() {
    setBusy("mp4"); setError("");
    try { set({ mp4: (await api<{ url: string }>("/api/admin/media/convert", { method: "POST", body: { slug, url: props.url } })).url }); }
    catch (e) { setError((e as Error).message); } finally { setBusy(""); }
  }
  return (
    <div className={styles.card} contentEditable={false}>
      <BusyOverlay label={busy === "poster" ? "Gerando a capa do vídeo…" : busy === "mp4" ? "Convertendo o vídeo…" : ""} />
      <div className={styles.cardHead}>
        <span className={styles.cardKind}><EmbedIcon />Vídeo</span>
        <select className={`${admin.select} ${styles.inlineSelect}`} value={props.player ? "player" : "loop"} onChange={e => set({ player: e.target.value === "player" })} aria-label="Como tocar">
          <option value="loop">Loop sem som, como GIF</option>
          <option value="player">Player com controles</option>
        </select>
        <select className={`${admin.select} ${styles.inlineSelect}`} value={props.size} onChange={e => set({ size: e.target.value })} aria-label="Largura">
          {IMAGE_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className={`${admin.select} ${styles.inlineSelect}`} value={props.border ? "on" : "off"} onChange={e => set({ border: e.target.value === "on" })} aria-label="Borda">
          <option value="on">Com borda</option>
          <option value="off">Sem borda</option>
        </select>
      </div>
      <div className={styles.cardBody}>
        {props.url ? (
          <div className={`${styles.videoFrame} ${crop ? cropStyles.crop : ""}`.trim()} style={crop ? cropVars(crop) : undefined}>
            <video className={`${styles.videoPreview} ${crop ? cropStyles.media : ""}`.trim()} src={props.url} poster={props.poster || undefined} muted loop autoPlay playsInline />
          </div>
        ) : null}
        {props.url ? (
          <span className={styles.videoTools}>
            <button type="button" className={`${admin.button} ${admin.small}`} onClick={async () => { const next = await cropper(props.url, props.crop); if (next !== null) set({ crop: next }); }}>{crop ? "Ajustar recorte" : "Recortar"}</button>
            {crop ? <button type="button" className={`${admin.button} ${admin.ghost} ${admin.small}`} onClick={() => set({ crop: "" })}>Remover recorte</button> : null}
          </span>
        ) : null}
        <span className={admin.label}>Vídeo</span>
        <ImageInput value={props.url} onChange={url => set(url === props.url ? { url } : { url, crop: "" })} />
        <input className={styles.caption} value={props.caption} onChange={e => set({ caption: e.target.value })} placeholder="Legenda" aria-label="Legenda" />
        <span className={admin.label}>Capa</span>
        <ImageInput value={props.poster} onChange={poster => set({ poster })} />
        {props.url ? <button type="button" className={`${admin.button} ${admin.small}`} style={{ justifySelf: "start" }} disabled={!!busy} onClick={() => void makePoster()}>{busy === "poster" ? "Gerando…" : "Gerar capa do primeiro quadro"}</button> : null}
        {/\.webm$/i.test(props.url) ? (
          <>
            <span className={admin.label}>Versão MP4 (para iPhones antigos)</span>
            <ImageInput value={props.mp4} onChange={mp4 => set({ mp4 })} />
            {!props.mp4 ? <button type="button" className={`${admin.button} ${admin.small}`} style={{ justifySelf: "start" }} disabled={!!busy} onClick={() => void makeMp4()}>{busy === "mp4" ? "Convertendo…" : "Converter para MP4"}</button> : null}
          </>
        ) : null}
        {error ? <span className={admin.error}>{error}</span> : null}
      </div>
    </div>
  );
}

export const VideoBlock = createReactBlockSpec(
  { type: "caseVideo", propSchema: { url: { default: "" }, caption: { default: "" }, poster: { default: "" }, mp4: { default: "" }, player: { default: false }, size: { default: "" }, crop: { default: "" }, border: { default: true } }, content: "none" },
  {
    render: ({ block, editor }) => {
      const slug = window.location.pathname.split("/").filter(Boolean).pop() ?? "";
      return <VideoView props={block.props} slug={slug} set={props => editor.updateBlock(block, { props })} />;
    },
  },
);

/* ---------- Anything else ---------- */

export const RawBlock = createReactBlockSpec(
  { type: "rawBlock", propSchema: { json: { default: "{}" } }, content: "none" },
  {
    render: ({ block, editor }) => (
      <div className={styles.card} contentEditable={false}>
        <div className={styles.cardHead}><span className={styles.cardKind}><CodeIcon />Bloco avançado</span></div>
        <div className={styles.cardBody}>
          <textarea className={`${admin.textarea} ${admin.mono}`} defaultValue={JSON.stringify(parse(block.props.json, {}), null, 2)} spellCheck={false} aria-label="Bloco em JSON"
            onChange={e => { try { JSON.parse(e.target.value); editor.updateBlock(block, { props: { json: e.target.value } }); } catch { /* wait for valid JSON */ } }} />
        </div>
      </div>
    ),
  },
);


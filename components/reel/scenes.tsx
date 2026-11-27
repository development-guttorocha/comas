import { Fragment, type CSSProperties, type ReactNode } from "react";
import type {
  CardsScene,
  CompareScene,
  DeltaScene,
  EndScene,
  FlowScene,
  ImageScene,
  ListScene,
  MetricsScene,
  NumberScene,
  ImgFrame,
  QuoteScene,
  RoleScene,
  ReelScene,
  ScreensScene,
} from "@/lib/reel/types";
import { hasPicture, type ReelPrepared } from "@/lib/reel/types";
import { H } from "./motion";
import s from "./reel.module.css";

// The scene library's markup: each kind renders its elements once, keyed with data-k, and
// its GSAP timeline (components/reel/timelines.ts) moves them from the scene's local time.

export const INK = "#f8f8f5";
export const MUTED = "#a3a39c";
const DARK = "#050505";
const PAPER = "#ffffff";

/** An image through Next's optimizer, at a width the stage needs. */
export const stageImg = (src: string | undefined, w = 1920) =>
  !src ? undefined : /^https?:|^data:/.test(src) ? src : `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;

// ── words ────────────────────────────────────────────────────────────────────

/** Splits lines into words; a run between *stars* takes the accent colour. */
export function splitWords(lines: string[]) {
  let on = false;
  return lines.map((line) =>
    line.split(" ").filter(Boolean).map((raw) => {
      let w = raw;
      const opens = w.startsWith("*");
      if (opens) w = w.slice(1);
      // the closing star may come before punctuation: "*inteira*."
      const end = /^(.*)\*([.,;:!?…)"”’]*)$/.exec(w);
      const closes = !!end;
      // punctuation after the closing star stays in the text colour
      const tail = end ? end[2] : "";
      if (end) w = end[1];
      if (opens) on = true;
      const accent = on;
      if (closes) on = false;
      return { w: accent ? w : w + tail, accent, tail: accent ? tail : "" };
    }),
  );
}
export const countWords = (lines: string[]) => splitWords(lines).flat().length;
/** A single text field, with "\n" for line breaks. */
const lines = (text: string) => text.split("\n");

function Words({ k, lines, accent, style }: { k: string; lines: string[]; accent: string; style?: CSSProperties }) {
  let i = 0;
  return (
    <span style={style}>
      {splitWords(lines).map((line, li) => (
        <span key={li} className={s.line}>
          {line.map((w, wi) => (
            <Fragment key={wi}>
              <span className={s.mask}>
                <span data-k={`${k}-${i++}`} className={s.word}>
                  {w.accent ? <span style={{ color: accent }}>{w.w}</span> : w.w}
                  {w.tail}
                </span>
              </span>
              {wi < line.length - 1 ? " " : null}
            </Fragment>
          ))}
        </span>
      ))}
    </span>
  );
}

function Eyebrow({ k, children }: { k: string; children: ReactNode; accent?: string }) {
  return (
    <p data-k={k} className={s.eyebrow} style={{ opacity: 0 }}>
      {children}
    </p>
  );
}

// ── images ───────────────────────────────────────────────────────────────────

/**
 * An image in its frame (none, phone, browser or card). The wrapper (data-k = k) is what
 * enters; the picture (k-pic) is what moves inside its viewport (zoom, pan, scroll, focus).
 */
function FramedImage({ k, src, w = 1920, frame = "none", fit = "cover", focus, className }: { k: string; src?: string; w?: number; frame?: ImgFrame; fit?: "cover" | "contain"; focus?: string; className: string }) {
  const pic = (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-k={`${k}-pic`} src={stageImg(src, w)} alt="" className={frame === "none" && fit === "contain" ? s.contain : s.cover} style={{ objectPosition: focus ?? "50% 50%" }} />
  );
  if (frame === "none") {
    return (
      <div data-k={k} className={className}>
        <div className={s.viewport}>{pic}</div>
      </div>
    );
  }
  return (
    <div data-k={k} className={className}>
      <div className={`${s.device} ${frame === "card" ? s.cardFrame : s[frame]}`}>
        {frame === "browser" ? (
          <div className={s.browserBar} aria-hidden>
            <i />
            <i />
            <i />
          </div>
        ) : null}
        <div className={s.viewport}>{pic}</div>
        {frame === "phone" ? <span className={s.notch} aria-hidden /> : null}
      </div>
    </div>
  );
}

// ── scene frame ──────────────────────────────────────────────────────────────

export function SceneFrame({ id, bg, backdrop, focus, children }: { id: string; bg: string; backdrop?: string; focus?: string; children: ReactNode }) {
  return (
    <section data-k={`s-${id}`} className={s.scene} style={{ display: "none", background: bg }}>
      {backdrop ? (
        // the product behind the words: outside the camera, so it stays while the words leave
        <div className={s.backdrop} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img data-k={`${id}-bd`} src={stageImg(backdrop)} alt="" className={s.cover} style={{ objectPosition: focus ?? "50% 50%", transformOrigin: focus ?? "50% 50%" }} />
          <div className={s.backdropShade} />
        </div>
      ) : null}
      <div data-k={`${id}-cam`} className={s.cam}>
        {children}
      </div>
    </section>
  );
}


// ── defaults ─────────────────────────────────────────────────────────────────

/** Every list and text a kind reads, present: a scene the AI or an edit left incomplete still draws. */
export function complete(scene: ReelScene): ReelScene {
  const arr = <T,>(v: T[] | undefined) => (Array.isArray(v) ? v : []);
  switch (scene.kind) {
    case "title": case "end": return { ...scene, lines: arr(scene.lines) };
    case "flow": return { ...scene, heading: scene.heading ?? "", nodes: arr(scene.nodes).map((n) => ({ ...n, title: n?.title ?? "" })) };
    case "number": return { ...scene, value: Number(scene.value) || 0, label: scene.label ?? "", bars: arr(scene.bars) };
    case "list": return { ...scene, heading: scene.heading ?? "", items: arr(scene.items) };
    case "cards": return { ...scene, heading: scene.heading ?? "", cards: arr(scene.cards).map((x) => ({ title: x?.title ?? "", body: x?.body ?? "" })) };
    case "screens": return { ...scene, shots: arr(scene.shots), boards: arr(scene.boards) };
    case "compare": return { ...scene, before: { src: scene.before?.src ?? "", label: scene.before?.label ?? "" }, after: { src: scene.after?.src ?? "", label: scene.after?.label ?? "" }, wipeAt: scene.wipeAt ?? 2 };
    case "metrics": return { ...scene, value: scene.value ?? "", label: scene.label ?? "", gauges: arr(scene.gauges) };
    case "image": return { ...scene, lines: scene.lines ? arr(scene.lines) : undefined };
    case "quote": return { ...scene, quote: scene.quote ?? "", author: scene.author ?? "" };
    case "role": return { ...scene, heading: scene.heading ?? "", facts: arr(scene.facts).map((f) => ({ label: f?.label ?? "", value: f?.value ?? "" })) };
    case "delta": return { ...scene, label: scene.label ?? "", before: { ...scene.before, value: Number(scene.before?.value) || 0 }, after: { ...scene.after, value: Number(scene.after?.value) || 0 } };
  }
}

// ── markup ───────────────────────────────────────────────────────────────────

export function SceneMarkup({ scene: raw, accent, cta, lang = "pt", prepared, aspect = "16:9" }: { scene: ReelScene; accent: string; cta?: string; lang?: "pt" | "en"; prepared?: ReelPrepared; aspect?: "9:16" | "16:9" }) {
  const scene = complete(raw);
  const id = scene.id;
  return <SceneFrame id={id} bg={DARK} backdrop={hasPicture(scene) ? undefined : scene.backdrop} focus={scene.backdropFocus}>{scene.kind === "end" ? <EndMarkup scene={scene} accent={accent} cta={cta} /> : body(scene, accent, lang, prepared, aspect)}</SceneFrame>;
}

function body(scene: ReelScene, accent: string, lang: "pt" | "en", prepared?: ReelPrepared, aspect: "9:16" | "16:9" = "16:9"): ReactNode {
  const id = scene.id;
  switch (scene.kind) {
    case "title":
      return (
        <>
          {scene.image ? (
            <div className={s.fill}>
              <FramedImage k={`${id}-img`} src={scene.image} className={s.fill} focus={scene.imgFocus ?? scene.imageFocus} />
              <div className={s.shade} />
            </div>
          ) : null}
          <div className={s.titleBlock}>
            {scene.eyebrow ? <Eyebrow k={`${id}-eb`} accent={accent}>{scene.eyebrow}</Eyebrow> : null}
            {/* filled and split by the GSAP timeline (components/reel/timelines.ts) */}
            <h2 className={s.display} data-gsap="title" data-accent={accent} aria-label={scene.lines.join(" ").replace(/\*/g, "")} />
          </div>
        </>
      );
    case "flow":
      return <FlowMarkup scene={scene} accent={accent} aspect={aspect} />;
    case "number":
      return <NumberMarkup scene={scene} accent={accent} />;
    case "list":
      return <ListMarkup scene={scene} accent={accent} />;
    case "cards":
      return <CardsMarkup scene={scene} accent={accent} />;
    case "screens":
      return <ScreensMarkup scene={scene} accent={accent} prepared={prepared} />;
    case "compare":
      return <CompareMarkup scene={scene} accent={accent} prepared={prepared} />;
    case "metrics":
      return <MetricsMarkup scene={scene} accent={accent} />;
    case "image":
      return <ImageMarkup scene={scene} accent={accent} />;
    case "quote":
      return <QuoteMarkup scene={scene} accent={accent} />;
    case "role":
      return <RoleMarkup scene={scene} accent={accent} />;
    case "delta":
      return <DeltaMarkup scene={scene} accent={accent} lang={lang} />;
    case "end":
      return <EndMarkup scene={scene} accent={accent} />;
  }
}

const FLOW_X0 = 160;
const FLOW_W = 1600;
const FLOW_Y = 590;
const FLOW_R = 104;
const flowX = (n: number, i: number) => FLOW_X0 + (FLOW_W / n) * (i + 0.5);

function FlowMarkup({ scene, accent, aspect }: { scene: FlowScene; accent: string; aspect: "9:16" | "16:9" }) {
  const id = scene.id;
  const n = Math.max(1, scene.nodes.length);
  const vertical = aspect === "9:16";
  const vStep = n <= 3 ? 256 : 212;
  const vStartY = 620;

  return (
    <>
      <div className={s.head}>
        {scene.eyebrow ? <Eyebrow k={`${id}-eb`} accent={accent}>{scene.eyebrow}</Eyebrow> : null}
        <h2 className={s.heading}>
          <Words k={`${id}-h`} lines={lines(scene.heading)} accent={accent} />
        </h2>
      </div>
      {vertical ? (
        <>
          {scene.nodes.slice(1).map((_, i) => (
            <div
              key={i}
              data-k={`${id}-ln-${i + 1}`}
              className={s.flowLineV}
              style={{ left: 158, top: vStartY + i * vStep + 144, height: Math.max(24, vStep - 144), transform: "scaleY(0)" }}
            />
          ))}
          {scene.nodes.map((node, i) => (
            <div key={i} data-k={`${id}-n-${i}`} className={s.flowNodeV} style={{ left: 88, top: vStartY + i * vStep, opacity: 0 }}>
              <div
                className={s.flowCircle}
                style={node.accent ? { background: accent, borderColor: accent, color: "#fff" } : undefined}
              >
                {scene.marks ? "●" : String(i + 1).padStart(2, "0")}
              </div>
              <div className={s.flowTextV}>
                <p className={s.flowTitle} style={node.accent ? { color: accent } : undefined}>{node.title}</p>
                {node.body ? <p className={s.flowBodyV}>{node.body}</p> : null}
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          {scene.nodes.slice(1).map((_, i) => {
            const x0 = flowX(n, i) + FLOW_R + 18;
            const x1 = flowX(n, i + 1) - FLOW_R - 18;
            return <div key={i} data-k={`${id}-ln-${i + 1}`} className={s.flowLine} style={{ left: x0, top: FLOW_Y - 1, width: x1 - x0, transform: "scaleX(0)" }} />;
          })}
          {scene.nodes.map((node, i) => (
            <div key={i} data-k={`${id}-n-${i}`} className={s.flowNode} style={{ left: flowX(n, i) - 160, top: FLOW_Y - FLOW_R, opacity: 0 }}>
              <div
                className={s.flowCircle}
                style={node.accent ? { background: accent, borderColor: accent, color: "#fff" } : undefined}
              >
                {scene.marks ? "●" : String(i + 1).padStart(2, "0")}
              </div>
              <p className={s.flowTitle} style={node.accent ? { color: accent } : undefined}>{node.title}</p>
              {node.body ? <p className={s.flowBody}>{node.body}</p> : null}
            </div>
          ))}
        </>
      )}
      {scene.caption ? (
        <p data-k={`${id}-cap`} className={s.caption} style={{ opacity: 0 }}>
          {scene.caption}
        </p>
      ) : null}
    </>
  );
}

function NumberMarkup({ scene, accent }: { scene: NumberScene; accent: string }) {
  const id = scene.id;
  const max = Math.max(1, ...(scene.bars ?? []).map((b) => b.value));
  return (
    <>
      <div className={s.numberCol}>
        {scene.eyebrow ? <Eyebrow k={`${id}-eb`} accent={accent}>{scene.eyebrow}</Eyebrow> : null}
        <p data-k={`${id}-num`} className={s.bigNumber} style={{ opacity: 0 }}>
          {scene.prefix}
          <span data-k={`${id}-val`}>0</span>
          {scene.suffix ? <span className={s.bigSuffix}>{scene.suffix}</span> : null}
        </p>
        <p data-k={`${id}-lb`} className={s.numberLabel} style={{ opacity: 0 }}>
          {scene.label}
        </p>
      </div>
      {scene.bars?.length ? (
        <div className={s.bars}>
          {scene.barsTitle ? (
            <p data-k={`${id}-bt`} className={s.barsTitle} style={{ opacity: 0 }}>
              {scene.barsTitle}
            </p>
          ) : null}
          {scene.bars.map((b, i) => (
            <div key={i} data-k={`${id}-b-${i}`} className={s.bar} style={{ opacity: 0 }}>
              <div className={s.barText}>
                <span>{b.label}</span>
                <span className={s.barValue} style={i === 0 ? { color: accent } : undefined}>{b.value}%</span>
              </div>
              <div className={s.barTrack}>
                <div data-k={`${id}-bf-${i}`} className={s.barFill} style={{ width: `${(b.value / max) * 100}%`, background: i === 0 ? accent : INK, transform: "scaleX(0)" }} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {scene.source ? (
        <p data-k={`${id}-src`} className={s.source} style={{ opacity: 0 }}>
          {scene.source}
        </p>
      ) : null}
    </>
  );
}

function ListMarkup({ scene, accent }: { scene: ListScene; accent: string }) {
  const id = scene.id;
  return (
    <>
      <div className={`${s.listCol} ${scene.image ? "" : s.listWide}`}>
        {scene.eyebrow ? <Eyebrow k={`${id}-eb`} accent={accent}>{scene.eyebrow}</Eyebrow> : null}
        <h2 data-k={`${id}-h`} className={s.listHeading} style={{ opacity: 0 }}>
          {scene.heading}
        </h2>
        <ul className={s.list}>
          {scene.items.map((item, i) => (
            <li key={i} className={s.mask}>
              <span data-k={`${id}-i-${i}`} className={s.listItem} style={{ transform: "translate(0, 112%)" }}>
                <span className={s.listMark} style={{ color: accent, borderColor: accent }}>×</span>
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {scene.image ? <FramedImage k={`${id}-img`} src={scene.image} w={1200} className={s.listBox} frame={scene.imgFrame ?? "card"} focus={scene.imgFocus ?? "50% 0%"} /> : null}
    </>
  );
}

function CardsMarkup({ scene, accent }: { scene: CardsScene; accent: string }) {
  const id = scene.id;
  return (
    <>
      <div className={s.head}>
        {scene.eyebrow ? <Eyebrow k={`${id}-eb`} accent={accent}>{scene.eyebrow}</Eyebrow> : null}
        <h2 className={s.heading}>
          <Words k={`${id}-h`} lines={lines(scene.heading)} accent={accent} />
        </h2>
      </div>
      <div className={s.cards}>
        {scene.cards.map((card, i) => (
          <div key={i} data-k={`${id}-c-${i}`} className={s.card} style={{ opacity: 0 }}>
            {scene.numbered ? <span className={s.cardNum} style={{ color: accent }}>{String(i + 1).padStart(2, "0")}</span> : null}
            <p className={s.cardTitle}>{card.title}</p>
            <p className={s.cardBody}>{card.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}

/** Boards (wide product images) sit at full stage width, centred. */
const BOARD_H = 940;
const BOARD_TOP = (H - BOARD_H) / 2;
const boardsOf = (scene: ScreensScene) => {
  const list: string[] = [];
  for (const src of [...(scene.shots ?? []).map((s) => s.src), ...(scene.boards ?? []).map((b) => b.src)]) if (src && !list.includes(src)) list.push(src);
  return list;
};

/** The blurred surround: the prepared one when PhotoCraft made it, else a small copy blurred by CSS. */
const auraSrc = (src: string, prepared?: ReelPrepared) => (prepared?.[src]?.aura ? stageImg(prepared[src].aura, 640) : stageImg(src, 640));

function ScreensMarkup({ scene, accent, prepared }: { scene: ScreensScene; accent: string; prepared?: ReelPrepared }) {
  const id = scene.id;
  const boards = boardsOf(scene);
  const hugged = boards.length > 0 && boards.every((src) => prepared?.[src]?.w && prepared[src].h);
  return (
    <>
      {/* the same screens, blurred and dimmed, fill the stage around the sheet */}
      <div className={s.screensAura} aria-hidden>
        {boards.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} data-k={`${id}-au-${i}`} src={auraSrc(src, prepared)} alt="" className={`${s.cover} ${prepared?.[src]?.aura ? s.auraReady : ""}`} style={{ opacity: i === 0 ? 1 : 0 }} />
        ))}
      </div>
      {/* the boards sit on a sheet with rounded corners and a shadow; the camera moves inside it */}
      {/* with every screen measured (PhotoCraft), each sits in a frame of its own size: no white
          bars around it; otherwise they share a white sheet */}
      <div data-k={`${id}-sheet`} className={`${s.screensSheet} ${hugged ? s.screensSheetBare : ""}`}>
        <div data-k={`${id}-view`} className={s.fill}>
          {boards.map((src, i) => {
            const p = prepared?.[src];
            const url = stageImg(p?.board ?? src, 3840);
            if (hugged && p?.w && p.h) {
              const r = p.w / p.h;
              const w = r > 1920 / BOARD_H ? 1920 : BOARD_H * r;
              const h = w / r;
              return (
                <div key={src} data-k={`${id}-bd-${i}`} data-src={src} className={`${s.boardFrame} ${p.mockup ? s[p.mockup === "phone" ? "boardPhone" : "boardBrowser"] : ""}`} style={{ left: (1920 - w) / 2, top: BOARD_TOP + (BOARD_H - h) / 2, width: w, height: h, opacity: i === 0 ? 1 : 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className={s.cover} />
                </div>
              );
            }
            // eslint-disable-next-line @next/next/no-img-element
            return <img key={src} data-k={`${id}-bd-${i}`} data-src={src} src={url} alt="" className={s.board} style={{ top: BOARD_TOP, height: BOARD_H, opacity: i === 0 ? 1 : 0 }} />;
          })}
        </div>
      </div>
      {scene.title ? (
        <h2 className={s.screensTitle}>
          <Words k={`${id}-t`} lines={lines(scene.title)} accent={accent} />
        </h2>
      ) : null}
    </>
  );
}

function CompareMarkup({ scene, accent, prepared }: { scene: CompareScene; accent: string; prepared?: ReelPrepared }) {
  const id = scene.id;
  return (
    <>
      <div className={s.screensAura} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={auraSrc(scene.before.src, prepared)} alt="" className={`${s.cover} ${prepared?.[scene.before.src]?.aura ? s.auraReady : ""}`} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img data-k={`${id}-au1`} src={auraSrc(scene.after.src, prepared)} alt="" className={`${s.cover} ${prepared?.[scene.after.src]?.aura ? s.auraReady : ""}`} style={{ opacity: 0 }} />
      </div>
      <div data-k={`${id}-sheet`} className={s.screensSheet}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={stageImg(prepared?.[scene.before.src]?.board ?? scene.before.src, 3840)} alt="" className={s.board} style={{ top: BOARD_TOP, height: BOARD_H }} />
        <div data-k={`${id}-after`} className={s.fill} style={{ background: PAPER, clipPath: "inset(0 100% 0 0)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={stageImg(prepared?.[scene.after.src]?.board ?? scene.after.src, 3840)} alt="" className={s.board} style={{ top: BOARD_TOP, height: BOARD_H }} />
        </div>
        <div data-k={`${id}-div`} className={s.divider} style={{ background: accent, opacity: 0 }} />
      </div>
      <span data-k={`${id}-lb0`} className={s.chip} style={{ left: 120, opacity: 0 }}>
        {scene.before.label}
      </span>
      <span data-k={`${id}-lb1`} className={s.chip} style={{ right: 120, background: accent, color: "#fff", opacity: 0 }}>
        {scene.after.label}
      </span>
    </>
  );
}

const RING_R = 112;
const RING_C = 2 * Math.PI * RING_R;

function MetricsMarkup({ scene, accent }: { scene: MetricsScene; accent: string }) {
  const id = scene.id;
  return (
    <>
      <div className={s.metricsCol}>
        <p data-k={`${id}-v`} className={s.metricValue} style={{ color: accent, opacity: 0 }}>
          {scene.value}
        </p>
        <p className={s.metricLabel}>
          <Words k={`${id}-l`} lines={lines(scene.label)} accent={accent} />
        </p>
      </div>
      <div className={s.gauges}>
        {scene.gauges.map((g, i) => (
          <div key={i} data-k={`${id}-g-${i}`} className={s.gauge} style={{ opacity: 0 }}>
            <svg width={280} height={280} viewBox="0 0 280 280" aria-hidden>
              <circle cx={140} cy={140} r={RING_R} fill="none" stroke="#222" strokeWidth={14} />
              <circle
                data-k={`${id}-ring-${i}`}
                cx={140}
                cy={140}
                r={RING_R}
                fill="none"
                stroke={accent}
                strokeWidth={14}
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C}
                transform="rotate(-90 140 140)"
              />
            </svg>
            <p className={s.gaugeValue}>
              {g.prefix}
              <span data-k={`${id}-gv-${i}`}>0</span>
              {g.suffix}
            </p>
            <p className={s.gaugeLabel}>{g.label}</p>
          </div>
        ))}
      </div>
      {scene.note ? (
        <p data-k={`${id}-note`} className={s.source} style={{ opacity: 0 }}>
          {scene.note}
        </p>
      ) : null}
    </>
  );
}

function ImageMarkup({ scene, accent }: { scene: ImageScene; accent: string }) {
  const id = scene.id;
  const fit = scene.fit ?? "cover";
  const hasText = Boolean(scene.eyebrow || scene.lines?.length || scene.body);
  return (
    <>
      <FramedImage
        k={`${id}-img`}
        src={scene.src}
        w={fit === "split" ? 1920 : 3840}
        className={fit === "split" ? s.splitImage : s.fill}
        frame={scene.imgFrame ?? "none"}
        fit={fit === "cover" ? "cover" : "contain"}
        focus={scene.imgFocus}
      />
      {fit === "cover" && hasText ? <div className={s.shadeBottom} /> : null}
      {hasText ? (
        <div className={fit === "split" ? s.splitText : s.imageText}>
          {scene.eyebrow ? <Eyebrow k={`${id}-eb`} accent={accent}>{scene.eyebrow}</Eyebrow> : null}
          {scene.lines?.length ? (
            <h2 className={s.heading}>
              <Words k={`${id}-w`} lines={scene.lines} accent={accent} />
            </h2>
          ) : null}
          {scene.body ? (
            <p data-k={`${id}-body`} className={s.bodyText} style={{ opacity: 0 }}>
              {scene.body}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function QuoteMarkup({ scene, accent }: { scene: QuoteScene; accent: string }) {
  const id = scene.id;
  return (
    <div className={s.quoteBlock}>
      <span data-k={`${id}-mark`} className={s.quoteMark} style={{ color: accent, opacity: 0 }} aria-hidden>
        “
      </span>
      <p className={s.quoteText}>
        <Words k={`${id}-q`} lines={lines(scene.quote)} accent={accent} />
      </p>
      <div data-k={`${id}-by`} className={s.quoteBy} style={{ opacity: 0 }}>
        {scene.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stageImg(scene.photo, 256)} alt="" className={s.quotePhoto} />
        ) : (
          <span className={s.quoteRule} style={{ background: accent }} />
        )}
        <span>
          <strong>{scene.author}</strong>
          {scene.role ? <span className={s.quoteRole}>{scene.role}</span> : null}
        </span>
      </div>
    </div>
  );
}

function RoleMarkup({ scene, accent }: { scene: RoleScene; accent: string }) {
  const id = scene.id;
  return (
    <>
      <div className={s.roleHead}>
        {scene.eyebrow ? <Eyebrow k={`${id}-eb`} accent={accent}>{scene.eyebrow}</Eyebrow> : null}
        <h2 className={s.heading}>
          <Words k={`${id}-h`} lines={lines(scene.heading)} accent={accent} />
        </h2>
      </div>
      <dl className={s.facts}>
        {scene.facts.map((f, i) => (
          <div key={i} className={s.fact}>
            <span data-k={`${id}-ln-${i}`} className={s.factLine} style={{ transform: "scaleX(0)" }} />
            <dt data-k={`${id}-fl-${i}`} className={s.factLabel} style={{ opacity: 0 }}>
              {f.label}
            </dt>
            <dd className={s.mask}>
              <span data-k={`${id}-fv-${i}`} className={s.factValue} style={{ transform: "translate(0, 112%)" }}>
                {f.value}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/** A number as it reads in the reel's language, with the decimals it was written with. */
export const formatNumber = (v: number, decimals: number, lang: "pt" | "en" = "pt") => v.toLocaleString(lang === "en" ? "en-US" : "pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
export const decimalsOf = (...values: number[]) => Math.min(2, Math.max(0, ...values.map((v) => (String(v).split(".")[1] ?? "").length)));

function DeltaMarkup({ scene, accent, lang }: { scene: DeltaScene; accent: string; lang: "pt" | "en" }) {
  const id = scene.id;
  const dec = decimalsOf(scene.before.value, scene.after.value);
  const value = (v: number, k: string, color?: string) => (
    <p className={s.deltaValue} style={color ? { color } : undefined}>
      {scene.prefix}
      <span data-k={k}>{formatNumber(v, dec, lang)}</span>
      {scene.suffix ? <span className={s.deltaSuffix}>{scene.suffix}</span> : null}
    </p>
  );
  return (
    <>
      <div className={s.head}>
        {scene.eyebrow ? <Eyebrow k={`${id}-eb`} accent={accent}>{scene.eyebrow}</Eyebrow> : null}
        <h2 className={s.heading}>
          <Words k={`${id}-l`} lines={lines(scene.label)} accent={accent} />
        </h2>
      </div>
      <div data-k={`${id}-b`} className={`${s.deltaSide} ${s.deltaBefore}`} style={{ opacity: 0 }}>
        <div className={s.deltaStrikeBox}>
          {value(scene.before.value, `${id}-bv`)}
          <span data-k={`${id}-strike`} className={s.deltaStrike} style={{ transform: "scaleX(0)" }} />
        </div>
        {scene.before.caption ? <p className={s.deltaCaption}>{scene.before.caption}</p> : null}
      </div>
      <svg data-k={`${id}-arrow`} className={s.deltaArrow} viewBox="0 0 160 60" aria-hidden style={{ opacity: 0 }}>
        <path d="M4 30 H150 M126 8 L152 30 L126 52" fill="none" stroke={accent} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset="1" />
      </svg>
      <div data-k={`${id}-a`} className={`${s.deltaSide} ${s.deltaAfter}`} style={{ opacity: 0 }}>
        {value(scene.before.value, `${id}-av`, accent)}
        {scene.after.caption ? <p className={s.deltaCaption}>{scene.after.caption}</p> : null}
      </div>
      {scene.note ? (
        <p data-k={`${id}-note`} className={s.source} style={{ opacity: 0 }}>
          {scene.note}
        </p>
      ) : null}
    </>
  );
}

function EndMarkup({ scene, accent, cta }: { scene: EndScene; accent: string; cta?: string }) {
  const id = scene.id;
  return (
    <>
      <div className={s.titleBlock}>
        {/* filled and split by the GSAP timeline, like the title */}
        <h2 className={s.display} data-gsap="title" data-accent={accent} aria-label={scene.lines.join(" ").replace(/\*/g, "")} />
        {scene.meta ? (
          <p data-k={`${id}-meta`} className={s.endMeta} style={{ opacity: 0 }}>
            {scene.meta}
          </p>
        ) : null}
        {/* the ask, as it looks on the end card (the player adds the real link when it ends) */}
        {cta ? (
          <span data-k={`${id}-cta`} className={s.endCta} style={{ background: accent, opacity: 0 }}>
            {cta} <span aria-hidden>→</span>
          </span>
        ) : null}
      </div>
      {scene.signature ? (
        <p data-k={`${id}-sig`} className={s.signature} style={{ opacity: 0 }}>
          {scene.signature}
        </p>
      ) : null}
    </>
  );
}

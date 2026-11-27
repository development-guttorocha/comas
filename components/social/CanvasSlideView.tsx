"use client";
/* eslint-disable @next/next/no-img-element -- rendered directly into PNG via modern-screenshot; next/image breaks DOM capture. */

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  CANVAS_MARGIN,
  CANVAS_SIZE,
  clampToMargin,
  contrastRatio,
  fillPlaceholders,
  FONT_STACK,
  parseMarks,
  resolveColor,
  stripMarks,
  type CanvasElement,
  type CanvasImageEl,
  type CanvasShadow,
  type CanvasShapeEl,
  type CanvasSlide,
  type CanvasTextEl,
} from "@/lib/social/canvas";
import type { StudioAspect } from "@/lib/social/studioTypes";
import type { SocialPalette } from "@/lib/social/types";

type HandleKind = "move" | "rotate" | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLES: Array<{ id: Exclude<HandleKind, "move" | "rotate">; left: string; top: string; cursor: string }> = [
  { id: "nw", left: "0%", top: "0%", cursor: "nwse-resize" },
  { id: "n", left: "50%", top: "0%", cursor: "ns-resize" },
  { id: "ne", left: "100%", top: "0%", cursor: "nesw-resize" },
  { id: "e", left: "100%", top: "50%", cursor: "ew-resize" },
  { id: "se", left: "100%", top: "100%", cursor: "nwse-resize" },
  { id: "s", left: "50%", top: "100%", cursor: "ns-resize" },
  { id: "sw", left: "0%", top: "100%", cursor: "nesw-resize" },
  { id: "w", left: "0%", top: "50%", cursor: "ew-resize" },
];

function textureCss(texture: CanvasSlide["texture"], ink: string): CSSProperties {
  const faint = `${ink}14`;
  const soft = `${ink}0E`;
  const ultraSoft = `${ink}08`;
  switch (texture) {
    case "paper":
      return {
        backgroundImage: `radial-gradient(circle at 20% 15%, rgba(255,255,255,0.28) 0%, transparent 55%), radial-gradient(${soft} 1px, transparent 0), radial-gradient(${ultraSoft} 1px, transparent 0)`,
        backgroundSize: "100% 100%, 26px 26px, 26px 26px",
        backgroundPosition: "0 0, 0 0, 13px 13px",
      };
    case "grid":
      return {
        backgroundImage: `linear-gradient(to right, ${soft} 1px, transparent 1px), linear-gradient(to bottom, ${soft} 1px, transparent 1px)`,
        backgroundSize: "52px 52px",
      };
    case "lines":
      return {
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent 53px, ${faint} 54px)`,
      };
    case "dots":
      return {
        backgroundImage: `radial-gradient(${faint} 2px, transparent 2px)`,
        backgroundSize: "34px 34px",
      };
    default:
      return {};
  }
}

function shadowCss(shadow: CanvasShadow | undefined, fallback?: string): string | undefined {
  if (shadow === "none") return undefined;
  if (shadow === "hard") return "8px 8px 0px #120E1A";
  if (shadow === "soft") return "0 22px 48px rgba(18, 14, 26, 0.13), 0 4px 12px rgba(18, 14, 26, 0.06)";
  if (shadow === "note") return "0 20px 38px rgba(18, 14, 26, 0.22), 0 3px 8px rgba(18, 14, 26, 0.1)";
  return fallback;
}

/** Gently shrinks font size when text grows longer than its box, avoiding clipping. */
function autoFitFontSize(el: CanvasTextEl, rawText: string): number {
  const plain = stripMarks(rawText).trim();
  if (!plain) return el.size;
  const padX =
    el.variant === "note" ? 76 : el.variant === "card" ? 68 : el.variant === "tarja" || el.variant === "marker" ? 56 : el.variant === "pill" ? 52 : 8;
  const padY =
    el.variant === "note" ? 72 : el.variant === "card" ? 52 : el.variant === "tarja" ? 36 : el.variant === "marker" ? 40 : el.variant === "pill" ? 24 : 6;
  const baseFactor = el.font === "display" ? 0.62 : el.font === "hand" ? 0.44 : el.font === "serif" ? 0.5 : 0.51;
  const charFactor = el.upper ? baseFactor + 0.06 : baseFactor;
  const listIndent = el.list ? el.size * 1.1 : 0;
  const availW = Math.max(110, el.w - padX - listIndent);
  const availH = Math.max(36, el.h - padY);
  const lh = el.lineHeight ?? 1.2;

  let size = el.size;
  const minSize = Math.max(20, Math.round(el.size * 0.54));
  while (size > minSize) {
    const maxChars = Math.max(5, Math.floor(availW / (size * charFactor)));
    const paragraphs = plain.split("\n").filter(Boolean);
    let totalLines = 0;
    for (const para of paragraphs) {
      const words = para.split(/\s+/).filter(Boolean);
      let lines = 1;
      let cur = 0;
      for (const word of words) {
        const next = cur === 0 ? word.length : cur + 1 + word.length;
        if (cur > 0 && next > maxChars) {
          lines++;
          cur = word.length;
        } else {
          cur = next;
        }
      }
      totalLines += lines;
    }
    const listGaps = el.list && paragraphs.length > 1 ? (paragraphs.length - 1) * Math.round(size * 0.34) : 0;
    if (totalLines * size * lh + listGaps <= availH * 1.08) break;
    size -= 2;
  }
  return size;
}

function resolveParentSurface(
  elements: CanvasElement[],
  zIdx: number,
  el: CanvasElement,
  palette: SocialPalette,
  slideBg: string,
): string {
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  let bg = slideBg;
  for (let k = 0; k < zIdx; k++) {
    const under = elements[k]!;
    const encloses = cx >= under.x && cx <= under.x + under.w && cy >= under.y && cy <= under.y + under.h;
    if (!encloses) continue;
    if (under.type === "shape" && (under.shape === "rect" || under.shape === "circle") && (under.opacity ?? 1) >= 0.85) {
      const hex = resolveColor(under.fill, palette, bg);
      if (hex !== "transparent") bg = hex;
    } else if (under.type === "image" && under.src && (under.overlay ?? 0) >= 0.25) {
      bg = "#120E1A";
    }
  }
  return bg;
}

function RichRuns({ text, markBg, markInk, isDisplay }: { text: string; markBg: string; markInk: string; isDisplay: boolean }) {
  const runs = parseMarks(text);
  return (
    <>
      {runs.map((run, idx) => {
        if (run.mark) {
          return (
            <mark
              key={idx}
              style={{
                background: markBg,
                color: markInk,
                padding: "0.03em 0.2em",
                borderRadius: "0.18em",
                boxDecorationBreak: "clone",
                WebkitBoxDecorationBreak: "clone",
                fontWeight: isDisplay ? 400 : 800,
              }}
            >
              {run.text}
            </mark>
          );
        }
        if (run.bold) {
          return (
            <strong key={idx} style={{ fontWeight: isDisplay ? 400 : 800 }}>
              {run.text}
            </strong>
          );
        }
        return <span key={idx}>{run.text}</span>;
      })}
    </>
  );
}

const STARBURST_PATH = (() => {
  const pts: string[] = [];
  const spikes = 12;
  const cx = 60;
  const cy = 60;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 55 : 39;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const x = (cx + Math.cos(angle) * r).toFixed(1);
    const y = (cy + Math.sin(angle) * r).toFixed(1);
    pts.push(`${i === 0 ? "M" : "L"}${x},${y}`);
  }
  return `${pts.join(" ")} Z`;
})();

function ShapeArtwork({ el, palette, slideBg }: { el: CanvasShapeEl; palette: SocialPalette; slideBg: string }) {
  const color = resolveColor(el.fill, palette, slideBg);
  const borderHex = el.borderWidth ? resolveColor(el.borderColor ?? "primary", palette, slideBg) : undefined;

  if (el.shape === "arrow") {
    return (
      <svg viewBox="0 0 220 80" width="100%" height="100%" fill="none" stroke={color} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 54 C 72 18, 138 18, 198 42" />
        <path d="M168 18 L 202 43 L 166 64" />
      </svg>
    );
  }
  if (el.shape === "underline") {
    return (
      <svg viewBox="0 0 320 26" width="100%" height="100%" fill="none" stroke={color} strokeWidth={9} strokeLinecap="round">
        <path d="M8 17 Q 162 4 312 15" />
      </svg>
    );
  }
  if (el.shape === "quote-mark") {
    return (
      <svg viewBox="0 0 120 88" width="100%" height="100%" fill={color} style={{ opacity: el.opacity ?? 1 }}>
        <path d="M31 84C14 84 4 71 4 53C4 30 20 12 48 4L53 16C34 23 26 34 25 46C27 45 31 44 35 44C47 44 55 52 55 64C55 76 45 84 31 84ZM93 84C76 84 66 71 66 53C66 30 82 12 110 4L115 16C96 23 88 34 87 46C89 45 93 44 97 44C109 44 117 52 117 64C117 76 107 84 93 84Z" />
      </svg>
    );
  }
  if (el.shape === "badge-star") {
    return (
      <svg viewBox="0 0 120 120" width="100%" height="100%" style={{ filter: "drop-shadow(5px 5px 0px #120E1A)" }}>
        <path d={STARBURST_PATH} fill={color} stroke="#120E1A" strokeWidth={3.5} strokeLinejoin="round" />
      </svg>
    );
  }
  if (el.shape === "frame") {
    const r = el.radius ?? 22;
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          boxSizing: "border-box",
          border: `2px solid ${color}`,
          borderRadius: `${r}px`,
          opacity: el.opacity ?? 0.16,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 10,
            border: `1px solid ${color}`,
            borderRadius: `${Math.max(8, r - 8)}px`,
          }}
        />
      </div>
    );
  }
  if (el.shape === "notebook-margin") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          borderLeft: `2.5px solid ${color}`,
          borderRight: `1px solid ${color}`,
          opacity: el.opacity ?? 0.32,
        }}
      />
    );
  }
  if (el.shape === "line") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          minHeight: Math.min(el.h, 2),
          background: color,
          opacity: el.opacity ?? 1,
          borderRadius: 99,
        }}
      />
    );
  }
  if (el.shape === "tape") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: color,
          opacity: el.opacity ?? 0.8,
          borderRadius: 3,
          borderLeft: "2px dashed rgba(18,14,26,0.16)",
          borderRight: "2px dashed rgba(18,14,26,0.16)",
          boxShadow: "0 4px 12px rgba(18,14,26,0.12)",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        background: color,
        opacity: el.opacity ?? 1,
        borderRadius: el.shape === "circle" ? "9999px" : `${el.radius ?? 24}px`,
        border: el.borderWidth && borderHex ? `${el.borderWidth}px solid ${borderHex}` : undefined,
        boxShadow: shadowCss(el.shadow),
      }}
    />
  );
}

export type TextSelectionRange = { elementId: string; start: number; end: number };

export default function CanvasSlideView({
  slide,
  index,
  total,
  handle,
  palette,
  aspect,
  scale = 1,
  interactive = false,
  selectedElementId = null,
  editingElementId = null,
  showSafeGuides = false,
  onSelectElement,
  onStartEditing,
  onStopEditing,
  onChangeElement,
  onPickImage,
  onSelectionRange,
}: {
  slide: CanvasSlide;
  index: number;
  total: number;
  handle: string;
  palette: SocialPalette;
  aspect: StudioAspect;
  scale?: number;
  interactive?: boolean;
  selectedElementId?: string | null;
  editingElementId?: string | null;
  showSafeGuides?: boolean;
  onSelectElement?: (id: string | null) => void;
  onStartEditing?: (id: string) => void;
  onStopEditing?: () => void;
  onChangeElement?: (id: string, patch: Partial<CanvasElement>) => void;
  onPickImage?: (id: string, currentSrc: string) => void;
  onSelectionRange?: (range: TextSelectionRange | null) => void;
}) {
  const { width: W, height: H } = CANVAS_SIZE[aspect];
  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dragging, setDragging] = useState(false);

  const dragRef = useRef<{
    id: string;
    kind: HandleKind;
    startClientX: number;
    startClientY: number;
    startBox: { x: number; y: number; w: number; h: number; rotation: number };
    fullBleed: boolean;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    if (editingElementId && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [editingElementId]);

  const slideBg = resolveColor(slide.background, palette);
  const slideContrast = resolveColor("contrast", palette, slideBg);

  function beginDrag(e: ReactPointerEvent, el: CanvasElement, kind: HandleKind) {
    if (!interactive || editingElementId === el.id) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onSelectElement?.(el.id);
    dragRef.current = {
      id: el.id,
      kind,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startBox: { x: el.x, y: el.y, w: el.w, h: el.h, rotation: el.rotation },
      fullBleed: el.type === "image" && el.x === 0 && el.y === 0 && el.w === W && el.h === H,
      moved: false,
    };
    setDragging(true);
  }

  function moveDrag(e: ReactPointerEvent) {
    const d = dragRef.current;
    if (!d || !onChangeElement) return;
    const dx = (e.clientX - d.startClientX) / (scale || 1);
    const dy = (e.clientY - d.startClientY) / (scale || 1);
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) d.moved = true;

    const s = d.startBox;
    if (d.kind === "rotate") {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + (s.x + s.w / 2) * scale;
      const cy = rect.top + (s.y + s.h / 2) * scale;
      let deg = Math.round((Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90);
      if (deg > 180) deg -= 360;
      if (Math.abs(deg) <= 2) deg = 0;
      onChangeElement(d.id, { rotation: deg });
      return;
    }

    if (d.kind === "move") {
      if (d.fullBleed) return;
      const clamped = clampToMargin({ x: s.x + dx, y: s.y + dy, w: s.w, h: s.h }, aspect);
      onChangeElement(d.id, { x: clamped.x, y: clamped.y });
      return;
    }

    const MIN_W = 90;
    const MIN_H = 44;
    let { x, y, w, h } = s;
    if (d.kind.includes("e")) w = Math.max(MIN_W, s.w + dx);
    if (d.kind.includes("s")) h = Math.max(MIN_H, s.h + dy);
    if (d.kind.includes("w")) {
      const nextW = Math.max(MIN_W, s.w - dx);
      x = s.x + (s.w - nextW);
      w = nextW;
    }
    if (d.kind.includes("n")) {
      const nextH = Math.max(MIN_H, s.h - dy);
      y = s.y + (s.h - nextH);
      h = nextH;
    }
    const clamped = clampToMargin({ x, y, w, h }, aspect);
    onChangeElement(d.id, clamped);
  }

  function endDrag(e: ReactPointerEvent, el: CanvasElement) {
    const d = dragRef.current;
    if (!d) return;
    const wasSelected = selectedElementId === el.id;
    const moved = d.moved;
    dragRef.current = null;
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    if (!moved && el.type === "text" && el.role !== "chrome" && wasSelected) {
      onStartEditing?.(el.id);
    }
    if (!moved && el.type === "image" && !el.src) {
      onPickImage?.(el.id, el.src);
    }
  }

  function renderTextElement(el: CanvasTextEl, zIdx: number) {
    const resolved = fillPlaceholders(el.text, { handle, index, total });
    if (!interactive && el.role === "chrome" && !resolved.trim()) return null;

    const parentBg = resolveParentSurface(slide.elements, zIdx, el, palette, slideBg);
    const fillHex = el.fill ? resolveColor(el.fill, palette, parentBg) : "transparent";
    const behind = fillHex !== "transparent" ? fillHex : parentBg;
    const textHex = resolveColor(el.color, palette, behind);
    const borderHex = el.borderWidth ? resolveColor(el.borderColor ?? "black", palette, parentBg) : undefined;

    // Highlight color: warm mustard marker on light and dark surfaces; invert only on yellow/mustard fills
    const onYellow = ["#e5b314", "#f8e07a", "#f5bd1f"].includes(behind.toLowerCase());
    const markBg = onYellow ? "#120E1A" : "#F5C836";
    const markInk = onYellow ? "#FFFFFF" : "#120E1A";

    const fontSize = autoFitFontSize(el, resolved || el.text);
    const isEditing = interactive && editingElementId === el.id;
    const isDisplay = el.font === "display";
    // Archivo Black only ships weight 400; never apply synthetic bold smearing.
    const fontWeight = isDisplay ? 400 : el.weight;

    const tracking =
      el.role === "chrome"
        ? "0.02em"
        : el.upper && el.variant === "pill"
          ? "0.07em"
          : el.upper && isDisplay
            ? "-0.015em"
            : el.upper
              ? "0.05em"
              : el.font === "serif"
                ? "-0.024em"
                : isDisplay
                  ? "-0.02em"
                  : "-0.012em";

    const hugActive = Boolean(el.hug && (el.variant === "pill" || el.variant === "tarja") && !isEditing);

    const surfaceDecoration: CSSProperties =
      el.variant === "pill"
        ? {
            background: fillHex,
            borderRadius: 999,
            padding: "11px 26px",
            border: el.borderWidth && borderHex ? `${el.borderWidth}px solid ${borderHex}` : undefined,
            boxShadow: shadowCss(el.shadow),
          }
        : el.variant === "tarja"
          ? {
              background: fillHex,
              borderRadius: 14,
              padding: "16px 28px",
              border: el.borderWidth && borderHex ? `${el.borderWidth}px solid ${borderHex}` : undefined,
              boxShadow: shadowCss(el.shadow, "0 10px 26px rgba(18,14,26,0.14)"),
            }
          : el.variant === "note"
            ? {
                position: "relative",
                background: fillHex || "#F8E07A",
                borderRadius: "6px 6px 28px 6px",
                padding: "38px 40px",
                border: el.borderWidth && borderHex ? `${el.borderWidth}px solid ${borderHex}` : undefined,
                boxShadow: shadowCss(el.shadow, "0 20px 38px rgba(18,14,26,0.22)"),
              }
            : el.variant === "card"
              ? {
                  background: fillHex,
                  borderRadius: 24,
                  padding: "26px 32px",
                  border: el.borderWidth && borderHex ? `${el.borderWidth}px solid ${borderHex}` : undefined,
                  boxShadow: shadowCss(el.shadow),
                }
              : el.variant === "marker"
                ? {
                    background: fillHex,
                    borderLeft: `8px solid ${resolveColor("accent", palette, parentBg)}`,
                    borderRadius: "0 18px 18px 0",
                    padding: "20px 26px",
                    boxShadow: shadowCss(el.shadow),
                  }
                : {};

    const typographyStyle: CSSProperties = {
      fontFamily: FONT_STACK[el.font],
      fontSize: `${fontSize}px`,
      fontWeight,
      fontStyle: el.italic ? "italic" : "normal",
      textTransform: el.upper ? "uppercase" : "none",
      lineHeight: el.lineHeight ?? 1.2,
      letterSpacing: tracking,
      color: textHex,
      textAlign: el.align,
      wordBreak: "break-word",
      whiteSpace: "pre-wrap",
      textWrap: fontSize >= 48 && !el.list ? "balance" : undefined,
      fontVariantNumeric: el.role === "chrome" || el.role === "step" ? "tabular-nums" : undefined,
    };

    if (isEditing) {
      return (
        <textarea
          ref={textareaRef}
          value={el.text}
          onChange={e => onChangeElement?.(el.id, { text: e.target.value })}
          onSelect={e => {
            const t = e.currentTarget;
            onSelectionRange?.({ elementId: el.id, start: t.selectionStart, end: t.selectionEnd });
          }}
          onBlur={() => onStopEditing?.()}
          onKeyDown={e => {
            if (e.key === "Escape") {
              e.preventDefault();
              onStopEditing?.();
            }
          }}
          style={{
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            ...typographyStyle,
            ...surfaceDecoration,
            border: "none",
            outline: "none",
            resize: "none",
            overflow: "hidden",
            cursor: "text",
            background: fillHex !== "transparent" ? fillHex : "rgba(0,0,0,0.06)",
          }}
        />
      );
    }

    if (hugActive) {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start",
          }}
        >
          <div
            style={{
              boxSizing: "border-box",
              width: "fit-content",
              maxWidth: "100%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              ...typographyStyle,
              ...surfaceDecoration,
            }}
          >
            <span>
              {el.prefix ? <span style={{ marginRight: 6 }}>{el.prefix}</span> : null}
              <RichRuns text={resolved} markBg={markBg} markInk={markInk} isDisplay={isDisplay} />
            </span>
          </div>
        </div>
      );
    }

    const boxStyle: CSSProperties = {
      width: "100%",
      height: "100%",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      justifyContent:
        el.variant === "pill" || el.variant === "tarja" || el.variant === "card" || el.variant === "note" || el.variant === "marker"
          ? "center"
          : "flex-start",
      alignItems: el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "stretch",
      ...typographyStyle,
      ...surfaceDecoration,
    };

    if (el.list) {
      const lines = resolved
        .split("\n")
        .map(l => l.replace(/^[•\-–✓✔️]\s*/, "").trim())
        .filter(Boolean);
      const bulletHex =
        contrastRatio(resolveColor("accent", palette, behind), behind) >= 3.2
          ? resolveColor("accent", palette, behind)
          : textHex;
      return (
        <div style={{ ...boxStyle, justifyContent: "center", gap: `${Math.round(fontSize * 0.34)}px` }}>
          {lines.map((line, li) => (
            <div key={li} style={{ display: "flex", alignItems: "flex-start", gap: "16px", textAlign: "left" }}>
              <span
                style={{
                  flexShrink: 0,
                  fontWeight: 800,
                  color: bulletHex,
                }}
              >
                {el.list === "check" ? "✓" : el.list === "number" ? `${li + 1}.` : "•"}
              </span>
              <span style={{ flex: 1 }}>
                <RichRuns text={line} markBg={markBg} markInk={markInk} isDisplay={isDisplay} />
              </span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div style={boxStyle}>
        <span>
          {el.prefix ? <span style={{ marginRight: 4 }}>{el.prefix}</span> : null}
          <RichRuns text={resolved} markBg={markBg} markInk={markInk} isDisplay={isDisplay} />
        </span>
        {el.variant === "note" ? (
          <span
            aria-hidden
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 30,
              height: 30,
              background: "linear-gradient(135deg, rgba(18,14,26,0.14) 0%, rgba(18,14,26,0.04) 50%, transparent 51%)",
              borderTopLeftRadius: 8,
              pointerEvents: "none",
            }}
          />
        ) : null}
      </div>
    );
  }

  function renderImageElement(el: CanvasImageEl) {
    if (!el.src) {
      if (!interactive) {
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: el.radius ?? 0,
              background: `linear-gradient(135deg, ${palette.primary} 0%, ${palette.accent} 100%)`,
              boxShadow: shadowCss(el.shadow),
            }}
          />
        );
      }
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: el.radius ?? 0,
            border: `4px dashed ${slideContrast}55`,
            background: `${slideContrast}12`,
            color: slideContrast,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 32,
            boxSizing: "border-box",
            textAlign: "center",
            fontFamily: FONT_STACK.sans,
          }}
        >
          <span style={{ fontSize: 54, lineHeight: 1 }}>🖼️</span>
          <strong style={{ fontSize: 28 }}>Clique para escolher uma foto</strong>
        </div>
      );
    }

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
          borderRadius: el.radius ?? 0,
          boxShadow: shadowCss(el.shadow),
        }}
      >
        <img
          src={el.src}
          alt=""
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        {el.overlay ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg, rgba(14,12,24,${(el.overlay * 0.65).toFixed(2)}) 0%, rgba(14,12,24,${Math.min(0.75, el.overlay * 1.45).toFixed(2)}) 100%)`,
              pointerEvents: "none",
            }}
          />
        ) : null}
      </div>
    );
  }

  const guidesVisible = interactive && (showSafeGuides || dragging);

  return (
    <div
      ref={rootRef}
      onPointerDown={e => {
        if (!interactive) return;
        if (e.target === rootRef.current) {
          onStopEditing?.();
          onSelectElement?.(null);
        }
      }}
      style={{
        width: `${W}px`,
        height: `${H}px`,
        position: "relative",
        overflow: "hidden",
        backgroundColor: slideBg,
        userSelect: "none",
        ...textureCss(slide.texture, slideContrast),
      }}
    >
      {slide.elements.map((el, zIdx) => {
        const isSelected = interactive && selectedElementId === el.id;
        const isEditing = interactive && editingElementId === el.id;
        const isFullBleedImg = el.type === "image" && el.x === 0 && el.y === 0 && el.w === W && el.h === H;
        const isPassiveDecor = el.type === "shape" && (el.shape === "frame" || el.shape === "notebook-margin");

        return (
          <div
            key={el.id}
            onPointerDown={isPassiveDecor ? undefined : e => beginDrag(e, el, "move")}
            onPointerMove={isPassiveDecor ? undefined : moveDrag}
            onPointerUp={isPassiveDecor ? undefined : e => endDrag(e, el)}
            onDoubleClick={e => {
              if (!interactive || isPassiveDecor) return;
              e.stopPropagation();
              if (el.type === "text" && el.role !== "chrome") onStartEditing?.(el.id);
              if (el.type === "image") onPickImage?.(el.id, el.src);
            }}
            style={{
              position: "absolute",
              left: `${el.x}px`,
              top: `${el.y}px`,
              width: `${el.w}px`,
              height: `${el.h}px`,
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
              transformOrigin: "center center",
              zIndex: isFullBleedImg ? 0 : zIdx + 1,
              pointerEvents: isPassiveDecor ? "none" : undefined,
              cursor: !interactive ? "default" : isEditing ? "text" : isFullBleedImg ? "pointer" : "grab",
              touchAction: interactive && !isEditing ? "none" : undefined,
              outline: isSelected ? "3px dashed #FFFFFF" : undefined,
              boxShadow: isSelected ? "0 0 0 3px #D9266F" : undefined,
              borderRadius: isSelected ? 6 : undefined,
            }}
          >
            {el.type === "shape" ? (
              <ShapeArtwork el={el} palette={palette} slideBg={slideBg} />
            ) : el.type === "image" ? (
              renderImageElement(el)
            ) : (
              renderTextElement(el, zIdx)
            )}

            {isSelected && !isEditing && !isFullBleedImg ? (
              <>
                <div
                  onPointerDown={e => beginDrag(e, el, "rotate")}
                  onPointerMove={moveDrag}
                  onPointerUp={e => endDrag(e, el)}
                  title="Girar"
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: -54,
                    transform: "translateX(-50%)",
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    background: "#FFFFFF",
                    border: "3px solid #D9266F",
                    color: "#D9266F",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 20,
                    fontWeight: 700,
                    cursor: "grab",
                    touchAction: "none",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.22)",
                  }}
                >
                  ↻
                </div>

                {HANDLES.map(h => (
                  <div
                    key={h.id}
                    onPointerDown={e => beginDrag(e, el, h.id)}
                    onPointerMove={moveDrag}
                    onPointerUp={e => endDrag(e, el)}
                    style={{
                      position: "absolute",
                      left: h.left,
                      top: h.top,
                      transform: "translate(-50%, -50%)",
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: "#D9266F",
                      border: "3px solid #FFFFFF",
                      cursor: h.cursor,
                      touchAction: "none",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                    }}
                  />
                ))}
              </>
            ) : null}
          </div>
        );
      })}

      {guidesVisible ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: CANVAS_MARGIN,
            top: aspect === "story" ? 210 : CANVAS_MARGIN,
            right: CANVAS_MARGIN,
            bottom: aspect === "story" ? 240 : CANVAS_MARGIN,
            border: `3px dashed ${slideContrast}44`,
            borderRadius: 16,
            pointerEvents: "none",
            zIndex: 999,
          }}
        />
      ) : null}
    </div>
  );
}

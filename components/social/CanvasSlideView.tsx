"use client";
/* eslint-disable @next/next/no-img-element -- rendered directly into PNG via modern-screenshot; next/image breaks DOM capture. */

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  CANVAS_MARGIN,
  CANVAS_SIZE,
  clampToMargin,
  fillPlaceholders,
  FONT_STACK,
  parseMarks,
  resolveColor,
  stripMarks,
  type CanvasElement,
  type CanvasImageEl,
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
  const soft = `${ink}10`;
  switch (texture) {
    case "paper":
      return {
        backgroundImage: `radial-gradient(${soft} 1px, transparent 0), radial-gradient(${faint} 1px, transparent 0)`,
        backgroundSize: "28px 28px",
        backgroundPosition: "0 0, 14px 14px",
      };
    case "grid":
      return {
        backgroundImage: `linear-gradient(to right, ${soft} 1px, transparent 1px), linear-gradient(to bottom, ${soft} 1px, transparent 1px)`,
        backgroundSize: "48px 48px",
      };
    case "lines":
      return {
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent 51px, ${faint} 52px)`,
      };
    case "dots":
      return {
        backgroundImage: `radial-gradient(${faint} 2px, transparent 2px)`,
        backgroundSize: "36px 36px",
      };
    default:
      return {};
  }
}

/** Gently shrinks font size when text grows longer than its box, avoiding clipping. */
function autoFitFontSize(el: CanvasTextEl, rawText: string): number {
  const plain = stripMarks(rawText);
  if (!plain) return el.size;
  const padX = el.variant === "note" ? 72 : el.variant === "card" || el.variant === "tarja" || el.variant === "pill" ? 52 : 8;
  const padY = el.variant === "note" ? 68 : el.variant === "card" || el.variant === "tarja" ? 34 : el.variant === "pill" ? 20 : 4;
  const availW = Math.max(120, el.w - padX);
  const availH = Math.max(36, el.h - padY);
  const lh = el.lineHeight ?? 1.2;

  let size = el.size;
  const minSize = Math.max(20, Math.round(el.size * 0.52));
  while (size > minSize) {
    const charsPerLine = Math.max(4, Math.floor(availW / (size * 0.54)));
    const lines = plain
      .split("\n")
      .reduce((sum, line) => sum + Math.max(1, Math.ceil(Math.max(1, line.length) / charsPerLine)), 0);
    if (lines * size * lh <= availH * 1.08) break;
    size -= 2;
  }
  return size;
}

function RichRuns({ text, markBg, markInk }: { text: string; markBg: string; markInk: string }) {
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
                padding: "0.04em 0.22em",
                borderRadius: "0.2em",
                boxDecorationBreak: "clone",
                WebkitBoxDecorationBreak: "clone",
                fontWeight: 800,
              }}
            >
              {run.text}
            </mark>
          );
        }
        if (run.bold) {
          return (
            <strong key={idx} style={{ fontWeight: 800 }}>
              {run.text}
            </strong>
          );
        }
        return <span key={idx}>{run.text}</span>;
      })}
    </>
  );
}

function ShapeArtwork({ el, palette, slideBg }: { el: CanvasShapeEl; palette: SocialPalette; slideBg: string }) {
  const color = resolveColor(el.fill, palette, slideBg);
  if (el.shape === "arrow") {
    return (
      <svg viewBox="0 0 220 80" width="100%" height="100%" fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 54 C 72 18, 138 18, 198 42" />
        <path d="M168 18 L 202 43 L 166 64" />
      </svg>
    );
  }
  if (el.shape === "underline") {
    return (
      <svg viewBox="0 0 320 26" width="100%" height="100%" fill="none" stroke={color} strokeWidth={10} strokeLinecap="round">
        <path d="M8 16 Q 160 4 312 15" />
      </svg>
    );
  }
  if (el.shape === "line") {
    return (
      <div
        style={{
          width: "100%",
          height: Math.max(3, el.h),
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
          opacity: el.opacity ?? 0.78,
          borderRadius: 4,
          boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: color,
        opacity: el.opacity ?? 1,
        borderRadius: el.shape === "circle" ? "9999px" : `${el.radius ?? 24}px`,
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
    } catch { /* ignore */ }

    if (!moved && el.type === "text" && el.role !== "chrome" && wasSelected) {
      onStartEditing?.(el.id);
    }
    if (!moved && el.type === "image" && !el.src) {
      onPickImage?.(el.id, el.src);
    }
  }

  function renderTextElement(el: CanvasTextEl) {
    const resolved = fillPlaceholders(el.text, { handle, index, total });
    if (!interactive && el.role === "chrome" && !resolved.trim()) return null;

    const fillHex = el.fill ? resolveColor(el.fill, palette, slideBg) : "transparent";
    const behind = fillHex !== "transparent" ? fillHex : slideBg;
    const textHex = resolveColor(el.color, palette, behind);

    // Highlight color: mustard gold on dark or soft/mustard on light
    const markBg = behind.toLowerCase() === "#e5b314" || behind.toLowerCase() === "#f8e07a" ? palette.primary : "#F5BD1F";
    const markInk = markBg === "#F5BD1F" ? "#16121F" : "#FFFFFF";

    const fontSize = autoFitFontSize(el, resolved || el.text);
    const isEditing = interactive && editingElementId === el.id;

    const boxStyle: CSSProperties = {
      width: "100%",
      height: "100%",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      justifyContent: el.variant === "pill" || el.variant === "tarja" ? "center" : "flex-start",
      alignItems: el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "stretch",
      textAlign: el.align,
      fontFamily: FONT_STACK[el.font],
      fontSize: `${fontSize}px`,
      fontWeight: el.weight,
      fontStyle: el.italic ? "italic" : "normal",
      textTransform: el.upper ? "uppercase" : "none",
      lineHeight: el.lineHeight ?? 1.2,
      letterSpacing: el.upper ? "0.04em" : el.font === "serif" ? "-0.02em" : "-0.01em",
      color: textHex,
      wordBreak: "break-word",
      whiteSpace: "pre-wrap",
      ...(el.variant === "pill"
        ? {
            background: fillHex,
            borderRadius: 999,
            padding: "12px 28px",
          }
        : el.variant === "tarja"
          ? {
              background: fillHex,
              borderRadius: 14,
              padding: "18px 28px",
              boxShadow: "0 10px 28px rgba(0,0,0,0.14)",
            }
          : el.variant === "note"
            ? {
                background: fillHex || "#F8E07A",
                borderRadius: "6px 6px 22px 6px",
                padding: "36px 38px",
                boxShadow: "0 18px 40px rgba(0,0,0,0.2)",
              }
            : el.variant === "card"
              ? {
                  background: fillHex,
                  borderRadius: 24,
                  padding: "26px 32px",
                }
              : el.variant === "marker"
                ? {
                    background: fillHex,
                    borderLeft: `8px solid ${resolveColor("accent", palette, slideBg)}`,
                    borderRadius: "0 18px 18px 0",
                    padding: "20px 26px",
                  }
                : {}),
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
            ...boxStyle,
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

    if (el.list) {
      const lines = resolved
        .split("\n")
        .map(l => l.replace(/^[•\-–✓✔️]\s*/, "").trim())
        .filter(Boolean);
      return (
        <div style={{ ...boxStyle, gap: `${Math.round(fontSize * 0.34)}px` }}>
          {lines.map((line, li) => (
            <div key={li} style={{ display: "flex", alignItems: "flex-start", gap: "16px", textAlign: "left" }}>
              <span
                style={{
                  flexShrink: 0,
                  fontWeight: 800,
                  color: resolveColor("accent", palette, behind),
                }}
              >
                {el.list === "check" ? "✓" : el.list === "number" ? `${li + 1}.` : "•"}
              </span>
              <span style={{ flex: 1 }}>
                <RichRuns text={line} markBg={markBg} markInk={markInk} />
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
          <RichRuns text={resolved} markBg={markBg} markInk={markInk} />
        </span>
      </div>
    );
  }

  function renderImageElement(el: CanvasImageEl) {
    if (!el.src) {
      if (!interactive) return null;
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
          <strong style={{ fontSize: 28 }}>Clique para escolher foto da Mídia ou gerar com IA</strong>
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
              background: `rgba(14, 12, 24, ${el.overlay})`,
              pointerEvents: "none",
            }}
          />
        ) : null}
      </div>
    );
  }

  const guidesVisible = interactive && (showSafeGuides || dragging || Boolean(selectedElementId));

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

        return (
          <div
            key={el.id}
            onPointerDown={e => beginDrag(e, el, "move")}
            onPointerMove={moveDrag}
            onPointerUp={e => endDrag(e, el)}
            onDoubleClick={e => {
              if (!interactive) return;
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
              cursor: !interactive ? "default" : isEditing ? "text" : isFullBleedImg ? "pointer" : "grab",
              touchAction: interactive && !isEditing ? "none" : undefined,
              outline: isSelected ? "4px solid #4C8DFF" : undefined,
              outlineOffset: isSelected ? "4px" : undefined,
            }}
          >
            {el.type === "shape" ? (
              <ShapeArtwork el={el} palette={palette} slideBg={slideBg} />
            ) : el.type === "image" ? (
              renderImageElement(el)
            ) : (
              renderTextElement(el)
            )}

            {isSelected && !isEditing && !isFullBleedImg ? (
              <>
                {/* Rotation handle */}
                <div
                  onPointerDown={e => beginDrag(e, el, "rotate")}
                  onPointerMove={moveDrag}
                  onPointerUp={e => endDrag(e, el)}
                  title="Girar elemento"
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: -54,
                    transform: "translateX(-50%)",
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    background: "#16161A",
                    border: "3px solid #4C8DFF",
                    color: "#FFFFFF",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 20,
                    cursor: "grab",
                    touchAction: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                  }}
                >
                  ↻
                </div>

                {/* 8 Resize handles */}
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
                      borderRadius: 5,
                      background: "#FFFFFF",
                      border: "3px solid #4C8DFF",
                      cursor: h.cursor,
                      touchAction: "none",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.28)",
                    }}
                  />
                ))}
              </>
            ) : null}
          </div>
        );
      })}

      {/* Safe breathing margin guide (never rendered on PNG export because interactive=false) */}
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

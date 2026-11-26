"use client";

import type { CSSProperties, ReactNode } from "react";
import { ASPECT_DIMENSIONS, type ArtDirection, type CompiledSlide, type StudioAspect } from "@/lib/social/studioTypes";
import type { SocialTheme } from "@/lib/social/types";

type Props = {
  slide: CompiledSlide;
  index: number;
  total: number;
  theme: SocialTheme;
  artDirection: ArtDirection;
  aspect: StudioAspect;
};

/** Renders inline `*word*` emphasis as brand-colored accent or notebook highlighter. */
function RichInline({
  text,
  accent,
  highlightBg,
  isNotebook,
}: {
  text: string;
  accent: string;
  highlightBg: string;
  isNotebook: boolean;
}): ReactNode {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      const word = part.slice(1, -1);
      if (isNotebook) {
        return (
          <mark
            key={i}
            style={{
              backgroundColor: highlightBg,
              color: "inherit",
              padding: "2px 10px",
              borderRadius: "8px",
              fontWeight: 700,
            }}
          >
            {word}
          </mark>
        );
      }
      return (
        <strong key={i} style={{ color: accent, fontWeight: 700 }}>
          {word}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function StudioSlideCanvas({ slide, index, total, theme, artDirection, aspect }: Props) {
  const { width, height } = ASPECT_DIMENSIONS[aspect];
  const isStory = aspect === "story";
  const isDark = artDirection === "dark";
  const isNotebook = artDirection === "notebook";
  const isBook = artDirection === "book";

  const bg = isDark ? "#131719" : isBook ? "#FAF7F1" : theme.palette.background;
  const surface = isDark ? "#1D2326" : theme.palette.surface;
  const ink = isDark ? "#F5F2EB" : theme.palette.primary;
  const muted = isDark ? "#9CA6AB" : theme.palette.muted;
  const accent = theme.palette.accent;
  const accentSoft = isDark ? `${accent}26` : theme.palette.accentSoft;
  const wrong = isDark ? "#F2706B" : theme.palette.wrong;
  const right = isDark ? "#5FD27D" : theme.palette.right;

  const displayFamily =
    theme.displayFont === "serif" || isBook
      ? "Georgia, 'Times New Roman', Times, serif"
      : "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif";
  const bodyFamily = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif";

  // Safe margins for Instagram Stories (top status/avatar + bottom reply bar)
  const padTop = isStory ? 210 : 88;
  const padBottom = isStory ? 230 : 96;
  const padX = isBook ? 104 : 84;

  const rootStyle: CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    backgroundColor: bg,
    color: ink,
    fontFamily: bodyFamily,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: `${padTop}px ${padX}px ${padBottom}px`,
    boxSizing: "border-box",
    overflow: "hidden",
    userSelect: "none",
    ...(isNotebook
      ? {
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent 62px, ${ink}12 62px, ${ink}12 64px)`,
          backgroundPosition: "0 18px",
        }
      : {}),
  };

  const slideNum = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  const slideImage = slide.kind === "cover" || slide.kind === "image" ? slide.imageUrl : undefined;
  const slideOverlay =
    slide.kind === "cover" || slide.kind === "image" ? (slide.imageOverlay ?? (slide.kind === "image" ? 0.38 : 0.78)) : 0.78;

  const inlineProps = { accent, highlightBg: accentSoft, isNotebook };

  return (
    <div style={rootStyle}>
      {/* Background decorations by Art Direction */}
      {slideImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slideImage}
            alt=""
            crossOrigin="anonymous"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: slide.kind === "image" ? "#0E1214" : bg,
              opacity: slideOverlay,
              pointerEvents: "none",
            }}
          />
        </>
      ) : null}

      {!slideImage && isNotebook ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "52px",
            width: "3px",
            backgroundColor: `${accent}44`,
            pointerEvents: "none",
          }}
        />
      ) : null}

      {!slideImage && isBook ? (
        <div
          style={{
            position: "absolute",
            inset: isStory ? "150px 48px 170px" : "44px",
            border: `2px solid ${ink}22`,
            borderRadius: "4px",
            pointerEvents: "none",
          }}
        />
      ) : null}

      {!slideImage && artDirection === "editorial" ? (
        <div
          style={{
            position: "absolute",
            top: "-180px",
            right: "-180px",
            width: "460px",
            height: "460px",
            borderRadius: "999px",
            backgroundColor: accentSoft,
            opacity: slide.kind === "cover" || slide.kind === "cta" ? 0.7 : 0.3,
            pointerEvents: "none",
          }}
        />
      ) : null}

      {/* Top header */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: "44px",
        }}
      >
        {"eyebrow" in slide && slide.eyebrow ? (
          <span
            style={
              isBook
                ? {
                    fontSize: "21px",
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: accent,
                  }
                : {
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "10px 22px",
                    borderRadius: "999px",
                    backgroundColor: slide.kind === "cover" ? accent : accentSoft,
                    color: slide.kind === "cover" ? "#FFFFFF" : accent,
                    fontSize: "22px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }
            }
          >
            {slide.eyebrow}
          </span>
        ) : (
          <span />
        )}

        {theme.showSlideNumbers && total > 1 ? (
          <span
            style={{
              fontSize: "22px",
              fontWeight: 600,
              color: slide.kind === "image" && slideImage ? "#FFFFFF" : muted,
              letterSpacing: "0.06em",
            }}
          >
            {slideNum}
          </span>
        ) : null}
      </div>

      {/* Main Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          textAlign: isBook && (slide.kind === "cover" || slide.kind === "quote" || slide.kind === "cta") ? "center" : "left",
          alignItems: isBook && (slide.kind === "cover" || slide.kind === "quote" || slide.kind === "cta") ? "center" : "stretch",
          padding: "36px 0",
        }}
      >
        {slide.kind === "cover" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "34px", alignItems: isBook ? "center" : "flex-start" }}>
            <h1
              style={{
                margin: 0,
                fontFamily: displayFamily,
                fontSize: isStory ? "92px" : "82px",
                lineHeight: 1.08,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: ink,
              }}
            >
              <RichInline text={slide.title} {...inlineProps} />
            </h1>
            {slide.subtitle ? (
              <p style={{ margin: 0, fontSize: "34px", lineHeight: 1.44, color: muted, maxWidth: "820px" }}>
                <RichInline text={slide.subtitle} {...inlineProps} />
              </p>
            ) : null}
            {slide.cta ? (
              <div style={{ marginTop: "10px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "18px 30px",
                    borderRadius: isBook ? "4px" : "16px",
                    backgroundColor: isDark ? accent : ink,
                    color: "#FFFFFF",
                    fontSize: "26px",
                    fontWeight: 600,
                  }}
                >
                  {slide.cta}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {slide.kind === "step" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
            <div style={{ fontFamily: displayFamily, fontSize: "92px", lineHeight: 1, fontWeight: 700, color: accent }}>
              {slide.stepNumber}
            </div>
            <h2 style={{ margin: 0, fontFamily: displayFamily, fontSize: "58px", lineHeight: 1.15, fontWeight: 700, color: ink }}>
              <RichInline text={slide.title} {...inlineProps} />
            </h2>
            <p style={{ margin: 0, fontSize: "35px", lineHeight: 1.5, color: ink, opacity: 0.9 }}>
              <RichInline text={slide.body} {...inlineProps} />
            </p>
            {slide.tip ? (
              <div
                style={{
                  marginTop: "12px",
                  padding: "26px 32px",
                  borderRadius: "18px",
                  backgroundColor: surface,
                  borderLeft: `8px solid ${accent}`,
                  boxShadow: isDark ? "none" : "0 10px 30px rgba(0,0,0,0.04)",
                  fontSize: "28px",
                  lineHeight: 1.42,
                  fontWeight: 500,
                  color: ink,
                }}
              >
                <RichInline text={slide.tip} {...inlineProps} />
              </div>
            ) : null}
          </div>
        ) : null}

        {slide.kind === "before_after" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <h2 style={{ margin: 0, fontFamily: displayFamily, fontSize: "52px", lineHeight: 1.16, fontWeight: 700, color: ink }}>
              <RichInline text={slide.title} {...inlineProps} />
            </h2>

            <div
              style={{
                backgroundColor: surface,
                borderRadius: "24px",
                padding: "30px 34px",
                border: `2px solid ${wrong}44`,
              }}
            >
              <div style={{ display: "inline-flex", gap: "10px", fontSize: "22px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: wrong, marginBottom: "14px" }}>
                <span>✕</span>
                <span>{slide.wrongLabel}</span>
              </div>
              <p style={{ margin: 0, fontSize: "33px", lineHeight: 1.42, color: muted, textDecoration: "line-through", textDecorationThickness: "2px" }}>
                {slide.wrongText}
              </p>
            </div>

            <div
              style={{
                backgroundColor: surface,
                borderRadius: "24px",
                padding: "32px 34px",
                border: `3px solid ${right}`,
                boxShadow: isDark ? "none" : "0 14px 36px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ display: "inline-flex", gap: "10px", fontSize: "22px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: right, marginBottom: "14px" }}>
                <span>✓</span>
                <span>{slide.rightLabel}</span>
              </div>
              <p style={{ margin: 0, fontSize: "34px", lineHeight: 1.42, fontWeight: 600, color: ink }}>
                <RichInline text={slide.rightText} {...inlineProps} />
              </p>
            </div>

            {slide.note ? (
              <p style={{ margin: 0, fontSize: "27px", lineHeight: 1.44, color: muted }}>
                <RichInline text={slide.note} {...inlineProps} />
              </p>
            ) : null}
          </div>
        ) : null}

        {slide.kind === "checklist" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <h2 style={{ margin: 0, fontFamily: displayFamily, fontSize: "56px", lineHeight: 1.14, fontWeight: 700, color: ink }}>
              <RichInline text={slide.title} {...inlineProps} />
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {slide.items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "20px",
                    backgroundColor: surface,
                    borderRadius: "20px",
                    padding: "24px 28px",
                    border: `1px solid ${ink}14`,
                  }}
                >
                  <span
                    style={{
                      flex: "none",
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      backgroundColor: accent,
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                      fontWeight: 700,
                      marginTop: "4px",
                    }}
                  >
                    ✓
                  </span>
                  <span style={{ fontSize: "31px", lineHeight: 1.4, color: ink }}>
                    <RichInline text={item} {...inlineProps} />
                  </span>
                </div>
              ))}
            </div>
            {slide.footerNote ? (
              <p style={{ margin: 0, fontSize: "26px", lineHeight: 1.42, color: muted }}>
                {slide.footerNote}
              </p>
            ) : null}
          </div>
        ) : null}

        {slide.kind === "quote" ? (
          <div
            style={{
              backgroundColor: isBook ? "transparent" : surface,
              borderRadius: "32px",
              padding: isBook ? "20px 10px" : "64px 56px",
              border: isBook ? "none" : `1px solid ${ink}14`,
              boxShadow: isDark || isBook ? "none" : "0 18px 48px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "30px",
              alignItems: isBook ? "center" : "flex-start",
            }}
          >
            <span style={{ fontFamily: displayFamily, fontSize: "110px", lineHeight: 0.6, color: accent, marginTop: "16px" }}>
              “
            </span>
            <p style={{ margin: 0, fontFamily: displayFamily, fontSize: "48px", lineHeight: 1.34, fontWeight: 600, color: ink }}>
              <RichInline text={slide.quote} {...inlineProps} />
            </p>
            {slide.author ? (
              <div style={{ fontSize: "25px", fontWeight: 700, color: accent, letterSpacing: "0.04em" }}>
                — {slide.author}
              </div>
            ) : null}
          </div>
        ) : null}

        {slide.kind === "image" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px", justifyContent: "flex-end", height: "100%" }}>
            {slide.title ? (
              <h2
                style={{
                  margin: 0,
                  fontFamily: displayFamily,
                  fontSize: "62px",
                  lineHeight: 1.12,
                  fontWeight: 700,
                  color: slideImage ? "#FFFFFF" : ink,
                }}
              >
                <RichInline text={slide.title} {...inlineProps} />
              </h2>
            ) : null}
            {slide.caption ? (
              <p style={{ margin: 0, fontSize: "32px", lineHeight: 1.45, color: slideImage ? "rgba(255,255,255,0.88)" : muted }}>
                {slide.caption}
              </p>
            ) : null}
          </div>
        ) : null}

        {slide.kind === "cta" ? (
          <div
            style={{
              backgroundColor: isDark ? surface : theme.palette.primary,
              color: "#FFFFFF",
              borderRadius: isBook ? "8px" : "32px",
              padding: "64px 56px",
              display: "flex",
              flexDirection: "column",
              gap: "28px",
              alignItems: isBook ? "center" : "flex-start",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <h2 style={{ margin: 0, fontFamily: displayFamily, fontSize: "62px", lineHeight: 1.14, fontWeight: 700, color: "#FFFFFF" }}>
              {slide.title}
            </h2>
            {slide.body ? (
              <p style={{ margin: 0, fontSize: "33px", lineHeight: 1.45, color: "rgba(255,255,255,0.86)" }}>
                {slide.body}
              </p>
            ) : null}
            {slide.buttonLabel ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "18px 30px",
                  borderRadius: "16px",
                  backgroundColor: accent,
                  color: "#FFFFFF",
                  fontSize: "27px",
                  fontWeight: 700,
                  marginTop: "8px",
                }}
              >
                {slide.buttonLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        {slide.kind === "free" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
            {slide.heading ? (
              <h2 style={{ margin: 0, fontFamily: displayFamily, fontSize: "60px", lineHeight: 1.14, fontWeight: 700, color: ink }}>
                <RichInline text={slide.heading} {...inlineProps} />
              </h2>
            ) : null}
            {slide.paragraphs.map((p, i) => {
              if (p.kind === "quote") {
                return (
                  <blockquote
                    key={i}
                    style={{
                      margin: 0,
                      padding: "20px 28px",
                      borderLeft: `8px solid ${accent}`,
                      backgroundColor: surface,
                      borderRadius: "14px",
                      fontFamily: displayFamily,
                      fontSize: "34px",
                      lineHeight: 1.42,
                      color: ink,
                    }}
                  >
                    <RichInline text={p.text} {...inlineProps} />
                  </blockquote>
                );
              }
              if (p.kind === "bullet" || p.kind === "numbered") {
                return (
                  <div key={i} style={{ display: "flex", gap: "18px", fontSize: "34px", lineHeight: 1.45, color: ink }}>
                    <span style={{ color: accent, fontWeight: 700 }}>{p.kind === "bullet" ? "•" : `${i + 1}.`}</span>
                    <span><RichInline text={p.text} {...inlineProps} /></span>
                  </div>
                );
              }
              return (
                <p key={i} style={{ margin: 0, fontSize: "35px", lineHeight: 1.5, color: ink, opacity: 0.92 }}>
                  <RichInline text={p.text} {...inlineProps} />
                </p>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderTop: `2px solid ${slide.kind === "image" && slideImage ? "rgba(255,255,255,0.28)" : `${ink}1A`}`,
          paddingTop: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "23px",
          color: slide.kind === "image" && slideImage ? "#FFFFFF" : muted,
        }}
      >
        <span style={{ fontWeight: 700, color: slide.kind === "image" && slideImage ? "#FFFFFF" : ink }}>
          {theme.brandName}
        </span>
        {theme.showFooterHandle ? (
          <span style={{ fontWeight: 600, color: slide.kind === "image" && slideImage ? "#FFFFFF" : accent }}>
            {theme.handle}
          </span>
        ) : null}
      </div>
    </div>
  );
}

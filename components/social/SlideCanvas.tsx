"use client";

import type { CSSProperties } from "react";
import { SLIDE_HEIGHT, SLIDE_WIDTH, type SocialSlide, type SocialTheme } from "@/lib/social/types";

type SlideCanvasProps = {
  slide: SocialSlide;
  index: number;
  total: number;
  theme: SocialTheme;
};

function contrastOn(hex: string): string {
  const clean = hex.trim().replace(/^#/, "");
  if (clean.length !== 6) return "#FFFFFF";
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.58 ? "#1E163B" : "#FFFFFF";
}

export default function SlideCanvas({ slide, index, total, theme }: SlideCanvasProps) {
  const { palette } = theme;
  const displayFamily =
    theme.displayFont === "serif"
      ? "Georgia, 'Times New Roman', Times, serif"
      : "var(--font-dm-sans), 'DM Sans', system-ui, -apple-system, sans-serif";
  const bodyFamily = "var(--font-dm-sans), 'DM Sans', system-ui, -apple-system, sans-serif";

  const rootStyle: CSSProperties = {
    width: `${SLIDE_WIDTH}px`,
    height: `${SLIDE_HEIGHT}px`,
    backgroundColor: palette.background,
    color: palette.primary,
    fontFamily: bodyFamily,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "92px 84px 104px",
    boxSizing: "border-box",
    overflow: "hidden",
    userSelect: "none",
  };

  const slideNum = `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  const overlayAlpha = typeof slide.imageOverlay === "number" ? slide.imageOverlay : 0.78;
  const onAccent = contrastOn(palette.accent);
  const onPrimary = contrastOn(palette.primary);

  return (
    <div style={rootStyle}>
      {slide.imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.imageUrl}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: palette.background,
              opacity: overlayAlpha,
              pointerEvents: "none",
            }}
          />
        </>
      ) : (
        /* Subtle decorative corner accent */
        <div
          style={{
            position: "absolute",
            top: "-180px",
            right: "-180px",
            width: "460px",
            height: "460px",
            borderRadius: "999px",
            backgroundColor: palette.accentSoft,
            opacity: slide.kind === "cover" || slide.kind === "cta" ? 0.65 : 0.3,
            pointerEvents: "none",
          }}
        />
      )}

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
        {slide.eyebrow ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "10px 20px",
              borderRadius: "999px",
              backgroundColor: slide.kind === "cover" ? palette.accent : palette.accentSoft,
              color: slide.kind === "cover" ? onAccent : palette.accent,
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
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
              color: palette.muted,
              letterSpacing: "0.06em",
            }}
          >
            {slideNum}
          </span>
        ) : null}
      </div>

      {/* Main body by slide kind */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "36px 0",
        }}
      >
        {slide.kind === "cover" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "34px" }}>
            <h1
              style={{
                margin: 0,
                fontFamily: displayFamily,
                fontSize: "82px",
                lineHeight: 1.08,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: palette.primary,
              }}
            >
              {slide.title}
            </h1>
            {slide.body ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "34px",
                  lineHeight: 1.42,
                  color: palette.muted,
                  maxWidth: "820px",
                }}
              >
                {slide.body}
              </p>
            ) : null}
            {slide.highlight ? (
              <div style={{ marginTop: "12px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "18px 30px",
                    borderRadius: "16px",
                    backgroundColor: palette.accent,
                    color: onAccent,
                    fontSize: "26px",
                    fontWeight: 700,
                  }}
                >
                  {slide.highlight}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {slide.kind === "content" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {slide.stepNumber ? (
              <div
                style={{
                  fontFamily: displayFamily,
                  fontSize: "88px",
                  lineHeight: 1,
                  fontWeight: 700,
                  color: palette.accent,
                  opacity: 0.9,
                }}
              >
                {slide.stepNumber}
              </div>
            ) : null}
            <h2
              style={{
                margin: 0,
                fontFamily: displayFamily,
                fontSize: "58px",
                lineHeight: 1.15,
                fontWeight: 700,
                color: palette.primary,
              }}
            >
              {slide.title}
            </h2>
            {slide.body ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "35px",
                  lineHeight: 1.48,
                  color: palette.primary,
                  opacity: 0.88,
                }}
              >
                {slide.body}
              </p>
            ) : null}
            {slide.highlight ? (
              <div
                style={{
                  marginTop: "16px",
                  padding: "26px 32px",
                  borderRadius: "18px",
                  backgroundColor: palette.surface,
                  borderLeft: `8px solid ${palette.accent}`,
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.04)",
                  fontSize: "28px",
                  lineHeight: 1.42,
                  fontWeight: 500,
                  color: palette.primary,
                }}
              >
                {slide.highlight}
              </div>
            ) : null}
          </div>
        ) : null}

        {slide.kind === "comparison" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <h2
              style={{
                margin: 0,
                fontFamily: displayFamily,
                fontSize: "52px",
                lineHeight: 1.15,
                fontWeight: 700,
                color: palette.primary,
              }}
            >
              {slide.title}
            </h2>

            {/* Wrong / Antes */}
            <div
              style={{
                backgroundColor: palette.surface,
                borderRadius: "24px",
                padding: "30px 34px",
                border: `2px solid ${palette.wrong}33`,
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.03)",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "22px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: palette.wrong,
                  marginBottom: "14px",
                }}
              >
                <span>✕</span>
                <span>{slide.wrongLabel || "Antes"}</span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "32px",
                  lineHeight: 1.4,
                  color: palette.muted,
                  textDecoration: "line-through",
                  textDecorationThickness: "2px",
                }}
              >
                {slide.wrongText || ""}
              </p>
            </div>

            {/* Right / Depois */}
            <div
              style={{
                backgroundColor: palette.surface,
                borderRadius: "24px",
                padding: "32px 34px",
                border: `3px solid ${palette.right}`,
                boxShadow: "0 14px 36px rgba(0, 0, 0, 0.06)",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "22px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: palette.right,
                  marginBottom: "14px",
                }}
              >
                <span>✓</span>
                <span>{slide.rightLabel || "Depois"}</span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "34px",
                  lineHeight: 1.4,
                  fontWeight: 600,
                  color: palette.primary,
                }}
              >
                {slide.rightText || ""}
              </p>
            </div>

            {slide.body ? (
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "27px",
                  lineHeight: 1.42,
                  color: palette.muted,
                }}
              >
                {slide.body}
              </p>
            ) : null}
          </div>
        ) : null}

        {slide.kind === "quote" ? (
          <div
            style={{
              backgroundColor: palette.surface,
              borderRadius: "32px",
              padding: "64px 56px",
              boxShadow: "0 18px 48px rgba(0, 0, 0, 0.05)",
              border: `1px solid ${palette.primary}14`,
              display: "flex",
              flexDirection: "column",
              gap: "32px",
            }}
          >
            <span
              style={{
                fontFamily: displayFamily,
                fontSize: "110px",
                lineHeight: 0.6,
                color: palette.accent,
                marginTop: "20px",
              }}
            >
              “
            </span>
            <p
              style={{
                margin: 0,
                fontFamily: displayFamily,
                fontSize: "48px",
                lineHeight: 1.32,
                fontWeight: 600,
                color: palette.primary,
              }}
            >
              {slide.title}
            </p>
            {slide.body ? (
              <p style={{ margin: 0, fontSize: "28px", lineHeight: 1.45, color: palette.muted }}>
                {slide.body}
              </p>
            ) : null}
            {slide.author ? (
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: palette.accent,
                  letterSpacing: "0.04em",
                }}
              >
                — {slide.author}
              </div>
            ) : null}
          </div>
        ) : null}

        {slide.kind === "cta" ? (
          <div
            style={{
              backgroundColor: palette.primary,
              color: onPrimary,
              borderRadius: "32px",
              padding: "64px 56px",
              display: "flex",
              flexDirection: "column",
              gap: "28px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: displayFamily,
                fontSize: "62px",
                lineHeight: 1.15,
                fontWeight: 700,
                color: onPrimary,
              }}
            >
              {slide.title}
            </h2>
            {slide.body ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "33px",
                  lineHeight: 1.45,
                  color: onPrimary,
                  opacity: 0.86,
                }}
              >
                {slide.body}
              </p>
            ) : null}
            {slide.highlight ? (
              <div style={{ marginTop: "12px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "18px 28px",
                    borderRadius: "16px",
                    backgroundColor: palette.accent,
                    color: onAccent,
                    fontSize: "27px",
                    fontWeight: 700,
                  }}
                >
                  {slide.highlight}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderTop: `2px solid ${palette.primary}18`,
          paddingTop: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "23px",
          color: palette.muted,
        }}
      >
        <span style={{ fontWeight: 700, color: palette.primary }}>
          {theme.brandName}
        </span>
        {theme.showFooterHandle ? (
          <span style={{ fontWeight: 600, color: palette.accent }}>{theme.handle}</span>
        ) : null}
      </div>
    </div>
  );
}

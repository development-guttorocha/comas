import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

/**
 * The site's share images (Open Graph): one card for every page, in the site's own type
 * (DM Sans), with Gutto's mark and portrait. The texts come from each page's editable title and
 * description, so the card always says what the page says.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const SITE_ACCENT = { color: "#ef352c", on: "#080808" };

const root = process.cwd();
const fontFile = (weight: number) => path.join(/*turbopackIgnore: true*/ root, "node_modules", "@fontsource", "dm-sans", "files", `dm-sans-latin-${weight}-normal.woff`);
const dataUrl = async (file: string, type: string) => `data:${type};base64,${(await readFile(path.join(/*turbopackIgnore: true*/ root, file))).toString("base64")}`;

type Font = { name: string; data: Buffer; weight: 400 | 700; style: "normal" };
let assets: Promise<{ fonts: Font[]; logo: string; photo: string }> | undefined;
function loadAssets() {
  assets ??= (async () => ({
    fonts: await Promise.all([400, 700].map(async weight => ({ name: "DM Sans", data: await readFile(fontFile(weight)), weight: weight as Font["weight"], style: "normal" as const }))),
    logo: await dataUrl("public/brand/symbol-on-dark-bg.svg", "image/svg+xml"),
    photo: await dataUrl("public/og/gutto-gray.jpg", "image/jpeg"),
  }))();
  return assets;
}

export { splitTitle } from "@/lib/ogText";

const titleSize = (text: string) => (text.length > 60 ? 54 : text.length > 38 ? 64 : 76);

export async function shareCard({ kicker, title, line, accent = SITE_ACCENT, footer = "guttorocha.com.br" }: {
  kicker?: string; title: string; line?: string; accent?: { color: string; on: string }; footer?: string;
}) {
  const { fonts, logo, photo } = await loadAssets();
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#0b0b0b", color: "#f8f8f5", fontFamily: "DM Sans" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 760, padding: "64px 0 60px 72px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src={logo} width={52} height={52} alt="" />
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1 }}>Gutto Rocha</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {kicker ? (
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, color: "#a3a39c", fontSize: 26, fontWeight: 700 }}>
                <div style={{ width: 14, height: 14, borderRadius: 14, background: accent.color }} />
                {kicker}
              </div>
            ) : null}
            <div style={{ fontSize: titleSize(title), fontWeight: 700, lineHeight: 1.02, letterSpacing: -3, maxWidth: 660 }}>{title}</div>
            {line ? <div style={{ marginTop: 26, maxWidth: 620, color: "#a3a39c", fontSize: 26, lineHeight: 1.4 }}>{line.length > 130 ? `${line.slice(0, 127).trimEnd()}…` : line}</div> : null}
          </div>

          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", padding: "12px 24px", borderRadius: 999, background: accent.color, color: accent.on, fontSize: 22, fontWeight: 700 }}>{footer}</div>
          </div>
        </div>

        {/* The portrait, fading into the background on its left edge. */}
        <div style={{ display: "flex", position: "relative", width: 440, height: "100%" }}>
          <img src={photo} width={440} height={630} alt="" style={{ objectFit: "cover", objectPosition: "50% 30%" }} />
          <div style={{ position: "absolute", left: 0, top: 0, width: 200, height: "100%", backgroundImage: "linear-gradient(90deg, #0b0b0b, rgba(11,11,11,0))" }} />
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}

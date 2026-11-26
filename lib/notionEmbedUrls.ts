/**
 * YouTube / Vimeo / Figma: URL de página → URL para <iframe src="…">.
 * Figma: Embed Kit 2.0 (`embed.figma.com`).
 */

function youtubeVideoId(input: string): string | null {
  try {
    const u = new URL(input.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.slice("/embed/".length).split("/")[0] || null;
      }
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.slice("/shorts/".length).split("/")[0] || null;
      }
      const v = u.searchParams.get("v");
      if (v) return v;
    }
  } catch {
    /* invalid URL */
  }
  return null;
}

function vimeoVideoId(input: string): string | null {
  try {
    const u = new URL(input.trim());
    if (!u.hostname.replace(/^www\./, "").includes("vimeo.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && /^\d+$/.test(last)) return last;
  } catch {
    /* invalid URL */
  }
  return null;
}

/** Figma's paths for each kind of file, as Embed Kit 2.0 serves them (`file` is the old `design`). */
const FIGMA_KINDS: Record<string, string> = { proto: "proto", design: "design", file: "design", board: "board", slides: "slides", deck: "deck" };
/** Who embeds it, as Embed Kit 2.0 asks; no OAuth app is needed while the page only shows it. */
const FIGMA_EMBED_HOST = "guttorocha";

/**
 * A Figma link → its Embed Kit 2.0 address (`embed.figma.com/<kind>/<key>/…`), keeping the
 * link's own options (frame, scaling) and dropping Figma's footer. Old `figma.com/embed?url=…`
 * links are unwrapped first.
 */
function figmaEmbedSrc(pageUrl: string): string | null {
  try {
    let u = new URL(pageUrl.trim());
    let host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "figma.com" && !host.endsWith(".figma.com")) return null;
    if (host === "figma.com" && u.pathname.replace(/\/$/, "") === "/embed") {
      const inner = u.searchParams.get("url");
      if (!inner) return null;
      u = new URL(inner);
      host = u.hostname.replace(/^www\./, "").toLowerCase();
    }
    const [kind, key, ...rest] = u.pathname.split("/").filter(Boolean);
    const path = FIGMA_KINDS[kind ?? ""];
    if (!path || !key) return null;
    const out = new URL(`https://embed.figma.com/${path}/${key}${rest.length ? `/${rest.join("/")}` : ""}`);
    u.searchParams.forEach((value, name) => {
      // `t` and `p` only track the share; the rest are the link's own options.
      if (name !== "t" && name !== "p" && name !== "embed_host") out.searchParams.set(name, value);
    });
    out.searchParams.set("embed-host", FIGMA_EMBED_HOST);
    if (!out.searchParams.has("footer")) out.searchParams.set("footer", "false");
    return out.toString();
  } catch {
    /* invalid URL */
  }
  return null;
}

function notionPageEmbedSrc(pageUrl: string): string | null {
  const raw = pageUrl.trim();
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "notion.so" || host.endsWith(".notion.so") || host === "notion.site" || host.endsWith(".notion.site")) {
      return raw;
    }
  } catch {
    /* invalid URL */
  }
  return null;
}

export function notionEmbedIframeSrc(pageUrl: string): string | null {
  const yt = youtubeVideoId(pageUrl);
  if (yt) return `https://www.youtube.com/embed/${yt}`;
  const vm = vimeoVideoId(pageUrl);
  if (vm) return `https://player.vimeo.com/video/${vm}`;
  const figma = figmaEmbedSrc(pageUrl);
  if (figma) return figma;
  return notionPageEmbedSrc(pageUrl);
}

/** Para layout e atributos do iframe (proporção igual ao Notion ≈ área de desenho). */
export function notionEmbedIframeIsFigma(iframeSrc: string): boolean {
  return iframeSrc.includes("figma.com");
}

/**
 * YouTube / Vimeo em iframe de leitor — convém manter 16:9 (`aspect-video`).
 * Notion, páginas web genéricas e outras UIs precisam de mais altura no mobile.
 */
export function notionEmbedIframeUsesAspectVideo(iframeSrc: string): boolean {
  if (notionEmbedIframeIsFigma(iframeSrc)) return false;
  try {
    const u = new URL(iframeSrc);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
      return u.pathname.startsWith("/embed/");
    }
    if (host === "player.vimeo.com" && u.pathname.includes("/video/")) return true;
  } catch {
    /* invalid */
  }
  return false;
}

export function isProbablyDirectVideoFile(url: string): boolean {
  return /\.(mp4|webm|ogg)(\?|#|$)/i.test(url.trim());
}

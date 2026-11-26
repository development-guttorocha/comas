import type { ReelDoc, ReelScene } from "@/lib/reel/types";
import type { CompiledSlide, StudioBlockJson } from "./studioTypes";

/** Extract plain text (preserving *bold* markers if desired) from BlockNote inline content. */
function inlineToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map(item => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return "";
      const node = item as { type?: string; text?: string; styles?: Record<string, unknown>; content?: unknown };
      if (node.type === "link" && Array.isArray(node.content)) {
        return inlineToText(node.content);
      }
      const txt = typeof node.text === "string" ? node.text : "";
      if (!txt) return "";
      if (node.styles?.bold) return `*${txt}*`;
      return txt;
    })
    .join("")
    .trim();
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : fallback;
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseList(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(x => String(x)).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(x => String(x)).filter(Boolean);
    } catch {
      return raw
        .split("\n")
        .map(s => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

/**
 * Compiles a BlockNote document (mix of rich social blocks + free-form Notion text)
 * into an ordered array of slides ready for 4:5 Carousel or 9:16 Stories rendering.
 */
export function compileDocToSlides(blocks: StudioBlockJson[]): CompiledSlide[] {
  const slides: CompiledSlide[] = [];
  let freeBuffer: {
    id: string;
    heading?: string;
    paragraphs: Array<{ text: string; kind: "p" | "bullet" | "numbered" | "quote" }>;
  } | null = null;

  const flushFree = () => {
    if (!freeBuffer) return;
    if (freeBuffer.heading || freeBuffer.paragraphs.length > 0) {
      slides.push({
        id: freeBuffer.id,
        kind: "free",
        heading: freeBuffer.heading,
        paragraphs: freeBuffer.paragraphs,
      });
    }
    freeBuffer = null;
  };

  blocks.forEach((block, idx) => {
    const id = block.id || `b_${idx}`;
    const props = block.props ?? {};

    switch (block.type) {
      case "slideBreak":
        flushFree();
        return;

      case "socialCover":
        flushFree();
        slides.push({
          id,
          kind: "cover",
          eyebrow: str(props.eyebrow),
          title: str(props.title, "Título da capa"),
          subtitle: str(props.subtitle),
          cta: str(props.cta),
          imageUrl: str(props.imageUrl) || undefined,
          imageOverlay: num(props.imageOverlay, 0.78),
        });
        return;

      case "socialBeforeAfter":
        flushFree();
        slides.push({
          id,
          kind: "before_after",
          eyebrow: str(props.eyebrow, "ANTES × DEPOIS"),
          title: str(props.title, "Compare as duas versões"),
          wrongLabel: str(props.wrongLabel, "Antes"),
          wrongText: str(props.wrongText),
          rightLabel: str(props.rightLabel, "Depois"),
          rightText: str(props.rightText),
          note: str(props.note) || undefined,
        });
        return;

      case "socialStep":
        flushFree();
        slides.push({
          id,
          kind: "step",
          stepNumber: str(props.stepNumber, "01"),
          eyebrow: str(props.eyebrow),
          title: str(props.title, "Passo"),
          body: str(props.body),
          tip: str(props.tip) || undefined,
        });
        return;

      case "socialChecklist":
        flushFree();
        slides.push({
          id,
          kind: "checklist",
          eyebrow: str(props.eyebrow, "CHECKLIST"),
          title: str(props.title, "Pontos para revisar"),
          items: parseList(props.itemsJson),
          footerNote: str(props.footerNote) || undefined,
        });
        return;

      case "socialQuote":
        flushFree();
        slides.push({
          id,
          kind: "quote",
          eyebrow: str(props.eyebrow, "NOTA"),
          quote: str(props.quote),
          author: str(props.author) || undefined,
        });
        return;

      case "socialImage":
        flushFree();
        slides.push({
          id,
          kind: "image",
          eyebrow: str(props.eyebrow) || undefined,
          title: str(props.title) || undefined,
          caption: str(props.caption) || undefined,
          imageUrl: str(props.imageUrl) || undefined,
          imageOverlay: num(props.imageOverlay, 0.45),
        });
        return;

      case "socialCta":
        flushFree();
        slides.push({
          id,
          kind: "cta",
          eyebrow: str(props.eyebrow, "TEXTO EM CICLO"),
          title: str(props.title, "Salve para consultar depois"),
          body: str(props.body) || undefined,
          buttonLabel: str(props.buttonLabel) || undefined,
        });
        return;

      case "heading": {
        const text = inlineToText(block.content);
        if (!text) return;
        // A new H1/H2 starts a fresh free-form slide when current buffer already has content
        if (freeBuffer && (freeBuffer.heading || freeBuffer.paragraphs.length > 0)) {
          flushFree();
        }
        freeBuffer = { id, heading: text, paragraphs: [] };
        return;
      }

      case "bulletListItem":
      case "numberedListItem":
      case "quote":
      case "paragraph": {
        const text = inlineToText(block.content);
        if (!text) return;
        if (!freeBuffer) {
          freeBuffer = { id, paragraphs: [] };
        }
        const kind =
          block.type === "bulletListItem"
            ? "bullet"
            : block.type === "numberedListItem"
              ? "numbered"
              : block.type === "quote"
                ? "quote"
                : "p";
        freeBuffer.paragraphs.push({ text, kind });
        return;
      }

      default:
        return;
    }
  });

  flushFree();
  return slides;
}

/**
 * Converts a compiled Studio document into a beat-synced ReelDoc
 * so the exact same content can immediately open in ReelStudio.
 */
export function compileSlidesToReel(
  slides: CompiledSlide[],
  options: { title: string; accent: string; handle: string; trackId?: string },
): ReelDoc {
  const scenes: ReelScene[] = [];
  let beat = 0;

  slides.forEach((sl, idx) => {
    const enter = idx === 0 ? "cut" : "fade";
    switch (sl.kind) {
      case "cover":
        scenes.push({
          id: `title-${idx + 1}`,
          kind: "title",
          at: beat,
          enter,
          eyebrow: sl.eyebrow || "TEXTO EM CICLO",
          lines: [sl.title, ...(sl.subtitle ? [sl.subtitle] : [])].slice(0, 2),
          ...(sl.imageUrl ? { image: sl.imageUrl } : {}),
        });
        beat += 12;
        break;

      case "step":
        scenes.push({
          id: `step-${idx + 1}`,
          kind: "title",
          at: beat,
          enter,
          eyebrow: sl.eyebrow || `PASSO ${sl.stepNumber}`,
          lines: [`*${sl.stepNumber}* ${sl.title}`, sl.body.slice(0, 80)],
        });
        beat += 12;
        break;

      case "before_after":
        scenes.push({
          id: `ba-${idx + 1}`,
          kind: "list",
          at: beat,
          enter,
          eyebrow: sl.eyebrow || "ANTES × DEPOIS",
          heading: sl.title,
          items: [`✕ ${sl.wrongText}`, `✓ ${sl.rightText}`],
        });
        beat += 16;
        break;

      case "checklist":
        scenes.push({
          id: `list-${idx + 1}`,
          kind: "list",
          at: beat,
          enter,
          eyebrow: sl.eyebrow || "CHECKLIST",
          heading: sl.title,
          items: sl.items.slice(0, 4),
        });
        beat += 16;
        break;

      case "quote":
        scenes.push({
          id: `quote-${idx + 1}`,
          kind: "quote",
          at: beat,
          enter,
          quote: sl.quote,
          author: sl.author || options.handle,
        });
        beat += 12;
        break;

      case "image":
        if (sl.imageUrl) {
          scenes.push({
            id: `img-${idx + 1}`,
            kind: "image",
            at: beat,
            enter,
            src: sl.imageUrl,
            ...(sl.title ? { lines: [sl.title] } : {}),
            ...(sl.caption ? { body: sl.caption } : {}),
          });
          beat += 12;
        }
        break;

      case "cta":
        scenes.push({
          id: `end-${idx + 1}`,
          kind: "end",
          at: beat,
          enter,
          lines: [sl.title],
          signature: options.handle,
        });
        beat += 12;
        break;

      case "free":
        scenes.push({
          id: `free-${idx + 1}`,
          kind: "list",
          at: beat,
          enter,
          heading: sl.heading || options.title,
          items: sl.paragraphs.map(p => p.text).slice(0, 4),
        });
        beat += 14;
        break;
    }
  });

  if (scenes.length === 0) {
    scenes.push({
      id: "title-1",
      kind: "title",
      at: 0,
      lines: [options.title],
    });
    beat = 16;
  }

  return {
    track: options.trackId || "chillax-jay-someday",
    end: Math.max(32, beat),
    fadeOut: [Math.max(24, beat - 8), Math.max(32, beat)],
    accent: options.accent,
    title: options.title,
    motion: "premium",
    scenes,
  };
}

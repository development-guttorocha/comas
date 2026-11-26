import fs from "node:fs";
import path from "node:path";
import type { TemplatePreset } from "./types";

export const SOCIAL_KB_FILE = path.join(process.cwd(), "content", "social", "textoemciclo-kb.md");
export const SOCIAL_CORPUS_FILE = path.join(process.cwd(), "content", "social", "instagram-corpus.json");

export type CorpusSlide = {
  slide: number;
  eyebrow?: string;
  title: string;
  body?: string;
  wrongText?: string;
  rightText?: string;
  highlights?: string[];
};

export type CorpusPublication = {
  index: number;
  shortcode: string;
  url: string;
  slideCount: number;
  dimensions: string;
  category: string;
  preset: TemplatePreset;
  exams: string[];
  palette: string[];
  slides: CorpusSlide[];
};

export type InstagramCorpus = {
  profile: {
    handle: string;
    name: string;
    url: string;
    bioCredentials: string[];
    targetExams: string[];
    manifesto: {
      corePrinciple: string;
      hater: string[];
      fan: string[];
    };
    totalImagesAnalyzed: number;
    totalPublications: number;
  };
  publications: CorpusPublication[];
};

export type SocialKnowledgeBase = {
  compact: string;
  examplesByPreset: Record<TemplatePreset, string[]>;
};

const ALL_PRESETS: TemplatePreset[] = [
  "repertorio_banca",
  "cycle_steps",
  "before_after",
  "radar_temas",
  "quick_tip",
];

function extractMarkerSection(markdown: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`<!-- kb:${escaped} -->([\\s\\S]*?)<!-- \\/kb:${escaped} -->`));
  if (!match) {
    throw new Error(`content/social/textoemciclo-kb.md: falta a seção <!-- kb:${name} -->.`);
  }
  return match[1]!.trim();
}

function parseBulletLines(block: string): string[] {
  return block
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.startsWith("- "))
    .map(line => line.slice(2).trim());
}

export function parseSocialKnowledgeBase(markdown: string): SocialKnowledgeBase {
  const examplesByPreset = {} as Record<TemplatePreset, string[]>;
  for (const preset of ALL_PRESETS) {
    examplesByPreset[preset] = parseBulletLines(extractMarkerSection(markdown, `examples:${preset}`));
  }
  return {
    compact: extractMarkerSection(markdown, "compact"),
    examplesByPreset,
  };
}

let cachedKb: { mtimeMs: number; kb: SocialKnowledgeBase } | undefined;
let cachedCorpus: { mtimeMs: number; corpus: InstagramCorpus } | undefined;

export function getSocialKnowledgeBase(): SocialKnowledgeBase {
  const { mtimeMs } = fs.statSync(SOCIAL_KB_FILE);
  if (!cachedKb || cachedKb.mtimeMs !== mtimeMs) {
    cachedKb = {
      mtimeMs,
      kb: parseSocialKnowledgeBase(fs.readFileSync(SOCIAL_KB_FILE, "utf8")),
    };
  }
  return cachedKb.kb;
}

export function getInstagramCorpus(): InstagramCorpus {
  const { mtimeMs } = fs.statSync(SOCIAL_CORPUS_FILE);
  if (!cachedCorpus || cachedCorpus.mtimeMs !== mtimeMs) {
    cachedCorpus = {
      mtimeMs,
      corpus: JSON.parse(fs.readFileSync(SOCIAL_CORPUS_FILE, "utf8")) as InstagramCorpus,
    };
  }
  return cachedCorpus.corpus;
}

function formatCorpusSample(pub: CorpusPublication): string {
  const head = `[Post real #${pub.index} · ${pub.slideCount} slide(s) · Bancas: ${pub.exams.join(", ")}]`;
  const slideLines = pub.slides.slice(0, 6).map(s => {
    const parts = [
      `Slide ${s.slide}: "${s.title}"`,
      s.wrongText && s.rightText ? `(❌ ${s.wrongText} → ✔️ ${s.rightText})` : undefined,
      s.body ? `— ${s.body.slice(0, 180)}` : undefined,
      s.highlights?.length ? `[Destaque: ${s.highlights.join(" | ")}]` : undefined,
    ].filter(Boolean);
    return `  ${parts.join(" ")}`;
  });
  return `${head}\n${slideLines.join("\n")}`;
}

/**
 * Builds the editorial voice + real Instagram few-shot prompt block for a given preset.
 */
export function socialKnowledgePrompt(preset: TemplatePreset): string {
  const kb = getSocialKnowledgeBase();
  const corpus = getInstagramCorpus();
  const examples = kb.examplesByPreset[preset] ?? [];
  const matchingPubs = corpus.publications.filter(p => p.preset === preset).slice(0, 2);

  const sections = [kb.compact];

  if (examples.length) {
    sections.push(
      `REFERÊNCIAS REAIS DO @textoemciclo NESTE FORMATO (imite o ritmo, a didática e o tom, nunca copie o tema literal se a ideia pedir outro assunto):\n${examples
        .map(ex => `- ${ex}`)
        .join("\n")}`,
    );
  }

  if (matchingPubs.length) {
    sections.push(
      `ESTRUTURA REAL DE SLIDES PUBLICADOS NO @textoemciclo:\n${matchingPubs.map(formatCorpusSample).join("\n\n")}`,
    );
  }

  return sections.join("\n\n");
}

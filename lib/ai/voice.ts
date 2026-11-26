import fs from "node:fs";
import path from "node:path";

/**
 * Gutto's voice, shared by every AI that writes as him (case drafts, reel scripts, translation).
 * The text lives in content/voice.md so he can read and edit it; this module only hands prompts
 * the parts between `<!-- voice:… -->` markers. Nothing calls it yet.
 */
export const VOICE_FILE = path.join(process.cwd(), "content", "voice.md");

export type VoiceRegister = "personal" | "project";

export type Voice = {
  /** About 250 words to paste into any prompt. */
  compact: string;
  /** Literal excerpts from the site, one list per register. */
  examples: Record<VoiceRegister, string[]>;
};

function section(markdown: string, name: string): string {
  const match = markdown.match(new RegExp(`<!-- voice:${name} -->([\\s\\S]*?)<!-- /voice:${name} -->`));
  if (!match) throw new Error(`content/voice.md: falta a seção <!-- voice:${name} -->.`);
  return match[1].trim();
}

/** Bullets of `- "…"` become plain quotes, without the list mark and the outer quotation marks. */
function quotes(block: string): string[] {
  return block.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim().replace(/^"([\s\S]*)"$/, "$1"));
}

export function parseVoice(markdown: string): Voice {
  return {
    compact: section(markdown, "compact"),
    examples: {
      personal: quotes(section(markdown, "examples:personal")),
      project: quotes(section(markdown, "examples:project")),
    },
  };
}

let cached: { mtimeMs: number; voice: Voice } | undefined;

/** Reads content/voice.md again whenever it changes, so edits reach the next generation. */
export function getVoice(): Voice {
  const { mtimeMs } = fs.statSync(VOICE_FILE);
  if (!cached || cached.mtimeMs !== mtimeMs) cached = { mtimeMs, voice: parseVoice(fs.readFileSync(VOICE_FILE, "utf8")) };
  return cached.voice;
}

/** The block a prompt includes: the compact guide plus the examples of one register. */
export function voicePrompt(register: VoiceRegister): string {
  const voice = getVoice();
  const label = register === "personal" ? "registro pessoal" : "registro de projeto";
  return `${voice.compact}\n\nExemplos reais do ${label} (imite o tom, nunca copie os fatos):\n${voice.examples[register].map((q) => `- "${q}"`).join("\n")}`;
}

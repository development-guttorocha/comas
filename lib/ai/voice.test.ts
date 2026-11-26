import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getVoice, voicePrompt } from "./voice";

/** Every Portuguese string the site publishes: Sobre plus the case files, with the JSON inside case blocks opened. */
function siteText(): string {
  const out: string[] = [];
  const walk = (value: unknown): void => {
    if (typeof value === "string") {
      out.push(value);
      const inner = value.match(/^\[case:\w+\]\s*(\{[\s\S]*\})\s*$/);
      if (inner) { try { walk(JSON.parse(inner[1])); } catch { /* not JSON: the raw string is already kept */ } }
    } else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "pages", "sobre.json"), "utf8")));
  const cases = path.join(process.cwd(), "content", "cases");
  for (const slug of fs.readdirSync(cases)) {
    // loft-design waits for its tone to be redone, so it is not a voice reference yet.
    if (slug === "modelo" || slug === "loft-design") continue;
    for (const file of ["case.json", "body.json"]) {
      const full = path.join(cases, slug, file);
      if (fs.existsSync(full)) walk(JSON.parse(fs.readFileSync(full, "utf8")));
    }
  }
  return out.join("\n");
}

test("the guide has a short compact version and 3 to 5 examples per register", () => {
  const voice = getVoice();
  const words = voice.compact.split(/\s+/).filter(Boolean).length;
  assert.ok(words <= 270, `versão compacta com ${words} palavras`);
  for (const register of ["personal", "project"] as const) {
    const n = voice.examples[register].length;
    assert.ok(n >= 3 && n <= 5, `${register}: ${n} exemplos`);
  }
});

test("every example is copied literally from the site", () => {
  const text = siteText();
  const voice = getVoice();
  for (const quote of [...voice.examples.personal, ...voice.examples.project]) {
    assert.ok(text.includes(quote), `não está no site: ${quote}`);
  }
});

test("the prompt block carries the compact guide and the register's examples", () => {
  const block = voicePrompt("project");
  assert.ok(block.startsWith(getVoice().compact));
  assert.ok(block.includes(getVoice().examples.project[0]));
});

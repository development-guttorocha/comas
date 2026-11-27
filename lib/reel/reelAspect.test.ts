import assert from "node:assert/strict";
import test from "node:test";
import { STAGE_SIZE } from "@/components/reel/motion";
import { parseReel } from "@/lib/reel/types";
import { compileSlidesToReel } from "@/lib/social/compileDoc";

test("STAGE_SIZE defines 1080x1920 for 9:16 and 1920x1080 for 16:9", () => {
  assert.deepEqual(STAGE_SIZE["9:16"], { w: 1080, h: 1920 });
  assert.deepEqual(STAGE_SIZE["16:9"], { w: 1920, h: 1080 });
});

test("parseReel preserves valid aspect values and ignores unknown ratios", () => {
  const base = {
    track: "bull",
    accent: "#3E2A8D",
    title: "Reel de teste",
    end: 16,
    scenes: [{ id: "s1", kind: "title", at: 0, lines: ["Olá"] }],
  };

  assert.equal(parseReel({ ...base, aspect: "9:16" })?.aspect, "9:16");
  assert.equal(parseReel({ ...base, aspect: "16:9" })?.aspect, "16:9");
  assert.equal(parseReel({ ...base, aspect: "4:5" })?.aspect, undefined);
});

test("compileSlidesToReel outputs a 9:16 vertical reel by default", () => {
  const reel = compileSlidesToReel(
    [
      { id: "sl-1", kind: "cover", title: "Como começar", subtitle: "Um passo simples" },
      { id: "sl-2", kind: "cta", title: "Salve para revisar" },
    ],
    { title: "Dica de redação", accent: "#3E2A8D", handle: "@textoemciclo" },
  );

  assert.equal(reel.aspect, "9:16");
  assert.ok(reel.scenes.length >= 2);
});

import assert from "node:assert/strict";
import test from "node:test";
import { presetInstruction } from "./ai";
import { getInstagramCorpus, getSocialKnowledgeBase, socialKnowledgePrompt } from "./knowledgeBase";
import { SOCIAL_PALETTE_PRESETS, STARTER_POSTS } from "./presets";
import { isValidTemplatePreset, SLIDE_LIMITS, TEMPLATE_PRESET_OPTIONS } from "./types";

test("textoemciclo knowledge base loads compact voice and examples for every preset", () => {
  const kb = getSocialKnowledgeBase();
  assert.ok(kb.compact.includes("Renata Romero"));
  assert.ok(kb.compact.includes("ESCRITA É PROCESSO!"));
  assert.ok(kb.compact.includes("VUNESP"));

  for (const opt of TEMPLATE_PRESET_OPTIONS) {
    assert.equal(isValidTemplatePreset(opt.value), true);
    const examples = kb.examplesByPreset[opt.value];
    assert.ok(Array.isArray(examples) && examples.length >= 1, `missing examples for ${opt.value}`);
  }
});

test("instagram corpus tracks all 22 publications and 100 analyzed slides", () => {
  const corpus = getInstagramCorpus();
  assert.equal(corpus.profile.handle, "@textoemciclo");
  assert.equal(corpus.publications.length, 22);

  const slideSum = corpus.publications.reduce((acc, pub) => acc + pub.slideCount, 0);
  assert.equal(slideSum, 100);
  assert.equal(corpus.profile.totalImagesAnalyzed, 100);

  for (const pub of corpus.publications) {
    assert.equal(pub.slides.length, pub.slideCount, `slide count mismatch in ${pub.shortcode}`);
    assert.ok(pub.url.startsWith("https://www.instagram.com/p/"));
  }
});

test("socialKnowledgePrompt and presetInstruction cover all 5 @textoemciclo editorial formats", () => {
  for (const opt of TEMPLATE_PRESET_OPTIONS) {
    const prompt = socialKnowledgePrompt(opt.value);
    assert.ok(prompt.includes("ESCRITA É PROCESSO!"));
    assert.ok(prompt.includes("REFERÊNCIAS REAIS DO @textoemciclo"));
    assert.ok(prompt.includes("ESTRUTURA REAL DE SLIDES PUBLICADOS"));

    const instruction = presetInstruction(opt.value, 6);
    assert.ok(instruction.length > 80);
  }
});

test("starter posts and real Instagram palette presets fit 1080x1350 slide limits", () => {
  assert.ok(SOCIAL_PALETTE_PRESETS.length >= 5);
  assert.ok(STARTER_POSTS.length >= 3);

  for (const post of STARTER_POSTS) {
    for (const slide of post.slides) {
      if (slide.eyebrow) {
        assert.ok(slide.eyebrow.length <= SLIDE_LIMITS.eyebrow, `eyebrow too long: ${slide.eyebrow}`);
      }
      if (slide.highlight) {
        assert.ok(slide.highlight.length <= SLIDE_LIMITS.highlight, `highlight too long: ${slide.highlight}`);
      }
      if (slide.kind === "cover") {
        assert.ok(slide.title.length <= SLIDE_LIMITS.coverTitle, `cover title too long: ${slide.title}`);
      } else if (slide.kind === "comparison") {
        assert.ok(slide.title.length <= SLIDE_LIMITS.comparisonTitle, `comparison title too long: ${slide.title}`);
        assert.ok((slide.wrongText ?? "").length <= SLIDE_LIMITS.wrongText);
        assert.ok((slide.rightText ?? "").length <= SLIDE_LIMITS.rightText);
      }
    }
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  applyLayout,
  blocksFromCanvas,
  buildSlide,
  CANVAS_MARGIN,
  CANVAS_PALETTES,
  CANVAS_SIZE,
  canvasFromCompiled,
  clampToMargin,
  ELEMENT_PRESETS,
  LAYOUTS,
  paletteById,
  parseMarks,
  reflowCanvas,
  remixLayoutId,
  resolveColor,
  slidesFromCompiled,
  syncContent,
} from "./canvas";
import { compileDocToSlides } from "./compileDoc";
import { STARTER_STUDIO_DOC, type StudioBlockJson } from "./studioTypes";

test("slidesFromCompiled assigns varied compositions with no two consecutive identical layouts", () => {
  const compiled = compileDocToSlides(STARTER_STUDIO_DOC.blocks);
  assert.ok(compiled.length >= 5);

  const slides = slidesFromCompiled(compiled, "carousel");
  assert.equal(slides.length, compiled.length);

  for (let i = 1; i < slides.length; i++) {
    assert.notEqual(
      slides[i]!.layoutId,
      slides[i - 1]!.layoutId,
      `slides ${i - 1} and ${i} should not repeat layout ${slides[i]!.layoutId}`,
    );
  }
});

test("applyLayout swaps composition without losing inline edited text or free elements", () => {
  let slide = buildSlide(
    {
      kind: "before_after",
      eyebrow: "[regência verbal]",
      title: "CORROBORAR",
      wrong: "As ONGs corroboram com o governo.",
      right: "Os dados corroboram a tese.",
      note: "Anota no post-it!",
    },
    "verbete",
    "carousel",
  );

  // Simulate inline edit directly on the canvas title element + adding a free post-it element
  const freeSticker = ELEMENT_PRESETS.find(p => p.id === "post-it")!.make("carousel");
  slide = {
    ...slide,
    elements: [
      ...slide.elements.map(el => (el.role === "title" && el.type === "text" ? { ...el, text: "CORROBORAR ==AGORA==" } : el)),
      { ...freeSticker, x: 520, y: 780, rotation: -6 },
    ],
  };

  const swapped = applyLayout(slide, "antes-depois", "carousel");
  assert.equal(swapped.layoutId, "antes-depois");
  assert.equal(swapped.content.title, "CORROBORAR ==AGORA==");
  assert.equal(swapped.content.wrong, "As ONGs corroboram com o governo.");
  assert.equal(swapped.content.right, "Os dados corroboram a tese.");

  const keptFree = swapped.elements.filter(e => e.role === "free");
  assert.equal(keptFree.length, 1);
  assert.equal(keptFree[0]!.x, 520);
  assert.equal(keptFree[0]!.y, 780);
  assert.equal(keptFree[0]!.rotation, -6);
});

test("every registered layout builds valid elements for both carousel (4:5) and story (9:16)", () => {
  assert.ok(LAYOUTS.length >= 12);
  for (const layout of LAYOUTS) {
    for (const aspect of ["carousel", "story"] as const) {
      const slide = buildSlide(
        {
          kind: layout.kinds[0] ?? "free",
          eyebrow: "TEXTO EM CICLO",
          title: "O homem ==cordial== na UERJ",
          subtitle: "Cuidado! Não é ser bonzinho.",
          body: "Agir pelo afeto rejeita a impessoalidade das leis.",
          wrong: "Corroboram com o Estado",
          right: "Corroboram a tese",
          items: "Dominar eixos\nLer a coletânea\nFazer projeto de texto",
          quote: "Escrita é processo!",
          author: "Renata · @textoemciclo",
          cta: "Vamos juntos? :)",
        },
        layout.id,
        aspect,
      );
      assert.ok(slide.elements.length >= 2, `${layout.id} (${aspect}) should produce elements`);
      const synced = syncContent(slide);
      assert.ok(synced.content.kind);
    }
  }
});

test("clampToMargin enforces breathing margin across all edges and oversized elements", () => {
  const { width, height } = CANVAS_SIZE.carousel;
  const topLeft = clampToMargin({ x: -120, y: 10, w: 300, h: 200 }, "carousel");
  assert.equal(topLeft.x, CANVAS_MARGIN);
  assert.equal(topLeft.y, CANVAS_MARGIN);

  const bottomRight = clampToMargin({ x: 9999, y: 9999, w: 300, h: 200 }, "carousel");
  assert.equal(bottomRight.x, width - CANVAS_MARGIN - 300);
  assert.equal(bottomRight.y, height - CANVAS_MARGIN - 200);

  const oversized = clampToMargin({ x: 0, y: 0, w: 5000, h: 5000 }, "carousel");
  assert.equal(oversized.w, width - CANVAS_MARGIN * 2);
  assert.equal(oversized.h, height - CANVAS_MARGIN * 2);
  assert.equal(oversized.x, CANVAS_MARGIN);
  assert.equal(oversized.y, CANVAS_MARGIN);
});

test("reflowCanvas adapts 4:5 carousel slides to 9:16 story slides preserving free elements", () => {
  const compiled = compileDocToSlides(STARTER_STUDIO_DOC.blocks);
  const canvas = canvasFromCompiled(compiled, "carousel", "bordo_reta_final");
  const freeArrow = ELEMENT_PRESETS.find(p => p.id === "seta")!.make("carousel");
  canvas.slides[0]!.elements.push({ ...freeArrow, y: 600 });

  const storyCanvas = reflowCanvas(canvas, "carousel", "story");
  assert.equal(storyCanvas.paletteId, "bordo_reta_final");
  assert.equal(storyCanvas.slides.length, canvas.slides.length);
  const storyFree = storyCanvas.slides[0]!.elements.find(e => e.role === "free");
  assert.ok(storyFree);
  assert.ok(storyFree.y > 600);
});

test("blocksFromCanvas and compileDocToSlides round-trip including admin image and caseComponent blocks", () => {
  const mixedBlocks: StudioBlockJson[] = [
    { type: "socialCover", props: { eyebrow: "REPERTÓRIO", title: "O Bem-Amado", subtitle: "Sérgio Buarque", cta: "deslize →" } },
    { type: "image", props: { url: "/social-media/exemplo.webp", caption: "Página anotada da redação" } },
    {
      type: "caseComponent",
      props: {
        name: "CaseBeforeAfter",
        data: JSON.stringify({
          sectionLabel: "NA FOLHA",
          heading: "Regência de implicar",
          before: { label: "Desvio", body: "Isso implica em atraso." },
          after: { label: "Adequado", body: "Isso implica atraso." },
        }),
      },
    },
    {
      type: "caseComponent",
      props: {
        name: "CaseBigNumber",
        data: JSON.stringify({ value: "95%", heading: "Cobertura vacinal", caption: "Meta da OMS citada na VUNESP" }),
      },
    },
    { type: "divider", props: {} },
    { type: "heading", props: { level: 2 }, content: [{ type: "text", text: "Leitura de coletânea", styles: {} }] },
    { type: "paragraph", content: [{ type: "text", text: "Sublinhe os comandos antes do rascunho.", styles: {} }] },
  ];

  const compiled = compileDocToSlides(mixedBlocks);
  assert.equal(compiled.length, 5);
  assert.equal(compiled[1]!.kind, "image");
  assert.equal(compiled[2]!.kind, "before_after");
  assert.equal(compiled[3]!.kind, "step");
  assert.equal(compiled[4]!.kind, "free");

  const canvas = canvasFromCompiled(compiled, "carousel", "terracota_historia");
  const roundTrippedBlocks = blocksFromCanvas(canvas);
  const recompiled = compileDocToSlides(roundTrippedBlocks);
  assert.equal(recompiled.length, 5);
});

test("parseMarks and resolveColor handle highlights and all @textoemciclo palettes", () => {
  const runs = parseMarks("Agir apenas com o ==coração== não é ser *bonzinho*.");
  assert.equal(runs.some(r => r.mark && r.text === "coração"), true);
  assert.equal(runs.some(r => r.bold && r.text === "bonzinho"), true);

  for (const preset of CANVAS_PALETTES) {
    const pal = paletteById(preset.id);
    const bg = resolveColor("background", pal);
    const contrast = resolveColor("contrast", pal, bg);
    assert.match(contrast, /^#[0-9A-Fa-f]{6}$/);
    assert.notEqual(contrast.toLowerCase(), bg.toLowerCase());
  }

  const slide = buildSlide({ kind: "cover", title: "Teste" }, "manchete", "carousel");
  const remixed = remixLayoutId(slide);
  assert.notEqual(remixed, "manchete");
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  applyFamilyToCanvas,
  applyLayout,
  blocksFromCanvas,
  buildSlide,
  CANVAS_MARGIN,
  CANVAS_PALETTES,
  CANVAS_SIZE,
  canvasFromCompiled,
  clampToMargin,
  contrastRatio,
  ELEMENT_PRESETS,
  layoutById,
  LAYOUTS,
  paletteById,
  parseMarks,
  reflowCanvas,
  remixLayoutId,
  resolveColor,
  slidesFromCompiled,
  STYLE_FAMILIES,
  syncContent,
  type StyleFamily,
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

test("LAYOUTS covers all 3 graphic style families (editorial, minimal, pop) with at least 5 layouts each", () => {
  const families: StyleFamily[] = ["editorial", "minimal", "pop"];
  assert.ok(LAYOUTS.length >= 15);
  assert.deepEqual(
    STYLE_FAMILIES.map(f => f.id),
    families,
  );
  for (const fam of families) {
    const inFamily = LAYOUTS.filter(l => l.family === fam);
    assert.ok(inFamily.length >= 5, `expected >= 5 layouts in family "${fam}", got ${inFamily.length}`);
  }
});

test("every non-decorative text element across all 15 layouts and 5 palettes meets WCAG AA contrast (>= 4.5:1)", () => {
  for (const layout of LAYOUTS) {
    const slide = buildSlide(
      {
        kind: layout.kinds[0] ?? "free",
        eyebrow: "REPERTÓRIO · VUNESP",
        step: "01",
        title: "Infodemia e hesitação vacinal na redação",
        subtitle: "Como articular dados da OMS sem cair no senso comum.",
        body: "Nomear o fenômeno e apontar sua consequência coletiva sustenta o argumento.",
        wrongLabel: "Antes",
        wrong: "As pessoas não tomam vacina porque veem fake news.",
        rightLabel: "Depois",
        right: "A infodemia compromete a barreira sanitária coletiva.",
        note: "Dica da Prô: cite o conceito com função argumentativa!",
        items: "Ler toda a coletânea\nDefinir causa e consequência\nRevisar regência verbal",
        quote: "Escrita é processo, não modelo engessado.",
        author: "Renata · @textoemciclo",
        cta: "Salve para revisar :)",
        image: "/social-media/exemplo.webp",
      },
      layout.id,
      "carousel",
    );

    for (const preset of CANVAS_PALETTES) {
      const pal = paletteById(preset.id);
      const slideBg = resolveColor(slide.background, pal);

      slide.elements.forEach((el, idx) => {
        if (el.type !== "text" || el.role === "decor") return;
        const cx = el.x + el.w / 2;
        const cy = el.y + el.h / 2;

        let parentBg = slideBg;
        for (let k = 0; k < idx; k++) {
          const under = slide.elements[k]!;
          const encloses = cx >= under.x && cx <= under.x + under.w && cy >= under.y && cy <= under.y + under.h;
          if (!encloses) continue;
          if (under.type === "shape" && (under.shape === "rect" || under.shape === "circle") && (under.opacity ?? 1) >= 0.85) {
            const shapeHex = resolveColor(under.fill, pal, parentBg);
            if (shapeHex !== "transparent") parentBg = shapeHex;
          } else if (under.type === "image" && under.src && (under.overlay ?? 0) >= 0.25) {
            parentBg = "#16121F";
          }
        }

        const fillHex = el.fill ? resolveColor(el.fill, pal, parentBg) : "transparent";
        const effectiveBg = fillHex !== "transparent" ? fillHex : parentBg;
        const textHex = resolveColor(el.color, pal, effectiveBg);
        const ratio = contrastRatio(textHex, effectiveBg);

        assert.ok(
          ratio >= 4.5,
          `WCAG fail (${ratio.toFixed(2)}:1) in layout "${layout.id}" palette "${preset.id}" role "${el.role}" (${textHex} on ${effectiveBg})`,
        );
      });
    }
  }
});

test("optical vertical flow locks elements tightly on short titles and expands cleanly on long titles", () => {
  const shortSlide = buildSlide(
    { kind: "cover", eyebrow: "ENEM", title: "Escreva bem", subtitle: "Clareza constrói autoria." },
    "manchete",
    "carousel",
  );
  const longSlide = buildSlide(
    {
      kind: "cover",
      eyebrow: "ENEM",
      title: "Como articular repertório sociocultural na redação da Fuvest sem decorar fórmulas prontas",
      subtitle: "Clareza constrói autoria.",
    },
    "manchete",
    "carousel",
  );

  const shortTitle = shortSlide.elements.find(e => e.role === "title")!;
  const shortSub = shortSlide.elements.find(e => e.role === "subtitle")!;
  const longTitle = longSlide.elements.find(e => e.role === "title")!;
  const longSub = longSlide.elements.find(e => e.role === "subtitle")!;

  assert.ok(shortSub.y - (shortTitle.y + shortTitle.h) <= 96, "short title should not leave a huge void above subtitle");
  assert.ok(longTitle.h > shortTitle.h, "long title box should expand vertically compared to short title");
  assert.ok(longTitle.y + longTitle.h <= longSub.y + 8, "long title must not overlap subtitle");
});

test("short capsule pills and manifesto tarjas enable hug-to-text sizing", () => {
  const cover = buildSlide({ kind: "cover", eyebrow: "ENEM", title: "Tema da semana" }, "manchete", "carousel");
  const eyebrow = cover.elements.find(e => e.role === "eyebrow" && e.type === "text");
  assert.equal(eyebrow?.type === "text" && eyebrow.hug, true);

  const compare = buildSlide(
    { kind: "before_after", title: "Regência", wrongLabel: "Antes", wrong: "A", rightLabel: "Depois", right: "B" },
    "antes-depois",
    "carousel",
  );
  const wrongLabel = compare.elements.find(e => e.role === "wrongLabel" && e.type === "text");
  const rightLabel = compare.elements.find(e => e.role === "rightLabel" && e.type === "text");
  assert.equal(wrongLabel?.type === "text" && wrongLabel.hug, true);
  assert.equal(rightLabel?.type === "text" && rightLabel.hug, true);

  const poster = buildSlide({ kind: "quote", quote: "Escrita é processo vivo" }, "manifesto", "carousel");
  const tarjas = poster.elements.filter(e => e.type === "text" && e.variant === "tarja");
  assert.ok(tarjas.length >= 2);
  for (const t of tarjas) {
    assert.equal(t.type === "text" && t.hug, true);
  }
});

test("slidesFromCompiled and remixLayoutId respect graphic style family filter without consecutive repeats", () => {
  const compiled = compileDocToSlides(STARTER_STUDIO_DOC.blocks);
  for (const family of ["editorial", "minimal", "pop"] as const) {
    const slides = slidesFromCompiled(compiled, "carousel", 0, family);
    assert.equal(slides.length, compiled.length);
    for (let i = 0; i < slides.length; i++) {
      const def = layoutById(slides[i]!.layoutId);
      assert.equal(def.family, family, `slide ${i} layout "${def.id}" should belong to family "${family}"`);
      if (i > 0) {
        assert.notEqual(slides[i]!.layoutId, slides[i - 1]!.layoutId);
      }
    }
    const remixed = remixLayoutId(slides[0]!, Math.random, [], family);
    assert.notEqual(remixed, slides[0]!.layoutId);
    assert.equal(layoutById(remixed).family, family);
  }
});

test("applyFamilyToCanvas switches whole deck graphic family while preserving inline edits and free stickers", () => {
  const compiled = compileDocToSlides(STARTER_STUDIO_DOC.blocks);
  const initial = canvasFromCompiled(compiled, "carousel", "indigo_lavanda", 0, "editorial");
  const sticker = ELEMENT_PRESETS.find(p => p.id === "estrela")!.make("carousel");
  initial.slides[0]!.elements = [
    ...initial.slides[0]!.elements.map(el => (el.role === "title" && el.type === "text" ? { ...el, text: "Título editado pela Renata" } : el)),
    { ...sticker, x: 740, y: 180 },
  ];

  const popDeck = applyFamilyToCanvas(initial, "pop", "carousel", 2);
  assert.equal(popDeck.slides.length, initial.slides.length);
  for (let i = 0; i < popDeck.slides.length; i++) {
    assert.equal(layoutById(popDeck.slides[i]!.layoutId).family, "pop");
    if (i > 0) assert.notEqual(popDeck.slides[i]!.layoutId, popDeck.slides[i - 1]!.layoutId);
  }
  assert.equal(popDeck.slides[0]!.content.title, "Título editado pela Renata");
  assert.equal(popDeck.slides[0]!.elements.filter(e => e.role === "free").length, 1);
});

test("no layout overflows canvas bounds, card containers, or footer chrome even with long texts", () => {
  const longContent = {
    eyebrow: "REPERTÓRIO SOCIOCULTURAL · VUNESP & FUVEST 2026",
    step: "03",
    title: "Como articular infodemia, saúde pública e desinformação digital sem cair em clichês na redação",
    subtitle:
      "Veja na prática como transformar uma notícia da semana em argumento analítico consistente com repertório legitimado pela banca.",
    body:
      "Mais importante do que decorar frases prontas na véspera da prova é compreender a engrenagem do problema: identificar causas estruturais, agentes envolvidos e consequências concretas para a coletividade.",
    wrongLabel: "Senso comum vago",
    wrong:
      "“As pessoas hoje em dia não tomam mais vacina porque acreditam em absolutamente tudo o que veem circulando nas redes sociais.”",
    rightLabel: "Articulação na dissertação",
    right:
      "“Impulsionada pela infodemia descrita pela OMS, a hesitação vacinal enfraquece a barreira sanitária coletiva e amplia riscos evitáveis.”",
    note:
      "Comentário da Prô: nomear o fenômeno com precisão e apontar sua consequência pública eleva imediatamente a competência argumentativa!",
    items:
      "Retomar o recorte exato da frase temática já na introdução\nGarantir que cada parágrafo defenda uma ideia central clara\nRevisar regência verbal, concordância e uso da crase antes de passar a limpo",
    quote:
      "Palavra difícil mal encaixada tira nota na correção; clareza, leitura frequente e projeto de texto bem amarrado constroem autoria verdadeira.",
    author: "Renata Romero · @textoemciclo",
    cta: "Salve este carrossel para revisar :)",
    image: "/social-media/exemplo.webp",
  };

  for (const layout of LAYOUTS) {
    for (const aspect of ["carousel", "story"] as const) {
      const { width: W, height: H } = CANVAS_SIZE[aspect];
      const slide = buildSlide({ kind: layout.kinds[0] ?? "free", ...longContent }, layout.id, aspect);
      const chromeEls = slide.elements.filter(e => e.role === "chrome");
      const chromeTop = chromeEls.length ? Math.min(...chromeEls.map(e => e.y)) : H;

      for (const el of slide.elements) {
        if (el.role === "decor" || el.type === "image") continue;
        assert.ok(el.x >= 0 && el.x + el.w <= W, `${layout.id} (${aspect}) ${el.role} overflows horizontally`);
        assert.ok(el.y >= 0 && el.y + el.h <= H, `${layout.id} (${aspect}) ${el.role} overflows vertically`);
        if (el.role !== "chrome") {
          assert.ok(
            el.y + el.h <= chromeTop - 8,
            `${layout.id} (${aspect}) ${el.role} (bottom ${el.y + el.h}) overlaps chrome (top ${chromeTop})`,
          );
        }
      }

      if (layout.id === "verbete" || layout.id === "neobrutal") {
        const card = slide.elements.find(e => e.type === "shape" && e.shape === "rect" && e.role === "decor");
        assert.ok(card, `${layout.id} should have a main card shape`);
        for (const el of slide.elements) {
          if (el.type !== "text" || el.role === "chrome" || el.role === "decor") continue;
          assert.ok(
            el.y >= card.y + 12 && el.y + el.h <= card.y + card.h - 12,
            `${layout.id} (${aspect}) ${el.role} (${el.y}..${el.y + el.h}) spills outside card (${card.y}..${card.y + card.h})`,
          );
        }
      }
    }
  }
});

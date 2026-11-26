import { hydrateRuntimeKeys } from "@/lib/admin/apiKeys";
import { getSocialKnowledgeBase, socialKnowledgePrompt } from "./knowledgeBase";
import { makeSlideId, SLIDE_LIMITS, type SlideKind, type SocialPost, type SocialSlide, type TemplatePreset } from "./types";

function buildSystemPrompt(preset: TemplatePreset): string {
  const kbBlock = socialKnowledgePrompt(preset);

  return `Você é a assistente editorial da professora Renata Romero, criadora do perfil @textoemciclo ("Texto em Ciclo").

${kbBlock}

Seu trabalho agora é transformar uma ideia bruta, notícia, obra literária/cultural, dúvida de aluno ou transcrição de aula da Renata em um post pronto para o Instagram (1080×1350), fiel à didática e à voz real do @textoemciclo.

REGRAS ESTRITAS DE TAMANHO (para nunca quebrar o layout 1080x1350):
- eyebrow: máximo ${SLIDE_LIMITS.eyebrow} caracteres
- cover.title: máximo ${SLIDE_LIMITS.coverTitle} caracteres (curto, forte, específico para vestibulandos)
- cover.body: máximo ${SLIDE_LIMITS.coverBody} caracteres
- content.title: máximo ${SLIDE_LIMITS.contentTitle} caracteres
- content.body: máximo ${SLIDE_LIMITS.contentBody} caracteres
- comparison.title: máximo ${SLIDE_LIMITS.comparisonTitle} caracteres
- comparison.wrongText: máximo ${SLIDE_LIMITS.wrongText} caracteres
- comparison.rightText: máximo ${SLIDE_LIMITS.rightText} caracteres
- quote.title: máximo ${SLIDE_LIMITS.quoteTitle} caracteres
- cta.title: máximo ${SLIDE_LIMITS.ctaTitle} caracteres
- cta.body: máximo ${SLIDE_LIMITS.ctaBody} caracteres
- highlight: máximo ${SLIDE_LIMITS.highlight} caracteres

REGRAS DA LEGENDA ("caption"):
- 1ª linha: gancho direto (observação de banca, provocação gentil contra "fórmula pronta" ou identificação imediata com a rotina do vestibulando).
- Desenvolvimento curto (2 parágrafos enxutos) conectando o conteúdo à prática de redação como processo.
- Fechamento convidando a salvar, mandar dúvida nos comentários ou chamar na DM ":)" ("Vamos juntos?").
- 5 a 7 hashtags reais do nicho (#textoemciclo #redacao #vestibular e bancas/temas pertinentes como #enem #fuvest #vunesp #unicamp #uerj #repertoriosociocultural).

FORMATO DE RESPOSTA:
Retorne APENAS um JSON válido com esta estrutura exata:
{
  "title": "Título interno curto do post",
  "format": "carousel" | "single_card",
  "caption": "Legenda completa pronta para o Instagram",
  "slides": [
    {
      "kind": "cover" | "content" | "comparison" | "quote" | "cta",
      "eyebrow": "...",
      "stepNumber": "01",
      "title": "...",
      "body": "...",
      "highlight": "...",
      "wrongLabel": "Senso comum / Evite",
      "wrongText": "...",
      "rightLabel": "Na redação / Norma-padrão",
      "rightText": "...",
      "author": "Renata · @textoemciclo"
    }
  ]
}`;
}

export function presetInstruction(preset: TemplatePreset, slideCount: number): string {
  switch (preset) {
    case "repertorio_banca":
      return `Crie um carrossel de Repertório & Bancas ("format": "carousel") com EXATAMENTE ${slideCount} slides, seguindo a estrutura real do @textoemciclo:
- Slide 1: kind "cover" (conecte o fato atual, obra cultural ou eixo diretamente à redação de vestibular; use highlight curto como "deslize →").
- Slide 2: kind "content" contextualizando o fato ("VOCÊ DEVE TER VISTO ISSO" ou apresentação objetiva da obra/autor e por que importa para as bancas).
- Slides intermediários: desenvolva a articulação usando kind "content" (separando ângulos como "ARGUMENTO · CAUSA", "ARGUMENTO · CONSEQUÊNCIA" ou conceito de pensador legitimado já explicado em linguagem de dissertação; use "highlight" para mostrar como esse eixo cai em provas reais ou recortes estilo VUNESP/ENEM/UNICAMP/FUVEST/UERJ) e, se enriquecer a didática, 1 slide kind "comparison" contrastando senso comum vago vs. parágrafo articulado com repertório.
- Último slide: kind "cta" convidando a salvar (porque traz repertório/argumento aplicável) ou pedir proposta de treino na DM ":)".`;

    case "before_after":
      return `Crie um carrossel de Norma-Padrão / Mesa de Correção ("format": "carousel") com EXATAMENTE ${slideCount} slides, inspirado na série "Palavras e construções que os vestibulandos juram que sabem usar":
- Slide 1: kind "cover" com gancho leve e bem-humorado de professora corretora.
- Slides do meio: pelo menos ${Math.max(2, slideCount - 3)} slides kind "comparison" em formato de ficha comentada de redação (title com o termo/regra + função entre colchetes; wrongLabel e wrongText com frase típica de erro em redação dissertativa; rightLabel e rightText com a construção adequada na norma-padrão; body explicando com leveza o critério real do corretor — regência, concordância, coesão ou ortografia) e opcionalmente 1 slide kind "quote" com dica-síntese da Prô.
- Último slide: kind "cta" convidando a salvar para revisar antes de passar a redação a limpo.`;

    case "radar_temas":
      return `Crie um carrossel estilo Radar de Temas de Vestibular ("format": "carousel") com EXATAMENTE ${slideCount} slides:
- Slide 1: kind "cover" apresentando o recorte/eixo do compilado de propostas para treino.
- Slides 2 a ${slideCount - 1}: slides kind "content" apresentando propostas de redação (reais do repertório das bancas ou explicitamente rotuladas no eyebrow como "PROPOSTA DE TREINO · ESTILO VUNESP / ENEM"), destacando formulações clássicas como "Tema: entre X e Y" ou pergunta direta, explicando no body qual tensão a coletânea exige discutir e indicando no highlight um repertório ou eixo possível.
- Último slide: kind "cta" lembrando que treinar com recortes variados destrava o projeto de texto e convidando a salvar ":)".`;

    case "quick_tip":
      return `Crie um card único ("format": "single_card") com EXATAMENTE 1 slide kind "quote" (ou "comparison" se a ideia pedir contraste direto), entregando uma pílula memorável de posicionamento pedagógico ("Escrita é processo", domínio de estrutura + eixos temáticos), acolhimento pré-prova ou citação legitimada com autoria clara, acompanhado de legenda completa.`;

    case "cycle_steps":
    default:
      return `Crie um carrossel de Estratégia de Redação & Processo ("format": "carousel") com EXATAMENTE ${slideCount} slides:
- Slide 1: kind "cover" nomeando a dor real do vestibulando sem terrorismo (ex.: organização, leitura de coletânea, projeto de texto, reta final).
- Slides 2 a ${slideCount - 1}: combine slides kind "content" (com stepNumber "01", "02"... e orientações concretas e sustentáveis) e, quando fizer sentido prático, 1 slide kind "comparison" mostrando a diferença real na folha de redação.
- Último slide: kind "cta" validando o esforço do aluno ("Você está indo bem", "Vamos juntos?") e convidando a salvar e comentar.`;
  }
}

function clip(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed;
}

const VALID_KINDS = new Set<SlideKind>(["cover", "content", "comparison", "quote", "cta"]);

function sanitizeSlides(raw: unknown): SocialSlide[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, idx) => {
      const kind: SlideKind = VALID_KINDS.has(item.kind as SlideKind) ? (item.kind as SlideKind) : "content";
      const titleLimit =
        kind === "cover"
          ? SLIDE_LIMITS.coverTitle
          : kind === "comparison"
            ? SLIDE_LIMITS.comparisonTitle
            : kind === "quote"
              ? SLIDE_LIMITS.quoteTitle
              : kind === "cta"
                ? SLIDE_LIMITS.ctaTitle
                : SLIDE_LIMITS.contentTitle;
      const bodyLimit =
        kind === "cover"
          ? SLIDE_LIMITS.coverBody
          : kind === "cta"
            ? SLIDE_LIMITS.ctaBody
            : SLIDE_LIMITS.contentBody;

      return {
        id: makeSlideId(),
        kind,
        eyebrow: clip(item.eyebrow, SLIDE_LIMITS.eyebrow),
        stepNumber: typeof item.stepNumber === "string" ? item.stepNumber.slice(0, 4) : kind === "content" ? String(idx).padStart(2, "0") : undefined,
        title: clip(item.title, titleLimit) ?? "Slide sem título",
        body: clip(item.body, bodyLimit),
        highlight: clip(item.highlight, SLIDE_LIMITS.highlight),
        wrongLabel: clip(item.wrongLabel, 24),
        wrongText: clip(item.wrongText, SLIDE_LIMITS.wrongText),
        rightLabel: clip(item.rightLabel, 24),
        rightText: clip(item.rightText, SLIDE_LIMITS.rightText),
        author: clip(item.author, 40),
      };
    });
}

function extractJson(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned) as Record<string, unknown>;
}

async function callOpenAI(systemPrompt: string, prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("NO_KEY");
  const model =
    process.env.OPENAI_MODEL?.trim() ||
    process.env.SOCIAL_OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(35_000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OpenAI (${res.status}): ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

async function callDeepSeek(systemPrompt: string, prompt: string): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) throw new Error("NO_KEY");
  const model = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(35_000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`DeepSeek (${res.status}): ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(systemPrompt: string, prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("NO_KEY");
  const model =
    process.env.GEMINI_MODEL?.trim() ||
    process.env.SOCIAL_GEMINI_MODEL?.trim() ||
    "gemini-2.5-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    }),
    signal: AbortSignal.timeout(35_000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini (${res.status}): ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callAnthropic(systemPrompt: string, prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error("NO_KEY");
  const model =
    process.env.ANTHROPIC_MODEL?.trim() ||
    process.env.SOCIAL_ANTHROPIC_MODEL?.trim() ||
    "claude-3-5-sonnet-latest";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2400,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(35_000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Anthropic (${res.status}): ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  return data.content?.[0]?.text ?? "";
}

export type AiTextProvider = "openai" | "gemini" | "anthropic" | "deepseek";

export function getConfiguredAiProvider(): AiTextProvider | null {
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  if (process.env.GEMINI_API_KEY?.trim()) return "gemini";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  if (process.env.DEEPSEEK_API_KEY?.trim()) return "deepseek";
  return null;
}

async function runTextProvider(provider: AiTextProvider, systemPrompt: string, prompt: string): Promise<string> {
  switch (provider) {
    case "openai":
      return callOpenAI(systemPrompt, prompt);
    case "gemini":
      return callGemini(systemPrompt, prompt);
    case "anthropic":
      return callAnthropic(systemPrompt, prompt);
    case "deepseek":
      return callDeepSeek(systemPrompt, prompt);
  }
}

export async function generateSocialDraft(input: {
  idea: string;
  preset: TemplatePreset;
  slideCount?: number;
}): Promise<SocialPost> {
  await hydrateRuntimeKeys();
  const slideCount = input.preset === "quick_tip" ? 1 : Math.min(10, Math.max(3, input.slideCount ?? 6));
  const systemPrompt = buildSystemPrompt(input.preset);
  const userPrompt = `${presetInstruction(input.preset, slideCount)}\n\nIDEIA / ANOTAÇÃO DA RENATA:\n"""\n${input.idea.trim()}\n"""`;

  const provider = getConfiguredAiProvider();
  if (!provider) {
    throw new Error("Nenhuma chave de IA configurada em /admin/chaves (OpenAI, Gemini, Anthropic ou DeepSeek).");
  }

  const rawText = await runTextProvider(provider, systemPrompt, userPrompt);

  const parsed = extractJson(rawText);
  const slides = sanitizeSlides(parsed.slides);
  if (!slides.length) {
    throw new Error("A IA não retornou slides válidos. Tente detalhar um pouco mais a ideia.");
  }

  const now = new Date().toISOString();
  const format = parsed.format === "single_card" || input.preset === "quick_tip" ? "single_card" : "carousel";

  return {
    id: `post_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    title: clip(parsed.title, 80) ?? slides[0]!.title,
    format,
    status: "draft_ai",
    slides,
    caption: typeof parsed.caption === "string" ? parsed.caption.trim() : "",
    sourceIdea: input.idea.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

export async function generateSocialReelDraft(input: {
  idea: string;
  trackId: string;
  accent?: string;
}): Promise<{ reel: NonNullable<SocialPost["reel"]>; tokens: number }> {
  await hydrateRuntimeKeys();
  const provider = getConfiguredAiProvider();
  if (!provider) {
    throw new Error("Nenhuma chave de IA configurada em /admin/chaves (OpenAI, Gemini, Anthropic ou DeepSeek).");
  }

  const reelSystemPrompt = `Você é a assistente editorial da professora Renata Romero (@textoemciclo).\n\n${getSocialKnowledgeBase().compact}`;
  const prompt = `Crie um roteiro curto de vídeo tipográfico animado (Reels) para o perfil @textoemciclo, voltado a vestibulandos (ENEM, Fuvest, Vunesp, Unicamp, UERJ).
Retorne APENAS um JSON válido com esta estrutura exata:
{
  "title": "Título curto da capa (máx 45 caracteres)",
  "openingLines": ["Linha 1 curta (use *asteriscos* em 1 palavra de destaque)", "Linha 2 curta"],
  "eyebrow": "REDAÇÃO EM CICLO",
  "stepsHeading": "Como aplicar na redação",
  "steps": [
    { "title": "Passo 1 curto", "body": "Detalhe prático", "accent": true },
    { "title": "Passo 2 curto", "body": "Detalhe prático", "accent": false },
    { "title": "Passo 3 curto", "body": "Detalhe prático", "accent": false }
  ],
  "quote": "Uma frase-síntese com a voz da Prô Renata (ex.: Escrita é processo, não modelo engessado).",
  "endLine": "Salve para revisar antes da prova :)"
}

IDEIA / TEMA:
"""
${input.idea.trim() || "Por que dominar os eixos temáticos e a leitura de coletânea vale mais do que chutar o tema da redação"}
"""`;

  const rawText = await runTextProvider(provider, reelSystemPrompt, prompt);

  const parsed = extractJson(rawText);
  const openingLines = Array.isArray(parsed.openingLines)
    ? parsed.openingLines.map(x => String(x)).slice(0, 3)
    : ["Escrita é *processo*,", "não modelo pronto"];
  const steps = Array.isArray(parsed.steps)
    ? parsed.steps.slice(0, 4).map(s => {
        const rec = (s ?? {}) as Record<string, unknown>;
        return {
          title: clip(rec.title, 28) ?? "Passo",
          body: clip(rec.body, 48),
          accent: Boolean(rec.accent),
        };
      })
    : [
        { title: "Coletânea", body: "Leia o recorte da banca", accent: true },
        { title: "Projeto", body: "Defina Causa e Consequência" },
        { title: "Repertório", body: "Articule sem decorar fórmula" },
      ];

  const reel: NonNullable<SocialPost["reel"]> = {
    track: input.trackId || "chillax-jay-someday",
    end: 64,
    fadeOut: [56, 64],
    accent: input.accent || "#3E2A8D",
    title: clip(parsed.title, 48) ?? "Texto em Ciclo",
    motion: "editorial" in ({} as Record<string, unknown>) ? "premium" : "premium",
    scenes: [
      {
        id: "title-1",
        kind: "title",
        at: 0,
        eyebrow: clip(parsed.eyebrow, 28) ?? "TEXTO EM CICLO",
        lines: openingLines,
      },
      {
        id: "flow-1",
        kind: "flow",
        at: 16,
        enter: "fade",
        eyebrow: "NA PRÁTICA",
        heading: clip(parsed.stepsHeading, 48) ?? "Projeto de texto",
        nodes: steps,
      },
      {
        id: "quote-1",
        kind: "quote",
        at: 36,
        enter: "fade",
        quote: clip(parsed.quote, 140) ?? "Tanto faz o tema se você domina estrutura e os eixos temáticos.",
        author: "Renata · @textoemciclo",
      },
      {
        id: "end-1",
        kind: "end",
        at: 52,
        enter: "fade",
        lines: [clip(parsed.endLine, 48) ?? "Vamos juntos? Salve esta dica :)"],
        signature: "@textoemciclo",
      },
    ],
  };

  return { reel, tokens: 1200 };
}

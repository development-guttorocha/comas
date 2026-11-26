import { makeSlideId, SLIDE_LIMITS, type SlideKind, type SocialPost, type SocialSlide, type TemplatePreset } from "./types";

const SYSTEM_PROMPT = `Você é a assistente editorial da professora Renata, criadora do perfil @textoemciclo ("Texto em Ciclo"), focado em escrita, redação, clareza textual, leitura e repertório.

Seu trabalho é transformar uma ideia bruta, dúvida de aluno ou transcrição de áudio em um carrossel didático e envolvente para o Instagram (ou card único, quando pedido).

TOM DE VOZ DA RENATA:
- Acolhedora, clara, didática, sem elitismo acadêmico e sem clichês de marketing agressivo.
- Mostra o "porquê" por trás da escrita com exemplos concretos de frases reais.
- Português do Brasil impecável, natural e fluido.

REGRAS ESTRITAS DE TAMANHO (para nunca quebrar o layout 1080x1350):
- eyebrow: máximo ${SLIDE_LIMITS.eyebrow} caracteres
- cover.title: máximo ${SLIDE_LIMITS.coverTitle} caracteres (curto, forte, gerando curiosidade)
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

FORMATO DE RESPOSTA:
Retorne APENAS um JSON válido com esta estrutura exata:
{
  "title": "Título interno curto do post",
  "format": "carousel" | "single_card",
  "caption": "Legenda pronta para o Instagram com gancho na primeira linha, desenvolvimento curto, pergunta para comentários e 4 a 6 hashtags relevantes",
  "slides": [
    {
      "kind": "cover" | "content" | "comparison" | "quote" | "cta",
      "eyebrow": "...",
      "stepNumber": "01",
      "title": "...",
      "body": "...",
      "highlight": "...",
      "wrongLabel": "Antes",
      "wrongText": "...",
      "rightLabel": "Depois",
      "rightText": "...",
      "author": "Texto em Ciclo"
    }
  ]
}`;

function presetInstruction(preset: TemplatePreset, slideCount: number): string {
  switch (preset) {
    case "before_after":
      return `Crie um carrossel no formato "Antes × Depois" com ${slideCount} slides:
- Slide 1: kind "cover"
- Slides do meio: pelo menos 2 slides kind "comparison" (com wrongLabel, wrongText, rightLabel, rightText e body curto explicando o porquê) e 1 slide kind "content" ou "quote" se couber
- Último slide: kind "cta"`;
    case "quick_tip":
      return `Crie um card único ("format": "single_card") com EXATAMENTE 1 slide kind "quote" (ou "comparison" se a ideia pedir comparação direta), bem conciso e memorável, acompanhado de uma legenda completa.`;
    case "cycle_steps":
    default:
      return `Crie um carrossel didático passo a passo ("format": "carousel") com ${slideCount} slides:
- Slide 1: kind "cover"
- Slides 2 a ${slideCount - 1}: misture kind "content" (com stepNumber "01", "02"...) e pelo menos 1 slide kind "comparison" mostrando um exemplo real de Antes × Depois
- Último slide: kind "cta" convidando a salvar e comentar`;
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

async function callOpenAI(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("NO_KEY");
  const model = process.env.SOCIAL_OPENAI_MODEL?.trim() || "gpt-4o-mini";
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
        { role: "system", content: SYSTEM_PROMPT },
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

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("NO_KEY");
  const model = process.env.SOCIAL_GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
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

async function callAnthropic(prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error("NO_KEY");
  const model = process.env.SOCIAL_ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-latest";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2200,
      system: SYSTEM_PROMPT,
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

export function getConfiguredAiProvider(): "openai" | "gemini" | "anthropic" | null {
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  if (process.env.GEMINI_API_KEY?.trim()) return "gemini";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  return null;
}

export async function generateSocialDraft(input: {
  idea: string;
  preset: TemplatePreset;
  slideCount?: number;
}): Promise<SocialPost> {
  const slideCount = Math.min(10, Math.max(3, input.slideCount ?? 6));
  const userPrompt = `${presetInstruction(input.preset, slideCount)}\n\nIDEIA / ANOTAÇÃO DA RENATA:\n"""\n${input.idea.trim()}\n"""`;

  const provider = getConfiguredAiProvider();
  if (!provider) {
    throw new Error("Nenhuma chave de IA configurada (OPENAI_API_KEY, GEMINI_API_KEY ou ANTHROPIC_API_KEY).");
  }

  const rawText =
    provider === "openai"
      ? await callOpenAI(userPrompt)
      : provider === "gemini"
        ? await callGemini(userPrompt)
        : await callAnthropic(userPrompt);

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
  const provider = getConfiguredAiProvider();
  if (!provider) {
    throw new Error("Nenhuma chave de IA configurada (OPENAI_API_KEY, GEMINI_API_KEY ou ANTHROPIC_API_KEY).");
  }

  const prompt = `Crie um roteiro curto de vídeo tipográfico animado para o perfil @textoemciclo (professora Renata, dicas de escrita e redação).
Retorne APENAS um JSON válido com esta estrutura exata:
{
  "title": "Título curto da capa (máx 45 caracteres)",
  "openingLines": ["Linha 1 curta (use *asteriscos* em 1 palavra de destaque)", "Linha 2 curta"],
  "eyebrow": "DICA DE ESCRITA",
  "stepsHeading": "Como aplicar na prática",
  "steps": [
    { "title": "Passo 1 curto", "body": "Detalhe rápido", "accent": true },
    { "title": "Passo 2 curto", "body": "Detalhe rápido", "accent": false },
    { "title": "Passo 3 curto", "body": "Detalhe rápido", "accent": false }
  ],
  "quote": "Uma frase-resumo memorável sobre clareza na escrita.",
  "endLine": "Salve para revisar seu próximo texto"
}

IDEIA / TEMA:
"""
${input.idea.trim() || "Como deixar qualquer parágrafo mais claro cortando excessos"}
"""`;

  const rawText =
    provider === "openai"
      ? await callOpenAI(prompt)
      : provider === "gemini"
        ? await callGemini(prompt)
        : await callAnthropic(prompt);

  const parsed = extractJson(rawText);
  const openingLines = Array.isArray(parsed.openingLines)
    ? parsed.openingLines.map(x => String(x)).slice(0, 3)
    : ["Escreva com *clareza*", "sem perder sua voz"];
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
        { title: "Contexto", body: "Situe o leitor", accent: true },
        { title: "Corte", body: "Tire excessos" },
        { title: "Ritmo", body: "Leia em voz alta" },
      ];

  const reel: NonNullable<SocialPost["reel"]> = {
    track: input.trackId || "chillax-jay-someday",
    end: 64,
    fadeOut: [56, 64],
    accent: input.accent || "#C85A32",
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
        eyebrow: "PASSO A PASSO",
        heading: clip(parsed.stepsHeading, 48) ?? "Na prática",
        nodes: steps,
      },
      {
        id: "quote-1",
        kind: "quote",
        at: 36,
        enter: "fade",
        quote: clip(parsed.quote, 140) ?? "Clareza é gentileza com quem lê.",
        author: "Renata · Texto em Ciclo",
      },
      {
        id: "end-1",
        kind: "end",
        at: 52,
        enter: "fade",
        lines: [clip(parsed.endLine, 48) ?? "Salve esta dica"],
        signature: "@textoemciclo",
      },
    ],
  };

  return { reel, tokens: 1200 };
}


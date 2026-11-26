// What Gutto can ask of the AI before it drafts a video. Every field has a sensible default,
// so "Gerar" works without touching any of them.

import type { Personality } from "@/components/reel/motion";

export type ReelFocus = "equilibrado" | "resultados" | "processo" | "lideranca" | "produto";
export type ReelAudience = "recrutadores" | "clientes" | "designers";

export interface ReelParams {
  /** target length, in seconds */
  seconds: number;
  /** motion personality, or "auto" to let the AI choose from the case */
  personality: Personality | "auto";
  focus: ReelFocus;
  audience: ReelAudience;
  /** music id from the library; empty keeps the current one */
  track?: string;
  /** free instructions, in Gutto's words */
  notes?: string;
}

export const DEFAULT_PARAMS: ReelParams = { seconds: 60, personality: "auto", focus: "equilibrado", audience: "recrutadores" };

export const SECONDS_OPTIONS = [
  { value: 30, label: "Curto · 30 s" },
  { value: 45, label: "Médio · 45 s" },
  { value: 60, label: "Padrão · 1 min" },
  { value: 75, label: "Longo · 1 min 15" },
];

export const PERSONALITY_OPTIONS: { value: ReelParams["personality"]; label: string; hint: string }[] = [
  { value: "auto", label: "A IA escolhe", hint: "Pelo tipo de case e público." },
  { value: "energetic", label: "Energética", hint: "Cortes rápidos, zoom forte, ritmo de drop." },
  { value: "premium", label: "Premium", hint: "Movimentos longos e suaves, pausas, sem exagero." },
  { value: "corporate", label: "Corporativa", hint: "Claro e preciso, transições discretas." },
  { value: "playful", label: "Lúdica", hint: "Entradas com leve quique, mais leve e solto." },
];

export const FOCUS_OPTIONS: { value: ReelFocus; label: string; prompt: string }[] = [
  { value: "equilibrado", label: "Equilibrado", prompt: "Conte o case inteiro com peso parecido para contexto, processo, decisão e resultado." },
  { value: "resultados", label: "Resultados", prompt: "Dê mais tempo e destaque aos números e ao impacto: chegue cedo ao resultado e feche nele." },
  { value: "processo", label: "Processo", prompt: "Dê mais tempo à pesquisa, ao diagnóstico e às decisões de design: mostre como se chegou à solução." },
  { value: "lideranca", label: "Liderança e time", prompt: "Destaque o papel de liderança: time, pessoas, organização e as escolhas de gestão." },
  { value: "produto", label: "Produto e telas", prompt: "Mostre mais o produto: mais cenas de telas e antes e depois, menos texto." },
];

/** What the video asks of each audience at the end: the button on the end card and the player. */
export interface ReelCta {
  label: string;
  href: string;
}

export const AUDIENCE_OPTIONS: { value: ReelAudience; label: string; prompt: string; goal: string; cta: ReelCta }[] = [
  {
    value: "recrutadores",
    label: "Recrutadores",
    prompt: "Quem assiste é recrutador ou gestor de contratação avaliando o autor para uma vaga sênior ou de liderança em design. Olha o case por cerca de 30 segundos e precisa sair sabendo qual foi o papel dele, o tamanho do que ele assumiu, o que ele decidiu e o resultado.",
    goal: "fazer o recrutador querer ver o currículo e chamar para uma conversa",
    cta: { label: "Ver currículo", href: "/curriculo" },
  },
  {
    value: "clientes",
    label: "Clientes",
    prompt: "Quem assiste pode contratar o autor: precisa reconhecer o próprio problema de negócio e ver que ele já resolveu algo parecido, com resultado.",
    goal: "fazer o cliente querer contratar os serviços do autor",
    cta: { label: "Ver serviços", href: "/servicos" },
  },
  {
    value: "designers",
    label: "Designers",
    prompt: "Quem assiste é designer: quer ver o problema de design, as restrições, as decisões com seus trade-offs, as telas de perto e o que levar para o próprio trabalho.",
    goal: "fazer o designer querer ler o case completo",
    cta: { label: "Ler o case completo", href: "#case-doc" },
  },
];
/** The ask when a reel names none (older reels): the services page. */
export const DEFAULT_CTA: ReelCta = { label: "Ver serviços", href: "/servicos" };
export const ctaFor = (audience: ReelAudience) => (AUDIENCE_OPTIONS.find((o) => o.value === audience) ?? AUDIENCE_OPTIONS[1]).cta;

/** Keeps only known values; anything missing falls back to the default. */
export function parseParams(raw: unknown): ReelParams {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<ReelParams>;
  const pick = <T,>(v: unknown, options: { value: T }[], fallback: T) => (options.some((o) => o.value === v) ? (v as T) : fallback);
  return {
    seconds: pick(Number(r.seconds), SECONDS_OPTIONS, DEFAULT_PARAMS.seconds),
    personality: pick(r.personality, PERSONALITY_OPTIONS, DEFAULT_PARAMS.personality),
    focus: pick(r.focus, FOCUS_OPTIONS, DEFAULT_PARAMS.focus),
    audience: pick(r.audience, AUDIENCE_OPTIONS, DEFAULT_PARAMS.audience),
    track: typeof r.track === "string" && r.track ? r.track : undefined,
    notes: typeof r.notes === "string" ? r.notes.trim().slice(0, 1200) || undefined : undefined,
  };
}

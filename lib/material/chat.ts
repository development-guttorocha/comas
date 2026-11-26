import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readCaseFiles, SLUG } from "@/lib/admin/caseStore";
import { saveCaseMaterial } from "@/lib/admin/materialStore";
import {
  fingerprint, isDismissed, isMine, numbersIn, parseMaterial, plain, SCALAR_KEYS,
  type AnyItem, type CaseMaterial, type ListKey, type MaterialDecision, type MaterialOrigin, type MaterialQuote, type MaterialResult, type MaterialText, type ScalarKey,
} from "@/lib/caseMaterial";
import { loadDraftContext, proposePlan, writeDraft } from "@/lib/caseDraft/generate";
import type { DraftCaseData } from "@/lib/caseDraft/caseData";
import { planToText, type CasePlan } from "@/lib/caseDraft/plan";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { askJson, deepSeekConfig } from "@/lib/reel/deepseek";
import { addSourceFile, addSourceText, readSources, type Source, type SourceMeta } from "./sources";

// The Material tab is a conversation: Gutto sends the material as it is (files, pasted text) and
// answers what the AI asks; the AI says in a few lines what it understood and asks only what would
// change the case. Each turn is one quick DeepSeek call (no thinking). It does not get the files
// again: it gets the facts it already knows (with their origins), a summary of the conversation, the
// last messages and only the material it has not read yet. The facts land in material.json every
// turn, so the case generator reads them as before. When there is enough, the AI offers the
// generator's plan, and the plan and the draft run inside the conversation.

const READ_CHARS = 24_000;
const RECENT = 6;
/** A message this long, or with this many lines, is pasted material (a Slack thread, an e-mail), not Gutto talking. */
const PASTE_AS_MATERIAL = { chars: 600, lines: 5 };
const CONVERSATION = "conversa";

export type ChatAttachment = { id: string; name: string; line: string };
export type ChatMessage = {
  id: string;
  role: "gutto" | "ia";
  text: string;
  at: string;
  attachments?: ChatAttachment[];
  tokens?: number;
  /** The AI thinks there is enough to propose the case's structure. */
  offerPlan?: boolean;
  plan?: CasePlan;
  /** The questions this message asked (kept so they are never asked again). */
  questions?: string[];
};
type ChatFile = { messages: ChatMessage[]; summary: string; read: Record<string, number>; tokens: number };

/** Gutto asking for the case itself: the conversation stops asking and builds it. */
export function wantsCase(text: string) {
  const t = plain(text);
  return /\b(cri|mont|ger|faz|escrev)\w*\b.{0,25}\b(case|estrutura|rascunho)\b/.test(t)
    || /^(pode|bora|vai|segue)\b.{0,12}\b(criar|montar|gerar|seguir|fazer|escrever)\b/.test(t)
    || /\be ponto\b/.test(t)
    || /\b(mostr|ver|quero ver|ve)\w*\b.{0,20}\bestrutura\b/.test(t);
}

const words = (q: string) => new Set(plain(q).split(/[^a-z0-9]+/).filter(w => w.length > 3));
/** The same question in other words: most of its long words were in a question already asked. */
export function alreadyAsked(question: string, asked: string[]) {
  const w = words(question);
  if (!w.size) return true;
  return asked.some(a => {
    const o = words(a);
    let shared = 0;
    for (const x of w) if (o.has(x)) shared++;
    return shared / Math.min(w.size, o.size || 1) >= 0.6;
  });
}
const MAX_ROUNDS = 2;

const dirOf = (slug: string) => {
  if (!SLUG.test(slug)) throw new Error("Case inválido.");
  return path.join(process.cwd(), ".admin", "material", slug);
};
async function readChat(slug: string): Promise<ChatFile> {
  try { return { messages: [], summary: "", read: {}, tokens: 0, ...JSON.parse(await readFile(path.join(dirOf(slug), "chat.json"), "utf8")) }; } catch { return { messages: [], summary: "", read: {}, tokens: 0 }; }
}
async function writeChat(slug: string, chat: ChatFile) {
  await mkdir(dirOf(slug), { recursive: true });
  await writeFile(path.join(dirOf(slug), "chat.json"), JSON.stringify(chat, null, 1));
}

const unreadCount = (sources: Source[], read: Record<string, number>) => sources.reduce((n, s) => n + Math.max(0, s.segmentList.length - (read[s.id] ?? 0)), 0);

export async function getChat(slug: string) {
  const [chat, sources] = await Promise.all([readChat(slug), readSources(slug)]);
  return { messages: chat.messages, tokens: chat.tokens, unread: unreadCount(sources, chat.read) };
}

// ── o prompt ─────────────────────────────────────────────────────────────────

const FIELDS = "empresa, produto, periodo, problema, funcao, time, comQuem, mudou, decisao, resultado, depoimento";
const SCALAR_OF: Record<string, ScalarKey> = { empresa: "company", produto: "product", periodo: "period", problema: "problem", funcao: "roleTitle", time: "roleTeam", comQuem: "rolePartners", mudou: "changes" };
const FIELD_OF: Record<ScalarKey, string> = Object.fromEntries(Object.entries(SCALAR_OF).map(([k, v]) => [v, k])) as Record<ScalarKey, string>;
const LIST_OF: Record<string, ListKey> = { decisao: "decisions", resultado: "results", depoimento: "quotes" };

const SYSTEM = `Você é quem entrevista o designer Gutto Rocha para montar um case do portfólio dele. Ele manda o material como está (decks, documentos, prints, conversas coladas) e conversa com você. Seu trabalho: entender o case, guardar os fatos com a origem de cada um e perguntar só o que falta e muda o case. Outro passo escreve o case; aqui é conversa.

Como você fala (campo "resposta"):
- Português do Brasil, direto. Curto: 1 ou 2 frases, no máximo 40 palavras. Sem títulos, sem listas, sem explicar seu raciocínio.
- Ao receber material novo: uma frase com o essencial que entendeu, com os dados concretos ("App de creators, você como Head of Design com 2 designers, Q3 2023 a Q4 2024."). Não liste decisões nem resultados: eles aparecem no painel ao lado.
- Ao receber uma resposta dele: não repita o que ele disse. Nunca comece com "Entendi:" parafraseando a fala dele. Basta "Anotado." ou uma frase com o que aquilo muda no case.
- Não anuncie o que vai fazer depois nem comente o processo.

Perguntas (campo "perguntas", nunca dentro de "resposta"):
- Antes de perguntar, deduza. Se a resposta está no material, nos fatos ou sai do que ele já disse, tire de lá e registre o fato (com "suposicao": true se for dedução sua). Pergunte só o que nem o material nem a conversa respondem e que muda o case.
- Quando ele disser que a resposta está no material ("está no PPT", "as decisões vêm do relatório"), não devolva a pergunta: ponha o arquivo em "reler" e tire de lá.
- Pergunte tudo de uma vez, não aos poucos: na primeira rodada, junte em até 3 perguntas curtas (até 15 palavras cada) o que mais pesa, nesta ordem: o papel dele (o que foi dele e o que foi do time); as decisões e o porquê; os resultados com número e de onde vem. Uma pergunta pode juntar dois pontos parecidos.
- Nunca repita uma pergunta de "Já perguntado", nem com outras palavras. "Não sei", "não tem", "não abri mão", "ainda não temos resultado" são respostas: registre e siga.
- Não pergunte o que não muda o case: do que abriu mão (se ele não trouxe), meta (se não há resultado), ferramenta, como provar causalidade, data exata, nome de tela, grafia. Dúvida pequena vira suposição ("suposicao": true), não pergunta. Fato escrito no material não é suposição.
- Lista vazia é normal: nenhuma pergunta é melhor que uma pergunta fraca. Depois de 2 rodadas de perguntas, pare de perguntar.

Quando montar:
- Se ele pedir para criar, montar ou ver o case ou a estrutura ("pode criar", "monta o case", "cria e ponto", "quero ver a estrutura"), acao = "plano" e nenhuma pergunta. Nunca segure o pedido para perguntar antes.
- Quando já houver o papel e pelo menos 2 decisões, ofereça uma vez: "Já dá para propor a estrutura do case. Quer ver?" e marque "oferecerPlano": true. Resultado medido não é obrigatório: há case sem resultado ainda.

Fatos (campo "fatos"): só o que está escrito no material ou que ele disse na conversa. Nada de deduzir, calcular, arredondar ou embelezar.
- Cada fato tem "fontes": 1 a 3 lugares que o sustentam. "s" é o código do trecho ([S4]) ou de um fato que você já tem ([F2]); "trecho" é uma cópia LITERAL, caractere por caractere, de parte desse trecho, com todos os números e nomes do fato. O código confere: trecho que não existe é descartado.
- Números exatamente como estão escritos ("+46%", "1.240"). Mantenha o sujeito do material ("colocamos" não vira "coloquei"). "Eu" nas notas, nos slides e na conversa é o Gutto.
- Para corrigir um fato que você já tem, mande o mesmo "id". Para apagar um fato que ele disse estar errado, ponha o id em "remover". Não repita fatos que não mudaram.
- Depoimento: só fala de alguém entre aspas ou claramente atribuída; "fala" é a cópia literal.

Responda em JSON:
{
 "resposta": "a mensagem ao Gutto",
 "fatos": [{"id": "F3 (só para corrigir)", "campo": um de: ${FIELDS},
   "texto": "para empresa, produto, periodo, problema, funcao, time, comQuem, mudou",
   "decisao": "...", "porque": "...", "abriuMao": "...",
   "metrica": "o que mede", "antes": "...", "depois": "...", "medidoEm": "onde/como foi medido",
   "fala": "...", "autor": "...", "cargo": "...",
   "fontes": [{"s": "S4", "trecho": "..."}], "suposicao": false}],
 "remover": ["F5"],
 "perguntas": ["0 a 3 perguntas curtas para ele agora, só as que nem o material nem a conversa respondem"],
 "reler": ["nome do arquivo que ele disse ter a resposta, quando for o caso"],
 "faltando": ["a lista completa do que ainda falta e importa, em frases curtas (inclua o que ele não soube responder)"],
 "resumo": "a conversa até aqui em até 8 linhas: o que ele contou, o que já foi perguntado, o que ele não sabe ou pulou",
 "acao": "nenhuma" | "plano" (ele quer ver ou aceitou ver a estrutura) | "ajustar_plano" (há uma estrutura na conversa e ele pediu mudança) | "rascunho" (ele aprovou a estrutura e quer o texto),
 "pedido": "o ajuste que ele pediu, nas palavras dele, quando acao = ajustar_plano",
 "oferecerPlano": false
}`;

export type Seg = { id: string; sourceId: string; file: string; where: string; text: string; plain: string };
type Fact = { id: string; kind: ScalarKey | ListKey; index: number; item: AnyItem };

/** The facts as the AI sees them: F1… with their fields and where they came from. */
function factsOf(m: CaseMaterial): Fact[] {
  const out: Fact[] = [];
  for (const key of SCALAR_KEYS) if (m[key]) out.push({ id: `F${out.length + 1}`, kind: key, index: 0, item: m[key]! });
  for (const key of ["decisions", "results", "quotes"] as const) ((m[key] ?? []) as AnyItem[]).forEach((item, index) => out.push({ id: `F${out.length + 1}`, kind: key, index, item }));
  return out;
}
const FACT_NAME: Record<string, string> = { ...FIELD_OF, decisions: "decisao", results: "resultado", quotes: "depoimento" };
function showFact(f: Fact) {
  const fields = Object.entries(f.item).filter(([k, v]) => typeof v === "string" && k !== "by").map(([k, v]) => `${k}: ${v}`).join(" · ");
  const from = (f.item.origins ?? []).map(o => `${o.file}${o.where ? `, ${o.where}` : ""}`).join("; ");
  return `[${f.id}] ${FACT_NAME[f.kind]} · ${fields}${from ? ` (de: ${from})` : ""}${f.item.assumed ? " (suposição)" : ""}`;
}

// ── aplicar a resposta ───────────────────────────────────────────────────────

type RawFact = Record<string, unknown> & { id?: unknown; campo?: unknown; fontes?: ({ s?: unknown; trecho?: unknown } | string)[]; suposicao?: unknown };
export type RawTurn = { resposta?: unknown; perguntas?: unknown; reler?: unknown; fatos?: RawFact[]; remover?: unknown; faltando?: unknown; resumo?: unknown; acao?: unknown; pedido?: unknown; oferecerPlano?: unknown };

const str = (v: unknown, max = 4000) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
function clean<T extends object>(o: T): T {
  for (const k of Object.keys(o) as (keyof T)[]) if (o[k] === undefined) delete o[k];
  return o;
}

/** The cited words, found in the cited piece (or anywhere when the AI mislabeled it); a cited fact lends its origins. */
function origins(raw: RawFact["fontes"], segs: Seg[], facts: Map<string, Fact>): MaterialOrigin[] {
  const out: MaterialOrigin[] = [];
  const add = (o: MaterialOrigin) => { if (!out.some(x => x.source === o.source && x.excerpt === o.excerpt)) out.push(o); };
  for (const r of Array.isArray(raw) ? raw.slice(0, 4) : []) {
    const ref = (typeof r === "string" ? r : typeof r?.s === "string" ? r.s : "").trim().replace(/[[\]]/g, "");
    const fact = facts.get(ref);
    if (fact) { (fact.item.origins ?? []).forEach(add); continue; }
    const cited = segs.find(x => x.id === ref);
    const excerpt = typeof r === "object" && typeof r?.trecho === "string" ? r.trecho.trim().slice(0, 600) : "";
    const p = plain(excerpt);
    // A place without its words: the place's own text is the excerpt.
    if (p.length < 4) { if (cited) add({ source: cited.sourceId, file: cited.file, where: cited.where, excerpt: cited.text.slice(0, 500) }); continue; }
    const seg = cited && cited.plain.includes(p) ? cited : segs.find(x => x.plain.includes(p));
    if (seg) add({ source: seg.sourceId, file: seg.file, where: seg.where, excerpt });
  }
  return out.slice(0, 5);
}

/**
 * A number left out of the excerpt gets, as one more excerpt, the sentence that has it: first in the
 * same places; then anywhere in what was read, for numbers that are hard to match by chance (10 or
 * more, or written with a comma or a dot).
 */
function backNumbers<T extends AnyItem>(item: T, segs: Seg[]): T {
  if (!item.origins?.length) return item;
  const backed = new Set(item.origins.flatMap(o => numbersIn(o.excerpt ?? "").map(n => n.value)));
  const missing = Object.entries(item).filter(([k, v]) => typeof v === "string" && k !== "by").flatMap(([, v]) => numbersIn(v as string)).filter(n => !backed.has(n.value));
  const list = [...item.origins];
  for (const n of missing) {
    if (backed.has(n.value)) continue;
    const near = segs.filter(x => item.origins!.some(o => o.source === x.sourceId && o.where === x.where));
    const distinctive = n.value >= 10 || /[.,]/.test(n.written);
    for (const seg of distinctive ? [...near, ...segs.filter(x => !near.includes(x))] : near) {
      const sentence = seg.text.split(/\n|(?<=[.!?;])\s+/).find(line => numbersIn(line).some(x => x.value === n.value));
      if (!sentence) continue;
      list.push({ source: seg.sourceId, file: seg.file, where: seg.where, excerpt: sentence.trim().slice(0, 400) });
      numbersIn(sentence).forEach(x => backed.add(x.value));
      break;
    }
  }
  return { ...item, origins: list.slice(0, 6) };
}

function itemFrom(raw: RawFact, kind: ScalarKey | ListKey, o: MaterialOrigin[]): AnyItem | null {
  const meta = { by: "ia" as const, origins: o, ...(raw.suposicao === true ? { assumed: true } : {}) };
  if (kind === "decisions") return str(raw.decisao) ? clean<MaterialDecision>({ decision: str(raw.decisao), why: str(raw.porque), tradeoff: str(raw.abriuMao), ...meta }) : null;
  if (kind === "results") return str(raw.depois) || str(raw.metrica) ? clean<MaterialResult>({ metric: str(raw.metrica, 300), before: str(raw.antes, 300), value: str(raw.depois, 300), source: str(raw.medidoEm, 600), ...meta }) : null;
  if (kind === "quotes") return str(raw.fala) ? clean<MaterialQuote>({ text: str(raw.fala)!.replace(/^[“"«]+|[”"»]+$/g, "").trim(), author: str(raw.autor, 300), role: str(raw.cargo, 300), ...meta }) : null;
  const text = str(raw.texto);
  return text ? { text, ...meta } : null;
}

const fromConversation = (item: AnyItem) => !!item.origins?.some(o => o.source === "gutto");

/**
 * The turn's facts applied to the material: corrections replace (except what Gutto edited himself,
 * unless he corrected it in the conversation), new facts are added without repeating, removed ones
 * are remembered so they do not come back.
 */
export function applyTurn(current: CaseMaterial, raw: RawTurn, segs: Seg[]): CaseMaterial {
  const m = parseMaterial(current);
  const facts = factsOf(m);
  const byId = new Map(facts.map(f => [f.id, f]));
  const lists: Record<ListKey, (AnyItem | null)[]> = { decisions: [...(m.decisions ?? [])], results: [...(m.results ?? [])], quotes: [...(m.quotes ?? [])] };
  const dismissed = new Set(m.dismissed ?? []);
  const remove = (f: Fact) => {
    if (f.kind in lists) lists[f.kind as ListKey][f.index] = null; else delete m[f.kind as ScalarKey];
    for (const k of [fingerprint(f.item), ...(f.item.origins?.find(o => o.excerpt) ? [`e:${plain(f.item.origins!.find(o => o.excerpt)!.excerpt!).slice(0, 120)}`] : [])]) if (k) dismissed.add(k);
  };
  for (const id of Array.isArray(raw.remover) ? raw.remover : []) { const f = byId.get(String(id).replace(/[[\]]/g, "")); if (f) remove(f); }
  for (const r of Array.isArray(raw.fatos) ? raw.fatos.slice(0, 40) : []) {
    const campo = String(r?.campo ?? "");
    const kind: ScalarKey | ListKey | undefined = SCALAR_OF[campo] ?? LIST_OF[campo];
    if (!kind) continue;
    const built = itemFrom(r, kind, origins(r.fontes, segs, byId));
    if (!built) continue;
    const item = backNumbers(built, segs);
    const target = byId.get(String(r.id ?? "").replace(/[[\]]/g, ""));
    if (target && target.kind === kind) {
      if (isMine(target.item) && !fromConversation(item)) continue;
      if (kind in lists) lists[kind as ListKey][target.index] = item; else m[kind as ScalarKey] = item as MaterialText;
      continue;
    }
    if (isDismissed(item, dismissed)) continue;
    if (!(kind in lists)) {
      const old = m[kind as ScalarKey];
      if (!old || !isMine(old) || fromConversation(item)) m[kind as ScalarKey] = item as MaterialText;
      continue;
    }
    const list = lists[kind as ListKey];
    const same = (x: AnyItem | null) => !!x && (fingerprint(x) === fingerprint(item) || (!!x.origins?.[0]?.excerpt && x.origins[0].excerpt === item.origins?.[0]?.excerpt));
    if (!list.some(same)) list.push(item);
  }
  for (const key of ["decisions", "results", "quotes"] as const) {
    const items = lists[key].filter((x): x is AnyItem => !!x);
    (m as Record<string, unknown>)[key] = items.length ? items : undefined;
  }
  const missing = Array.isArray(raw.faltando) ? raw.faltando.flatMap(q => (str(q, 300) ? [str(q, 300)!] : [])).slice(0, 10) : null;
  if (missing) m.questions = missing.length ? missing.map((text, i) => ({ id: `q${i + 1}`, text })) : undefined;
  if (dismissed.size) m.dismissed = [...dismissed].slice(-200);
  return parseMaterial(m);
}

// ── uma mensagem ─────────────────────────────────────────────────────────────

const g = globalThis as typeof globalThis & { __materialChat?: Map<string, Promise<unknown>> };
const locks = (g.__materialChat ??= new Map());
function locked<T>(slug: string, work: () => Promise<T>): Promise<T> {
  const next = (locks.get(slug) ?? Promise.resolve()).catch(() => {}).then(work);
  locks.set(slug, next);
  return next;
}

const newId = () => `${Date.now().toString(36)}${randomBytes(2).toString("hex")}`;
const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function attachmentLine(s: SourceMeta) {
  const parts: string[] = [];
  if (s.units) parts.push(`${s.units} ${s.kind === "pptx" ? "slides" : "páginas"}`);
  if (s.kind === "image") parts.push(s.chars ? "texto lido na imagem" : "imagem sem texto");
  if (s.images.length) parts.push(`${s.images.length} ${s.images.length > 1 ? "imagens foram" : "imagem foi"} para a mídia`);
  if (s.skippedImages) parts.push(`${s.skippedImages} descartada${s.skippedImages > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

export type TurnInput = {
  text?: string;
  files?: File[];
  /** The editor's material (with unsaved edits) and the revision it was read at. */
  material: CaseMaterial;
  revision: string;
  /** "continuar": keep reading what is left; "plano" / "rascunho": a button, without a chat call. */
  action?: "continuar" | "plano" | "rascunho";
};
export type TurnResult = { messages: ChatMessage[]; material: CaseMaterial; revision: string; unread: number; tokens: number; draft?: NotionBlockNode[]; draftData?: DraftCaseData; failed: { name: string; error: string }[] };

export function sendMessage(slug: string, input: TurnInput): Promise<TurnResult> {
  return locked(slug, () => turn(slug, input));
}

async function turn(slug: string, input: TurnInput): Promise<TurnResult> {
  const files = await readCaseFiles(slug);
  if (!files) throw new Error("Case não encontrado.");
  const chat = await readChat(slug);
  const now = new Date().toISOString();
  const text = (input.text ?? "").trim();
  const added: SourceMeta[] = [], failed: { name: string; error: string }[] = [];
  for (const file of input.files ?? []) {
    try { added.push(await addSourceFile(slug, file)); } catch (error) { failed.push({ name: file.name, error: error instanceof Error ? error.message : "Não foi possível ler." }); }
  }
  const pasted = text.length > PASTE_AS_MATERIAL.chars || text.split("\n").filter(l => l.trim()).length >= PASTE_AS_MATERIAL.lines ? await addSourceText(slug, text) : null;
  if (pasted) added.push(pasted);
  const out: ChatMessage[] = [];
  if (text || input.files?.length) {
    out.push(clean({
      id: newId(), role: "gutto" as const, at: now,
      text: pasted ? `${text.slice(0, 280).trim()}…` : text,
      attachments: added.length || failed.length ? [
        ...added.map(s => ({ id: s.id, name: s.name, line: s === pasted ? `texto colado guardado como material · ${s.segments} trechos` : attachmentLine(s) })),
        ...failed.map(f => ({ id: "", name: f.name, line: `não deu para ler: ${f.error}` })),
      ] : undefined,
    }));
  }
  let material = parseMaterial(input.material);
  let tokens = added.reduce((n, s) => n + (s.tokens ?? 0), 0);
  let reply: ChatMessage;
  let draft: NotionBlockNode[] | undefined;
  let draftData: DraftCaseData | undefined;
  const lastPlan = [...chat.messages].reverse().find(msg => msg.plan)?.plan;
  const sources = await readSources(slug);

  // Buttons skip the conversation call.
  if (input.action === "plano" || input.action === "rascunho") {
    const r = await runGenerator(slug, material, input.action, lastPlan);
    reply = { id: newId(), role: "ia", at: new Date().toISOString(), ...r.message };
    tokens += r.tokens;
    draft = r.draft;
    draftData = r.draftData;
  } else {
    // What it has not read yet, up to one careful reading; the rest comes in the next turns.
    const segs: Seg[] = [];
    const read = { ...chat.read };
    let size = 0, full = false;
    for (const s of sources) {
      for (let i = read[s.id] ?? 0; i < s.segmentList.length && !full; i++) {
        const seg = s.segmentList[i];
        if (segs.length && size + seg.text.length > READ_CHARS) { full = true; break; }
        segs.push({ id: `S${segs.length + 1}`, sourceId: s.id, file: s.name, where: seg.where, text: seg.text, plain: plain(seg.text) });
        size += seg.text.length;
        read[s.id] = i + 1;
      }
      if (full) break;
    }
    // Gutto's words in the conversation are a source too.
    const recent = [...chat.messages, ...out].slice(-RECENT);
    const said = recent.filter(msg => msg.role === "gutto" && msg.text && !msg.text.endsWith("…"));
    for (const msg of said) segs.push({ id: `S${segs.length + 1}`, sourceId: "gutto", file: "Você, na conversa", where: when(msg.at), text: msg.text, plain: plain(msg.text) });
    const facts = factsOf(material);
    const unreadAfter = sources.reduce((n, s) => n + Math.max(0, s.segmentList.length - (read[s.id] ?? 0)), 0);
    const asked = chat.messages.flatMap(msg => msg.questions ?? []);
    const rounds = chat.messages.filter(msg => msg.role === "ia" && msg.questions?.length).length;
    const prompt = (extra = "") => [
      `Case: “${files.case.title}” (${files.case.company}).`,
      `Material recebido: ${sources.map(s => `${s.name}${s.units ? ` (${s.units} ${s.kind === "pptx" ? "slides" : "páginas"})` : ""}`).join("; ") || "nenhum ainda"}.`,
      unreadAfter ? `Ainda há ${unreadAfter} trechos do material que você não leu; você lê na próxima vez. Diga que segue lendo, sem perguntar o que pode estar lá.` : "",
      `Fatos que você já tem:\n${facts.map(showFact).join("\n") || "(nenhum)"}`,
      `Ainda faltando: ${(material.questions ?? []).map(q => q.text).join(" | ") || "(nada registrado)"}`,
      `Já perguntado (não repita): ${asked.join(" | ") || "(nada)"}`,
      `Rodadas de perguntas até aqui: ${rounds} de ${MAX_ROUNDS}.${rounds >= MAX_ROUNDS ? " Não pergunte mais nada." : ""}`,
      `Resumo da conversa até aqui:\n${chat.summary || "(começo da conversa)"}`,
      lastPlan ? `Estrutura proposta na conversa:\n${planToText(lastPlan)}` : "",
      `Últimas mensagens:\n${recent.map(msg => `${msg.role === "gutto" ? "Gutto" : "Você"}: ${msg.text}${msg.questions?.length ? ` ${msg.questions.join(" ")}` : ""}${msg.attachments?.length ? ` [anexos: ${msg.attachments.map(a => a.name).join(", ")}]` : ""}`).join("\n") || "(nenhuma)"}`,
      `Trechos novos para ler (material e o que o Gutto disse):\n${segs.map(x => `[${x.id}] ${x.file} · ${x.where}\n${x.text}`).join("\n\n") || "(nenhum)"}`,
      input.action === "continuar" ? "O Gutto não escreveu nada: você está continuando a leitura do material. Diga em 1 ou 2 frases o que o resto acrescentou." : "",
      extra,
    ].filter(Boolean).join("\n\n");
    const cfg = { ...(await deepSeekConfig()), thinking: false };
    let { data, tokens: used } = await askJson<RawTurn>(cfg, SYSTEM, prompt(), { timeoutMs: 120_000 });
    tokens += used;
    // He pointed to a file ("está no PPT"): read it again and take the answer from it, once.
    const again = rereadSources(sources, data.reler, text);
    if (again.length) {
      let size = 0;
      for (const s of again) for (const seg of s.segmentList) {
        if (size + seg.text.length > READ_CHARS) break;
        segs.push({ id: `S${segs.length + 1}`, sourceId: s.id, file: s.name, where: seg.where, text: seg.text, plain: plain(seg.text) });
        size += seg.text.length;
      }
      ({ data, tokens: used } = await askJson<RawTurn>(cfg, SYSTEM, prompt(`O Gutto apontou ${again.map(s => s.name).join(", ")}: os trechos estão acima, lidos de novo. Tire deles o que ele indicou, sem perguntar de novo; "reler" vazio.`), { timeoutMs: 120_000 }));
      tokens += used;
    }
    // The last answer as it came, to see why a fact lost its origin.
    await writeFile(path.join(dirOf(slug), "last-turn.json"), JSON.stringify({ at: now, data }, null, 1)).catch(() => {});
    material = applyTurn(material, data, segs);
    chat.read = read;
    chat.summary = str(data.resumo, 2000) ?? chat.summary;
    let action = String(data.acao ?? "");
    // "Pode criar", "cria o case e ponto": build it now, whatever the model thought.
    if (wantsCase(text) && !["plano", "ajustar_plano", "rascunho"].includes(action)) action = lastPlan ? "rascunho" : "plano";
    const generating = action === "plano" || action === "ajustar_plano" || (action === "rascunho" && !!lastPlan);
    const questions = generating || rounds >= MAX_ROUNDS ? [] : pickQuestions(data.perguntas, asked);
    const body = str(data.resposta, 2000) ?? (questions.length ? "" : "Anotado.");
    const listed = questions.length > 1 ? questions.map((q, i) => `${i + 1}. ${q}`).join("\n") : questions[0] ?? "";
    reply = clean({
      id: newId(), role: "ia" as const, at: new Date().toISOString(),
      text: [body, listed].filter(Boolean).join("\n\n"),
      questions: questions.length ? questions : undefined,
      offerPlan: data.oferecerPlano === true && !generating ? true : undefined,
    });
    if (generating) {
      const r = await runGenerator(slug, material, action === "rascunho" ? "rascunho" : "plano", lastPlan, action === "ajustar_plano" ? str(data.pedido, 1000) ?? text : undefined);
      // With the structure, the message is the structure: no chat around it.
      reply = { ...reply, text: r.message.text, plan: "plan" in r.message ? r.message.plan : undefined, offerPlan: undefined };
      tokens += r.tokens;
      draft = r.draft;
      draftData = r.draftData;
    }
  }
  reply.tokens = tokens;
  out.push(reply);
  material = parseMaterial(material);
  const saved = await saveCaseMaterial(slug, input.revision, material);
  chat.messages = [...chat.messages, ...out].slice(-400);
  chat.tokens += tokens;
  await writeChat(slug, chat);
  return { messages: out, material: saved.material, revision: saved.revision, unread: unreadCount(await readSources(slug), chat.read), tokens, draft, draftData, failed };
}

/** At most 3 new questions: none asked before in other words. */
export function pickQuestions(raw: unknown, asked: string[]): string[] {
  const out: string[] = [];
  for (const q of Array.isArray(raw) ? raw : []) {
    const t = str(q, 200);
    if (t && !alreadyAsked(t, [...asked, ...out])) out.push(t);
    if (out.length === 3) break;
  }
  return out;
}

/** The sources Gutto pointed to: by name, or by kind ("o PPT", "o PDF", "o relatório", "o deck"). */
export function rereadSources<T extends { name: string; kind: string }>(sources: T[], reler: unknown, text = ""): T[] {
  const asks = [...(Array.isArray(reler) ? reler : []), ...(Array.isArray(reler) && reler.length ? [text] : [])].map(x => plain(String(x ?? ""))).filter(Boolean);
  if (!asks.length) return [];
  const kinds: [RegExp, string[]][] = [[/\b(ppt|pptx|powerpoint|deck|slides?|apresentacao)\b/, ["pptx", "pdf"]], [/\bpdf\b/, ["pdf"]], [/\b(doc|docx|word|documento)\b/, ["docx"]]];
  return sources.filter(s => {
    const name = plain(s.name);
    return asks.some(a => a.includes(name) || name.includes(a) || name.split(" ").some(w => w.length > 4 && a.includes(w))
      || kinds.some(([re, list]) => re.test(a) && list.includes(s.kind)));
  });
}

/** The case generator's plan and draft, as they are, called from the conversation. */
async function runGenerator(slug: string, material: CaseMaterial, step: "plano" | "rascunho", lastPlan?: CasePlan, change?: string) {
  const ctx = await loadDraftContext(slug, material);
  if (step === "rascunho") {
    if (!lastPlan) throw new Error("Ainda não há estrutura na conversa: peça para ver a estrutura primeiro.");
    const r = await writeDraft(ctx, lastPlan);
    const notes = r.findings.length ? ` Ficaram ${r.findings.length} avisos para você olhar no editor.` : "";
    return { message: { text: `Rascunho no editor, na aba Conteúdo. Nada foi gravado: revise e clique em Salvar.${notes}` }, tokens: r.tokens.total, draft: r.body, draftData: r.data };
  }
  const notes = change && lastPlan ? `Estrutura anterior:\n${planToText(lastPlan)}\n\nAjuste pedido pelo Gutto: ${change}` : "";
  const r = await proposePlan(ctx, notes);
  return { message: { text: `${change ? "Ajustei a estrutura." : "Uma proposta de estrutura."} Me diga o que mudar ou peça o rascunho.`, plan: r.plan }, tokens: r.tokens };
}


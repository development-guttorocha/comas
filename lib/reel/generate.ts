import path from "node:path";
import sharp from "sharp";
import { listMedia, readCaseFiles } from "@/lib/admin/caseStore";
import { blocksToMarkdown } from "@/lib/siteMarkdown";
import { SITE_URL } from "@/lib/seo";
import { layOut, trackBeats, BAR, MIN_BEATS, MAX_BEATS } from "@/lib/reel/layout";
import { beatLength, type ReelTrack } from "@/lib/reel/tracks";
import { getReelTrack } from "@/lib/reel/trackStore";
import { AUDIENCE_OPTIONS, FOCUS_OPTIONS, PERSONALITY_OPTIONS, ctaFor, type ReelAudience, type ReelParams } from "@/lib/reel/params";
import { askJson, deepSeekConfig } from "@/lib/reel/deepseek";
import { hasPicture, type ReelDir, type ReelDoc, type ReelEnter, type ReelScene } from "@/lib/reel/types";
import { FOCUS_X } from "@/lib/reel/screens";
import { mediaFilePath } from "@/lib/admin/materialMedia";

// Drafts a case video with DeepSeek, from the case's text and its images. The model picks
// the story (scenes, order, short lines, images, lengths in bars); the code does the rest:
// ids, beats, cameras and entrances, and it drops anything it cannot trust (an image that
// is not in the case, a scene without its content).


type Img = { src: string; w: number; h: number; shape: "larga" | "vertical" | "quadrada" };

async function caseImages(slug: string, markdown: string): Promise<Img[]> {
  // images used in the case text first, in reading order
  const used = [...markdown.matchAll(/\]\((\/cases\/[^)\s]+)\)/g)].map((m) => m[1]);
  // covers of videos, mobile crops and exported copies only repeat other images
  const files = (await listMedia(slug)).filter(
    (f) => /\.(png|jpe?g|webp)$/i.test(f.name) && (used.includes(f.url) || !/-(capa|mobile)\.|^ca-r3-|^\d\d-/.test(f.name)),
  );
  const order = (src: string) => {
    const i = used.indexOf(src);
    return i < 0 ? 1000 : i;
  };
  const list = await Promise.all(
    files.map(async (f): Promise<Img | null> => {
      try {
        const meta = await sharp(mediaFilePath(f.url) ?? path.join(process.cwd(), "public", f.url)).metadata();
        const w = meta.width ?? 0;
        const h = meta.height ?? 0;
        if (w < 600 && h < 600) return null;
        const r = w / h;
        return { src: f.url, w, h, shape: r > 1.3 ? "larga" : r < 0.8 ? "vertical" : "quadrada" };
      } catch {
        return null;
      }
    }),
  );
  return list.filter((i): i is Img => !!i).sort((a, b) => order(a.src) - order(b.src)).slice(0, 60);
}

const SCENE_GUIDE = `Tipos de cena (campos de cada um; textos curtos, em português do Brasil):
- "title": frase grande que entra palavra por palavra. lines: 1 a 3 linhas (máx. ~22 caracteres cada). eyebrow: sobretítulo curto opcional. image: foto de fundo opcional (escurecida). Bom para abrir.
- "flow": etapas em círculos. heading (1 linha), nodes: 3 a 5 {title (1-3 palavras), accent: true só na etapa final}. caption opcional (1 frase).
- "number": um número que conta. value (número puro, sem pontos), prefix/suffix opcionais, na posição em que aparecem no texto (ex.: suffix "milhões"; "2000+" é value 2000 e suffix "+"), label (o que o número é). Opcional: barsTitle e bars (até 5 {label, value em %}). source opcional.
- "list": heading (1 frase) e items (3 a 5, cada um até ~28 caracteres). image vertical opcional ao lado.
- "cards": heading e cards (2 a 4 {title até ~24 caracteres}; o título carrega a ideia inteira, não há texto embaixo). numbered: true só quando a ordem dos cards importa (etapas em sequência); senão omita.
- "screens": pranchas de telas do produto. title opcional (até ~28 caracteres). boards: 1 a 4 {src: imagem LARGA, focus: "left" | "center" | "right" (qual tela da prancha a câmera aproxima)}.
- "compare": antes e depois. before {src, label}, after {src, label}. Use duas imagens LARGAS do mesmo tipo de tela.
- "metrics": resultado. value (texto curto com um número, ex.: "+99%"; sem número não é métrica, use "title"), label (1-2 linhas), gauges: 0 a 3 {value (0-100), prefix, suffix, label}. note opcional (período ou fonte).
- "image": uma imagem. src, fit: "contain" (imagem inteira) ou "split" (imagem à esquerda e texto à direita: eyebrow, lines, body).
Tratamento de imagem (em "title" com image, "list" com image e "image"; todos opcionais):
- imgFrame: "phone" para print de tela de celular (imagem vertical estreita), "browser" para print de tela de computador, "card" para foto ou slide, "none" para foto de pessoas ou ambiente.
- imgMotion: "scroll" para print longo (bem mais alto que largo); "focus" para aproximar de um detalhe citado no texto (com imgFocus); "in" ou "out" para fotos; "panRight"/"panLeft" para imagens largas com muita informação; "still" quando o texto da cena é que importa.
- imgEnter: "crop", "rise", "side", "circle", "far", "fade" ou "none". Varie entre as cenas; "circle" e "far" chamam atenção, use no máximo uma vez cada.
- imgFocus: o ponto que importa na imagem, "x% y%" (ex.: "30% 20%" é o alto à esquerda).
- "quote": depoimento. quote: a fala LITERAL de alguém que está no texto do case, palavra por palavra (até ~180 caracteres; corte só no fim de uma frase), author (nome como no texto), role (cargo e empresa, se o texto disser). Só use se o texto tiver uma fala entre aspas de outra pessoa; nunca reescreva nem invente.
- "role": o papel do autor em fatos. heading (uma afirmação, ex.: "Liderei o design do app *do zero*."), facts: 2 a 4 {label (1-2 palavras: "Função", "Time", "Tempo", "Escopo"), value (até ~28 caracteres)}. Só fatos que estão no texto.
- "delta": um número antes e depois. label (o que o número mede, 1 linha), before {value: número puro, caption curta}, after {value, caption}, prefix/suffix opcionais (ex.: suffix "M", "%", "dias"). Use só quando o texto traz OS DOIS números; mais forte que "metrics" quando há um antes claro. note opcional (período ou fonte).
- "end": encerramento. lines (2 linhas, a ideia central do case), meta (empresa · papel · ano).
Em lines, label e heading, marque com *asteriscos* 1 a 3 palavras para destacar na cor do case (ex.: "*ganhar dinheiro* aqui?"). Em textos longos use "\\n" para quebrar linha.`;

const MOTION_RULES = `Direção de movimento (o código anima; você decide o que entra em cada cena):
- Uma ideia por cena. O elemento principal (a frase, o número, a tela) é o herói e domina a cena.
- Poucos elementos por cena: prefira 3 a 4 itens a 6.
- Alterne o ritmo: depois de uma cena densa, uma cena de respiro (uma frase, uma imagem, um número).`;

/**
 * What each audience came to see, and so the story the video tells them. Clients (who buy) get a
 * sales pitch; recruiters and hiring managers (who skim a portfolio in about 30 seconds, looking
 * for the candidate's part, scope, decisions and result) get a hiring case; designers (peers, who
 * want the reasoning, the trade-offs and what went wrong) get a conversation about the work.
 */
const AUDIENCE_STORY: Record<ReelAudience, { role: string; frame: string; structure: string; checks: string; tone: string }> = {
  clientes: {
    role: "Você é um diretor criativo que faz vídeos curtos de portfólio que vendem.",
    frame: "Este vídeo é um PITCH, não um resumo do case. Ele existe para ${goal}.",
    structure: `Estrutura obrigatória, nesta ordem:
1. GANCHO (primeira cena, até 8 batidas): o resultado mais forte OU a tensão do problema, em até 7 palavras. Nada de apresentar empresa ou contexto primeiro. Ex.: "5,2M → 17,8M sessões. Com 3 pessoas." / "Plantão em planilha e WhatsApp?"
2. O QUE ESTAVA EM JOGO (1 cena): o problema de negócio em uma frase concreta, com número se houver.
3. O QUE EU FIZ (2 a 3 cenas): decisões do autor, com verbo em primeira pessoa no passado (decidi, convenci, cortei, desenhei, montei, priorizei). Cada cena é UMA decisão e o porquê. É aqui que quem assiste entende como o autor pensa.
4. PROVA (1 a 3 cenas): telas, antes e depois, o produto funcionando. Se houver imagens largas, use "screens" ou "compare". Um depoimento ("quote") de cliente ou liderança, se houver no texto, é a prova mais forte: use-o aqui ou logo antes do fechamento.
5. IMPACTO (1 cena "metrics", "number" ou "delta"): o número que mais importa, grande. Se o case tem um resultado numérico, ele aparece TAMBÉM no gancho ou na segunda cena: quem assiste só 10 segundos precisa ver a prova.
6. FECHAMENTO ("end"): uma frase que posiciona o autor (o que ele faz por quem contrata), não uma moral genérica. O botão do fim já está definido: "\${cta}".`,
    checks: `- "gancho": a primeira cena traz o resultado ou a tensão em até 7 palavras, sem apresentar contexto.
- "provaCedo": se o case tem número de resultado, ele aparece na primeira ou na segunda cena.
- "papelDoAutor": pelo menos 2 cenas com decisões do autor em primeira pessoa.
- "fechamento": a cena "end" posiciona o autor para quem contrata.`,
    tone: "Na dúvida, liderança pede \"premium\" ou \"corporate\"; produto de consumo e growth pedem \"energetic\".",
  },
  recrutadores: {
    role: "Você é um diretor criativo que já trabalhou com recrutamento de design. Faz vídeos curtos de portfólio para recrutadores e gestores de contratação, que olham cada case por cerca de 30 segundos e decidem ali se chamam para conversa.",
    frame: `Este vídeo é um case de CONTRATAÇÃO, não um anúncio. Ele existe para \${goal}.
Quem assiste quer responder, nesta ordem e rápido: qual era o papel do autor (função, tamanho do time, tempo, escopo)? Que problema de negócio ele tinha nas mãos? O que ELE decidiu, e o que foi do time? Que resultado saiu? Ele trabalha bem com produto, engenharia e liderança? Se o vídeo parar aos 15 segundos, as três primeiras respostas já precisam ter aparecido.`,
    structure: `Estrutura obrigatória, nesta ordem:
1. QUEM E O RESULTADO (primeira cena, até 8 batidas): a função do autor e o resultado mais forte, ou a função e o problema se não houver número. Ex.: "Head de Design. 2 produtos em 2 meses." / "Liderei 12 squads de design." Nada de slogan.
2. O PAPEL (cena "role", obrigatória se o texto disser função, time, tempo ou escopo): 3 ou 4 fatos curtos (Função, Time, Tempo, Escopo, Com quem), só com o que está no texto.
3. O PROBLEMA DE NEGÓCIO (1 cena): o que estava em jogo para a empresa, em uma frase concreta, com número se houver.
4. AS DECISÕES DO AUTOR (2 cenas): cada uma é UMA decisão dele e o motivo, em primeira pessoa no passado (decidi, propus, convenci, priorizei, estruturei, contratei). Mostre julgamento: o que ele escolheu fazer E o que escolheu NÃO fazer, se o texto disser. Se o case tem liderança, uma das decisões é de gestão (time, processo, alinhamento com produto e engenharia, influência na liderança).
5. RESULTADO (1 cena "metrics", "number" ou "delta"): o número que mais importa, grande, com o que ele mede.
6. PROVA (1 cena): um depoimento ("quote") de liderança, par ou cliente, se houver no texto, é o que mais pesa para quem contrata. Sem depoimento, telas do produto ("screens" ou "compare").
7. FECHAMENTO ("end"): o tipo de problema que o autor resolve e em que nível (ex.: "Design que move o negócio, de squad a diretoria"), só com o que o case mostra. Nada de "contrate-me". O botão do fim já está definido: "\${cta}".
Linguagem para quem não é designer: troque jargão de design (heurística, affordance, tokens, wireframe, discovery) pelo efeito no negócio ou no usuário. Dê crédito ao time: "liderei", "com o time", "convenci" no lugar de assumir sozinho o que o time fez.`,
    checks: `- "papelCedo": a função do autor aparece na primeira cena, e função, time ou tempo estão claros até a terceira cena (de preferência numa cena "role").
- "provaCedo": se o case tem número de resultado, ele aparece na primeira ou na segunda cena.
- "decisoes": 2 cenas com decisões do próprio autor e o motivo, em primeira pessoa; se o case tem liderança, uma delas é de gestão.
- "semJargao": nenhum termo técnico de design que um recrutador não entenda.
- "creditoAoTime": fica claro o que foi do autor e o que foi do time.
- "fechamento": a cena "end" diz que problema o autor resolve e em que nível, sem pedir emprego.`,
    tone: "Para recrutadores, prefira \"premium\" ou \"corporate\": texto fácil de ler, cenas que dão tempo de ler. Use \"energetic\" só em case de produto de consumo com resultado forte.",
  },
  designers: {
    role: "Você é um diretor criativo e designer sênior. Faz vídeos curtos de portfólio para outros designers, que querem entender como o autor pensou, não ouvir propaganda.",
    frame: `Este vídeo é uma CONVERSA ENTRE DESIGNERS, não um pitch. Ele existe para \${goal}.
Quem assiste é da área e quer: o problema de design difícil de verdade (não o de negócio); as restrições reais (prazo, legado, tecnologia, time); as decisões com o trade-off (o que foi escolhido, o que ficou de fora e por quê); o que não funcionou ou mudou no caminho; detalhes de execução nas telas; e o que dá para levar para o próprio trabalho. Não explique o básico de design para designer.`,
    structure: `Estrutura obrigatória, nesta ordem:
1. A PERGUNTA DE DESIGN (primeira cena, até 8 batidas): a tensão de design do case, como pergunta ou restrição, em até 8 palavras. Ex.: "Como caber 12 squads em um só app?" / "Um catálogo que o Google entende." Não abra com número de negócio.
2. AS RESTRIÇÕES (1 cena, "list" ou "cards"): o que limitava as escolhas (prazo, legado, tecnologia, tamanho do time, regras do negócio), só o que está no texto.
3. AS DECISÕES E OS TRADE-OFFS (3 cenas): cada cena é UMA decisão de design e o que se abriu mão por ela ("Escolhi X em vez de Y porque…"). Mostre a decisão na tela sempre que houver imagem: "compare" (antes e depois), "screens" com foco no detalhe, "flow" para arquitetura e fluxo, "image" split para um detalhe com uma frase. O título de "screens" tem no máximo 28 caracteres: quando a decisão e o trade-off não cabem nisso, use "image" split (frase curta nas linhas, o "em vez de" no body).
4. O QUE MUDOU NO CAMINHO (1 cena, se o texto tiver): uma hipótese que caiu, uma versão que não funcionou, uma discussão que mudou o rumo.
5. O RESULTADO (1 cena "metrics", "number" ou "delta"): curto. Aqui o resultado confirma as decisões; não é o clímax.
6. FECHAMENTO ("end"): o princípio que fica do case, específico e acionável (ex.: "Estrutura antes de tela."), não uma moral genérica. O botão do fim já está definido: "\${cta}".
Linguagem de par: vocabulário de design é bem-vindo (arquitetura de informação, design system, fluxo, hierarquia, pesquisa), sem enfeite. Mais telas e menos frases de efeito.`,
    checks: `- "perguntaDeDesign": a primeira cena traz a tensão de design (não um número de negócio) em até 8 palavras.
- "restricoes": uma cena diz o que limitava as escolhas.
- "tradeoffs": pelo menos 2 cenas com decisão do autor e o que se abriu mão, em primeira pessoa.
- "mostra": pelo menos 2 decisões aparecem em imagem ("compare", "screens", "image" ou "flow"), se o case tem imagens, e nenhum título de "screens" passa de 28 caracteres.
- "honesto": se o texto conta algo que não funcionou ou mudou, isso aparece.
- "fechamento": a cena "end" é um princípio específico deste case, não uma moral genérica.`,
    tone: "Para designers, escolha pelo case: \"premium\" para sistemas e liderança, \"energetic\" para produto de consumo. Dê tempo às cenas de tela.",
  },
};

/** Rules every script follows, whoever watches. */
const TEXT_RULES = `Regras de texto (cada uma será conferida):
- Cada frase afirma algo concreto: um número, uma decisão, uma mudança. Se a frase serviria para qualquer case, reescreva.
- Títulos de cena são afirmações, nunca rótulos de seção. Ruim: "Os 4 pilares do app", "O que ficou pronto", "Conceitos para os dois lados", "Três tribos, cada uma com uma missão", "Resultados". Bom: "Mostrei o dinheiro antes do cadastro.", "2 produtos no ar em 2 meses.", "Dividi 12 squads pelo que o lojista precisa.", "+99% de creators ganhando dinheiro." (exemplos de ESTILO; use só os fatos deste case).
- Proibido: "pilares", "o que ficou", "conceitos", "jornada", "transformação", "inovação", "de ponta a ponta", "potencializar", "alavancar", "experiência incrível", "não é só", "mais do que", "o desafio", e títulos de uma palavra só ("Contexto", "Resultados", "Solução").
- Números sempre em algarismos e com unidade ("17,8M sessões", "2 meses", "+46% de conversão").
- Variedade visual: no máximo 3 cenas "title" (contando a primeira), no máximo 1 "cards", 1 "list", 1 "quote" e 1 "role", e pelo menos 4 tipos diferentes no vídeo. Uma decisão do autor pode ser "image" split (imagem + frase), "compare" ou "screens" com título, não só "title".
- Destaque: no máximo UM trecho entre *asteriscos* por cena, de 1 a 3 palavras (o número ou a palavra que decide a frase). Destacar tudo é não destacar nada.
- Atribuição fiel: o autor só "fez" o que o texto diz que ele fez. Se o time executou e ele propôs, convenceu ou liderou, diga isso ("Convenci o time a reescrever o backend", não "Reescrevi o backend").
- Sem cena de enchimento: toda cena precisa de uma afirmação completa. Nada de cena só com "6 meses depois." ou um número sem o que ele prova (ex.: "3" sozinho).
- Frases curtas: títulos com até 8 palavras; linhas de "title" e "end" com até 22 caracteres.
- Legível no celular: o vídeo aparece pequeno no telefone, então não há letra miúda. Etapas de "flow" e "cards" têm só o título (sem body); legendas e notas com no máximo 1 frase curta.
- Uma imagem aparece em uma cena só: nunca repita a mesma imagem (nem a da abertura) em outra cena.
- Mostre o trabalho: prefira "screens", "compare" e "image" (com imgMotion "focus" e imgFocus no componente que prova a decisão) a cenas só de texto. As telas que sobrarem entram sozinhas, escurecidas, atrás das cenas de texto.`;

const COMMON_CHECKS = `- "concreto": nenhuma frase genérica, nenhum título-rótulo, nenhuma palavra proibida.
- "variedade": no máximo 3 "title", 1 "cards", 1 "list", 1 "quote" e 1 "role", e pelo menos 4 tipos diferentes.
- "destaque": no máximo um trecho entre asteriscos por cena.
- "atribuicao": nenhuma ação do time atribuída só ao autor.
- "semEnchimento": nenhuma cena sem afirmação completa.
- "fiel": todo número, nome e fato está no texto do case, escrito como lá (nenhum número calculado ou arredondado); todo depoimento é a fala literal que está no texto.`;

/** The story for this audience, with its goal and the end button filled in. */
function storyFor(params: ReelParams) {
  const audience = AUDIENCE_OPTIONS.find((o) => o.value === params.audience) ?? AUDIENCE_OPTIONS[1];
  const story = AUDIENCE_STORY[audience.value];
  const fill = (t: string) => t.replaceAll("${goal}", audience.goal).replaceAll("${cta}", audience.cta.label);
  return { audience, story, rules: `${fill(story.frame)}\n\n${fill(story.structure)}\n\n${TEXT_RULES}`, checks: `${story.checks}\n${COMMON_CHECKS}` };
}

function systemPrompt(track: ReelTrack, maxBeats: number, params: ReelParams) {
  const sections = track.sections.filter((s) => s.beat < maxBeats).map((s) => `batida ${s.beat}: ${s.label}`).join("; ");
  const seconds = Math.round(maxBeats * beatLength(track));
  const minScenes = Math.max(4, Math.round(seconds / 7));
  const maxScenes = Math.max(minScenes + 1, Math.round(seconds / 5));
  const { audience, story, rules } = storyFor(params);
  const music = track.steady === false
    ? `Música (${track.title}): não tem batida marcada. Aqui uma "batida" vale meio segundo; as partes da música, por energia, são: ${sections}. Corte nas mudanças de energia, não em compassos.`
    : `Música (${track.title}, ${track.bpm} BPM, 4 batidas por compasso): ${sections}.`;
  const personality = params.personality === "auto"
    ? `Escolha a personalidade de movimento que combina com o case e o público e devolva em "motion": ${PERSONALITY_OPTIONS.filter((o) => o.value !== "auto").map((o) => `"${o.value}" (${o.hint})`).join("; ")}. ${story.tone}`
    : `Personalidade de movimento já escolhida: "${params.personality}". Escreva no mesmo tom: ${PERSONALITY_OPTIONS.find((o) => o.value === params.personality)?.hint}`;
  return `${story.role} Monte o roteiro de um vídeo de cerca de ${seconds} segundos sobre um case do designer Gutto Rocha (o autor), para tocar na página do case.

${rules}

Quem assiste: ${audience.prompt}
Ênfase pedida: ${FOCUS_OPTIONS.find((o) => o.value === params.focus)?.prompt}

Regras de fidelidade:
- Use SOMENTE fatos, números e nomes que estão no texto do case. Nunca invente números, prazos, nomes ou resultados. Se o case não tem número de resultado, a primeira cena traz a tensão do problema.
- Números exatamente como estão no texto: não calcule novos (porcentagens de variação, somas, médias) e não arredonde ("quase dez anos" continua "quase 10 anos").
- Use apenas imagens da lista fornecida, pelo caminho exato. Imagens "larga" servem para "screens" e "compare"; "vertical" para "list" ou "image" split; foto de pessoas serve de fundo em "title".
- Entre ${minScenes} e ${maxScenes} cenas. Comece com "title" e termine com "end".

${MOTION_RULES}

${personality}

${music} O vídeo não pode passar de ${maxBeats} batidas no total; chegue perto desse total.
Cada cena tem "beats": a duração, em múltiplos de ${BAR}, entre ${MIN_BEATS} e ${MAX_BEATS} (8 a 16 é o comum). Cada cena começa na soma das durações das anteriores. Faça as cenas de prova e impacto começarem nos drops, e use os respiros para uma frase de impacto.
Dê "chapter" (1-2 palavras) às cenas que abrem uma parte da história (até 6 capítulos).

${SCENE_GUIDE}

Responda só com JSON: {"title": "linha curta para a capa do vídeo, com o resultado ou a tensão", "motion": "energetic|premium|corporate|playful", "scenes": [{"kind": "...", "beats": 12, "chapter": "...", ...campos do tipo}]}`;
}

/** The second pass: the AI checks its own script against the pitch rules and rewrites what fails. */
function reviewPrompt(params: ReelParams) {
  const { audience, rules, checks } = storyFor(params);
  return `Você é o editor-chefe que revisa roteiros de vídeos de portfólio antes de publicar. Este vídeo é para ${audience.label.toLowerCase()}. Recebe o texto do case e um roteiro em JSON. Confira o roteiro contra estas regras e REESCREVA o que falhar, mantendo o que já está bom. Se o roteiro segue a estrutura de outro público (por exemplo, um pitch de venda para um vídeo de recrutadores ou designers), reescreva-o na estrutura deste.

${rules}

Checklist (responda cada item com true ou false, sobre o roteiro FINAL que você devolver):
${checks}

Seja exigente: marque false sempre que houver dúvida, e corrija. Mantenha a soma de "beats" igual ou menor e as imagens pelos caminhos da lista. Troque o "kind" de uma cena quando for preciso para cumprir a estrutura ou "variedade" (use os campos do novo tipo).
Responda só com JSON: {"checklist": {...}, "title": "...", "motion": "...", "scenes": [...]}`;
}

// ── sanitizing the model's answer ────────────────────────────────────────────

type Raw = Record<string, unknown>;
/** Trimmed text within max characters, cut on a whole word (never "em u"). */
const str = (v: unknown, max = 160) => {
  if (typeof v !== "string" || !v.trim()) return undefined;
  const t = v.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  const at = cut.lastIndexOf(" ");
  return (at > max * 0.5 ? cut.slice(0, at) : t.slice(0, max)).replace(/[\s,;:–-]+$/, "");
};
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined);
const strs = (v: unknown, max = 6, len = 60) => (Array.isArray(v) ? v.map((x) => str(x, len)).filter((x): x is string => !!x).slice(0, max) : typeof v === "string" ? str(v, len * max)?.split("\n").filter(Boolean).slice(0, max) : undefined);
const objs = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x): x is Raw => !!x && typeof x === "object").slice(0, max) : []);
const clean = <T extends Raw>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length))) as T;


const IMG_ENTER = ["none", "rise", "side", "circle", "crop", "far", "fade"] as const;
const IMG_MOTION = ["still", "in", "out", "panRight", "panLeft", "scroll", "focus"] as const;
const IMG_FRAME = ["none", "phone", "browser", "card"] as const;
const pickOf = <T extends string>(v: unknown, list: readonly T[]) => (list.includes(v as T) ? (v as T) : undefined);
const focusOf = (v: unknown) => (typeof v === "string" && /^\d{1,3}% \d{1,3}%$/.test(v.trim()) ? v.trim() : undefined);
/** The image treatment the AI chose, kept only when valid. */
const imgFx = (raw: Raw, frames = true) => ({
  imgEnter: pickOf(raw.imgEnter, IMG_ENTER),
  imgMotion: pickOf(raw.imgMotion, IMG_MOTION),
  imgFrame: frames ? pickOf(raw.imgFrame, IMG_FRAME) : undefined,
  imgFocus: focusOf(raw.imgFocus),
});

/** Text compared loosely: no accents, stars, quotes or punctuation, single spaces. */
const plain = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[*“”"'‘’«»]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").toLowerCase().trim();
/** A number as the case could have written it: 5.2 → "5,2" or "5.2"; 1200 → "1200", "1.200" or "1 200". */
const writtenIn = (text: string, n: number) => {
  const raw = String(n);
  const forms = [raw, raw.replace(".", ","), n.toLocaleString("pt-BR"), n.toLocaleString("pt-BR").replace(/\./g, " ")];
  return forms.some((f) => new RegExp(`(?<!\\d[.,]?)${f.replace(/[.\\]/g, "\\$&")}(?![.,]?\\d)`).test(text));
};

function sceneFrom(raw: Raw, images: Set<string>, beats: number, caseText: string): ReelScene | null {
  const img = (v: unknown) => {
    const s = str(v, 300)?.replace(SITE_URL, "");
    return s && images.has(s) ? s : undefined;
  };
  const base = { id: "", at: 0, chapter: str(raw.chapter, 24) };
  switch (raw.kind) {
    case "title": {
      const lines = strs(raw.lines, 3, 40);
      const image = img(raw.image);
      return lines ? clean({ ...base, kind: "title" as const, lines, eyebrow: str(raw.eyebrow, 60), image, ...(image ? imgFx(raw, false) : {}), wordsAt: 1, step: 1 }) : null;
    }
    case "flow": {
      const nodes = objs(raw.nodes, 5).map((n) => clean({ title: str(n.title, 24) ?? "", body: str(n.body, 40), accent: n.accent === true ? true : undefined })).filter((n) => n.title);
      const heading = str(raw.heading, 80);
      if (!heading || nodes.length < 2) return null;
      const step = Math.max(1, Math.min(2, Math.floor((beats - 4) / nodes.length)));
      return clean({ ...base, kind: "flow" as const, eyebrow: str(raw.eyebrow, 40), heading, nodes, nodesAt: 2, step, caption: str(raw.caption, 160), captionAt: Math.min(beats - 3, 2 + nodes.length * step + 1) });
    }
    case "number": {
      const value = num(raw.value);
      const label = str(raw.label, 60);
      if (value === undefined || !label) return null;
      const bars = objs(raw.bars, 5).map((b) => ({ label: str(b.label, 28) ?? "", value: num(b.value) ?? 0 })).filter((b) => b.label);
      return clean({ ...base, kind: "number" as const, eyebrow: str(raw.eyebrow, 40), value, prefix: str(raw.prefix, 6), suffix: str(raw.suffix, 14), label, countBeats: 4, barsTitle: bars.length ? str(raw.barsTitle, 40) : undefined, bars, barsAt: 6, step: 1, source: str(raw.source, 80) });
    }
    case "list": {
      const heading = str(raw.heading, 90);
      const items = strs(raw.items, 5, 36);
      if (!heading || !items) return null;
      const step = items.length > 4 ? 1 : 2;
      const image = img(raw.image);
      return clean({ ...base, kind: "list" as const, eyebrow: str(raw.eyebrow, 40), heading, items, itemsAt: Math.max(2, Math.min(6, beats - 2 - items.length * step)), step, image, ...(image ? imgFx(raw) : {}) });
    }
    case "cards": {
      const heading = str(raw.heading, 70);
      const cards = objs(raw.cards, 4).map((c) => ({ title: str(c.title, 30) ?? "", body: str(c.body, 110) ?? "" })).filter((c) => c.title);
      if (!heading || cards.length < 2) return null;
      return clean({ ...base, kind: "cards" as const, eyebrow: str(raw.eyebrow, 40), heading, cards, numbered: raw.numbered === true ? true : undefined, cardsAt: 2, step: Math.max(1, Math.min(2, Math.floor((beats - 3) / cards.length))) });
    }
    case "screens": {
      const boards = objs(raw.boards, 4).map((b) => ({ src: img(b.src), focus: (b.focus === "left" || b.focus === "right" ? b.focus : "center") as keyof typeof FOCUS_X })).filter((b): b is { src: string; focus: keyof typeof FOCUS_X } => !!b.src);
      if (!boards.length) return null;
      return clean({ ...base, kind: "screens" as const, title: str(raw.title, 40), titleOut: Math.min(3.75, beats / boards.length - 0.5), shots: [], boards });
    }
    case "compare": {
      const b = raw.before as Raw | undefined;
      const a = raw.after as Raw | undefined;
      const before = img(b?.src);
      const after = img(a?.src);
      if (!before || !after || before === after) return null;
      return { ...base, kind: "compare" as const, before: { src: before, label: str(b?.label, 20) ?? "Antes" }, after: { src: after, label: str(a?.label, 20) ?? "Depois" }, wipeAt: Math.min(4, beats / 2) };
    }
    case "metrics": {
      const value = str(raw.value, 12);
      const label = str(raw.label, 90);
      // a metric is a number: words in the value ("Visão e time") belong to a title, not here
      if (!value || !label || !/\d/.test(value)) return null;
      const gauges = objs(raw.gauges, 3).map((g) => clean({ value: Math.max(0, Math.min(100, num(g.value) ?? 0)), prefix: str(g.prefix, 3), suffix: str(g.suffix, 3), label: str(g.label, 24) ?? "" })).filter((g) => g.label);
      return { ...clean({ ...base, kind: "metrics" as const, value, label, gaugesAt: 4, step: 2, note: str(raw.note, 90) }), gauges };
    }
    case "image": {
      const src = img(raw.src);
      if (!src) return null;
      const split = raw.fit === "split";
      return clean({
        ...base, kind: "image" as const, src, fit: (split ? "split" : "contain") as "split" | "contain",
        ...imgFx(raw),
        eyebrow: split ? str(raw.eyebrow, 40) : undefined, lines: split ? strs(raw.lines, 3, 30) : undefined, body: split ? str(raw.body, 180) : undefined, textAt: 1,
      });
    }
    case "quote": {
      // too long for the screen: keep whole sentences, never a quote cut mid-thought
      const full = str(raw.quote, 2000);
      const quote = full && full.length > 240 ? full.slice(0, 241).match(/^[\s\S]*[.!?…](?=\s|$)/)?.[0] : full;
      const author = str(raw.author, 40);
      // a testimonial is only kept when its words are really in the case
      if (!quote || !author || !plain(caseText).includes(plain(quote))) return null;
      return clean({ ...base, kind: "quote" as const, quote, author, role: str(raw.role, 60), quoteAt: 1 });
    }
    case "role": {
      const heading = str(raw.heading, 80);
      const facts = objs(raw.facts, 4).map((f) => ({ label: str(f.label, 20) ?? "", value: str(f.value, 32) ?? "" })).filter((f) => f.label && f.value);
      if (!heading || facts.length < 2) return null;
      return clean({ ...base, kind: "role" as const, eyebrow: str(raw.eyebrow, 40), heading, facts, factsAt: 2, step: 1 });
    }
    case "delta": {
      const b = raw.before as Raw | undefined;
      const a = raw.after as Raw | undefined;
      const before = num(b?.value);
      const after = num(a?.value);
      const label = str(raw.label, 80);
      // both numbers must be written in the case: none calculated
      if (before === undefined || after === undefined || before === after || !label || !writtenIn(caseText, before) || !writtenIn(caseText, after)) return null;
      return clean({
        ...base, kind: "delta" as const, eyebrow: str(raw.eyebrow, 40), label,
        before: clean({ value: before, caption: str(b?.caption, 30) }), after: clean({ value: after, caption: str(a?.caption, 30) }),
        prefix: str(raw.prefix, 4), suffix: str(raw.suffix, 10), changeAt: 2, note: str(raw.note, 90),
      });
    }
    case "end": {
      const lines = strs(raw.lines, 3, 34);
      return lines ? clean({ ...base, kind: "end" as const, lines, meta: str(raw.meta, 80), signature: "Gutto Rocha" }) : null;
    }
  }
  return null;
}

/**
 * Transitions with one grammar: a dry cut on the beat by default (the words have already left);
 * the case's own curtain only where the music drops; a fade only into or out of a picture.
 */
function transitions(scenes: ReelScene[], track: ReelTrack): { enter: ReelEnter; enterDir?: ReelDir }[] {
  const startsAt = (beat: number, tone: string) => track.sections.some((x) => x.beat === beat && x.tone === tone);
  return scenes.map((s, i) => {
    if (i === 0) return { enter: "cut" as const };
    if (startsAt(s.at, "drop")) return { enter: "curtain" as const };
    if (hasPicture(s) || hasPicture(scenes[i - 1])) return { enter: "fade" as const };
    return { enter: "cut" as const };
  });
}

// ── the call ─────────────────────────────────────────────────────────────────

export async function generateReel(slug: string, params: ReelParams): Promise<{ reel: ReelDoc; tokens: number; checklist?: Record<string, boolean> }> {
  const files = await readCaseFiles(slug);
  if (!files) throw new Error("Case não encontrado.");
  const track = await getReelTrack(params.track);
  if (!track) throw new Error("Adicione uma música antes de gerar o vídeo.");
  // the target length, on whole bars, never past the music
  const maxBeats = Math.min(trackBeats(track) - 2, Math.round(params.seconds / beatLength(track) / BAR) * BAR);
  const c = files.case;
  const markdown = [`# ${c.title} — ${c.company}`, c.summary, `Empresa: ${c.company} · Ano: ${c.year} · Papel: ${c.role}`, blocksToMarkdown(files.body)]
    .filter(Boolean).join("\n\n").replaceAll(SITE_URL, "").slice(0, 40000);
  const images = await caseImages(slug, markdown);

  const cfg = await deepSeekConfig();
  const caseText = `Texto do case (Markdown; as imagens aparecem onde estão no texto):\n\n${markdown}\n\nImagens disponíveis (caminho, tamanho, formato):\n${images.map((i) => `${i.src} (${i.w}×${i.h}, ${i.shape})`).join("\n")}`;
  const notes = params.notes ? `Pedido do autor para este vídeo (siga, desde que não contrarie as regras de fidelidade): ${params.notes}\n\n` : "";
  type Script = { title?: unknown; motion?: unknown; scenes?: unknown; checklist?: Record<string, boolean> };
  // pass 1: the script
  const draftScript = await askJson<Script>(cfg, systemPrompt(track, maxBeats, params), `${notes}${caseText}`, { effort: "high" });
  // pass 2: the AI checks it against the pitch rules and rewrites the weak scenes
  let parsed: Script = draftScript.data;
  let tokens = draftScript.tokens;
  try {
    const reviewed = await askJson<Script>(cfg, reviewPrompt(params), `${notes}${caseText}\n\nRoteiro para revisar:\n${JSON.stringify(draftScript.data)}`, { effort: "low" });
    tokens += reviewed.tokens;
    if (Array.isArray(reviewed.data.scenes) && reviewed.data.scenes.length >= 3) parsed = reviewed.data;
  } catch {
    // the review is a bonus: the first script stands if it fails
  }

  const allowed = new Set(images.map((i) => i.src));
  const lengths: number[] = [];
  const scenes: ReelScene[] = [];
  for (const raw of objs(parsed.scenes, 16)) {
    const beats = Math.min(MAX_BEATS, Math.max(MIN_BEATS, Math.round((num(raw.beats) ?? 8) / BAR) * BAR));
    const scene = sceneFrom(raw, allowed, beats, markdown);
    if (!scene) continue;
    scenes.push({ ...scene, id: `${scene.kind}-${scenes.filter((s) => s.kind === scene.kind).length + 1}` });
    lengths.push(beats);
  }
  if (scenes.length < 3) throw new Error("A IA devolveu poucas cenas aproveitáveis. Tente de novo.");
  // keep inside the music: trim the longest scenes (never the last) until it fits
  while (lengths.reduce((a, b) => a + b, 0) > maxBeats) {
    const i = lengths.slice(0, -1).reduce((best, l, j, all) => (l > all[best] ? j : best), 0);
    if (lengths[i] <= MIN_BEATS) break;
    lengths[i] -= BAR;
  }

  const cta = ctaFor(params.audience);
  const chosen = params.personality !== "auto" ? params.personality : PERSONALITY_OPTIONS.some((o) => o.value === parsed.motion && o.value !== "auto") ? (parsed.motion as ReelDoc["motion"]) : "energetic";
  const draft: ReelDoc = { draft: true, motion: chosen, cta, track: track.id, end: 0, accent: c.brandColor || "#ffffff", title: str(parsed.title, 60) ?? `${c.company} em 1 minuto`, scenes: [] };
  const laid = layOut(draft, scenes, lengths);
  // a picture shows once: a title or list that repeats an earlier image goes on black
  const seen = new Set<string>();
  laid.scenes = laid.scenes.map((sc) => {
    const src = sc.kind === "image" ? sc.src : sc.kind === "title" || sc.kind === "list" ? sc.image : undefined;
    if (!src) return sc;
    if (seen.has(src) && (sc.kind === "title" || sc.kind === "list")) return { ...sc, image: undefined };
    seen.add(src);
    return sc;
  });
  // the work stays on screen: each scene of type gets a case image nobody used yet, dimmed
  // behind it (wide screens first; the closing scene stays clean)
  const shots = [...images.filter((i) => i.shape === "larga"), ...images.filter((i) => i.shape !== "larga")]
    .map((i) => i.src).filter((src) => !seen.has(src) && !laid.scenes.some((sc) => JSON.stringify(sc).includes(src)));
  laid.scenes = laid.scenes.map((sc) => (hasPicture(sc) || sc.kind === "end" || !shots.length ? sc : { ...sc, backdrop: shots.shift() }));
  const picks = transitions(laid.scenes, track);
  laid.scenes = laid.scenes.map((s, i) => ({ ...s, ...picks[i], enterBeats: picks[i].enter === "flash" ? 1 : picks[i].enter === "cut" ? undefined : 1 }));
  if (!laid.scenes[0].chapter) laid.scenes[0] = { ...laid.scenes[0], chapter: "Abertura" };
  laid.cover = Math.min(8, Math.max(0, (laid.scenes[1]?.at ?? 8) - 2));
  return { reel: laid, tokens, checklist: parsed.checklist };
}

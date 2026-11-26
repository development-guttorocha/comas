import test from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import {
  dismissKeys, factsOnly, hasMaterialNumber, isLiteralQuote, plain, itemProblems, materialCounts, materialNumbers, materialQuotes, materialToMarkdown, parseMaterial,
  type CaseMaterial,
} from "./caseMaterial";
import { extractPptx, extractText, readZip } from "./material/extract";
import { applyTurn, type Seg } from "./material/chat";

const deck = (slide: string) => ({ source: "a1", file: "Deck.pptx", where: slide });

const m = parseMaterial({
  problem: { text: "4 em cada 10 tickets eram sobre saldo.", by: "ia", origins: [{ ...deck("slide 2"), excerpt: "Isso vinha direto do suporte: 4 em cada 10 tickets eram sobre saldo." }] },
  roleTeam: { text: "2 designers de produto", by: "ia", origins: [{ ...deck("slide 8"), excerpt: "dois designers de produto" }] },
  results: [
    { metric: "Conversão", value: "+46%", by: "ia", origins: [{ ...deck("slide 9"), excerpt: "+46% de conversão" }] },
    { metric: "Ativação", value: "+80%", by: "ia", origins: [{ ...deck("slide 9"), excerpt: "+75% de ativação" }] },
    { metric: "Retenção", value: "+12%", by: "ia" },
  ],
  quotes: [
    { text: "Agora eu entendo quanto vou ganhar.", author: "Creator", by: "ia", origins: [{ ...deck("slide 11"), excerpt: "“Agora eu entendo quanto vou ganhar.” — Creator ativa" }] },
    { text: "Agora eu entendo tudo sobre ganhos.", author: "Creator", by: "ia", origins: [{ ...deck("slide 11"), excerpt: "“Agora eu entendo quanto vou ganhar.”" }] },
  ],
  junk: 1,
});

test("the first version's plain strings still read", () => {
  const legacy = parseMaterial({ problem: "Queda de 12,5%.", role: { title: "Head" }, results: [{ value: "+5%" }] });
  assert.deepEqual(legacy.problem, { text: "Queda de 12,5%." });
  assert.equal(legacy.roleTitle?.text, "Head");
  assert.deepEqual(itemProblems(legacy.results![0], "results"), [], "what Gutto wrote is trusted");
  assert.deepEqual(parseMaterial(null), {});
});

test("an AI item is a fact only when its excerpts back every number and quote", () => {
  assert.deepEqual(itemProblems(m.problem!), []);
  assert.deepEqual(itemProblems(m.roleTeam!), [], "dois backs 2");
  assert.deepEqual(itemProblems(m.results![0], "results"), []);
  assert.match(itemProblems(m.results![1], "results")[0], /80 sem trecho/);
  assert.match(itemProblems(m.results![2], "results")[0], /sem trecho de origem/);
  assert.deepEqual(itemProblems(m.quotes![0], "quotes"), []);
  assert.match(itemProblems(m.quotes![1], "quotes").join(), /palavra por palavra/);
  const confirmed = { ...m.results![1], origins: [...m.results![1].origins!, { source: "gutto", file: "Você" }] };
  assert.deepEqual(itemProblems(confirmed, "results"), [], "Gutto's confirmation makes it his");
});

test("the generator reads only the facts", () => {
  const f = factsOnly(m);
  assert.equal(f.results?.length, 1);
  assert.equal(f.quotes?.length, 1);
  assert.deepEqual(materialCounts(m), { facts: 4, flagged: 3, decisions: 0, open: 0 });
  assert.ok(hasMaterialNumber(m, 46) && !hasMaterialNumber(m, 80) && !hasMaterialNumber(m, 12));
  assert.deepEqual(materialQuotes(m).map(q => q.text), ["Agora eu entendo quanto vou ganhar."]);
  assert.ok(isLiteralQuote(m, "Agora eu entendo quanto vou ganhar") && !isLiteralQuote(m, "Agora eu entendo tudo sobre ganhos."));
  const md = materialToMarkdown(m);
  assert.match(md, /\+46%/);
  assert.match(md, /Trecho \(Deck\.pptx, slide 9\): “\+46% de conversão”/);
  assert.doesNotMatch(md, /80%|12%|tudo sobre ganhos/);
  assert.ok(materialNumbers(m).every(n => n.value !== 80));
});

test("a conversation turn adds facts with origins, corrects by id and does not bring back what was removed", () => {
  const seg = (id: string, sourceId: string, file: string, where: string, text: string): Seg => ({ id, sourceId, file, where, text, plain: plain(text) });
  const segs = [
    seg("S1", "a1", "Deck.pptx", "slide 9", "+46% de conversão\nFonte: painel de Q4 2024."),
    seg("S2", "gutto", "Você, na conversa", "11 de nov.", "éramos 4 designers, eu liderava"),
  ];
  const current: CaseMaterial = {
    roleTitle: { text: "Head de Design", by: "ia", origins: [{ source: "gutto", file: "Você" }] },
    results: [{ ...m.results![1] }],
    dismissed: dismissKeys({ decision: "Cortei o onboarding de 5 passos", by: "ia" }),
  };
  const next = applyTurn(current, {
    fatos: [
      { campo: "time", texto: "4 designers", fontes: [{ s: "S2", trecho: "éramos 4 designers" }] },
      { id: "F2", campo: "resultado", metrica: "Conversão", depois: "+46%", medidoEm: "painel de Q4 2024", fontes: [{ s: "S1", trecho: "+46% de conversão" }] },
      { campo: "funcao", texto: "Designer", fontes: [{ s: "S9", trecho: "inventado" }] },
      { campo: "decisao", decisao: "Cortei o onboarding de 5 passos", fontes: [] },
      { campo: "periodo", texto: "2024", suposicao: true },
    ],
    faltando: ["De onde vem o +46%?"],
  }, segs);
  assert.equal(next.roleTeam?.text, "4 designers");
  assert.deepEqual(itemProblems(next.roleTeam!), [], "what Gutto said in the conversation is a source");
  assert.equal(next.results?.[0].value, "+46%");
  assert.deepEqual(itemProblems(next.results![0], "results"), [], "Q4 2024 comes from the same slide");
  assert.equal(next.roleTitle?.text, "Head de Design", "a confirmed fact is not replaced by an unsupported guess");
  assert.equal(next.decisions, undefined, "a removed fact does not come back");
  assert.match(itemProblems(next.period!)[0], /suposição/);
  assert.deepEqual(next.questions?.map(q => q.text), ["De onde vem o +46%?"]);
});

/** A ZIP as Office writes it (deflate), small enough to build here. */
function zip(files: Record<string, string>) {
  const locals: Buffer[] = [], centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = deflateRawSync(Buffer.from(text)), n = Buffer.from(name);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(data.length, 18); local.writeUInt16LE(n.length, 26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10); central.writeUInt32LE(data.length, 20); central.writeUInt16LE(n.length, 28); central.writeUInt32LE(offset, 42);
    locals.push(local, n, data); centrals.push(central, n);
    offset += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(centrals), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

test("a .pptx gives its slides in order, with the speaker notes", async () => {
  const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const rel = (id: string, type: string, target: string) => `<Relationship Id="${id}" Type="${R}/${type}" Target="${target}"/>`;
  const rels = (...r: string[]) => `<Relationships>${r.join("")}</Relationships>`;
  const p = (t: string) => `<a:p><a:r><a:t>${t}</a:t></a:r></a:p>`;
  const buf = zip({
    "ppt/presentation.xml": `<p:presentation><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId1"/></p:sldIdLst></p:presentation>`,
    "ppt/_rels/presentation.xml.rels": rels(rel("rId1", "slide", "slides/slide1.xml"), rel("rId2", "slide", "slides/slide2.xml")),
    "ppt/slides/slide1.xml": `<p:sld><p:sp>${p("Resultados")}${p("+46% de convers&#227;o &amp; mais")}</p:sp><a:p><a:fld type="slidenum"><a:t>2</a:t></a:fld></a:p></p:sld>`,
    "ppt/slides/_rels/slide1.xml.rels": rels(rel("rId9", "notesSlide", "../notesSlides/notesSlide1.xml")),
    "ppt/notesSlides/notesSlide1.xml": `<p:notes><p:sp><p:ph type="sldImg"/>${p("ignorar")}</p:sp><p:sp><p:ph type="body"/>${p("Fonte: painel de Q4.")}</p:sp><p:sp><p:ph type="sldNum"/>${p("2")}</p:sp></p:notes>`,
    "ppt/slides/slide2.xml": `<p:sld show="0">${p("Abertura")}</p:sld>`,
  });
  assert.ok(readZip(buf).has("ppt/presentation.xml"));
  const out = await extractPptx(buf, "Deck.pptx");
  assert.deepEqual(out.segments, [
    { where: "slide 1 (oculto)", text: "Abertura" },
    { where: "slide 2", text: "Resultados\n+46% de conversão & mais\n\nNotas do apresentador: Fonte: painel de Q4." },
  ]);
  assert.equal(out.units, 2);
});

test("pasted text is cut into blocks between paragraphs", () => {
  const out = extractText(`${"a".repeat(1000)}\n\n${"b".repeat(1000)}\n\nc`);
  assert.deepEqual(out.segments.map(s => s.where), ["trecho 1", "trecho 2"]);
});

test("the conversation builds the case when asked, and never asks the same thing twice", async () => {
  const { wantsCase, alreadyAsked, pickQuestions, rereadSources } = await import("./material/chat");
  for (const t of ["pode começar a montar o case", "pode criar", "Cria o case e ponto", "quero ver a estrutura", "bora gerar o rascunho"]) assert.ok(wantsCase(t), t);
  for (const t of ["não abri mão de nada", "ainda não temos resultado", "eram 4 designers"]) assert.ok(!wantsCase(t), t);
  const asked = ["Qual era a meta de conversão?", "Do que você abriu mão ao colocar o saldo na home?"];
  assert.ok(alreadyAsked("E qual era a meta de conversão do projeto?", asked));
  assert.ok(!alreadyAsked("Quantas pessoas de engenharia havia no time?", asked));
  assert.deepEqual(pickQuestions(["Qual a meta de conversão?", "Quem mediu a ativação?", "Quem mediu a ativação?", "Qual o prazo?", "Quantos squads?"], asked), ["Quem mediu a ativação?", "Qual o prazo?", "Quantos squads?"]);
  const sources = [{ name: "motivos-abandono.pptx", kind: "pptx" }, { name: "relatorio-impacto.pdf", kind: "pdf" }, { name: "Texto colado 1", kind: "text" }];
  assert.deepEqual(rereadSources(sources, ["o PPT dos motivos"]).map(s => s.name), ["motivos-abandono.pptx", "relatorio-impacto.pdf"]);
  assert.deepEqual(rereadSources(sources, ["relatório"]).map(s => s.name), ["relatorio-impacto.pdf"]);
  assert.deepEqual(rereadSources(sources, []), []);
});

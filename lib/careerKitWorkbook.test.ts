import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeCompetencies,
  analyzeSkills,
  createEmptyWorkbook,
  isWorkbookSubstantivelyEmpty,
  kitCompletion,
  sanitizeWorkbook,
  workbookToMarkdown,
} from "./careerKitWorkbook";

test("createEmptyWorkbook starts clean and substantive check detects empty state", () => {
  const empty = createEmptyWorkbook();
  assert.equal(empty.version, 1);
  assert.equal(empty.currentRole, "pleno");
  assert.equal(empty.targetRole, "senior");
  assert.equal(isWorkbookSubstantivelyEmpty(empty), true);
  assert.equal(kitCompletion(empty).completedModules, 0);
});

test("sanitizeWorkbook clamps malformed roles, skills out of 1..5, and oversized arrays", () => {
  const dirty = {
    currentRole: "diretor-inventado",
    targetRole: "staff",
    moment: "mastering",
    momentNote: "x".repeat(2000),
    competencies: {
      descoberta: "exceeds",
      invalida: "consistent",
      exploracao: "status-fake",
    },
    selfSkills: {
      "pesquisa-quali": 5,
      "dados-quanti": 99,
      "visual-ui": 0,
      "skill-fake": 4,
    },
    leaderSkills: {
      "pesquisa-quali": 3,
      "dados-quanti": 4,
    },
    bragDoc: Array.from({ length: 40 }, (_, i) => ({
      id: `b ${i}`,
      quarter: "Q4",
      delivery: `Entrega ${i}`,
      okr: "Retenção",
      impact: "+12%",
      link: "https://example.com",
    })),
  };

  const clean = sanitizeWorkbook(dirty);
  assert.equal(clean.currentRole, "pleno");
  assert.equal(clean.targetRole, "staff");
  assert.equal(clean.moment, "mastering");
  assert.equal(clean.momentNote.length, 1200);
  assert.deepEqual(clean.competencies, { descoberta: "exceeds" });
  assert.deepEqual(clean.selfSkills, { "pesquisa-quali": 5 });
  assert.deepEqual(clean.leaderSkills, { "pesquisa-quali": 3, "dados-quanti": 4 });
  assert.equal(clean.bragDoc.length, 25);
});

test("analyzeCompetencies and analyzeSkills compute totals, averages, and misalignments", () => {
  const wb = createEmptyWorkbook();
  wb.moment = "mastering";
  wb.competencies = {
    descoberta: "exceeds",
    exploracao: "consistent",
    entrega: "consistent",
    complexidade: "inconsistent",
    autonomia: "not_yet",
  };
  wb.selfSkills = {
    "pesquisa-quali": 5,
    "dados-quanti": 2,
    "visual-ui": 4,
    "interacao-fluxos": 4,
    "negocio-produto": 3,
  };
  wb.leaderSkills = {
    "pesquisa-quali": 3,
    "dados-quanti": 4,
    "visual-ui": 4,
  };
  wb.pdi.missions[0] = {
    id: "m-1",
    mission: "Liderar discovery do checkout",
    strategy: "Entrevistar 12 lojistas e prototipar",
    audience: "Lojistas B2B",
    metric: "Aumentar conversão em 10% até março",
  };

  const comp = analyzeCompetencies(wb);
  assert.equal(comp.total, 12);
  assert.equal(comp.marked, 5);
  assert.equal(comp.exceeds, 1);
  assert.equal(comp.consistent, 2);
  assert.equal(comp.inconsistent, 1);
  assert.equal(comp.notYet, 1);

  const skills = analyzeSkills(wb);
  assert.equal(skills.ratedCount, 5);
  assert.equal(skills.leaderRatedCount, 3);
  assert.equal(skills.selfAvg, 3.6);
  assert.equal(skills.leaderAvg, 3.7);
  assert.equal(skills.topStrengths[0]?.id, "pesquisa-quali");
  assert.equal(skills.focusAreas[0]?.id, "dados-quanti");
  assert.equal(skills.misalignments.length, 2);
  assert.equal(skills.misalignments[0]?.direction, "self_higher"); // +2 on pesquisa-quali vs -2 on dados-quanti
  assert.ok(skills.misalignments.some(m => m.id === "dados-quanti" && m.direction === "leader_higher"));

  const completion = kitCompletion(wb);
  assert.equal(completion.completedModules, 4);
  assert.equal(isWorkbookSubstantivelyEmpty(wb), false);

  const md = workbookToMarkdown(wb, "Maria");
  assert.match(md, /Trilha de carreira em design — Maria/);
  assert.match(md, /Liderar discovery do checkout/);
  assert.match(md, /Pesquisa qualitativa/);
  assert.match(md, /Plano do trimestre/);
  assert.doesNotMatch(md, /Kit de Clareza/i);
});

import test from "node:test";
import assert from "node:assert/strict";
import { buildSurveyResults, emptySurveyResults } from "./salarySurveyResults";

test("emptySurveyResults returns safe waiting state with all core roles queued", () => {
  const res = emptySurveyResults("2027", 3);
  assert.equal(res.edition, "2027");
  assert.equal(res.minGroup, 5);
  assert.equal(res.totalApproved, 0);
  assert.equal(res.hasAnyCut, false);
  assert.equal(res.cutsReadyCount, 0);
  assert.equal(res.waitingRoles.length, 7);
});

test("buildSurveyResults filters groups below minGroup and computes canonical cuts", () => {
  const data = buildSurveyResults(
    [
      { cut: "summary", groupKey: "__all__", sampleCount: 36, p25: 6830, p50: 9430, p75: 13750 },
      { cut: "role", groupKey: "Sênior", sampleCount: 17, p25: 7740, p50: 10500, p75: 12500 },
      { cut: "role", groupKey: "Design Lead", sampleCount: 4, p25: 12000, p50: 14000, p75: 16000 },
      { cut: "role", groupKey: "Pleno", sampleCount: 11, p25: 6000, p50: 6840, p75: 7500 },
      { cut: "regime", groupKey: "PJ", sampleCount: 9, p25: 7600, p50: 11000, p75: 14800 },
      { cut: "regime", groupKey: "CLT", sampleCount: 25, p25: 6200, p50: 7740, p75: 10500 },
      {
        cut: "regime",
        groupKey: "Contratado por empresa de fora do Brasil",
        sampleCount: 5,
        p25: 18000,
        p50: 22000,
        p75: 26000,
      },
      { cut: "region", groupKey: "Sul", sampleCount: 13, p25: 7700, p50: 9861, p75: 12500 },
      { cut: "region", groupKey: "Sudeste", sampleCount: 18, p25: 6925, p50: 9120, p75: 13050 },
      { cut: "state", groupKey: "RS", sampleCount: 5, p25: 9000, p50: 9000, p75: 9861 },
      { cut: "state", groupKey: "SP", sampleCount: 13, p25: 7300, p50: 11000, p75: 15000 },
      { cut: "company_size", groupKey: "Mais de 5.000", sampleCount: 9, p25: 9000, p50: 10500, p75: 12500 },
      { cut: "company_size", groupKey: "Até 50 pessoas", sampleCount: 9, p25: 7000, p50: 7600, p75: 10500 },
      { cut: "sector", groupKey: "Tecnologia / SaaS", sampleCount: 14, p25: 6925, p50: 9120, p75: 14000 },
      { cut: "sector", groupKey: "Banco ou fintech", sampleCount: 8, p25: 7185, p50: 10180, p75: 12750 },
      { cut: "gender", groupKey: "Homem", sampleCount: 20, p25: 7525, p50: 11500, p75: 15075 },
      { cut: "gender", groupKey: "Mulher", sampleCount: 15, p25: 6100, p50: 7300, p75: 9430 },
      { cut: "gender_role", groupKey: "Sênior::Homem", sampleCount: 11, p25: 9750, p50: 11000, p75: 14200 },
      { cut: "gender_role", groupKey: "Sênior::Mulher", sampleCount: 5, p25: 7300, p50: 7740, p75: 9861 },
      { cut: "gender_role", groupKey: "Pleno::Mulher", sampleCount: 8, p25: 6100, p50: 6850, p75: 8025 },
    ],
    { edition: "2027", minGroup: 5 },
  );

  assert.equal(data.totalApproved, 36);
  assert.equal(data.overall?.p50, 9430);
  assert.equal(data.hasAnyCut, true);
  assert.equal(data.cutsReadyCount, 5);

  // Roles ordered canonically (Pleno before Sênior) and Design Lead (< 5) excluded.
  assert.deepEqual(
    data.byRole.map(r => r.key),
    ["Pleno", "Sênior"],
  );
  assert.ok(data.waitingRoles.includes("Design Lead"));
  assert.ok(!data.waitingRoles.includes("Sênior"));

  // Regime ordered CLT -> PJ -> Exterior label mapping, plus PJ vs CLT delta (+42%).
  assert.deepEqual(
    data.byRegime.map(r => r.label),
    ["CLT", "PJ", "Exterior"],
  );
  assert.equal(data.pjVsCltPct, 42);

  // Regions and states sorted by sampleCount desc.
  assert.deepEqual(data.byRegion.map(r => r.key), ["Sudeste", "Sul"]);
  assert.deepEqual(data.byState.map(r => r.key), ["SP", "RS"]);

  // Company size canonical order; sector sorted by p50 desc.
  assert.deepEqual(data.byCompanySize.map(r => r.key), ["Até 50 pessoas", "Mais de 5.000"]);
  assert.deepEqual(data.bySector.map(r => r.key), ["Banco ou fintech", "Tecnologia / SaaS"]);

  // Gender canonical order; gender_role only includes Sênior (2+ genders), hides Pleno (1 gender).
  assert.deepEqual(data.byGender.map(r => r.key), ["Mulher", "Homem"]);
  assert.equal(data.byGenderSameRole.length, 1);
  assert.equal(data.byGenderSameRole[0]?.role, "Sênior");
  assert.deepEqual(
    data.byGenderSameRole[0]?.items.map(g => g.label),
    ["Mulher", "Homem"],
  );
});

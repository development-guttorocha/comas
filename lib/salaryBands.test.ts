import test from "node:test";
import assert from "node:assert/strict";
import {
  bandFor,
  defaultSalaryBands,
  FULL_SURVEY_AT,
  isLikelyOutlier,
  mergeSalaryBands,
  MIN_GROUP,
  PRIOR_WEIGHT_K,
  surveyWeightFor,
} from "./salaryBands";

test("surveyWeightFor respects anonymity threshold, progressive ramp, and full transition", () => {
  for (let n = 0; n < MIN_GROUP; n++) assert.equal(surveyWeightFor(n), 0);
  assert.equal(surveyWeightFor(5), 5 / (5 + PRIOR_WEIGHT_K));
  assert.equal(surveyWeightFor(15), 0.5);
  assert.equal(surveyWeightFor(45), 0.75);
  assert.equal(surveyWeightFor(FULL_SURVEY_AT), 1);
  assert.equal(surveyWeightFor(120), 1);
});

test("mergeSalaryBands keeps 100% baseline below MIN_GROUP while counting approved answers", () => {
  const merged = mergeSalaryBands([
    { roleBandId: "pleno", sampleCount: 4, p25: 12000, p50: 15000, p75: 20000 },
    { roleBandId: "__all__", sampleCount: 6, p25: null, p50: null, p75: null },
  ]);

  const pleno = merged.roles.find(r => r.id === "pleno")!;
  const basePleno = defaultSalaryBands.roles.find(r => r.id === "pleno")!;

  assert.equal(pleno.sampleCount, 4);
  assert.equal(pleno.surveyWeight, 0);
  assert.equal(pleno.p25, basePleno.p25);
  assert.equal(pleno.p50, basePleno.p50);
  assert.equal(pleno.p75, basePleno.p75);
  assert.equal(merged.hasLiveData, false);
  assert.equal(merged.mappedApproved, 4);
  assert.equal(merged.totalApproved, 6);
});

test("mergeSalaryBands blends progressively at n=5, n=15, and n=60+ rounded to R$ 100", () => {
  // Base pleno: p25=7000, p50=8500, p75=10500
  const at5 = mergeSalaryBands([
    { roleBandId: "pleno", sampleCount: 5, p25: 11000, p50: 12500, p75: 14500 },
  ]);
  const r5 = at5.roles.find(r => r.id === "pleno")!;
  assert.equal(r5.surveyWeight, 0.25);
  // 0.75*7000 + 0.25*11000 = 8000; 0.75*8500 + 0.25*12500 = 9500; 0.75*10500 + 0.25*14500 = 11500
  assert.equal(r5.p25, 8000);
  assert.equal(r5.p50, 9500);
  assert.equal(r5.p75, 11500);
  assert.equal(at5.hasLiveData, true);

  const at15 = mergeSalaryBands([
    { roleBandId: "pleno", sampleCount: 15, p25: 9000, p50: 10500, p75: 12500 },
  ]);
  const r15 = at15.roles.find(r => r.id === "pleno")!;
  assert.equal(r15.surveyWeight, 0.5);
  assert.equal(r15.p25, 8000);
  assert.equal(r15.p50, 9500);
  assert.equal(r15.p75, 11500);

  const at60 = mergeSalaryBands([
    { roleBandId: "pleno", sampleCount: 60, p25: 9120, p50: 11140, p75: 13870 },
  ]);
  const r60 = at60.roles.find(r => r.id === "pleno")!;
  assert.equal(r60.surveyWeight, 1);
  assert.equal(r60.p25, 9100);
  assert.equal(r60.p50, 11100);
  assert.equal(r60.p75, 13900);
});

test("mergeSalaryBands enforces monotonic p25 <= p50 <= p75", () => {
  const merged = mergeSalaryBands([
    { roleBandId: "junior", sampleCount: 60, p25: 6000, p50: 5900, p75: 5800 },
  ]);
  const junior = merged.roles.find(r => r.id === "junior")!;
  assert.ok(junior.p25 <= junior.p50);
  assert.ok(junior.p50 <= junior.p75);
});

test("bandFor applies company size and PJ multipliers against supplied live data", () => {
  const live = mergeSalaryBands([
    { roleBandId: "senior", sampleCount: 60, p25: 12000, p50: 14000, p75: 18000 },
  ]);
  const pjBig = bandFor("senior", 3, "PJ", live)!;
  // size 3 factor = 1.1, pjFactor = 1.5 => 1.65x
  assert.deepEqual(pjBig, { p25: 19800, p50: 23100, p75: 29700 });
});

test("isLikelyOutlier flags extreme CLT/PJ values but ignores unmapped roles and international contracts", () => {
  assert.equal(isLikelyOutlier("Pleno", 8500, "501 a 5.000", "CLT"), false);
  assert.equal(isLikelyOutlier("Pleno", 1200, "501 a 5.000", "CLT"), true);
  assert.equal(isLikelyOutlier("Pleno", 50000, "501 a 5.000", "CLT"), true);
  assert.equal(isLikelyOutlier("Pleno", 15000, "501 a 5.000", "PJ"), false);
  assert.equal(isLikelyOutlier("Pleno", 60000, "501 a 5.000", "Contratado por empresa de fora do Brasil"), false);
  assert.equal(isLikelyOutlier("Freelancer ou consultor", 80000, "Até 50 pessoas", "PJ"), false);
});

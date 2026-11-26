import test from "node:test";
import assert from "node:assert/strict";
import { translateUnits } from "./openai";
test("API batches use structured output, validate targets and disable response storage", async () => {
  const originalFetch = globalThis.fetch, originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-only-key";
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    const input = JSON.parse(body.input);
    return Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify({ units: input.units.map((u: { key: string; source: string }) => ({ key: u.key, target: `EN ${u.source}` })) }) }] }] });
  };
  try {
    const units = Array.from({ length: 25 }, (_, i) => ({ key: `unit-${i}`, source: "Crescimento de 20%", target: "" }));
    const result = await translateUnits(units, "Contexto do case");
    assert.equal(result.length, 25); assert.equal(calls, 2);
    assert.equal(result[0].target, "EN Crescimento de 20%");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  }
});
test("exhausted API credit gives an actionable error without leaking credentials", async () => {
  const originalFetch = globalThis.fetch, originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-only-key";
  globalThis.fetch = async () => Response.json({ error: { code: "credit_balance_exhausted", type: "insufficient_quota", message: "Private API error" } }, { status: 429 });
  try {
    await assert.rejects(() => translateUnits([{ key: "title", source: "Design", target: "" }], ""), /Adicione créditos/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  }
});

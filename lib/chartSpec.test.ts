import assert from "node:assert/strict";
import test from "node:test";
import { parseChartSpec, parsePastedTable, readNumber } from "./chartSpec";

test("numbers read the way they are written in Portuguese and in English", () => {
  assert.equal(readNumber("5.200"), 5200);
  assert.equal(readNumber("1.234.567"), 1234567);
  assert.equal(readNumber("3,5"), 3.5);
  assert.equal(readNumber("1.234,5"), 1234.5);
  assert.equal(readNumber("1,234.5"), 1234.5);
  assert.equal(readNumber("17,800"), 17800);
  assert.equal(readNumber("0.125"), 0.125);
  assert.equal(readNumber("R$ 12%"), 12);
  assert.equal(readNumber("-4"), -4);
  assert.equal(readNumber(""), null);
});

test("a pasted spreadsheet becomes categories and series", () => {
  const table = parsePastedTable("Canal\tAntes\tDepois\nOrgânico\t5.200\t17.800\nPago\t3,5\t");
  assert.deepEqual(table?.categories, ["Orgânico", "Pago"]);
  assert.deepEqual(table?.series.map(s => [s.label, s.values]), [["Antes", [5200, 3.5]], ["Depois", [17800, null]]]);
  assert.equal(parsePastedTable("só uma linha"), null);
});

test("a chart needs categories and at least one value", () => {
  assert.equal(parseChartSpec({ categories: ["A"], series: [{ values: [null] }] }), null);
  const spec = parseChartSpec({ type: "pie", categories: ["A", "B"], series: [{ values: [1, "2"] }] });
  assert.equal(spec?.type, "column");
  assert.deepEqual(spec?.series[0]?.values, [1, 2]);
});

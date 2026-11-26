import test from "node:test";
import assert from "node:assert/strict";
import { getCaseCoverSrc } from "./caseCover";

test("covers are the case's own file, or nothing", () => {
  assert.equal(getCaseCoverSrc({ slug: "plenno", heroImage: "/cases/plenno/plenno-header.png" }), "/cases/plenno/plenno-header.png");
  assert.equal(getCaseCoverSrc({ slug: "cdn", heroImage: " https://cdn.example.com/cover.png " }), "https://cdn.example.com/cover.png");
  assert.equal(getCaseCoverSrc({ slug: "none", heroImage: " " }), undefined);
  assert.equal(getCaseCoverSrc({ slug: "missing" }), undefined);
});

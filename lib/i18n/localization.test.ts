import test from "node:test";
import assert from "node:assert/strict";
import portuguese from "./pt.json";
import { collectSiteSources } from "./catalog";
import { getTranslator, localizeData, messagesEn } from "./messages";
import { pageCopy, sitePageMetadata } from "./metadata";
import type { SitePage } from "@/lib/pages/schemas";
import { validateTargets } from "@/lib/translations/document";
import { localizedHref, localePathEnFrom, localePathPtFrom } from "@/lib/navLocalePaths";

test("all institutional source texts have saved translations with unchanged numbers and links", () => {
  const sources = [...collectSiteSources().keys()];
  assert.deepEqual(new Set(Object.keys(portuguese)), new Set(sources));
  const units = sources.map(source => ({ key: source, source, target: "" }));
  assert.doesNotThrow(() => validateTargets(units, sources.map(key => ({ key, target: messagesEn[key] }))));
  for (const source of sources) assert.equal(getTranslator("pt")(source), source);
});

test("language switching retains equivalent institutional and Notion case routes", () => {
  for (const route of ["/", "/sobre", "/contato", "/curriculo", "/cases", "/cases/plenno", "/cases/banco-pan"]) {
    const english = localePathEnFrom(route);
    assert.ok(english);
    assert.equal(localizedHref(route, "en"), english);
    assert.equal(localePathPtFrom(english), route);
    assert.equal(localizedHref(english, "en"), english);
  }
  assert.equal(localePathEnFrom("/cases/modelo"), null);
  assert.equal(localizedHref("https://example.com", "en"), "https://example.com");
});

test("translating static data keeps names, institutions, contacts and original data intact", () => {
  const original = { name: "Oficina Brasil", institution: "Universidade", href: "https://example.com", src: "/image.png", year: "2024", period: "Setembro de 2025 — Atual", body: "Design digital", children: ["Educação"] };
  const result = localizeData(original, getTranslator("en"));
  assert.deepEqual(result, { ...original, period: "September 2025 — Present", body: "Digital design", children: ["Education"] });
  assert.equal(original.body, "Design digital");
});

test("all institutional pages publish reciprocal language metadata and localized titles", async () => {
  for (const page of ["home", "sobre", "cases", "curriculo", "contato"] satisfies SitePage[]) {
    const [pt, en] = await Promise.all([sitePageMetadata(page, "pt"), sitePageMetadata(page, "en")]);
    const [copyPt, copyEn] = await Promise.all([pageCopy(page, "pt"), pageCopy(page, "en")]);
    assert.equal(pt.title, copyPt.title);
    assert.equal(en.title, copyEn.title);
    assert.notEqual(en.title, pt.title);
    assert.deepEqual(en.alternates?.languages, pt.alternates?.languages);
    assert.equal(pt.alternates?.canonical, page === "home" ? "/" : `/${page}`);
    assert.equal(en.alternates?.canonical, page === "home" ? "/en" : `/en/${page}`);
    assert.equal(en.openGraph?.locale, "en_US");
  }
});

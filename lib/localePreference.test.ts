import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { preferredSiteLocale, LOCALE_PREFERENCE_COOKIE } from "./localePreference";
import { proxy } from "@/proxy";

test("browser language negotiation honors regional variants, weights and unsupported languages", () => {
  const scenarios: Array<[string | null, "pt" | "en"]> = [
    ["pt-BR,pt;q=0.9,en;q=0.8", "pt"],
    ["en-US,en;q=0.9,pt;q=0.8", "en"],
    ["en;q=0.3,pt-PT;q=0.9", "pt"],
    ["fr-FR,en-GB;q=0.7,pt;q=0.4", "en"],
    ["EN-us; q=0.8, PT-br; q=0.5", "en"],
    ["pt;q=0,en;q=0.5", "en"],
    ["en;q=invalid,pt;q=0.4", "pt"],
    ["en;q=2,pt", "pt"],
    ["pt;q=0.8,en;q=0.8", "pt"],
    ["es-ES,fr;q=0.9", "pt"],
    [null, "pt"],
  ];
  for (const [header, expected] of scenarios) assert.equal(preferredSiteLocale(header), expected, String(header));
});

test("an explicit saved choice takes priority over the browser", () => {
  assert.equal(preferredSiteLocale("en-US", "pt"), "pt");
  assert.equal(preferredSiteLocale("pt-BR", "en"), "en");
  assert.equal(preferredSiteLocale("en-US", "invalid"), "en");
});

test("only the neutral Home redirects and preserves query strings without shared caching", () => {
  const request = (path: string, method = "GET", cookie?: string) => new NextRequest(`http://localhost:3000${path}`, {
    method, headers: { "accept-language": "en-US,en;q=0.9", ...(cookie ? { cookie } : {}) },
  });
  const response = proxy(request("/?utm_source=portfolio"));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/en?utm_source=portfolio");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("vary"), "Accept-Language, Cookie");
  assert.equal(proxy(request("/", "HEAD")).status, 307);
  assert.equal(proxy(request("/", "GET", `${LOCALE_PREFERENCE_COOKIE}=pt`)).status, 200);
  for (const path of ["/en", "/sobre", "/cases/plenno", "/cases/modelo", "/unknown", "/api/other"]) {
    assert.equal(proxy(request(path)).status, 200, path);
  }
  for (const method of ["POST", "PUT", "OPTIONS"]) assert.equal(proxy(request("/", method)).status, 200, method);
});

test("saved English redirects even when the browser prefers Portuguese", () => {
  const request = new NextRequest("http://localhost:3000/", {
    headers: { "accept-language": "pt-BR", cookie: `${LOCALE_PREFERENCE_COOKIE}=en` },
  });
  assert.equal(proxy(request).headers.get("location"), "http://localhost:3000/en");
});

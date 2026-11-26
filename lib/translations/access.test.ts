import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { translationAdminAvailable, translationAdminRequestAvailable, translationAdminPath } from "./access";
import { createSession, isAuthorized, SESSION_COOKIE } from "./auth";
import { GET, POST } from "@/app/api/translations/route.local";
import { POST as login, DELETE as logout } from "@/app/api/translations/session/route.local";
import { GET as sync } from "@/app/api/translations/sync/route.local";
import { proxy } from "@/proxy";

test("admin only accepts loopback hosts in development, with an optional private off switch", () => {
  for (const host of ["localhost", "localhost:3000", "127.0.0.1:3000", "[::1]:3000"]) {
    assert.equal(translationAdminAvailable(host, { NODE_ENV: "development" }), true);
    assert.equal(translationAdminAvailable(host, { NODE_ENV: "development", TRANSLATION_ADMIN_ENABLED: "true" }), true);
    assert.equal(translationAdminAvailable(host, { NODE_ENV: "development", TRANSLATION_ADMIN_ENABLED: "false" }), false);
    assert.equal(translationAdminAvailable(host, { NODE_ENV: "development", VERCEL: "1" }), false);
    assert.equal(translationAdminAvailable(host, { NODE_ENV: "production", TRANSLATION_ADMIN_ENABLED: "true" }), false);
  }
  for (const host of [null, "portfolio.vercel.app", "192.168.1.10:3000", "localhost.evil.com", "user@localhost:3000", "localhost/path", "localhost:invalid"]) {
    assert.equal(translationAdminAvailable(host, { NODE_ENV: "development" }), false);
  }
  assert.equal(translationAdminAvailable("localhost:3000", { NODE_ENV: "test" }), false);
});

test("public portfolio paths are outside the administrative namespace", () => {
  for (const path of ["/admin", "/admin/traducoes", "/admin/cases/plenno", "/api/admin/cases/plenno", "/api/admin/media", "/api/translations", "/api/translations/session", "/api/translations/sync"]) assert.equal(translationAdminPath(path), true);
  for (const path of ["/", "/en", "/en/cases/plenno", "/cases/plenno", "/api/translations-other", "/api/administration"]) assert.equal(translationAdminPath(path), false);
});

test("production blocks every admin handler and method even with valid session, token and enabled flag", async () => {
  const env = process.env as Record<string, string | undefined>;
  const changes = { NODE_ENV: "production", TRANSLATION_ADMIN_ENABLED: "true", TRANSLATION_ADMIN_TOKEN: "fixture-admin-secret", CRON_SECRET: "fixture-sync-secret" };
  const previous = Object.fromEntries(Object.keys(changes).map(key => [key, env[key]]));
  Object.assign(env, changes);
  try {
    const session = createSession(changes.TRANSLATION_ADMIN_TOKEN);
    const request = (path: string, method = "GET") => new NextRequest(`http://localhost:3000${path}`, {
      method, headers: { host: "localhost:3000", origin: "http://localhost:3000", cookie: `${SESSION_COOKIE}=${session}`, authorization: `Bearer ${changes.CRON_SECRET}` },
      ...(method === "POST" ? { body: "not-json" } : {}),
    });
    assert.equal(translationAdminRequestAvailable(request("/api/translations")), false);
    assert.equal(isAuthorized(request("/api/translations")), false);
    for (const [handler, path, method] of [
      [GET, "/api/translations", "GET"], [POST, "/api/translations", "POST"],
      [login, "/api/translations/session", "POST"], [logout, "/api/translations/session", "DELETE"],
      [sync, "/api/translations/sync", "GET"],
    ] as const) {
      const response = await handler(request(path, method));
      assert.equal(response.status, 404);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(await response.text(), "");
    }
    for (const path of ["/api/admin/cases", "/api/translations", "/api/translations/session", "/api/translations/sync"]) {
      for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) assert.equal(proxy(request(path, method)).status, 404);
    }
    const unauthenticatedAdmin = proxy(request("/admin/carrosseis"));
    assert.equal(unauthenticatedAdmin.status, 307);
    assert.equal(new URL(unauthenticatedAdmin.headers.get("location")!).pathname, "/admin/login");
    assert.equal(proxy(request("/admin/login")).headers.get("x-middleware-next"), "1");
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete env[key]; else env[key] = value;
    }
  }
});

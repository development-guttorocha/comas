import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  buildSocialSessionFromToken,
  getAuthMode,
  getMissingAuthEnv,
  isAllowedEmail,
  isRequestSocialAuthenticated,
  isSocialAuthRequired,
  makeSessionToken,
  normalizeOtpCode,
  sanitizeNextPath,
  sendLoginCode,
  SOCIAL_COOKIE_NAME,
  verifyLoginCode,
  verifySessionToken,
} from "./auth";
import { proxy } from "@/proxy";

async function withEnv<T>(overrides: Record<string, string | undefined>, fn: () => Promise<T> | T): Promise<T> {
  const env = process.env as Record<string, string | undefined>;
  const previous = Object.fromEntries(Object.keys(overrides).map(k => [k, env[k]]));
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete env[k];
      else env[k] = v;
    }
  }
}

test("authentication fails closed when ALLOWED_ADMIN_EMAILS or RESEND_API_KEY are missing", async () => {
  await withEnv(
    {
      ALLOWED_ADMIN_EMAILS: undefined,
      RESEND_API_KEY: undefined,
      AUTH_SECRET: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    () => {
      assert.equal(isSocialAuthRequired(), true);
      assert.equal(getAuthMode(), "unconfigured");
      assert.deepEqual(getMissingAuthEnv(), ["ALLOWED_ADMIN_EMAILS", "RESEND_API_KEY"]);

      const session = buildSocialSessionFromToken(undefined);
      assert.equal(session.authenticated, false);
      assert.equal(session.authRequired, true);
      assert.equal(session.configured, false);
    },
  );
});

test("empty AUTH_SECRET falls back cleanly to RESEND_API_KEY and validates allowed emails", async () => {
  await withEnv(
    {
      AUTH_SECRET: "",
      RESEND_API_KEY: "re_test_secret_key_123456",
      ALLOWED_ADMIN_EMAILS: "Renata@TextoEmCiclo.com.br, outro@dominio.com",
    },
    async () => {
      assert.equal(getAuthMode(), "email");
      assert.equal(isAllowedEmail("renata@textoemciclo.com.br"), true);
      assert.equal(isAllowedEmail("invasor@dominio.com"), false);

      const token = makeSessionToken("Renata@TextoEmCiclo.com.br");
      const verified = verifySessionToken(token);
      assert.equal(verified.valid, true);
      assert.equal(verified.email, "renata@textoemciclo.com.br");

      // Removing the email from ALLOWED_ADMIN_EMAILS immediately invalidates existing cookies
      await withEnv({ ALLOWED_ADMIN_EMAILS: "outro@dominio.com" }, () => {
        assert.equal(verifySessionToken(token).valid, false);
      });
    },
  );
});

test("OTP challenge token cannot be replayed as a session cookie and verifies 6-digit codes", async () => {
  const originalFetch = globalThis.fetch;
  let capturedBody: { to?: string[]; subject?: string; text?: string } | null = null;

  globalThis.fetch = (async (_input, init) => {
    capturedBody = JSON.parse(String(init?.body ?? "{}"));
    return new Response(JSON.stringify({ id: "email_123" }), { status: 200 });
  }) as typeof fetch;

  try {
    await withEnv(
      {
        AUTH_SECRET: "unit-test-signing-secret",
        RESEND_API_KEY: "re_unit_test_key",
        ALLOWED_ADMIN_EMAILS: "renata@textoemciclo.com.br",
      },
      async () => {
        const { challengeToken } = await sendLoginCode("renata@textoemciclo.com.br");
        assert.ok(challengeToken.includes("."));

        // Critical security check: challengeToken MUST NOT validate as a session cookie
        assert.equal(verifySessionToken(challengeToken).valid, false);

        const match = capturedBody?.subject?.match(/(\d{6})/);
        assert.ok(match, "6-digit code should be present in email subject");
        const code = match[1]!;

        // Formatted code with space should normalize and verify cleanly
        const formattedCode = `${code.slice(0, 3)} ${code.slice(3)}`;
        assert.equal(normalizeOtpCode(formattedCode), code);

        const verified = verifyLoginCode(challengeToken, formattedCode);
        assert.equal(verified.email, "renata@textoemciclo.com.br");

        const wrongCode = code === "000000" ? "111111" : "000000";
        assert.throws(() => verifyLoginCode(challengeToken, wrongCode), /Código incorreto/);
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("proxy redirects unauthenticated /admin requests to /admin/login and allows valid sessions", async () => {
  await withEnv(
    {
      AUTH_SECRET: "proxy-test-secret",
      RESEND_API_KEY: "re_proxy_test",
      ALLOWED_ADMIN_EMAILS: "renata@textoemciclo.com.br",
    },
    () => {
      const unauthReq = new NextRequest("https://textoemciclo.vercel.app/admin/marca");
      const unauthRes = proxy(unauthReq);
      assert.equal(unauthRes.status, 307);
      const location = new URL(unauthRes.headers.get("location")!);
      assert.equal(location.pathname, "/admin/login");
      assert.equal(location.searchParams.get("next"), "/admin/marca");

      const sessionToken = makeSessionToken("renata@textoemciclo.com.br");
      const authReq = new NextRequest("https://textoemciclo.vercel.app/admin/marca", {
        headers: { cookie: `${SOCIAL_COOKIE_NAME}=${sessionToken}` },
      });
      assert.equal(isRequestSocialAuthenticated(authReq), true);
      const authRes = proxy(authReq);
      assert.equal(authRes.headers.get("x-middleware-next"), "1");

      // Authenticated user visiting /admin/login redirects straight to destination
      const loginReq = new NextRequest(
        "https://textoemciclo.vercel.app/admin/login?next=%2Fadmin%2Freels",
        { headers: { cookie: `${SOCIAL_COOKIE_NAME}=${sessionToken}` } },
      );
      const loginRes = proxy(loginReq);
      assert.equal(loginRes.status, 307);
      assert.equal(new URL(loginRes.headers.get("location")!).pathname, "/admin/reels");

      // /admin/chaves and /api/admin/keys are unlocked in production behind session auth
      const chavesUnauth = proxy(new NextRequest("https://textoemciclo.vercel.app/admin/chaves"));
      assert.equal(chavesUnauth.status, 307);
      assert.equal(new URL(chavesUnauth.headers.get("location")!).searchParams.get("next"), "/admin/chaves");

      const chavesAuth = proxy(
        new NextRequest("https://textoemciclo.vercel.app/admin/chaves", {
          headers: { cookie: `${SOCIAL_COOKIE_NAME}=${sessionToken}` },
        }),
      );
      assert.equal(chavesAuth.headers.get("x-middleware-next"), "1");

      const keysApiRes = proxy(new NextRequest("https://textoemciclo.vercel.app/api/admin/keys"));
      assert.equal(keysApiRes.headers.get("x-middleware-next"), "1");
    },
  );
});

test("sanitizeNextPath defaults to /admin/estudio and blocks open redirects and loops", () => {
  assert.equal(sanitizeNextPath(""), "/admin/estudio");
  assert.equal(sanitizeNextPath("/admin"), "/admin/estudio");
  assert.equal(sanitizeNextPath("//evil.com"), "/admin/estudio");
  assert.equal(sanitizeNextPath("https://evil.com/admin"), "/admin/estudio");
  assert.equal(sanitizeNextPath("/\\evil.com"), "/admin/estudio");
  assert.equal(sanitizeNextPath("/admin/login"), "/admin/estudio");
  assert.equal(sanitizeNextPath("/admin/login?next=/admin/marca"), "/admin/estudio");
  assert.equal(sanitizeNextPath("/admin/carrosseis/post_1"), "/admin/carrosseis/post_1");
});

test("invited emails in EXTRA_ADMIN_EMAILS authenticate, pass cold-start proxy, and revoke cleanly without redirect loops", async () => {
  await withEnv(
    {
      AUTH_SECRET: "invited-test-secret",
      RESEND_API_KEY: "re_invited_test",
      ALLOWED_ADMIN_EMAILS: "owner@guttorocha.com.br",
      EXTRA_ADMIN_EMAILS: "renata@textoemciclo.com.br",
    },
    async () => {
      assert.equal(isAllowedEmail("owner@guttorocha.com.br"), true);
      assert.equal(isAllowedEmail("renata@textoemciclo.com.br"), true);

      const renataToken = makeSessionToken("renata@textoemciclo.com.br");
      assert.equal(verifySessionToken(renataToken).valid, true);

      // Cold-start proxy (before EXTRA_ADMIN_EMAILS is hydrated in memory) lets signed invited cookie reach server route
      await withEnv({ EXTRA_ADMIN_EMAILS: undefined }, () => {
        const estudioReq = new NextRequest("https://textoemciclo.vercel.app/admin/estudio", {
          headers: { cookie: `${SOCIAL_COOKIE_NAME}=${renataToken}` },
        });
        assert.equal(proxy(estudioReq).headers.get("x-middleware-next"), "1");

        // When server route detects revocation and redirects to /admin/login?revoked=1, proxy clears cookie and renders login
        const revokedLoginReq = new NextRequest("https://textoemciclo.vercel.app/admin/login?revoked=1", {
          headers: { cookie: `${SOCIAL_COOKIE_NAME}=${renataToken}` },
        });
        const revokedRes = proxy(revokedLoginReq);
        assert.equal(revokedRes.headers.get("x-middleware-next"), "1");
        assert.match(revokedRes.headers.get("set-cookie") ?? "", /Max-Age=0/i);
      });

      // Once EXTRA_ADMIN_EMAILS is hydrated as empty (revoked), verifySessionToken strictly rejects the token
      await withEnv({ EXTRA_ADMIN_EMAILS: "" }, () => {
        assert.equal(verifySessionToken(renataToken).valid, false);
      });
    },
  );
});

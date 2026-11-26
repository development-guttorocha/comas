import test from "node:test";
import assert from "node:assert/strict";
import {
  generateOtpCode,
  generateSessionToken,
  hashOtpCode,
  hashSessionToken,
  isValidEmail,
  normalizeEmail,
  normalizeOtpCode,
  verifyOtpHash,
} from "./careerKitAuth";

const TEST_SECRET = "test-career-kit-signing-secret";

test("normalizeEmail and isValidEmail sanitize input cleanly", () => {
  assert.equal(normalizeEmail("  Pessoa@Empresa.COM.br "), "pessoa@empresa.com.br");
  assert.equal(isValidEmail("pessoa@empresa.com.br"), true);
  assert.equal(isValidEmail("invalido"), false);
  assert.equal(isValidEmail("a@b"), false);
});

test("normalizeOtpCode extracts exact 6 digits and accepts formatted spacing/dashes", () => {
  assert.equal(normalizeOtpCode("482 193"), "482193");
  assert.equal(normalizeOtpCode("019-203"), "019203");
  assert.equal(normalizeOtpCode("12345"), "");
  assert.equal(normalizeOtpCode("1234567"), "");
  assert.equal(normalizeOtpCode("abcdef"), "");
});

test("generateOtpCode always emits 6 numeric digits", () => {
  for (let i = 0; i < 20; i++) {
    const code = generateOtpCode();
    assert.match(code, /^\d{6}$/);
  }
});

test("hashOtpCode and verifyOtpHash bind code to normalized e-mail via timingSafeEqual", () => {
  const hash = hashOtpCode("Designer@Site.com", "042918", TEST_SECRET);
  assert.equal(verifyOtpHash("  designer@site.com ", "042 918", hash, TEST_SECRET), true);
  assert.equal(verifyOtpHash("designer@site.com", "042919", hash, TEST_SECRET), false);
  assert.equal(verifyOtpHash("outro@site.com", "042918", hash, TEST_SECRET), false);
  assert.equal(verifyOtpHash("designer@site.com", "042918", "short", TEST_SECRET), false);
});

test("session tokens are high-entropy base64url strings and hash deterministically", () => {
  const a = generateSessionToken();
  const b = generateSessionToken();
  assert.notEqual(a, b);
  assert.ok(a.length >= 40);
  assert.equal(hashSessionToken(a).length, 64);
  assert.equal(hashSessionToken(a), hashSessionToken(a));
});

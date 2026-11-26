import { test } from "node:test";
import assert from "node:assert/strict";
import { readForm, UploadError } from "./form";

const post = (body: BodyInit, headers: Record<string, string> = {}) => new Request("http://localhost:3000/x", { method: "POST", body, headers });

test("a well-formed upload is read whole", async () => {
  const body = new FormData();
  body.append("file", new Blob([new Uint8Array(2048)]), "a.png");
  const form = await readForm(post(body));
  assert.equal((form.get("file") as File).size, 2048);
});

test("a body without a boundary, a cut body and a body over the limit give plain-language errors", async () => {
  await assert.rejects(readForm(post("lixo", { "content-type": "multipart/form-data" })), (e: unknown) => e instanceof UploadError && /separação/.test(e.message));
  await assert.rejects(readForm(post("--abc\r\nContent-Disposition: form-data; name=\"f\"; filename=\"x\"\r\n\r\nmeio", { "content-type": "multipart/form-data; boundary=abc" })), (e: unknown) => e instanceof UploadError && /incompleto/.test(e.message) && !/FormData/.test(e.message));
  await assert.rejects(readForm(post("x", { "content-type": "multipart/form-data; boundary=abc", "content-length": String(40 * 1024 * 1024) }), { maxMb: 25 }), (e: unknown) => e instanceof UploadError && e.status === 413);
  await assert.rejects(readForm(post("{}", { "content-type": "application/json" })), (e: unknown) => e instanceof UploadError && /formulário/.test(e.message));
});

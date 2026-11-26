import test from "node:test";
import assert from "node:assert/strict";
import { serializeJsonLd } from "./jsonLd";

test("CMS content cannot close a JSON-LD script and inject HTML", () => {
  const value = {
    name: '</script><script src="https://malicious.example/payload.js"></script>',
    description: "Design <produto> & pessoas — ação",
  };
  const serialized = serializeJsonLd(value);
  assert.equal(serialized.includes("<"), false);
  assert.deepEqual(JSON.parse(serialized), value);
});

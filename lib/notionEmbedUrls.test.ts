import assert from "node:assert/strict";
import { test } from "node:test";
import { notionEmbedIframeSrc } from "./notionEmbedUrls";

test("a Figma prototype link becomes an Embed Kit 2.0 address without the footer", () => {
  const src = notionEmbedIframeSrc("https://www.figma.com/proto/ABC123/Case-BL?node-id=0-3198&p=f&t=xyz-0&scaling=scale-down&content-scaling=fixed&page-id=0%3A1");
  const u = new URL(src!);
  assert.equal(u.origin + u.pathname, "https://embed.figma.com/proto/ABC123/Case-BL");
  assert.equal(u.searchParams.get("node-id"), "0-3198");
  assert.equal(u.searchParams.get("scaling"), "scale-down");
  assert.equal(u.searchParams.get("page-id"), "0:1");
  assert.equal(u.searchParams.get("embed-host"), "guttorocha");
  assert.equal(u.searchParams.get("footer"), "false");
  assert.equal(u.searchParams.has("t"), false);
  assert.equal(u.searchParams.has("p"), false);
});

test("design files and old embed links are converted too", () => {
  assert.equal(new URL(notionEmbedIframeSrc("https://www.figma.com/file/KEY/Name")!).pathname, "/design/KEY/Name");
  const old = notionEmbedIframeSrc(`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent("https://www.figma.com/proto/KEY/Name?node-id=1-2")}`);
  assert.equal(new URL(old!).pathname, "/proto/KEY/Name");
  assert.equal(new URL(old!).searchParams.get("node-id"), "1-2");
});

test("an embed.figma.com link keeps its own footer choice", () => {
  const src = notionEmbedIframeSrc("https://embed.figma.com/proto/KEY?footer=true&embed-host=other");
  assert.equal(new URL(src!).searchParams.get("footer"), "true");
  assert.equal(new URL(src!).searchParams.get("embed-host"), "guttorocha");
});

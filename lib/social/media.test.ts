import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { deleteSocialMedia, listSocialMedia, uploadSocialMedia } from "./media";

test("uploadSocialMedia optimizes PNG to WebP, lists it in Mídia, and deletes cleanly", async () => {
  const pngBuffer = await sharp({
    create: {
      width: 320,
      height: 400,
      channels: 3,
      background: { r: 62, g: 42, b: 141 },
    },
  })
    .png()
    .toBuffer();

  const file = new File([new Uint8Array(pngBuffer)], "Prova Redacao Teste.png", { type: "image/png" });
  const saved = await uploadSocialMedia(file, "teste-automatizado");

  assert.ok(saved.url);
  assert.equal(saved.kind, "image");
  assert.match(saved.name, /prova-redacao-teste\.webp$/i);
  assert.equal(saved.width, 320);
  assert.equal(saved.height, 400);

  const all = await listSocialMedia();
  assert.equal(all.some(item => item.url === saved.url), true);

  const removed = await deleteSocialMedia([saved.url]);
  assert.equal(removed, 1);

  const after = await listSocialMedia();
  assert.equal(after.some(item => item.url === saved.url && item.source !== "post"), false);
});

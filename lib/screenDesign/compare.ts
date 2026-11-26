import sharp from "sharp";

/** Original | rebuilt | difference (red where they part), and how far apart they are. */
export async function compare(original: string, rebuilt: string, out: string) {
  const m = await sharp(original).metadata();
  const w = m.width!, h = m.height!;
  const A = await sharp(original).removeAlpha().raw().toBuffer();
  const B = await sharp(rebuilt).removeAlpha().resize(w, h, { fit: "fill" }).raw().toBuffer();
  const diff = Buffer.alloc(A.length);
  let sum = 0, far = 0;
  for (let i = 0; i < A.length; i += 3) {
    const v = (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2])) / 3;
    sum += v; if (v > 40) far++;
    diff[i] = Math.min(255, v * 3);
  }
  const n = A.length / 3;
  await sharp({ create: { width: w * 3 + 40, height: h, channels: 3, background: "#1a1a1a" } })
    .composite([
      { input: await sharp(original).png().toBuffer(), left: 0, top: 0 },
      { input: await sharp(rebuilt).resize(w, h, { fit: "fill" }).png().toBuffer(), left: w + 20, top: 0 },
      { input: await sharp(diff, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer(), left: w * 2 + 40, top: 0 },
    ])
    .png().toFile(out);
  return { mean: Math.round((sum / n) * 10) / 10, farShare: Math.round((far / n) * 1000) / 10 };
}

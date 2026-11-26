import fs from "node:fs";
import path from "node:path";

/** Lê `viewBox` ou `width`/`height` do início de um SVG em `public/`. */
export function readPublicSvgSize(relativeToPublic: string): {
  width: number;
  height: number;
} | null {
  const full = path.join(process.cwd(), "public", relativeToPublic);
  if (!fs.existsSync(full)) return null;
  const head = fs.readFileSync(full, "utf8").slice(0, 2500);
  const viewBox = head.match(
    /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/
  );
  if (viewBox) {
    return {
      width: Math.round(Number(viewBox[1])),
      height: Math.round(Number(viewBox[2])),
    };
  }
  const wh = head.match(
    /<svg[^>]*\swidth="(\d+(?:\.\d+)?)"[^>]*\sheight="(\d+(?:\.\d+)?)"/
  );
  if (wh) {
    return {
      width: Math.round(Number(wh[1])),
      height: Math.round(Number(wh[2])),
    };
  }
  return null;
}

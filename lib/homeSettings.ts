import { readFile } from "node:fs/promises";
import path from "node:path";
import { normalizeHomeSettings, type HomeSettings } from "./homeSettingsModel";

/**
 * The Home's own settings, edited in the admin: `content/home.json`. The belt's images stay with each
 * case (its Home image, or its cover); this file only orders the cases and tunes the belt's motion.
 */
export const HOME_SETTINGS_FILE = path.join(process.cwd(), "content", "home.json");

export { BELT_LIMITS, DEFAULT_BELT, normalizeHomeSettings, orderBySlugs } from "./homeSettingsModel";
export type { BeltMotion, HomeSettings } from "./homeSettingsModel";

export async function getHomeSettings(): Promise<HomeSettings> {
  try { return normalizeHomeSettings(JSON.parse(await readFile(HOME_SETTINGS_FILE, "utf8"))); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.warn("content/home.json:", error);
    return normalizeHomeSettings(null);
  }
}

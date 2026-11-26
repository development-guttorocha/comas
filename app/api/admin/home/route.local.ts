import { rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { adminGuard, adminJson } from "@/lib/admin/guard";
import { HOME_SETTINGS_FILE, normalizeHomeSettings } from "@/lib/homeSettings";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Saves the Home's belt: the cases' order and its motion, to `content/home.json`. */
export async function PUT(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try {
    const settings = normalizeHomeSettings(await request.json());
    const temp = `${HOME_SETTINGS_FILE}.${randomUUID()}.tmp`;
    await writeFile(temp, `${JSON.stringify(settings, null, 2)}\n`);
    await rename(temp, HOME_SETTINGS_FILE);
    return adminJson({ settings });
  } catch (error) {
    return adminJson({ error: error instanceof Error ? error.message : "Não foi possível salvar a Home." }, 422);
  }
}

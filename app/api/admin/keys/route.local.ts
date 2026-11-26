import { adminGuard, adminJson } from "@/lib/admin/guard";
import { listKeys, removeKey, saveKey, testKey } from "@/lib/admin/apiKeys";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (error: unknown) => adminJson({ error: error instanceof Error ? error.message : "Falha." }, 400);

/** The keys, masked: the full value never leaves .env.local. */
export async function GET(request: Request) {
  const denied = adminGuard(request);
  if (denied) return denied;
  return adminJson({ keys: await listKeys() });
}

/** Saves a key (new value, validity, notes) or adds a custom provider. */
export async function PUT(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try { await saveKey(await request.json()); return adminJson({ keys: await listKeys() }); }
  catch (error) { return fail(error); }
}

/** Checks a saved key against its provider. */
export async function POST(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try { const { id } = await request.json() as { id: string }; return adminJson(await testKey(id)); }
  catch (error) { return fail(error); }
}

export async function DELETE(request: Request) {
  const denied = adminGuard(request, { write: true });
  if (denied) return denied;
  try { await removeKey(new URL(request.url).searchParams.get("id") ?? ""); return adminJson({ keys: await listKeys() }); }
  catch (error) { return fail(error); }
}

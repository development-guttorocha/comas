import { listKeys, removeKey, saveKey, testKey } from "@/lib/admin/apiKeys";
import { isSocialAuthenticated } from "@/lib/social/auth";
import { sameOrigin } from "@/lib/translations/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });

const fail = (error: unknown) =>
  json({ error: error instanceof Error ? error.message : "Falha." }, 400);

async function guard(request: Request, write = false): Promise<Response | null> {
  if (!(await isSocialAuthenticated())) {
    return json({ error: "Não autorizado." }, 401);
  }
  if (write && !sameOrigin(request)) {
    return json({ error: "Origem inválida." }, 403);
  }
  return null;
}

export async function GET(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  return json({ keys: await listKeys() });
}

export async function PUT(request: Request) {
  const denied = await guard(request, true);
  if (denied) return denied;
  try {
    await saveKey(await request.json());
    return json({ keys: await listKeys() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  const denied = await guard(request, true);
  if (denied) return denied;
  try {
    const { id } = (await request.json()) as { id: string };
    return json(await testKey(id));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  const denied = await guard(request, true);
  if (denied) return denied;
  try {
    await removeKey(new URL(request.url).searchParams.get("id") ?? "");
    return json({ keys: await listKeys() });
  } catch (error) {
    return fail(error);
  }
}

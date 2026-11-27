import { NextResponse, type NextRequest } from "next/server";
import { getSocialSession } from "@/lib/social/auth";
import { listCreatorFeedback, submitCreatorFeedback } from "@/lib/social/feedback";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const session = await getSocialSession();
  if (!session.authenticated) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401, headers: NO_STORE });
  }

  try {
    const items = await listCreatorFeedback();
    return NextResponse.json({ items }, { headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao carregar mensagens.";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSocialSession();
  if (!session.authenticated) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401, headers: NO_STORE });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400, headers: NO_STORE });
  }

  try {
    const result = await submitCreatorFeedback({
      category: body.category,
      rating: body.rating,
      message: body.message,
      page: body.page,
      senderEmail: session.email,
    });
    return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Não foi possível enviar sua mensagem.";
    return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE });
  }
}

import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { listCreatorFeedback, submitCreatorFeedback } from "@/lib/social/feedback";

test("submitCreatorFeedback validates message and persists feedback locally without Supabase", async () => {
  const prevUrl = process.env.SUPABASE_URL;
  const prevKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const prevResend = process.env.RESEND_API_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.RESEND_API_KEY;

  const file = path.join(process.cwd(), ".data", "creator-feedback.json");

  try {
    await assert.rejects(
      () => submitCreatorFeedback({ category: "help", rating: 5, message: "oi" }),
      /mensagem um pouco maior/i,
    );

    const { item, emailed } = await submitCreatorFeedback({
      category: "suggestion",
      rating: 5,
      message: "Seria ótimo poder agendar posts direto no calendário!",
      page: "/admin/estudio",
      senderEmail: "renata@textoemciclo.com.br",
    });

    assert.equal(emailed, false);
    assert.equal(item.category, "suggestion");
    assert.equal(item.rating, 5);
    assert.equal(item.page, "/admin/estudio");
    assert.equal(item.senderEmail, "renata@textoemciclo.com.br");

    const saved = await listCreatorFeedback();
    assert.ok(saved.some(x => x.id === item.id && x.message === item.message));
  } finally {
    await rm(file, { force: true }).catch(() => {});
    if (prevUrl !== undefined) process.env.SUPABASE_URL = prevUrl;
    if (prevKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prevKey;
    if (prevResend !== undefined) process.env.RESEND_API_KEY = prevResend;
  }
});

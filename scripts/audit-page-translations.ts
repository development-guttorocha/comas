/**
 * Reviews the English of the editable pages with Sol, against the same rules it translates by
 * (lib/translations/openai.ts). Each text found faithful and natural records the Portuguese it
 * matches (`enFrom`), so a later change shows it as out of date; each one with a problem gets an
 * empty `enFrom` and shows in the admin as "Revisar o inglês". The English itself is never rewritten.
 *
 * node --env-file=.env.local --import tsx scripts/audit-page-translations.ts [--dry]
 */
import { writeFile } from "node:fs/promises";
import { PAGE_SCHEMAS } from "@/lib/pages/schemas";
import type { Localized, PageValues } from "@/lib/pages/model";
import { readPage, savePage } from "@/lib/pages/store";
import { TRANSLATION_INSTRUCTIONS, TRANSLATION_MODEL } from "@/lib/translations/openai";

type Leaf = { key: string; text: Localized };
type Verdict = { key: string; ok: boolean; issue: string };

const isLocalized = (v: unknown): v is Localized => !!v && typeof v === "object" && !Array.isArray(v) && typeof (v as Localized).pt === "string" && typeof (v as Localized).en === "string";

function leaves(value: unknown, path: string, out: Leaf[]) {
  if (isLocalized(value)) { out.push({ key: path, text: value }); return; }
  if (Array.isArray(value)) value.forEach((item, i) => leaves(item, `${path}.${i}`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) leaves(v, path ? `${path}.${k}` : k, out);
}

const AUDIT = [
  "You review English translations of a Brazilian Portuguese portfolio site, as a strict native-speaking editor.",
  "For each unit, set ok=true only when the English is faithful (nothing missing, added or changed in meaning; numbers equal), reads as natural idiomatic US English, and follows the translation rules and glossary below. Be strict about meaning, glossary and literal translations; accept reasonable stylistic choices.",
  "Short labels that are names, brands or identical in both languages are ok.",
  "issue: when not ok, one short sentence in Brazilian Portuguese saying what is wrong and the better English; empty when ok.",
  "The translation rules:",
  TRANSLATION_INSTRUCTIONS,
].join("\n");

async function review(units: Array<{ key: string; pt: string; en: string }>, context: string): Promise<Verdict[]> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY?.trim()}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(180000),
    body: JSON.stringify({
      model: TRANSLATION_MODEL, store: false, reasoning: { effort: "medium" }, max_output_tokens: 16000,
      instructions: AUDIT,
      input: JSON.stringify({ context, units }),
      text: { format: { type: "json_schema", name: "translation_review", strict: true, schema: {
        type: "object", additionalProperties: false, required: ["units"], properties: { units: { type: "array", items: {
          type: "object", additionalProperties: false, required: ["key", "ok", "issue"],
          properties: { key: { type: "string" }, ok: { type: "boolean" }, issue: { type: "string" } },
        } } },
      } } },
    }),
  });
  if (!response.ok) throw new Error(`A OpenAI recusou a revisão (HTTP ${response.status}).`);
  const data = await response.json() as { status?: string; output?: Array<{ content?: Array<{ type: string; text?: string }> }> };
  if (data.status !== "completed") throw new Error("A revisão ficou incompleta.");
  const text = data.output?.flatMap(item => item.content ?? []).filter(item => item.type === "output_text").map(item => item.text ?? "").join("") ?? "";
  return (JSON.parse(text) as { units: Verdict[] }).units;
}

function setEnFrom(values: PageValues, key: string, enFrom: string) {
  let node: unknown = values;
  for (const step of key.split(".")) node = Array.isArray(node) ? node[Number(step)] : (node as Record<string, unknown>)[step];
  if (isLocalized(node)) node.enFrom = enFrom;
}

async function main() {
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error("Configure OPENAI_API_KEY.");
  const dry = process.argv.includes("--dry");
  const report: string[] = ["# Revisão do inglês das páginas", "", `Modelo: ${TRANSLATION_MODEL}. ${new Date().toLocaleString("pt-BR")}.`, ""];
  let reviewed = 0, flagged = 0, baselined = 0;

  for (const schema of PAGE_SCHEMAS) {
    const { values, revision } = await readPage(schema.slug);
    const all: Leaf[] = [];
    leaves(values, "", all);
    // Texts already shown as out of date stay as they are: the admin flags them on its own.
    const units = all.filter(l => l.text.pt.trim() && l.text.en.trim() && (l.text.enFrom === undefined || l.text.enFrom === l.text.pt));
    const issues: string[] = [];
    for (let i = 0; i < units.length; i += 30) {
      const batch = units.slice(i, i + 30);
      const verdicts = new Map((await review(batch.map(u => ({ key: u.key, pt: u.text.pt, en: u.text.en })), `Page "${schema.label}": ${schema.description}`)).map(v => [v.key, v]));
      for (const unit of batch) {
        const verdict = verdicts.get(unit.key);
        if (!verdict) continue;
        reviewed++;
        if (verdict.ok) {
          if (unit.text.enFrom === undefined) { setEnFrom(values, unit.key, unit.text.pt); baselined++; }
        } else {
          setEnFrom(values, unit.key, "");
          flagged++;
          issues.push(`- **${unit.key}**: ${verdict.issue}\n  - PT: ${unit.text.pt.replace(/\n/g, " ").slice(0, 220)}\n  - EN: ${unit.text.en.replace(/\n/g, " ").slice(0, 220)}`);
        }
      }
      process.stdout.write(`${schema.label}: ${Math.min(i + 30, units.length)}/${units.length}\r`);
    }
    console.log(`${schema.label}: ${units.length} revisados, ${issues.length} para revisar.`);
    report.push(`## ${schema.label} (${issues.length})`, "", ...(issues.length ? issues : ["Tudo certo."]), "");
    if (!dry) await savePage(schema.slug, revision, values);
  }

  report.splice(3, 0, `${reviewed} textos revisados · ${flagged} para revisar · ${baselined} passaram a registrar o português de origem.`, "");
  const out = process.env.AUDIT_REPORT ?? "translation-audit.md";
  await writeFile(out, report.join("\n"));
  console.log(`\n${reviewed} revisados · ${flagged} para revisar · ${baselined} com origem registrada${dry ? " (sem gravar)" : ""}. Relatório: ${out}`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });

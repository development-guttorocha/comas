import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFile, writeFile, rename } from "node:fs/promises";
import { collectSiteSources } from "@/lib/i18n/catalog";
async function main() {
  loadEnvConfig(process.cwd());
  const sources = collectSiteSources();
  const english = JSON.parse(await readFile("lib/i18n/en.json", "utf8")) as Record<string, string>;
  const sorted = (value: Record<string, string>) => Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
  const pt = Object.fromEntries([...sources.keys()].map(source => [source, source]));
  if (process.argv.includes("--check")) {
    const missing = [...sources.keys()].filter(source => !english[source]?.trim());
    const actual = JSON.parse(await readFile("lib/i18n/pt.json", "utf8"));
    if (missing.length || JSON.stringify(sorted(actual)) !== JSON.stringify(sorted(pt))) throw new Error(`Catálogo desatualizado: ${missing.length} textos sem inglês. Execute site:translate.`);
    console.log(`Catálogo completo: ${sources.size} textos em PT e EN.`); return;
  }
  await writeFile("lib/i18n/pt.json", JSON.stringify(sorted(pt), null, 2) + "\n");
  if (process.argv.includes("--extract")) { console.log(`Catálogo: ${sources.size} textos.`); return; }
  const { translateUnits } = await import("@/lib/translations/openai");
  const pending = [...sources.keys()].filter(source => !english[source]?.trim());
  console.log(`Textos: ${sources.size}. Novos ou alterados: ${pending.length}.`);
  for (let start = 0; start < pending.length; start += 24) {
    const batch = pending.slice(start, start + 24);
    const units = batch.map(source => ({ key: createHash("sha256").update(source).digest("hex").slice(0, 24), source, target: "" }));
    const locations = new Set(batch.flatMap(source => [...sources.get(source)!]));
    const context = [...sources.entries()].filter(([, files]) => [...files].some(file => locations.has(file))).map(([source]) => source).join("\n");
    const translated = await translateUnits(units, context);
    for (const unit of translated) {
      const leading = unit.source.match(/^\s*/)?.[0] ?? "", trailing = unit.source.match(/\s*$/)?.[0] ?? "";
      english[unit.source] = leading + unit.target.trim() + trailing;
    }
    // Checkpoint each validated batch, allowing a failed run to resume without retranslating it.
    const current = Object.fromEntries([...sources.keys()].filter(source => english[source]).map(source => [source, english[source]]));
    await writeFile("lib/i18n/en.json.tmp", JSON.stringify(sorted(current), null, 2) + "\n");
    await rename("lib/i18n/en.json.tmp", "lib/i18n/en.json");
    console.log(`Tradução salva: ${Math.min(start + 24, pending.length)}/${pending.length}.`);
  }
  console.log("Tradução concluída. Revise lib/i18n/en.json e execute site:translations-check.");
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Falha na tradução."); process.exitCode = 1; });

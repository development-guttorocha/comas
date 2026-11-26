/**
 * Gera NOTION-CASE-<slug>-CONTEUDO.md para cada case em lib/casesSeed.ts (só scripts),
 * exceto Loft (usa scripts/generate-notion-loft-plain-text.ts).
 *
 * npx tsx scripts/generate-notion-cases-plain-text.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeLandingMediaExtras } from "../lib/caseLandingMediaExtras";
import type { Case } from "../lib/cases";
import { CASES_SEED } from "../lib/casesSeed";
import { tryParseCaseEmbedParagraph } from "../lib/notionCaseEmbedFromNotion";
import { formatNotionHeroDatabaseBlock } from "./notionCaseHeroDatabasePlaintext";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SKIP_SLUG = "loft-lideranca-gestao-e-cultura-de-design";

function caseLine(name: string, obj: Record<string, unknown>) {
  return `[case:${name}] ${JSON.stringify(obj)}`;
}

function pushBlank(lines: string[]) {
  lines.push("");
}

function buildBody(c: Case): string {
  const lines: string[] = [];

  lines.push(
    "Cola no corpo da página do case no Notion: linha em branco = novo parágrafo. Linhas [case:Nome] {json} = um parágrafo só (sem Enter no meio). Não precisas de \"component\" no JSON.",
  );
  pushBlank(lines);
  lines.push(formatNotionHeroDatabaseBlock(c));
  pushBlank(lines);
  lines.push("---");
  pushBlank(lines);

  lines.push("[-nav 1] Contexto");
  pushBlank(lines);
  lines.push(
    caseLine("CaseSectionSplit", {
      id: "case-contexto",
      label: "// Contexto",
      body: c.context.trim(),
      borderClass: "border-t border-ink/10 dark:border-white/10",
    }),
  );
  pushBlank(lines);

  const afterHero = c.landingMedia?.afterHero;
  if (afterHero) {
    lines.push(
      caseLine("CaseMediaFullWidth", {
        src: afterHero.src,
        alt: afterHero.alt,
      }),
    );
    pushBlank(lines);
    if (afterHero.caption?.trim()) {
      lines.push(afterHero.caption.trim());
      pushBlank(lines);
    }
  }

  lines.push("[-nav 2] Desafio");
  pushBlank(lines);
  lines.push("// Desafio");
  pushBlank(lines);
  lines.push(c.challenge.trim());
  pushBlank(lines);

  const problemStructural = c.landingMedia?.problemStructural;
  if (problemStructural) {
    const mediaObj: Record<string, unknown> = {
      label: "// Problema estrutural",
      media: { src: problemStructural.src, alt: problemStructural.alt },
    };
    if (problemStructural.caption?.trim()) {
      mediaObj.intro = problemStructural.caption.trim();
    }
    lines.push(caseLine("CaseSectionMedia", mediaObj));
    pushBlank(lines);
  }

  lines.push("[-nav 3] Abordagem");
  pushBlank(lines);
  c.approach.forEach((section, i) => {
    const bodyText = [section.title, ...section.body].join("\n\n");
    const split: Record<string, unknown> = {
      label: `// ${String(i + 1).padStart(2, "0")}`,
      body: bodyText,
      borderClass: "border-t border-ink/10 dark:border-white/10",
    };
    if (i === 0) split.id = "case-abordagem";
    lines.push(caseLine("CaseSectionSplit", split));
    pushBlank(lines);
  });

  const gallery = c.landingMedia?.liveProductGallery;
  if (gallery?.length) {
    lines.push("// Referência no produto");
    pushBlank(lines);
    for (const item of gallery) {
      lines.push(
        caseLine("CaseMediaFullWidth", {
          src: item.src,
          alt: item.alt,
        }),
      );
      pushBlank(lines);
    }
    if (c.landingMedia?.liveProductNote?.trim()) {
      lines.push(c.landingMedia.liveProductNote.trim());
      pushBlank(lines);
    }
  }

  lines.push("[-nav 4] Impacto");
  pushBlank(lines);
  const statBand: Record<string, unknown> = {
    stats: c.stats,
  };
  if (c.attributionNote?.trim()) statBand.attributionNote = c.attributionNote.trim();
  if (c.editorialSourceNote?.trim()) {
    statBand.editorialSourceNote = c.editorialSourceNote.trim();
  }
  lines.push(caseLine("CaseStatBand", statBand));
  pushBlank(lines);

  lines.push("[-nav 5] Resultado");
  pushBlank(lines);
  lines.push(
    caseLine("CaseSectionSplit", {
      id: "case-resultado",
      label: "// Resultado",
      body: c.outcome.trim(),
      borderClass: "border-t border-ink/10 dark:border-white/10",
    }),
  );
  pushBlank(lines);

  lines.push(
    caseLine("CasePullQuote", {
      label: "// Learning",
      body: c.learning.trim(),
    }),
  );

  return lines.join("\n") + "\n";
}

function validateFile(path: string, label: string) {
  const text = readFileSync(path, "utf8");
  const embedLines = text.split("\n").filter((l) => /^\[case:/.test(l.trim()));
  let ok = 0;
  for (const line of embedLines) {
    const parsed = tryParseCaseEmbedParagraph(line);
    if (!parsed) {
      throw new Error(`[${label}] parse falhou: ${line.slice(0, 120)}…`);
    }
    ok++;
  }
  console.log(`  ✓ ${label}: ${ok} embed(s) [case:…] válidos`);
}

function main() {
  for (const raw of CASES_SEED) {
    if (raw.slug === SKIP_SLUG) continue;
    const c = mergeLandingMediaExtras(raw);
    const outPath = join(ROOT, `NOTION-CASE-${c.slug}-CONTEUDO.md`);
    const body = buildBody(c);
    writeFileSync(outPath, body, "utf8");
    console.log(`Gerado: ${outPath}`);
    validateFile(outPath, c.slug);
  }
  console.log("\nLoft: NOTION-CASE-LOFT-CONTEUDO.md → npx tsx scripts/generate-notion-loft-plain-text.ts");
}

main();

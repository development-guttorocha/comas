/**
 * O site em Markdown, para assistentes de IA (GEO): cada página tem uma versão `.md` com o mesmo
 * conteúdo em texto, e `/llms.txt` resume o site e aponta para elas. Os cases saem do mesmo
 * conteúdo que a página usa (o inglês só quando a tradução está publicada e em dia).
 */
import type { Case } from "@/lib/cases";
import { getCaseHref } from "@/lib/cases";
import { getCaseBody, getCaseDataSource, orderCasesForListing } from "@/lib/caseContent";
import { parseChartSpec } from "@/lib/chartSpec";
import { getTranslator } from "@/lib/i18n/messages";
import { pageCopy } from "@/lib/i18n/metadata";
import type { NotionBlockNode } from "@/lib/notionBlockTree";
import { richToMd } from "@/lib/admin/richText";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import type { SiteLocale } from "@/lib/siteLocale";
import { LINKEDIN_URL } from "@/lib/social";
import { applySnapshot, extractSource } from "@/lib/translations/document";
import { translatedCaseListings } from "@/lib/translations/listing";
import { readTranslation } from "@/lib/translations/store";
import { getPageContent } from "@/lib/pages/store";
import type { ContactContent, CurriculumContent, SiteContent } from "@/lib/pages/schemas";

export const MARKDOWN_PAGES = ["index", "sobre", "curriculo", "contato", "cases"] as const;
type Page = (typeof MARKDOWN_PAGES)[number];

const pagePath = (page: Page, locale: SiteLocale) => (locale === "en" ? (page === "index" ? "/en" : `/en/${page}`) : page === "index" ? "/" : `/${page}`);
const mdPath = (path: string) => (path === "/" ? "/index.md" : `${path}.md`);

function frontMatter(fields: Record<string, string | undefined>) {
  const lines = Object.entries(fields).flatMap(([k, v]) => (v ? [`${k}: ${v.includes(":") || v.includes("#") ? JSON.stringify(v) : v}`] : []));
  return `---\n${lines.join("\n")}\n---\n`;
}
const join = (...parts: (string | false | null | undefined)[]) => `${parts.filter(Boolean).join("\n\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
const clean = (s: string) => s.replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim();

/* ---------- Case body ---------- */

// Values that only drive layout or point at files: never content.
const SKIP_KEYS = new Set([
  "id", "src", "url", "href", "image", "images", "mobileSrc", "mobileImage", "poster", "video", "videoUrl", "mp4", "icon", "tone", "tones", "color", "colors",
  "layout", "variant", "type", "kind", "size", "align", "arrange", "routing", "theme", "component", "spaceTop", "spaceBottom", "focus", "aspect", "ratio",
  "columns", "span", "parent", "col", "row", "from", "to", "edges", "highlight", "decimals", "prefix", "suffix", "max", "min", "accent", "border", "background",
  "alt", "intersection", "series", "categories", "borderClass", "className", "emphasizeIndices",
]);
const skipKey = (key: string) => SKIP_KEYS.has(key) || /(Class|ClassName|Indices|Id|Url|Src|Color)$/.test(key);
const NOT_TEXT = /^(https?:\/\/|\/|#[0-9a-f]{3,8}$|mailto:|tel:)/i;

function strings(value: unknown, key = ""): string[] {
  if (skipKey(key)) return [];
  if (typeof value === "string") return value.trim() && !NOT_TEXT.test(value.trim()) ? [clean(value)] : [];
  if (typeof value === "number") return ["value", "figure", "number"].includes(key) ? [String(value)] : [];
  if (Array.isArray(value)) return value.flatMap(v => strings(v, key));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => strings(v, k));
  return [];
}

function chartTable(props: Record<string, unknown>): string | null {
  const spec = parseChartSpec(props);
  if (!spec || !spec.categories.length || !spec.series.length) return null;
  const fmt = (n: number | null) => (n === null ? "—" : `${spec.prefix ?? ""}${n.toLocaleString("pt-BR")}${spec.suffix ?? ""}`);
  const head = `| ${[spec.type === "line" || spec.type === "area" ? "Período" : "", ...spec.series.map(s => s.label || "Valor")].join(" | ")} |`;
  const rule = `| ${["---", ...spec.series.map(() => "---")].join(" | ")} |`;
  const rows = spec.categories.map((c, i) => `| ${[c, ...spec.series.map(s => fmt(s.values[i] ?? null))].join(" | ")} |`);
  return [head, rule, ...rows].join("\n");
}

/** A case component as text: its titles as headings, its lists as lists, a chart as a table. */
function componentMarkdown(name: string, props: Record<string, unknown>): string {
  const out: string[] = [];
  const label = typeof props.sectionLabel === "string" ? props.sectionLabel.replace(/^\/\/\s*/, "").trim() : "";
  const heading = typeof props.heading === "string" ? clean(props.heading) : "";
  if (heading) out.push(`### ${heading}`);
  else if (label) out.push(`### ${label}`);
  for (const [key, value] of Object.entries(props)) {
    if (key === "sectionLabel" || key === "heading" || skipKey(key)) continue;
    if (Array.isArray(value)) {
      const items = value.map(item => strings(item, key)).filter(parts => parts.length);
      if (items.length) out.push(items.map(parts => `- ${parts.length > 1 ? `**${parts[0]}** — ${parts.slice(1).join(" — ")}` : parts[0]}`).join("\n"));
    } else if (value && typeof value === "object") {
      const parts = strings(value, key);
      if (parts.length) out.push(parts.join("\n\n"));
    } else {
      const [text] = strings(value, key);
      if (!text) continue;
      out.push(key === "title" ? `**${text}**` : key === "caption" || key === "source" ? `_${text}_` : key === "quote" ? `> ${text}` : text);
    }
  }
  if (name === "CaseChart" || props.categories) {
    const table = chartTable(props);
    if (table) out.push(table);
  }
  return out.join("\n\n");
}

const SECTION = /^\s*\[-nav\s*[1-6]\]\s*([\s\S]*?)\s*(?:\[\/-nav\s*[1-6]\s*\+\s*(?:true|false)\s*\])?\s*$/i;
const COMPONENT = /^\s*\[case:\s*(\w+)\]\s*(\{[\s\S]*\})\s*$/;
const fileUrl = (p: Record<string, unknown>) => {
  const holder = (p.type === "external" ? p.external : p.file) as { url?: string } | undefined;
  return typeof holder?.url === "string" ? holder.url : "";
};

export function blocksToMarkdown(blocks: NotionBlockNode[]): string {
  const out: string[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { out.push(list.join("\n")); list = []; } };
  blocks.forEach(function walk(block) {
    const p = (block[block.type] ?? {}) as Record<string, unknown>;
    const plain = Array.isArray(p.rich_text) ? (p.rich_text as { plain_text?: string }[]).map(r => r.plain_text ?? "").join("") : "";
    const md = clean(richToMd(p.rich_text));
    const isItem = block.type === "bulleted_list_item" || block.type === "numbered_list_item";
    if (!isItem) flush();
    const section = SECTION.exec(plain);
    const component = COMPONENT.exec(plain);
    if (section) { if (section[1]!.trim()) out.push(`## ${clean(section[1]!)}`); }
    else if (component) {
      try { const text = componentMarkdown(component[1]!, JSON.parse(component[2]!)); if (text) out.push(text); } catch { /* malformed: nothing to say */ }
    } else if (block.type === "heading_1") out.push(`## ${md}`);
    else if (block.type === "heading_2") out.push(`### ${md}`);
    else if (block.type === "heading_3") out.push(`#### ${md}`);
    else if (block.type === "quote") { if (md) out.push(`> ${md}`); }
    else if (isItem) { if (md) list.push(`${block.type === "numbered_list_item" ? `${list.length + 1}.` : "-"} ${md}`); }
    else if (block.type === "image") {
      const src = fileUrl(p), caption = clean(richToMd(p.caption));
      if (src) out.push(`![${caption.replace(/[[\]]/g, "") || "Imagem"}](${absoluteUrl(src)})${caption ? `\n_${caption}_` : ""}`);
    } else if (block.type === "video") {
      const src = fileUrl(p), caption = clean(richToMd(p.caption));
      if (src) out.push(`[Vídeo${caption ? `: ${caption}` : ""}](${absoluteUrl(src)})`);
    } else if (block.type === "divider") out.push("---");
    else if (md) out.push(md);
    block.children?.forEach(walk);
  });
  flush();
  return out.join("\n\n");
}

/* ---------- Pages ---------- */

/** A case in a language, as the page shows it; null when that version is not published. */
async function caseDocument(slug: string, locale: SiteLocale): Promise<{ c: Case; blocks: NotionBlockNode[] } | null> {
  const c = (await getCaseDataSource()).cases.find(item => item.slug === slug);
  if (!c) return null;
  const blocks = await getCaseBody(slug);
  if (locale === "pt") return { c, blocks };
  const snapshot = (await readTranslation(slug))?.published;
  const source = extractSource(c, blocks);
  if (!snapshot || snapshot.sourceHash !== source.sourceHash) return null;
  const translated = applySnapshot(source, snapshot);
  return { c: translated.case, blocks: translated.blocks };
}

export async function caseMarkdown(slug: string, locale: SiteLocale): Promise<string | null> {
  const doc = await caseDocument(slug, locale);
  if (!doc) return null;
  const { c, blocks } = doc;
  const en = locale === "en";
  const url = absoluteUrl(getCaseHref(slug, locale));
  const facts = [
    [en ? "Company" : "Empresa", c.company], [en ? "Year" : "Ano", c.year], [en ? "Role" : "Papel", c.role],
    ["Tags", [...(c.tags ?? []), ...(c.accentTags ?? [])].join(", ")],
  ].filter(([, v]) => v?.trim()).map(([k, v]) => `- **${k}:** ${v}`).join("\n");
  const classic = [
    [en ? "Context" : "Contexto", c.context], [en ? "Challenge" : "Desafio", c.challenge],
    [en ? "Outcome" : "Resultado", c.outcome], [en ? "Learnings" : "Aprendizados", c.learning],
  ].filter(([, v]) => v?.trim()).map(([k, v]) => `## ${k}\n\n${clean(v!)}`).join("\n\n");
  const stats = (c.stats ?? []).filter(s => s.value || s.label).map(s => `- **${s.value}** ${s.label}`).join("\n");
  return join(
    frontMatter({ url, language: en ? "en" : "pt-BR", page: "case", site: SITE_NAME, author: "Gutto Rocha", company: c.company, year: c.year, updated: c.updatedAt }),
    `# ${c.title} — ${c.company}`,
    c.summary && clean(c.summary),
    facts,
    stats && `## ${en ? "Key results" : "Resultados"}\n\n${stats}`,
    classic,
    blocksToMarkdown(blocks),
    "---",
    `${en ? "Case study by" : "Case de"} [Gutto Rocha](${absoluteUrl(en ? "/en" : "/")}), ${en ? "design manager" : "design manager"}. ${en ? "All cases" : "Todos os cases"}: ${absoluteUrl(en ? "/en/cases" : "/cases")}`,
  );
}

async function caseList(locale: SiteLocale) {
  const ordered = orderCasesForListing((await getCaseDataSource()).cases).filter(c => c.slug !== "modelo");
  return locale === "en" ? translatedCaseListings(ordered) : ordered;
}

function caseLine(c: Case, locale: SiteLocale) {
  return `- [${c.title} — ${c.company}](${absoluteUrl(mdPath(getCaseHref(c.slug, locale)))})${c.summary ? `: ${clean(c.summary)}` : ""}`;
}

// The résumé and the contact read the same editable content as their pages (content/pages).
async function curriculumMarkdown(locale: SiteLocale) {
  const cv = await getPageContent<CurriculumContent>("curriculo", locale);
  return join(
    `## ${cv.summaryTitle}\n\n${cv.summary}`,
    `## ${cv.experienceTitle}`,
    ...cv.phases.flatMap(phase => [
      `### ${phase.title}${phase.period ? ` (${phase.period})` : ""}`,
      ...phase.jobs.map(job => join(
        `#### ${job.title}`, `_${job.period}_`,
        job.bullets.map(b => `- ${b.text}`).join("\n"),
        !!job.results.length && `**${cv.resultsTitle}:**\n${job.results.map(r => `- ${r.text}`).join("\n")}`,
      )),
    ]),
    `## ${cv.educationTitle}\n\n${cv.education.map(e => `- ${e.course} — ${e.institution} (${e.year})`).join("\n")}`,
    `## ${cv.skillsTitle}\n\n${cv.skills.map(s => s.text).join(", ")}`,
    `## ${cv.toolsTitle}\n\n${cv.tools.map(tool => tool.name).join(", ")}`,
    `## ${cv.aiTitle}\n\n${cv.ai.map(tool => tool.name).join(", ")}`,
  );
}

async function contactMarkdown(locale: SiteLocale) {
  const c = await getPageContent<ContactContent>("contato", locale);
  return join(
    `- **${c.emailButton}:** ${c.email}`,
    c.channels.filter(ch => ch.href.startsWith("http")).map(ch => `- **${ch.label}:** ${ch.href}`).join("\n"),
    `- **${c.locationLabel}:** ${c.location}`,
  );
}

function about(locale: SiteLocale) {
  const t = getTranslator(locale);
  return [
    "Designer brasileiro com mais de 18 anos de experiência.",
    "Liderança em design, do desenvolvimento de pessoas ao impacto no produto.",
    "Mais de 18 anos em design. Experiência liderando times de até 15 pessoas.",
    "Conecto desenvolvimento de pessoas, qualidade de design e resultado. Passei por fintechs, produtos imobiliários e plataformas para creators. Hoje, sigo aprendendo e experimentando com IA.",
  ].map(t).join(" ");
}

/** A page of the site as Markdown; null when it does not exist in that language. */
export async function pageMarkdown(page: Page, locale: SiteLocale): Promise<string | null> {
  const en = locale === "en";
  const copy = await pageCopy(page === "index" ? "home" : page, locale);
  const path = pagePath(page, locale);
  const head = [frontMatter({ url: absoluteUrl(path), language: en ? "en" : "pt-BR", page, site: SITE_NAME, author: "Gutto Rocha" }), `# ${copy.title}`, copy.description];
  const cases = await caseList(locale);
  const casesSection = `## Cases\n\n${cases.map(c => caseLine(c, locale)).join("\n")}`;
  const links = `## ${en ? "Pages" : "Páginas"}\n\n${MARKDOWN_PAGES.map(p => `- ${absoluteUrl(mdPath(pagePath(p, locale)))}`).join("\n")}`;
  switch (page) {
    case "index": return join(...head, about(locale), casesSection, links);
    case "sobre": return join(...head, about(locale), `${en ? "Full résumé" : "Currículo completo"}: ${absoluteUrl(mdPath(pagePath("curriculo", locale)))}`, links);
    case "curriculo": return join(...head, await curriculumMarkdown(locale), links);
    case "contato": return join(...head, await contactMarkdown(locale), links);
    case "cases": return join(...head, casesSection, links);
  }
}

/* ---------- llms.txt ---------- */

/** The site in one short file, as llmstxt.org proposes: who, what, and where to read more. */
export async function llmsTxt() {
  const [pt, en] = await Promise.all([caseList("pt"), caseList("en")]);
  const [cv, contact] = await Promise.all([getPageContent<CurriculumContent>("curriculo", "pt"), getPageContent<ContactContent>("contato", "pt")]);
  const roles = cv.phases.flatMap(phase => phase.jobs);
  const current = roles[0]?.title;
  const linkedin = contact.channels.find(ch => /linkedin/i.test(ch.href))?.href ?? LINKEDIN_URL;
  const titles = async (locale: SiteLocale) => Promise.all(MARKDOWN_PAGES.map(async p => (await pageCopy(p === "index" ? "home" : p, locale)).title));
  const [titlesPt, titlesEn] = await Promise.all([titles("pt"), titles("en")]);
  return join(
    `# ${SITE_NAME}`,
    `> Portfólio de Gutto Rocha (Gustavo Rocha), designer brasileiro e Design Manager com mais de 18 anos de experiência em design de produto, liderança de times de design, design systems e pesquisa com usuários. Mora em Guarulhos, SP. Site em português, com versão em inglês.`,
    [current && `- Atualmente: ${current}`, `- Experiência: ${roles.slice(0, 6).map(e => e.title.split("@")[1]?.trim()).filter(Boolean).join(", ")} e outras`, `- Contato: ${contact.email} · ${linkedin}`].filter(Boolean).join("\n"),
    `Cada página tem uma versão em Markdown: troque o endereço por \`.md\` (a Home é \`/index.md\`). Versão completa em um arquivo: ${absoluteUrl("/llms-full.txt")}`,
    `## Cases\n\n${pt.map(c => caseLine(c, "pt")).join("\n")}`,
    `## Páginas\n\n${MARKDOWN_PAGES.map((p, i) => `- [${titlesPt[i]}](${absoluteUrl(mdPath(pagePath(p, "pt")))})`).join("\n")}`,
    `## English\n\n${[...MARKDOWN_PAGES.map((p, i) => `- [${titlesEn[i]}](${absoluteUrl(mdPath(pagePath(p, "en")))})`), ...en.map(c => caseLine(c, "en"))].join("\n")}`,
    `## Optional\n\n- [Currículo completo](${absoluteUrl("/curriculo.md")})\n- [Tudo em um arquivo](${absoluteUrl("/llms-full.txt")})`,
  );
}

/** Everything in one file: the résumé and every case, in Portuguese. */
export async function llmsFullTxt() {
  const cases = await caseList("pt");
  const [bodies, site] = await Promise.all([Promise.all(cases.map(c => caseMarkdown(c.slug, "pt"))), getPageContent<SiteContent>("site", "pt")]);
  return join(
    `# ${SITE_NAME} — conteúdo completo`,
    `> ${site.personDescription} Fonte: ${absoluteUrl("/")}`,
    await curriculumMarkdown("pt"),
    await contactMarkdown("pt"),
    ...bodies.map(b => b && b.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/^# /m, "# Case: ")),
  );
}

/**
 * Texto inicial para colar na database Notion (colunas da linha — hero + cartão).
 * Não faz parte do corpo renderizado pelo site.
 */
import type { Case } from "../lib/cases";

export function formatNotionHeroDatabaseBlock(c: Case): string {
  const lines: string[] = [];
  lines.push("## Propriedades Notion (database — hero e listagem)");
  lines.push("");
  lines.push(
    "Preenche nas **colunas da linha** deste case na database (slug, título, empresa, imagem de capa, cores, etiquetas). Isto **não** é corpo da página: o site usa estas propriedades para o hero e para a listagem.",
  );
  lines.push(
    "Imagem de capa / poster de vídeo: no Notion podes usar coluna **URL**, **texto** com link, ou tipo **Files** (upload).",
  );
  lines.push("");
  lines.push(`slug: ${c.slug}`);
  lines.push(`num: ${c.num}`);
  lines.push(`title: ${c.title}`);
  lines.push(`company: ${c.company}`);
  if (c.productTag?.trim()) lines.push(`productTag: ${c.productTag.trim()}`);
  lines.push(`year: ${c.year}`);
  lines.push(`role: ${c.role}`);
  lines.push(`tags: ${c.tags.join(", ")}`);
  lines.push(`accentTags: ${c.accentTags.join(", ")}`);
  lines.push(
    `featuredOnSite: ${c.featuredOnSite === true ? "true" : c.featuredOnSite === false ? "false" : "(sem coluna no seed — no Notion usa checkbox/select)"}`,
  );
  lines.push(`placeholder: ${c.placeholder}`);
  lines.push(`brandColor: ${c.brandColor}`);
  const hi = c.heroImage?.trim();
  lines.push(hi ? `heroImage: ${hi}` : `heroImage: `);
  lines.push(`summary: ${c.summary}`);
  if (c.heroMegaWord?.trim()) lines.push(`heroMegaWord: ${c.heroMegaWord.trim()}`);
  if (c.heroVariant) lines.push(`heroVariant: ${c.heroVariant}`);
  if (c.heroFullBleedEyebrow?.trim()) {
    lines.push(`heroFullBleedEyebrow: ${c.heroFullBleedEyebrow.trim()}`);
  }
  if (c.heroFullBleedTagline?.trim()) {
    lines.push(`heroFullBleedTagline: ${c.heroFullBleedTagline.trim()}`);
  }
  if (c.heroFullBleedNextSectionId?.trim()) {
    lines.push(`heroFullBleedNextSectionId: ${c.heroFullBleedNextSectionId.trim()}`);
  }
  if (c.heroFullBleedVideoUrl?.trim()) {
    lines.push(`heroFullBleedVideoUrl: ${c.heroFullBleedVideoUrl.trim()}`);
  }
  if (c.heroFullBleedVideoPoster?.trim()) {
    lines.push(`heroFullBleedVideoPoster: ${c.heroFullBleedVideoPoster.trim()}`);
  }
  lines.push("");
  lines.push(
    "_Aliases de colunas e campos extra: `mapCaseFromNotion` em `lib/notionCases.ts`._",
  );
  return lines.join("\n");
}

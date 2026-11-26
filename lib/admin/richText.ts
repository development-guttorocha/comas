/**
 * Rich text (o formato de partes do Notion que o site renderiza) ↔ um markdown mínimo para o admin:
 * **negrito**, _itálico_, `código`, ~~riscado~~ e [link](url). Sublinhado e cores não têm marcação:
 * um texto que os usa é `lossy` e só perde essa formatação se for editado.
 */
export type RichTextPart = {
  type: "text";
  text: { content: string; link: { url: string } | null };
  annotations: { bold: boolean; italic: boolean; strikethrough: boolean; underline: boolean; code: boolean; color: string };
  plain_text: string;
  href: string | null;
};

type Marks = { bold: boolean; italic: boolean; strikethrough: boolean; code: boolean };

const SPECIAL = /[\\*_`~[\]]/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function partOf(content: string, marks: Marks, url: string | null): RichTextPart {
  return {
    type: "text",
    text: { content, link: url ? { url } : null },
    annotations: { ...marks, underline: false, color: "default" },
    plain_text: content,
    href: url,
  };
}

/** Plain text of any rich text array. */
export function richPlain(parts: unknown): string {
  return Array.isArray(parts) ? parts.map(p => (isRecord(p) && typeof p.plain_text === "string" ? p.plain_text : "")).join("") : "";
}

/** Whether the parts use formatting the markdown cannot carry (underline, colours, mentions). */
export function richIsLossy(parts: unknown): boolean {
  if (!Array.isArray(parts)) return false;
  return parts.some(p => {
    if (!isRecord(p)) return true;
    if (p.type !== "text") return true;
    const a = isRecord(p.annotations) ? p.annotations : {};
    return a.underline === true || (typeof a.color === "string" && a.color !== "default");
  });
}

export function richToMd(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  // Consecutive parts of one link share a single [ … ](url).
  const groups: { link: string | null; md: string }[] = [];
  for (const p of parts) {
    if (!isRecord(p)) continue;
    const text = isRecord(p.text) && typeof p.text.content === "string" ? p.text.content : typeof p.plain_text === "string" ? p.plain_text : "";
    const a = isRecord(p.annotations) ? p.annotations : {};
    const link = isRecord(p.text) && isRecord(p.text.link) && typeof p.text.link.url === "string" ? p.text.link.url : null;
    let out = a.code ? `\`${text.replace(/`/g, "")}\`` : text.replace(SPECIAL, m => `\\${m}`);
    if (a.strikethrough) out = `~~${out}~~`;
    if (a.italic) out = `_${out}_`;
    if (a.bold) out = `**${out}**`;
    const last = groups.at(-1);
    if (last && link && last.link === link) last.md += out;
    else groups.push({ link, md: out });
  }
  return groups.map(g => (g.link ? `[${g.md}](${g.link})` : g.md)).join("");
}

const LINK = /^\[((?:\\.|[^\]\\])*)\]\(([^()\s]+)\)/;

export function mdToRich(md: string): RichTextPart[] {
  const parts: RichTextPart[] = [];
  const parse = (source: string, marks: Marks, url: string | null) => {
    let buffer = "";
    const flush = () => { if (buffer) parts.push(partOf(buffer, { ...marks }, url)); buffer = ""; };
    for (let i = 0; i < source.length; i++) {
      const c = source[i]!;
      if (marks.code) {
        if (c === "`") { flush(); marks.code = false; } else buffer += c;
        continue;
      }
      if (c === "\\" && i + 1 < source.length) { buffer += source[++i]; continue; }
      if (c === "`") { flush(); marks.code = true; continue; }
      if (source.startsWith("**", i)) { flush(); marks.bold = !marks.bold; i++; continue; }
      if (source.startsWith("~~", i)) { flush(); marks.strikethrough = !marks.strikethrough; i++; continue; }
      if (c === "_") { flush(); marks.italic = !marks.italic; continue; }
      if (c === "[" && !url) {
        const m = LINK.exec(source.slice(i));
        if (m) {
          flush();
          parse(m[1]!, { ...marks }, m[2]!);
          i += m[0].length - 1;
          continue;
        }
      }
      buffer += c;
    }
    flush();
  };
  parse(md, { bold: false, italic: false, strikethrough: false, code: false }, null);
  // Adjacent parts with the same formatting read as one.
  return parts.reduce<RichTextPart[]>((out, part) => {
    const last = out.at(-1);
    if (last && last.href === part.href && JSON.stringify(last.annotations) === JSON.stringify(part.annotations)) {
      const content = last.text.content + part.text.content;
      out[out.length - 1] = { ...last, text: { ...last.text, content }, plain_text: content };
    } else out.push(part);
    return out;
  }, []);
}

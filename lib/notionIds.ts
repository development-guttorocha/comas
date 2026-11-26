/** Normaliza ID de database ou página Notion (URL, UUID, 32 chars). */
export function normalizeNotionId(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (!value) return undefined;

  const withoutQuery = value.split(/[?#]/)[0] ?? value;

  const urlMatch = withoutQuery.match(/[0-9a-fA-F]{32}(?=[^0-9a-fA-F]|$)/g);
  if (urlMatch && urlMatch.length > 0) {
    return urlMatch[urlMatch.length - 1].toLowerCase();
  }

  const compact = withoutQuery.replace(/-/g, "");
  if (/^[0-9a-fA-F]{32}$/.test(compact)) {
    return compact.toLowerCase();
  }

  return undefined;
}

/** UUID com hífens para paths da API Notion. */
export function formatNotionUuid(id: string): string {
  const c = id.replace(/-/g, "").toLowerCase();
  if (c.length !== 32 || !/^[0-9a-f]{32}$/.test(c)) return id;
  return `${c.slice(0, 8)}-${c.slice(8, 12)}-${c.slice(12, 16)}-${c.slice(16, 20)}-${c.slice(20, 32)}`;
}

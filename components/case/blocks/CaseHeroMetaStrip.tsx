import type { CSSProperties, ReactNode } from "react";
import styles from "../CaseChrome.module.css";
import type { SiteLocale } from "@/lib/siteLocale";

export type CaseHeroMetaVariant = "surface" | "ink";

const MAX_STRIP_TAG_PILLS = 3;

export interface CaseHeroMetaStripCoreProps {
  locale?: SiteLocale;
  variant?: CaseHeroMetaVariant;
  company: string;
  year: string;
  role?: string;
  /**
   * Tokens de escopo (uma palavra cada), separados por vírgula, ponto e vírgula ou ponto médio.
   * Funde com `tags` numa fila de pills; entradas com espaço são ignoradas.
   */
  scopeLine?: string;
  productTag?: string;
  tags?: string[];
  accentTags?: string[];
  /** One more cell at the end of the row (the case video as a card or a button). */
  aside?: ReactNode;
}

/** Uma tag = um token sem espaços em branco. */
export function isSingleWordTag(s: string): boolean {
  const t = s.trim();
  return t.length > 0 && !/\s/.test(t);
}

function tokensFromScopeLine(scopeLine: string | undefined): string[] {
  if (!scopeLine?.trim()) return [];
  const raw = scopeLine.trim();
  if (!/[,;·]/.test(raw)) {
    return isSingleWordTag(raw) ? [raw.trim()] : [];
  }
  return raw
    .split(/[,;·]/)
    .map((p) => p.trim())
    .filter(isSingleWordTag);
}

/** Escopo (só tokens de uma palavra) + tags válidas → no máximo `max` pills. */
export function mergeScopeAndTags(
  scopeLine: string | undefined,
  tags: string[] | undefined,
  max = MAX_STRIP_TAG_PILLS,
): string[] {
  const out: string[] = [];
  for (const t of tokensFromScopeLine(scopeLine)) {
    if (out.length >= max) break;
    if (!out.includes(t)) out.push(t);
  }
  for (const t of tags ?? []) {
    if (out.length >= max) break;
    const u = t?.trim();
    if (!u || out.includes(u) || !isSingleWordTag(u)) continue;
    out.push(u);
  }
  return out;
}


/** Metadados no fluxo de leitura, com campos alinhados e sem duplicação no DOM. */
export function CaseHeroMetaStripView({
  company, year, role, scopeLine, productTag, tags = [], id, className = "", locale = "pt", aside,
}: CaseHeroMetaStripCoreProps & { id?: string; className?: string }) {
  const displayTags = mergeScopeAndTags(scopeLine, tags);
  return (
    <dl id={id} className={`${styles.meta} ${className}`} style={{ "--meta-columns": (role ? 3 : 2) + (aside ? 1 : 0) } as CSSProperties}>
      <div><dt>{locale === "en" ? "Company" : "Empresa"}</dt><dd>{company}{productTag ? <span>{productTag}</span> : null}</dd></div>
      <div><dt>{locale === "en" ? "Year" : "Ano"}</dt><dd>{year}</dd></div>
      {role ? <div><dt>{locale === "en" ? "Role" : "Papel"}</dt><dd>{role}</dd></div> : null}
      {aside ? <div className={styles.metaAside}>{aside}</div> : null}
      {displayTags.length ? <div className={styles.metaTagsRow}><dt className="sr-only">Tags</dt><dd className={styles.metaTags}>{displayTags.map(tag => <span key={tag}>{tag}</span>)}</dd></div> : null}
    </dl>
  );
}

interface CaseHeroEditorialDockProps {
  strip: CaseHeroMetaStripCoreProps;
  /** Mantido para compatibilidade com os cases existentes; os metadados seguem o fluxo. */
  enableDock?: boolean;
  children: ReactNode;
}
export default function CaseHeroEditorialDock({ strip, children }: CaseHeroEditorialDockProps) {
  return <>{children}<section aria-label="Metadados do case"><CaseHeroMetaStripView {...strip} /></section></>;
}

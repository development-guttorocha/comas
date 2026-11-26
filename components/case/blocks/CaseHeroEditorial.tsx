import type { CSSProperties, ReactNode } from "react";
import { caseHeroEditorialEyebrowClass, caseHeroEditorialTitleClass, caseHeroEditorialTaglineClass, caseHeroEditorialLeadClass, caseHeroEditorialSummaryClass } from "@/lib/caseTypography";
import CaseHeroEditorialDock from "./CaseHeroMetaStrip";
import styles from "../CaseChrome.module.css";
import type { SiteLocale } from "@/lib/siteLocale";

export interface CaseHeroEditorialProps {
  locale?: SiteLocale;
  /** Fundo claro (wash) ou escuro (`ink`) — mesma hierarquia de conteúdo. */
  tone?: "surface" | "ink";
  /** Cor do case (`placeholder` em lib/cases) para wash — ignorado se `tone="ink"` ou `brandColor`. */
  placeholder: string;
  /** Cor de marca (`brandColor` em lib/cases): degradê via `caseBrandGradientBackground` no hero claro. */
  brandColor?: string;
  /** Graus do gradiente no wash (ex. 180 editorial, 165 WebMotors) */
  washAngle?: number;
  /**
   * Marca d’água gigante atrás do texto (e visualmente com a faixa abaixo).
   * Padrão editorial: marca d’água centralizada na horizontal, base na vertical, `megaScale` display.
   */
  megaWord?: string;
  megaAlign?: "left" | "center" | "right";
  megaVertical?: "bottom" | "top" | "center";
  company: string;
  year: string;
  /** Rótulo de produto (linha extra na coluna Empresa). */
  productTag?: string;
  eyebrow: string;
  title: ReactNode;
  /** display: clamp editorial (30px→96px). headline: escala mais contida. */
  titleScale?: "display" | "headline";
  tagline?: ReactNode;
  lead?: ReactNode;
  summary?: string;
  role?: string;
  scopeLine?: string;
  tags?: string[];
  accentTags?: string[];
  /** Sobrescreve o bloco após lead (texto de apoio em largura útil). */
  children?: ReactNode;
  /** Conteúdo extra após summary|children (diagramas, cards). */
  belowLead?: ReactNode;
  sectionClassName?: string;
  sectionStyle?: CSSProperties;
  /** pt/pb do hero (default editorial BrandLovers) */
  paddingClass?: string;
  /** Substitui o wash calculado — ignorado se `tone="ink"` ou se `brandColor` estiver definido. */
  backgroundOverride?: string;
  /** `display` = escala BrandLovers (padrão quando há `megaWord`). */
  megaScale?: "default" | "display";
  /**
   * Desativa barra inferior fixa; faixa de meta só no fluxo (ex. hero legado).
   */
  disableMetaDock?: boolean;
  /** Ancora para navegação local (ex. `#visao-geral`). */
  sectionId?: string;
  /** Uma célula a mais na faixa de metadados (o vídeo do case como cartão ou botão). */
  metaAside?: ReactNode;
}


export default function CaseHeroEditorial({
  tone = "surface", company, year, productTag, eyebrow, title, titleScale = "display", locale = "pt",
  tagline, lead, summary, role, scopeLine, tags = [], accentTags = [], children, belowLead,
  sectionClassName = "", sectionStyle, sectionId, metaAside,
}: CaseHeroEditorialProps) {
  const isInk = tone === "ink";
  return (
    <section id={sectionId} className={`${styles.hero} ${sectionClassName}`} style={sectionStyle}>
      <div className={styles.container}>
        <CaseHeroEditorialDock strip={{ variant: isInk ? "ink" : "surface", company, year, role, scopeLine, productTag, tags, accentTags, locale, aside: metaAside }}>
          <div className={styles.heroCopy}>
            <p className={caseHeroEditorialEyebrowClass(isInk)}>{eyebrow}</p>
            <h1 className={caseHeroEditorialTitleClass(isInk, titleScale)}>{title}</h1>
            {tagline ? <div className={caseHeroEditorialTaglineClass(isInk)}>{tagline}</div> : null}
            {lead ? <div className={caseHeroEditorialLeadClass(isInk)}>{lead}</div> : null}
            {children ? <div className="mt-8">{children}</div> : summary ? <p className={`${caseHeroEditorialSummaryClass(isInk)} mt-8`}>{summary}</p> : null}
          </div>
          {belowLead}
        </CaseHeroEditorialDock>
      </div>
    </section>
  );
}

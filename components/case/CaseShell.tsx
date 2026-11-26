import type { ReactNode } from "react";
import styles from "./CaseChrome.module.css";
import CaseArrival from "@/components/case/CaseArrival";
import CaseNav from "@/components/case/CaseNav";
import CaseNextLink from "@/components/case/CaseNextLink";
import CaseSectionNav from "@/components/case/CaseSectionNav";
import { CaseImageThemeProvider } from "@/components/ImageVeil";
import type { CaseSectionNavItem } from "@/components/case/CaseSectionNav";
import { DEFAULT_SITE_LOCALE, type SiteLocale } from "@/lib/siteLocale";

export type { CaseSectionNavItem };

export interface CaseShellNext {
  slug: string;
  title: string;
  company: string;
  brandColor?: string;
  cover?: string;
}

interface CaseShellProps {
  /** `en` para `/en/cases/…` (links “próximo case” e locale coerente). */
  locale?: SiteLocale;
  next?: CaseShellNext;
  /** Topo da página (hero e eventual mídia logo abaixo). O menu local e a barra de progresso aparecem logo a seguir. */
  hero: ReactNode;
  /** Âncoras da navegação local (máx. 5); empresa à esquerda, links à direita. Cor de marca na barra de progresso. */
  sectionNav: {
    company: string;
    items: CaseSectionNavItem[];
    brandColor?: string;
  };
  children: ReactNode;
  /** Sobrescreve `--color-accent` localmente no case (ex.: cor vinda do Notion). */
  accentColor?: string;
}

/** Shell partilhado: nav global, hero, navegação local do case + progresso de leitura, conteúdo, próximo case. */
export default function CaseShell({
  locale = DEFAULT_SITE_LOCALE,
  next,
  hero,
  sectionNav,
  children,
  accentColor,
}: CaseShellProps) {
  return (
    <CaseImageThemeProvider color={accentColor} label={sectionNav.company}>
      <CaseNav />
      <main className={`case-content portfolio-case-page ${styles.page}`} style={accentColor ? { ["--case-brand" as string]: accentColor } : undefined}>
        {hero}
        <CaseArrival />
        <CaseSectionNav
          company={sectionNav.company}
          items={sectionNav.items}
          brandColor={sectionNav.brandColor}
        />
        {children}
        {next ? <CaseNextLink locale={locale} {...next} /> : null}
      </main>
    </CaseImageThemeProvider>
  );
}

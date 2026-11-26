import Link from "next/link";
import CaseCoverImage from "@/components/CaseCoverImage";
import { Kicker, Section, pillClassName } from "@/components/guide";
import { caseDetailUi } from "@/lib/caseDetailLocale";
import { getCaseHref } from "@/lib/cases";
import { getTranslator } from "@/lib/i18n/messages";
import { DEFAULT_SITE_LOCALE, type SiteLocale } from "@/lib/siteLocale";
import styles from "./CaseChrome.module.css";

interface CaseNextLinkProps {
  slug: string;
  title: string;
  company: string;
  brandColor?: string;
  cover?: string;
  locale?: SiteLocale;
}

export default function CaseNextLink({ slug, title, company, brandColor, cover, locale = DEFAULT_SITE_LOCALE }: CaseNextLinkProps) {
  const ui = caseDetailUi(locale);
  const t = getTranslator(locale);
  return (
    <Section className={styles.next} aria-label={ui.nextCaseEyebrow}>
      <Kicker>{ui.nextCaseEyebrow}</Kicker>
      <Link href={getCaseHref(slug, locale)} className={styles.nextCard} aria-label={ui.nextCaseAria(title, company)}>
        <div className={styles.nextBody}>
          <span className={styles.nextCompany}>{company}</span>
          <span className={styles.nextTitle}>{title}</span>
          <span className={`${pillClassName} ${styles.nextCta}`} aria-hidden>
            {t("Ver case")}<span>↗</span>
          </span>
        </div>
        <div className={styles.nextMedia}>
          <CaseCoverImage src={cover} company={company} brandColor={brandColor} />
        </div>
      </Link>
    </Section>
  );
}

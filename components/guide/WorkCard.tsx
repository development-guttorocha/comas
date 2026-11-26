import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./guide.module.css";

export type WorkMetric = { value: string; label: string };

/** Work card from the Sobre leadership chapter: who, when, what changed, and the numbers. */
export function WorkCard({ href, company, role, date, title, metrics = [], tags = [], media, tone = "dark", headingLevel = 3, ariaLabel }: {
  href: string;
  company: string;
  role?: string;
  date?: string;
  title: string;
  metrics?: WorkMetric[];
  tags?: string[];
  media?: ReactNode;
  tone?: "dark" | "light";
  headingLevel?: 3 | 4;
  ariaLabel?: string;
}) {
  const Company = headingLevel === 3 ? "h3" : "h4";
  const Title = headingLevel === 3 ? "h4" : "h5";
  return (
    <Link href={href} className={styles.workCard} data-tone={tone} aria-label={ariaLabel}>
      {media ? <div className={styles.workMedia}>{media}</div> : null}
      <div className={styles.workBody}>
        <header>
          <Company className={styles.workCompany}>{company}</Company>
          {role ? <p>{role}</p> : null}
          {date ? <p className={styles.workDate}>{date}</p> : null}
        </header>
        <div className={styles.workResults}>
          <Title className={styles.workTitle}>{title}</Title>
          {metrics.length ? <dl>{metrics.map(metric => <div key={`${metric.value}-${metric.label}`}><dt>{metric.value}</dt><dd>{metric.label}</dd></div>)}</dl> : null}
          {tags.length ? <ul className={styles.workTags}>{tags.map(tag => <li key={tag}>{tag}</li>)}</ul> : null}
        </div>
      </div>
      <span className={styles.workArrow} aria-hidden="true">↗</span>
    </Link>
  );
}

export function WorkMonogram({ children }: { children: ReactNode }) {
  return <span className={styles.workMonogram} aria-hidden="true">{children}</span>;
}

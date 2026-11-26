import type { CurriculumContent } from "@/lib/pages/schemas";
import { splitJob } from "./curriculumParts";
import styles from "./CurriculumPrint.module.css";

const bare = (href: string) => href.replace(/^(https?:\/\/(www\.)?|mailto:|tel:)/, "").replace(/\/$/, "");

/**
 * The résumé as an A4 document, shown only when printing (or saving as PDF): white paper, one column of
 * experience beside a narrow one of education, skills and tools, and no screen chrome.
 */
export function CurriculumPrint({ data }: { data: CurriculumContent }) {
  return (
    <article className={styles.print} aria-hidden="true">
      <header className={styles.header}>
        <h1 className={styles.name}>{data.name} {data.surname}</h1>
        <p className={styles.headline}>{data.headline}</p>
        <ul className={styles.contacts}>
          {data.contacts.map(contact => <li key={contact.href}><span>{contact.label}</span>{contact.value}</li>)}
          {data.location ? <li>{data.location}</li> : null}
        </ul>
      </header>

      <section className={styles.summary}>
        <h2>{data.summaryTitle}</h2>
        <p>{data.summary}</p>
      </section>

      <div className={styles.body}>
        <section className={styles.main}>
          <h2>{data.experienceTitle}</h2>
          {data.phases.map(phase => {
            const detailed = phase.jobs.filter(job => job.bullets.length || job.results.length);
            const brief = phase.jobs.filter(job => !job.bullets.length && !job.results.length);
            return (
              <div key={phase.title} className={styles.phase}>
                <h3 className={styles.phaseTitle}>{phase.title}{phase.period ? <span>{phase.period}</span> : null}</h3>
                {detailed.map(job => {
                  const { role, company } = splitJob(job.title);
                  return (
                    <div key={`${job.title}-${job.period}`} className={styles.job}>
                      <div className={styles.jobHead}>
                        <h4>{role}{company ? <span> · {company}</span> : null}</h4>
                        <p>{job.period}</p>
                      </div>
                      {job.bullets.map((line, i) => <p key={i} className={styles.text}>{line.text}</p>)}
                      {job.results.length ? (
                        <div className={styles.results}>
                          <h5>{data.resultsTitle}</h5>
                          <ul>{job.results.map((line, i) => <li key={i}>{line.text}</li>)}</ul>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {brief.length ? (
                  <ul className={styles.brief}>
                    {brief.map(job => {
                      const { role, company } = splitJob(job.title);
                      return <li key={`${job.title}-${job.period}`}><span><strong>{role}</strong>{company ? ` · ${company}` : ""}</span><span>{job.period}</span></li>;
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </section>

        <aside className={styles.side}>
          <section>
            <h2>{data.educationTitle}</h2>
            {data.education.map(e => (
              <div key={`${e.course}-${e.year}`} className={styles.course}>
                <strong>{e.course}</strong>
                <span>{e.institution} · {e.year}</span>
              </div>
            ))}
          </section>
          <section>
            <h2>{data.skillsTitle}</h2>
            <ul className={styles.list}>{data.skills.map(s => <li key={s.text}>{s.text}</li>)}</ul>
          </section>
          <section>
            <h2>{data.toolsTitle}</h2>
            <p className={styles.inline}>{data.tools.map(tool => tool.name).join(" · ")}</p>
          </section>
          <section>
            <h2>{data.aiTitle}</h2>
            <p className={styles.inline}>{data.ai.map(tool => tool.name).join(" · ")}</p>
          </section>
          <section>
            <h2>{data.socialTitle}</h2>
            <ul className={styles.list}>{data.social.map(s => <li key={s.href}><strong>{s.label}</strong><span>{bare(s.href)}</span></li>)}</ul>
          </section>
        </aside>
      </div>
    </article>
  );
}

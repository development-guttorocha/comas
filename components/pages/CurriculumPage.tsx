import type { SiteLocale } from "@/lib/siteLocale";
import { CurriculumPrint } from "@/components/curriculo/CurriculumPrint";
import { CurriculumPrintButton } from "@/components/curriculo/CurriculumPrintButton";
import { CurriculumTestimonials } from "@/components/curriculo/CurriculumTestimonials";
import { SocialIcon, splitJob } from "@/components/curriculo/curriculumParts";
import SiteNav from "@/components/SiteNav";
import { PillLink, Section } from "@/components/guide";
import { localizedHref } from "@/lib/navLocalePaths";
import { getPageContent } from "@/lib/pages/store";
import type { CurriculumContent } from "@/lib/pages/schemas";
import styles from "@/components/curriculo/Curriculum.module.css";

const external = (href: string) => (href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {});

/**
 * The résumé as cards: the profile beside the summary and the experience (whose roles scroll inside their
 * own card), then education, skills and tools in a strip, then the testimonials.
 * Printing shows a separate A4 document (CurriculumPrint), not this screen.
 * Everything comes from `content/pages/curriculo.json`, edited in the admin.
 */
export default async function CurriculumPage({ locale = "pt" }: { locale?: SiteLocale }) {
  const data = await getPageContent<CurriculumContent>("curriculo", locale);

  return (
    <>
      <SiteNav />

      <main className={styles.page}>
        <Section as="div" className={styles.screen}>
          <div className={styles.layout}>
            <aside className={styles.profile} aria-label={data.kicker}>
              {data.photo ? (
                <div className={styles.photo}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a single portrait, chosen in the admin */}
                  <img src={data.photo} alt={`${data.name} ${data.surname}`} />
                </div>
              ) : null}
              <div className={styles.identity}>
                {data.status ? <p className={styles.status}><span aria-hidden />{data.status}</p> : null}
                <h1 className={styles.name}>{data.name} <span>{data.surname}</span></h1>
                <p className={styles.headline}>{data.headline}</p>
                {data.location ? <p className={styles.location}>{data.location}</p> : null}

                <dl className={styles.rows}>
                  {data.contacts.map(contact => (
                    <div key={contact.href}>
                      <dt>{contact.label}</dt>
                      <dd><a href={contact.href} {...external(contact.href)}>{contact.value}</a></dd>
                    </div>
                  ))}
                </dl>

                <ul className={styles.socials} aria-label={data.socialTitle}>
                  {data.social.map(s => (
                    <li key={s.href}><a href={s.href} {...external(s.href)} aria-label={s.label} title={s.label}><SocialIcon href={s.href} label={s.label} /></a></li>
                  ))}
                </ul>

                <div className={styles.actions}>
                  <CurriculumPrintButton className={styles.primaryAction}>{data.printLabel}</CurriculumPrintButton>
                  <PillLink href={localizedHref("/contato", locale)}>{data.contactCta}</PillLink>
                </div>
              </div>
            </aside>

            <div className={styles.content}>
              <section className={styles.card} aria-labelledby="cv-summary">
                <h2 id="cv-summary" className={styles.chip}>{data.summaryTitle}</h2>
                <p className={styles.summary}>{data.summary}</p>
              </section>

              <section className={`${styles.card} ${styles.experience}`} aria-labelledby="cv-experience">
                <h2 id="cv-experience" className={styles.cardTitle}>{data.experienceTitle}</h2>
                {/* On wide screens the roles scroll inside this card, which ends where the profile ends. */}
                <div className={styles.scroller} tabIndex={0} role="region" aria-labelledby="cv-experience">
                  {data.phases.map((phase, index) => {
                    // Roles with paragraphs are told in full; the rest read as compact lines.
                    const detailed = phase.jobs.filter(job => job.bullets.length || job.results.length);
                    const brief = phase.jobs.filter(job => !job.bullets.length && !job.results.length);
                    return (
                      // Each phase folds; the most recent one starts open.
                      <details key={phase.title} className={styles.phase} open={index === 0}>
                        <summary className={styles.phaseHead}>
                          <h3 className={styles.phaseTitle}>{phase.title}</h3>
                          <span className={styles.phaseMeta}>
                            {phase.period ? <span className={styles.period}>{phase.period}</span> : null}
                            <svg className={styles.phaseChevron} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
                          </span>
                        </summary>
                        {detailed.length ? (
                          <ol className={styles.jobs}>
                            {detailed.map(job => {
                              const { role, company } = splitJob(job.title);
                              return (
                                <li key={`${job.title}-${job.period}`} className={styles.job}>
                                  <div className={styles.jobHead}>
                                    <div>
                                      {company ? <p className={styles.company}>{company}</p> : null}
                                      <h4 className={styles.role}>{role}</h4>
                                    </div>
                                    <p className={styles.period}>{job.period}</p>
                                  </div>
                                  {job.bullets.map((line, i) => <p key={i} className={styles.jobText}>{line.text}</p>)}
                                  {job.results.length ? (
                                    <div className={styles.results}>
                                      <p className={styles.resultsTitle}>{data.resultsTitle}</p>
                                      <ul>{job.results.map((line, i) => <li key={i}>{line.text}</li>)}</ul>
                                    </div>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ol>
                        ) : null}
                        {brief.length ? (
                          <ul className={styles.brief}>
                            {brief.map(job => {
                              const { role, company } = splitJob(job.title);
                              return (
                                <li key={`${job.title}-${job.period}`}>
                                  <span><strong>{role}</strong>{company ? <span className={styles.briefCompany}>{company}</span> : null}</span>
                                  <span className={styles.period}>{job.period}</span>
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </details>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>

          <div className={styles.strip}>
            <section className={styles.card} aria-labelledby="cv-education">
              <h2 id="cv-education" className={styles.chip}>{data.educationTitle}</h2>
              <ul className={styles.education}>
                {data.education.map(e => (
                  <li key={`${e.course}-${e.year}`}>
                    <div><p className={styles.course}>{e.course}</p><p className={styles.institution}>{e.institution}</p></div>
                    <span className={styles.year}>{e.year}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className={styles.card} aria-labelledby="cv-skills">
              <h2 id="cv-skills" className={styles.chip}>{data.skillsTitle}</h2>
              <ul className={styles.tags}>{data.skills.map(s => <li key={s.text}>{s.text}</li>)}</ul>
            </section>
            <section className={styles.card} aria-labelledby="cv-tools">
              <h2 id="cv-tools" className={styles.chip}>{data.toolsTitle}</h2>
              <ul className={styles.tools}>
                {data.tools.map(tool => <li key={tool.name}><span aria-hidden>{tool.name.slice(0, 1)}</span>{tool.name}</li>)}
              </ul>
            </section>
            <section className={styles.card} aria-labelledby="cv-ai">
              <h2 id="cv-ai" className={styles.chip}>{data.aiTitle}</h2>
              <ul className={`${styles.tools} ${styles.ai}`}>
                {data.ai.map(tool => <li key={tool.name}><span aria-hidden>{tool.name.slice(0, 1)}</span>{tool.name}</li>)}
              </ul>
            </section>
          </div>

          <CurriculumTestimonials testimonials={data.testimonials} kicker={data.testimonialsKicker} title={data.testimonialsTitle} continuation={data.testimonialsContinuation} />
        </Section>

        <CurriculumPrint data={data} />
      </main>
    </>
  );
}

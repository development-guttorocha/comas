import type { CurriculumContent } from "@/lib/pages/schemas";
import { Kicker, SplitHeading } from "@/components/guide";
import styles from "./CurriculumTestimonials.module.css";

export function CurriculumTestimonials({ testimonials, kicker, title, continuation }: {
  testimonials: CurriculumContent["testimonials"];
  kicker: string;
  title: string;
  continuation: string;
}) {
  if (!testimonials.length) return null;
  return (
    <section id="depoimentos" className={styles.section} aria-labelledby="curriculum-testimonials-title">
      <header className={styles.heading}>
        <Kicker>{kicker}</Kicker>
        <SplitHeading id="curriculum-testimonials-title" title={title} continuation={continuation} />
      </header>
      <div className={styles.grid}>
        {testimonials.map(testimonial => (
          <figure key={testimonial.quote} className={styles.card}>
            <span className={styles.quoteMark} aria-hidden="true">“</span>
            <blockquote className={styles.quote}>{testimonial.quote}</blockquote>
            <figcaption className={styles.author}>
              <div className={styles.authorMeta}>
                <p className={styles.name}>{testimonial.position}</p>
                <time dateTime={testimonial.date}>{testimonial.date}</time>
              </div>
              <p className={styles.role}>{testimonial.role}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

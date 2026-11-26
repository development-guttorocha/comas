import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import { Kicker, PillLink, SplitHeading, WorkCard } from "@/components/guide";
import CtaTracker from "@/components/servicos/CtaTracker";
import LeadForm from "@/components/servicos/LeadForm";
import ServiceFooter from "@/components/servicos/ServiceFooter";
import ServiceNav from "@/components/servicos/ServiceNav";
import type { Case } from "@/lib/cases";
import { getCaseHref } from "@/lib/cases";
import { serializeJsonLd } from "@/lib/jsonLd";
import { servicesHub } from "@/lib/services";
import { getPageContent } from "@/lib/pages/store";
import type { ContactContent } from "@/lib/pages/schemas";
import styles from "@/app/(pt)/servicos/service-shell.module.css";

/**
 * The frame every service page shares: its own menu and footer, the accent color, CTA
 * tracking, and the building blocks below (buttons, formats, cases, FAQ, closing), so the
 * pages differ in their heroes and signature sections, not in how the basics look.
 */

export type ServiceContact = { email: string; mailto: string; whatsapp?: string; linkedin?: string };

/** E-mail and phone come from the Contato page; the subject and message from the service. */
export async function getServiceContact({ emailSubject, whatsappMessage }: { emailSubject: string; whatsappMessage: string }): Promise<ServiceContact> {
  const contact = await getPageContent<ContactContent>("contato", "pt");
  const phone = contact.channels.find(c => c.href.startsWith("tel:"))?.href.replace(/\D/g, "");
  return {
    email: contact.email,
    mailto: `mailto:${contact.email}?subject=${encodeURIComponent(emailSubject)}`,
    whatsapp: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}` : undefined,
    linkedin: contact.channels.find(c => c.href.includes("linkedin.com"))?.href,
  };
}

/** Which hub a page belongs to: Design Services by default, Design Resources on /recursos. */
type Family = { parent: { label: string; href: string } };

export function ServiceShell({ slug, name, links, accent, contact, jsonLd, family, navCta, className, trackAs, children }: {
  slug: string;
  /** The page name in CTA tracking, for a page outside both families. */
  trackAs?: string;
  navCta?: { label: string; href: string };
  className?: string;
  family?: Family;
  name: string;
  links: Array<{ label: string; href: string }>;
  accent: { color: string; on: string };
  contact: ServiceContact;
  jsonLd: unknown;
  children: ReactNode;
}) {
  const vars = { "--svc-accent": accent.color, "--svc-on-accent": accent.on } as CSSProperties;
  return (
    <div className={className ? `${styles.shell} ${className}` : styles.shell} style={vars}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <CtaTracker page={trackAs ?? (slug || (family ? family.parent.href.slice(1) : "servicos"))} />
      {/* Inside a page, the family name ("Design Services") leads back to its hub. */}
      <ServiceNav name={name} links={links} cta={navCta} parent={slug ? family?.parent ?? { label: servicesHub.navName, href: "/servicos" } : undefined} />
      <main id="topo">{children}</main>
      <ServiceFooter whatsapp={contact.whatsapp} />
    </div>
  );
}

type ButtonVariant = "primary" | "ghost" | "ink" | "ghostInk";

/** The one button of the service pages. `ink` variants sit on light surfaces. */
export function ServiceButton({ href, variant = "primary", arrow = "→", cta, children }: {
  href: string; variant?: ButtonVariant; arrow?: string; cta?: string; children: ReactNode;
}) {
  const external = /^https?:\/\//.test(href);
  return (
    <a href={href} className={styles.btn} data-variant={variant} data-cta={cta} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}<span aria-hidden="true">{arrow}</span>
    </a>
  );
}

/**
 * A strip of names (companies, tools) running sideways. Short lists repeat so the row
 * fills wide screens; screen readers get the plain list once.
 */
export function ServiceMarquee({ label, items }: { label: string; items: string[] }) {
  const run = items.length < 8 ? [...items, ...items] : items;
  const row = (copy?: boolean) => <ul className={styles.marqueeRow} data-copy={copy || undefined}>{run.map((t, i) => <li key={i}>{t}</li>)}</ul>;
  return (
    <div className={styles.marquee}>
      <p>{label}</p>
      <ul className={styles.srOnly}>{items.map(t => <li key={t}>{t}</li>)}</ul>
      <div className={styles.marqueeViewport} aria-hidden="true">
        <div className={styles.marqueeTrack}>{row()}{row(true)}</div>
      </div>
    </div>
  );
}

/** Kicker and split heading, the opening of every section. */
export function ServiceHeading({ id, kicker, title, continuation }: { id: string; kicker: string; title: string; continuation?: string }) {
  return (
    <ScrollReveal className={styles.heading}>
      <Kicker>{kicker}</Kicker>
      <SplitHeading id={id} title={title} continuation={continuation} />
    </ScrollReveal>
  );
}

type Format = { tag: string; title: string; duration: string; description: string; fit: string; cta: string; price?: string };

/** Each card's button picks its format in the contact form below (see `LeadForm`). */
export function ServiceFormats({ id = "formatos", kicker, title, continuation, items, featured = 0, priceEmpty }: {
  id?: string; kicker: string; title: string; continuation?: string; items: Format[]; featured?: number;
  /** Shown where a format has an empty `price` (career consulting, until Gutto sets it). */
  priceEmpty?: string;
}) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <ServiceHeading id={`${id}-title`} kicker={kicker} title={title} continuation={continuation} />
      <div className={styles.formats}>
        {items.map((f, i) => (
          <ScrollReveal key={f.title} delay={i * 0.08} className={styles.format}>
            <article data-featured={i === featured || undefined}>
              <p className={styles.formatTag}>{f.tag}</p>
              <h3>{f.title}</h3>
              <p className={styles.formatDuration}>{f.duration}</p>
              {f.price !== undefined ? <p className={styles.formatPrice}>{f.price || priceEmpty}</p> : null}
              <p className={styles.formatDescription}>{f.description}</p>
              <p className={styles.formatFit}>{f.fit}</p>
              <a href="#contato" className={styles.formatCta} data-format={f.title} data-cta={`formato-${f.title}`}>{f.cta}<span aria-hidden="true">→</span></a>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

export function ServiceCases({ id = "resultados", kicker, title, continuation, cases, cta, children }: {
  id?: string; kicker: string; title: string; continuation?: string; cases: Case[]; cta: string; children?: ReactNode;
}) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <ServiceHeading id={`${id}-title`} kicker={kicker} title={title} continuation={continuation} />
      {children}
      <div className={styles.cases} data-count={cases.length}>
        {cases.map(c => (
          <WorkCard
            key={c.slug}
            href={getCaseHref(c.slug)}
            company={c.company}
            role={c.role}
            date={c.year}
            title={c.title}
            tags={c.tags}
            media={c.heroImage ? <img src={c.heroImage} alt="" loading="lazy" decoding="async" /> : undefined}
          />
        ))}
      </div>
      <div className={styles.casesCta}><PillLink href="/cases" arrow="→">{cta}</PillLink></div>
    </section>
  );
}

export function ServiceFaq({ kicker, title, items }: { kicker: string; title: string; items: Array<{ question: string; answer: string }> }) {
  return (
    <section id="faq" className={`${styles.section} ${styles.faqSection}`} aria-labelledby="faq-title">
      <div>
        <Kicker>{kicker}</Kicker>
        <SplitHeading id="faq-title" title={title} />
      </div>
      <div className={styles.faq}>
        {items.map(q => (
          <details key={q.question}>
            <summary>{q.question}<span aria-hidden="true" /></summary>
            <p>{q.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** The page's last section: the pitch on one side, the contact form on the other. */
export function ServiceClosing({ title, body, whatsappCta, contact, service, page, options, related, audience }: {
  title: string; body: string; whatsappCta: string; contact: ServiceContact;
  service: string; page: string; options: { label: string; items: string[] };
  related?: { text: string; label: string; href: string };
  /** Designers (career consulting) answer different questions than companies; their copy overrides the form's. */
  audience?: { stages: readonly string[]; copy: Partial<typeof servicesHub.form> };
}) {
  const f = { ...servicesHub.form, ...audience?.copy };
  return (
    <section id="contato" className={styles.closing} aria-labelledby="contato-title">
      <div className={styles.closingCopy}>
        <h2 id="contato-title">{title}</h2>
        <p>{body}</p>
        <p className={styles.closingAlt}>{f.alternatives}</p>
        <div className={styles.ctaRow}>
          {contact.whatsapp ? <ServiceButton href={contact.whatsapp} variant="ghost" arrow="↗" cta="fechamento-whatsapp">{whatsappCta}</ServiceButton> : null}
          <ServiceButton href={contact.mailto} variant="ghost" arrow="↗" cta="fechamento-email">{f.emailLink}</ServiceButton>
        </div>
        {related ? <p className={styles.related}>{related.text} <Link href={related.href}>{related.label} →</Link></p> : null}
      </div>
      <div className={styles.closingForm}>
        <LeadForm copy={f} stages={audience?.stages} service={service} page={page} options={options} calendlyUrl={servicesHub.calendlyUrl || undefined} />
      </div>
    </section>
  );
}

export { styles as shellStyles };

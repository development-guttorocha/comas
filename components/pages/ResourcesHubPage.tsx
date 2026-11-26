import Link from "next/link";
import type { CSSProperties } from "react";
import { SplitHeading } from "@/components/guide";
import ScrollReveal from "@/components/ScrollReveal";
import { getServiceContact, ServiceButton, ServiceHeading, ServiceShell, shellStyles } from "@/components/servicos/ServiceShell";
import { articleThemes, getArticleHref, getArticles } from "@/lib/articles";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { careerConsulting, resourceBreadcrumb, resourceList, resourcesFamily, type ResourcesHubContent } from "@/lib/resources";
import styles from "@/app/(pt)/recursos/hub.module.css";

/** The hub is neutral; each frame on the board carries its own page's color. */
const HUB_ACCENT = { color: "#f8f8f5", on: "#0b0b0b" };

/**
 * `/recursos`: the file seen zoomed out. Every resource page is a frame on a dotted board; here
 * the four frames sit side by side, each led by the question it answers, so a designer picks by
 * what they are asking, not by product name. Then how the pieces feed each other, who made them,
 * something to read, and a way to ask for the next one.
 */
export default async function ResourcesHubPage({ hub }: { hub: ResourcesHubContent }) {
  const contact = await getServiceContact(hub.closing);
  const bySlug = new Map(resourceList.map(r => [r.slug, r]));
  const all = await getArticles({ drafts: process.env.NODE_ENV !== "production" });
  const articles = [...all.filter(a => a.theme === "carreira-em-design"), ...all.filter(a => a.theme !== "carreira-em-design")].slice(0, 3);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: hub.navName,
      itemListElement: resourceList.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: r.name, url: absoluteUrl(r.href) })),
      author: { "@id": `${absoluteUrl("/")}#person`, name: SITE_NAME },
    },
    resourceBreadcrumb(hub.navName, ""),
  ];

  return (
    <ServiceShell slug="" family={resourcesFamily} name={hub.navName} links={resourceList.map(r => ({ label: r.navName, href: r.href }))}
      navCta={{ label: "Sugerir um tema", href: "#contato" }} accent={HUB_ACCENT} contact={contact} jsonLd={jsonLd}>
      {/* ─── Hero: the board zoomed out, one frame per question ─── */}
      <section className={styles.hero} aria-labelledby="hub-title">
        <div className={styles.canvas}>
          <span className={styles.boardTab} aria-hidden="true">{hub.hero.boardTab}</span>
          <div className={styles.heroCopy}>
            <div>
              <p className={shellStyles.heroKicker}>{hub.hero.kicker}</p>
              <SplitHeading as="h1" size="display" id="hub-title" title={hub.hero.title} continuation={hub.hero.continuation} className={styles.title} />
            </div>
            <div className={styles.heroText}>
              <p className={styles.intro}>{hub.hero.intro}</p>
              <p className={styles.hint}>{hub.hero.hint}</p>
            </div>
          </div>
          <ol className={styles.frames}>
            {hub.frames.map((f, i) => {
              const r = bySlug.get(f.slug)!;
              return (
                <li key={f.slug} style={{ "--frame": r.accent.color, "--frame-on": r.accent.on, "--i": i } as CSSProperties}>
                  <Link href={r.href} className={styles.frame} data-cta={`hub-${r.slug}`}>
                    <span className={styles.frameTab}>{f.tab}</span>
                    <span className={styles.frameBody}>
                      <span className={styles.mini} aria-hidden="true"><Mini slug={f.slug} /></span>
                      <span className={styles.frameText}>
                        <strong>{f.question}</strong>
                        <span>{f.line}</span>
                      </span>
                      <span className={styles.frameFoot}>
                        <small>{f.meta}</small>
                        <em>{r.name} <i aria-hidden="true">→</i></em>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ─── How the pieces feed each other ─── */}
      <section className={shellStyles.section} aria-labelledby="connect-title">
        <ServiceHeading id="connect-title" kicker={hub.connect.kicker} title={hub.connect.title} continuation={hub.connect.continuation} />
        <ol className={styles.connect}>
          {hub.connect.items.map((x, i) => <li key={x.title}><span>{String(i + 1).padStart(2, "0")}</span><h3>{x.title}</h3><p>{x.body}</p></li>)}
        </ol>
      </section>

      {/* ─── Who: the numbers the consulting page uses, without a photo ─── */}
      <section className={shellStyles.section} aria-labelledby="who-title">
        <div className={styles.who}>
          <div>
            <ServiceHeading id="who-title" kicker={hub.who.kicker} title={hub.who.title} continuation={hub.who.continuation} />
            <p className={styles.whoBody}>{hub.who.body}</p>
          </div>
          <dl className={styles.proof}>
            {careerConsulting.hero.proof.map(p => <div key={p.label}><dt>{p.value}</dt><dd>{p.label}</dd></div>)}
          </dl>
        </div>
      </section>

      {/* ─── Something to read ─── */}
      <section className={shellStyles.section} aria-labelledby="read-title">
        <ServiceHeading id="read-title" kicker={hub.articles.kicker} title={hub.articles.title} continuation={hub.articles.continuation} />
        {articles.length ? (
          <ul className={styles.reads}>
            {articles.map((a, i) => (
              <li key={a.slug}>
                <ScrollReveal delay={i * 0.08} className={styles.readWrap}>
                  <Link href={getArticleHref(a.slug)} className={styles.read} data-cta={`hub-artigo-${a.slug}`}>
                    <small>{articleThemes[a.theme].label}</small>
                    <strong>{a.title}</strong>
                    <span>{a.dek}</span>
                  </Link>
                </ScrollReveal>
              </li>
            ))}
          </ul>
        ) : null}
        <Link href="/artigos" className={styles.readAll} data-cta="hub-artigos">{hub.articles.cta} →</Link>
      </section>

      <section id="contato" className={styles.suggest} aria-labelledby="contato-title">
        <h2 id="contato-title">{hub.closing.title}</h2>
        <p>{hub.closing.body}</p>
        <div className={shellStyles.ctaRow}>
          <ServiceButton href={contact.mailto} arrow="↗" cta="hub-email">{hub.closing.emailCta}</ServiceButton>
          {contact.whatsapp ? <ServiceButton href={contact.whatsapp} variant="ghost" arrow="↗" cta="hub-whatsapp">{hub.closing.whatsappCta}</ServiceButton> : null}
        </div>
      </section>
    </ServiceShell>
  );
}

/** A few strokes of each page's piece, as it would look in a zoomed-out file: shapes, not content. */
function Mini({ slug }: { slug: string }) {
  const box = { viewBox: "0 0 240 120", className: styles.miniSvg };
  if (slug === "trilha-de-carreira") return (
    <svg {...box}>
      <path d="M58 60H86M134 60H156M120 48L150 26M120 72L150 94" className={styles.stroke} />
      <rect x="14" y="48" width="44" height="24" rx="6" className={styles.node} />
      <rect x="86" y="48" width="48" height="24" rx="6" className={styles.nodeOn} />
      <rect x="156" y="48" width="56" height="24" rx="6" className={styles.node} />
      <rect x="150" y="14" width="62" height="24" rx="6" className={styles.node} />
      <rect x="150" y="82" width="52" height="24" rx="6" className={styles.nodeDash} />
      <circle cx="110" cy="38" r="5" className={styles.fill} />
    </svg>
  );
  if (slug === "salario-em-design") return (
    <svg {...box}>
      <path d="M16 84H224" className={styles.stroke} />
      {[16, 52, 88, 124, 160, 196, 224].map(x => <path key={x} d={`M${x} 78V90`} className={styles.stroke} />)}
      <rect x="84" y="80" width="80" height="8" rx="4" className={styles.fill} />
      <circle cx="40" cy="44" r="8" className={styles.figure} /><path d="M28 70Q40 52 52 70" className={styles.figureLine} />
      <circle cx="124" cy="36" r="10" className={styles.figureOn} /><path d="M108 70Q124 46 140 70" className={styles.figureOnLine} />
      <circle cx="200" cy="44" r="8" className={styles.figure} /><path d="M188 70Q200 52 212 70" className={styles.figureLine} />
    </svg>
  );
  if (slug === "pesquisa-salarial") return (
    <svg {...box}>
      <rect x="64" y="8" width="112" height="112" rx="6" className={styles.paper} transform="rotate(-3 120 64)" />
      <g transform="rotate(-3 120 64)">
        <path d="M78 26H138" className={styles.paperInk} />
        {[46, 62, 78, 94].map((y, i) => <g key={y}><path d={`M78 ${y}H104`} className={styles.paperLine} /><path d={`M112 ${y}H${i === 0 ? 160 : 140}`} className={i === 0 ? styles.paperAccent : styles.paperLine} /></g>)}
      </g>
    </svg>
  );
  return (
    <svg {...box}>
      <path d="M20 60H196" className={styles.stroke} />
      {[20, 64, 108, 152].map((x, i) => <circle key={x} cx={x} cy="60" r="7" className={i ? styles.dot : styles.dotOpen} />)}
      <circle cx="196" cy="60" r="9" className={styles.fill} />
      {[0, 1, 2, 3, 4, 5].map(n => <rect key={n} x={210 + (n % 3) * 7} y={44 + Math.floor(n / 3) * 7} width="7" height="7" className={(n + Math.floor(n / 3)) % 2 ? styles.flagDark : styles.flagLight} />)}
      <rect x="210" y="44" width="21" height="14" className={styles.flagEdge} />
    </svg>
  );
}

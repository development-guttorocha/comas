import Link from "next/link";
import { SplitHeading } from "@/components/guide";
import { getServiceContact, ServiceShell, shellStyles } from "@/components/servicos/ServiceShell";
import { resourcesHub } from "@/lib/resources";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { servicesHub } from "@/lib/services";
import { termsOfUse } from "@/lib/termsOfUse";
import styles from "@/app/(pt)/termos-de-uso/termos.module.css";

/**
 * `/termos-de-uso`: Terms of use, legal disclaimer for the salary calculator / CLT x PJ tools,
 * anonymous survey data license, LGPD rights, and portfolio IP notice.
 */
export default async function TermsOfUsePage() {
  const contact = await getServiceContact({
    emailSubject: "Termos de uso e privacidade",
    whatsappMessage: "Oi, Gutto! Tenho uma dúvida sobre os termos de uso do site.",
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: termsOfUse.seoTitle,
    description: termsOfUse.seoDescription,
    url: absoluteUrl("/termos-de-uso"),
    inLanguage: "pt-BR",
    author: { "@id": `${absoluteUrl("/")}#person`, name: SITE_NAME },
  };

  return (
    <ServiceShell
      slug=""
      trackAs="termos-de-uso"
      name="Termos de uso"
      accent={{ color: "#f8f8f5", on: "#0b0b0b" }}
      contact={contact}
      jsonLd={jsonLd}
      links={[
        { label: servicesHub.navName, href: "/servicos" },
        { label: resourcesHub.navName, href: "/recursos" },
        { label: "Salário em design", href: "/recursos/salario-em-design" },
        { label: "Pesquisa salarial", href: "/recursos/pesquisa-salarial" },
      ]}
      navCta={{ label: "Ver portfólio", href: "/" }}
    >
      <header className={styles.hero}>
        <p className={shellStyles.heroKicker}>{termsOfUse.kicker}</p>
        <SplitHeading
          as="h1"
          size="display"
          id="termos-title"
          title={termsOfUse.title}
          continuation={termsOfUse.continuation}
          className={styles.title}
        />
        <p className={styles.intro}>{termsOfUse.intro}</p>
      </header>

      <section className={styles.summary} aria-labelledby="termos-resumo">
        <h2 id="termos-resumo">{termsOfUse.summaryTitle}</h2>
        <ul>
          {termsOfUse.summary.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className={styles.sections}>
        {termsOfUse.sections.map(section => (
          <section key={section.id} id={section.id} className={styles.clause} aria-labelledby={`sec-${section.id}`}>
            <div className={styles.clauseHead}>
              <span className={styles.clauseNum}>{section.number}</span>
              <h2 id={`sec-${section.id}`}>{section.title}</h2>
            </div>
            <div className={styles.clauseBody}>
              {section.paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <aside className={styles.closingNote}>
        <p>{termsOfUse.contactPrompt}</p>
        <Link href="/fale-comigo?assunto=outro">{termsOfUse.contactCta} →</Link>
      </aside>
    </ServiceShell>
  );
}

import LeadForm from "@/components/servicos/LeadForm";
import { getServiceContact, ServiceButton, ServiceShell, shellStyles as shell } from "@/components/servicos/ServiceShell";
import { CONTACT_TOPICS } from "@/lib/leadOptions";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { resourcesHub } from "@/lib/resources";
import { servicesHub } from "@/lib/services";

export const contactFormCopy = {
  title: "Fale comigo | Gutto Rocha",
  description: "Mande uma mensagem para Gutto Rocha: design para a sua empresa, consultoria de carreira, materiais para designers ou um artigo que você leu.",
};

/**
 * `/fale-comigo`: where every "contato" of the three fronts leads, so nobody lands on a bare
 * e-mail address. One open form (name, e-mail, topic, message); `?assunto=` picks the topic
 * from the page the person came from.
 */
export default async function ContactFormPage() {
  const contact = await getServiceContact({ emailSubject: "Contato pelo site", whatsappMessage: "Oi, Gutto! Vim pelo seu site e queria conversar." });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: contactFormCopy.title,
    description: contactFormCopy.description,
    url: absoluteUrl("/fale-comigo"),
    inLanguage: "pt-BR",
    about: { "@id": `${absoluteUrl("/")}#person`, name: SITE_NAME },
  };
  const copy = { ...servicesHub.form, email: "E-mail", message: "Mensagem", messageHint: "", sentBodyNoCalendar: "Leio com calma e respondo por e-mail em breve." };

  return (
    <ServiceShell slug="" trackAs="fale-comigo" name="Fale comigo" accent={{ color: "#f8f8f5", on: "#0b0b0b" }} contact={contact} jsonLd={jsonLd}
      links={[{ label: servicesHub.navName, href: "/servicos" }, { label: resourcesHub.navName, href: "/recursos" }, { label: "Artigos", href: "/artigos" }]}
      navCta={{ label: "Ver portfólio", href: "/" }}>
      <section id="contato" className={shell.closing} aria-labelledby="contato-title">
        <div className={shell.closingCopy}>
          <h1 id="contato-title">Me conta o que você precisa.</h1>
          <p>Um time de design para organizar, uma dúvida de carreira, um artigo que você quer discutir ou uma ideia que ainda não tem nome. Leio cada mensagem e respondo por e-mail.</p>
          <p className={shell.closingAlt}>{servicesHub.form.alternatives}</p>
          <div className={shell.ctaRow}>
            {contact.whatsapp ? <ServiceButton href={contact.whatsapp} variant="ghost" arrow="↗" cta="contato-whatsapp">Chamar no WhatsApp</ServiceButton> : null}
            {contact.linkedin ? <ServiceButton href={contact.linkedin} variant="ghost" arrow="↗" cta="contato-linkedin">LinkedIn</ServiceButton> : null}
          </div>
        </div>
        <div className={shell.closingForm}>
          {/* No scheduler here: an open call is booked from a service page, after the context is clear. */}
          <LeadForm open copy={copy} arrivalChoice={{ param: "assunto", labels: Object.fromEntries(CONTACT_TOPICS.map(t => [t.key, t.label])) }} service="Contato pelo site" page="/fale-comigo"
            options={{ label: "Assunto", items: CONTACT_TOPICS.map(t => t.label) }} />
        </div>
      </section>
    </ServiceShell>
  );
}

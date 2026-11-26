import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/LogoMark";
import { ContactLink, FooterLink } from "@/components/servicos/FooterLinks";
import { articleThemes } from "@/lib/articleTaxonomy";
import { getPageContent } from "@/lib/pages/store";
import type { ContactContent } from "@/lib/pages/schemas";
import { resourceList, resourcesHub } from "@/lib/resources";
import { serviceList, servicesHub } from "@/lib/services";
import styles from "@/app/(pt)/servicos/service-shell.module.css";

/** The three fronts and the portfolio, each column headed by its hub, so every page leads to the others. */
const columns = [
  { label: servicesHub.navName, href: "/servicos", items: serviceList.map(s => ({ label: s.navName, href: s.href })) },
  { label: resourcesHub.navName, href: "/recursos", items: resourceList.map(r => ({ label: r.navName, href: r.href })) },
  { label: "Artigos", href: "/artigos", items: Object.entries(articleThemes).map(([key, t]) => ({ label: t.label, href: `/artigos?tema=${key}` })) },
  { label: "Gutto Rocha", href: "/", items: [{ label: "Cases", href: "/cases" }, { label: "Sobre", href: "/sobre" }, { label: "Currículo", href: "/curriculo" }] },
];

const icons: Record<string, ReactNode> = {
  linkedin: <path d="M6.5 9.5v8M6.5 6.5v.01M10.5 17.5v-4.5a2.5 2.5 0 0 1 5 0v4.5M10.5 9.5v8M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5v.01" /></>,
  dribbble: <><circle cx="12" cy="12" r="9" /><path d="M8.5 3.7C13 9 15 14.5 15.8 20.2M3.1 10.6c5.4.4 10.6-1 14.6-4.6M5.6 18.4c3.5-4.6 8.6-6 15.3-4.4" /></>,
  whatsapp: <><path d="M3.5 20.5 5 15.9A8.5 8.5 0 1 1 8.2 19l-4.7 1.5Z" /><path d="M9 8.5c0 3.3 3.2 6.5 6.5 6.5l1-1.7-2-1-1 1c-1.2-.4-2.4-1.6-2.8-2.8l1-1-1-2L9 8.5Z" /></>,
};

/**
 * The footer the three fronts share (services, designer resources, articles): a way to start a
 * conversation, a column per front so readers cross from one to the other, the social channels,
 * and the name set large at the bottom. Contact always goes to a form, never to the e-mail.
 */
export default async function ServiceFooter({ whatsapp }: { whatsapp?: string }) {
  const contact = await getPageContent<ContactContent>("contato", "pt");
  const social = contact.channels
    .filter(c => c.href.startsWith("http"))
    .map(c => ({ label: c.label, href: c.href, icon: Object.keys(icons).find(k => c.href.includes(k)) }))
    .filter(c => c.icon);
  if (whatsapp) social.push({ label: "WhatsApp", href: whatsapp, icon: "whatsapp" });

  return (
    <footer className={styles.footer}>
      <div className={styles.footerCard}>
        <div className={styles.footerCta}>
          <div>
            <p className={styles.footerLabel}>Fale comigo</p>
            <h2>Um time para organizar, uma carreira para destravar ou uma ideia para testar?</h2>
          </div>
          <div className={styles.footerCtaActions}>
            <ContactLink className={styles.btn} cta="footer-contato">Mandar uma mensagem<span aria-hidden="true">→</span></ContactLink>
            <p>Leio com calma e respondo por e-mail.</p>
          </div>
        </div>

        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.footerName}>
              <LogoMark variant="onDark" className={styles.footerLogo} />
              <span><strong>Gutto Rocha</strong>Design para pessoas, há 18 anos.</span>
            </Link>
            <p>Design de produto, design systems e liderança. Serviços para empresas, materiais e consultoria de carreira para designers, e o que aprendi pelo caminho em artigos.</p>
            <ul className={styles.footerSocial}>
              {social.map(s => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label} data-cta={`footer-${s.icon}`}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[s.icon!]}</svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {columns.map(col => (
            <nav key={col.href} aria-label={col.label} className={styles.footerCol}>
              <p className={styles.footerHead}><FooterLink href={col.href}>{col.label}</FooterLink></p>
              <ul>{col.items.map(item => <li key={item.href}><FooterLink href={item.href}>{item.label}</FooterLink></li>)}</ul>
            </nav>
          ))}
        </div>

        <div className={styles.footerBottom}>
          <p>© {new Date().getFullYear()} Gutto Rocha · Guarulhos, SP · atendimento remoto</p>
          <div className={styles.footerBottomLinks}>
            <FooterLink href="/termos-de-uso">Termos de uso</FooterLink>
            <ContactLink cta="footer-contato-rodape">Fale comigo</ContactLink>
          </div>
        </div>
        <p className={styles.footerWordmark} aria-hidden="true">Gutto Rocha</p>
      </div>
    </footer>
  );
}

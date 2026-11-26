"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { contactHref, type ContactTopic } from "@/lib/leadOptions";

/** A footer link that marks itself when it is the page being read. */
export function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  return <Link href={href} aria-current={pathname === href ? "page" : undefined}>{children}</Link>;
}

/** What the person was reading says what they likely want to talk about. */
function topicFor(pathname: string): ContactTopic | undefined {
  if (pathname.startsWith("/servicos")) return "empresa";
  if (pathname.startsWith("/recursos/consultoria-de-carreira")) return "carreira";
  if (pathname.startsWith("/recursos")) return "recursos";
  if (pathname.startsWith("/artigos")) return "artigos";
  return undefined;
}

/**
 * The way to the contact form: the page's own form when it has one (`#contato` on the services
 * and the career consulting), otherwise `/fale-comigo` with the topic already picked.
 */
export function ContactLink({ className, cta, children }: { className?: string; cta: string; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [onPage, setOnPage] = useState(false);
  useEffect(() => setOnPage(Boolean(document.querySelector("#contato form"))), [pathname]);
  if (onPage) return <a href="#contato" className={className} data-cta={cta}>{children}</a>;
  return <Link href={contactHref(topicFor(pathname))} className={className} data-cta={cta}>{children}</Link>;
}

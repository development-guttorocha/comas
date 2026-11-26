import type { Metadata } from "next";
import ContactFormPage, { contactFormCopy } from "@/components/pages/ContactFormPage";
import { SITE_NAME } from "@/lib/seo";

const { title, description } = contactFormCopy;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/fale-comigo" },
  openGraph: { type: "website", siteName: SITE_NAME, title, description, url: "/fale-comigo", locale: "pt_BR" },
};

export default function Page() {
  return <ContactFormPage />;
}

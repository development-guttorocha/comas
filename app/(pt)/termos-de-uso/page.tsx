import type { Metadata } from "next";
import TermsOfUsePage from "@/components/pages/TermsOfUsePage";
import { SITE_NAME } from "@/lib/seo";
import { termsOfUse } from "@/lib/termsOfUse";

export const metadata: Metadata = {
  title: termsOfUse.seoTitle,
  description: termsOfUse.seoDescription,
  alternates: { canonical: "/termos-de-uso" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: termsOfUse.seoTitle,
    description: termsOfUse.seoDescription,
    url: "/termos-de-uso",
    locale: "pt_BR",
  },
};

export default function Page() {
  return <TermsOfUsePage />;
}

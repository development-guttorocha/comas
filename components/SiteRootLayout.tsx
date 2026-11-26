import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Footer from "@/components/Footer";
import PageTransitionShell from "@/components/PageTransitionShell";
import { personJsonLd, SITE_URL, websiteJsonLd } from "@/lib/seo";
import { serializeJsonLd } from "@/lib/jsonLd";
import "@/app/globals.css";
import LocaleProvider from "@/components/i18n/LocaleProvider";
import { messagesEn } from "@/lib/i18n/messages";
import { getPageContent } from "@/lib/pages/store";
import type { FooterContent, SiteContent } from "@/lib/pages/schemas";
import SiteContentProvider from "@/components/i18n/SiteContentProvider";
import type { SiteLocale } from "@/lib/siteLocale";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

/** The site's defaults: the Home's title and description, from admin → SEO. Each page sets its own. */
export async function siteRootMetadata(): Promise<Metadata> {
  const { homeTitle: title, homeDescription: description } = await getPageContent<SiteContent>("site", "pt");
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: "Gutto Rocha",
    authors: [{ name: "Gutto Rocha", url: SITE_URL }],
    creator: "Gutto Rocha",
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    title,
    description,
    openGraph: { type: "website", siteName: "Gutto Rocha", title, description, locale: "pt_BR", alternateLocale: ["en_US"] },
    twitter: { card: "summary_large_image", title, description },
  };
}

export const siteViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

/**
 * The document for one language. Portuguese (`app/(pt)`) and English (`app/en`) are separate root
 * layouts, so the language is known at build time and every page can be prerendered; switching
 * language is a full page load.
 */
export default async function SiteRootLayout({ locale, children }: { locale: SiteLocale; children: React.ReactNode }) {
  // Both languages, so the footer and the menu stay right on the not-found page, which has no route.
  const [footerPt, footerEn, sitePt, siteEn] = await Promise.all([
    getPageContent<FooterContent>("rodape", "pt"), getPageContent<FooterContent>("rodape", "en"),
    getPageContent<SiteContent>("site", "pt"), getPageContent<SiteContent>("site", "en"),
  ]);
  const site = locale === "en" ? siteEn : sitePt;
  return (
    <html
      lang={locale === "en" ? "en" : "pt-BR"}
      data-scroll-behavior="smooth"
      className={dmSans.variable}
      suppressHydrationWarning
    >
      {/* eslint-disable-next-line @next/next/no-head-element -- this is the root layout, shared by app/(pt) and app/en */}
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd([{ ...personJsonLd, description: site.personDescription }, websiteJsonLd(locale)]) }}
        />
      </head>
      <body className="font-sans">
        <LocaleProvider locale={locale} messages={messagesEn}>
          <SiteContentProvider content={{ pt: sitePt, en: siteEn }}>
            <PageTransitionShell>
              {children}
              <Footer content={{ pt: footerPt, en: footerEn }} />
            </PageTransitionShell>
          </SiteContentProvider>
        </LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}

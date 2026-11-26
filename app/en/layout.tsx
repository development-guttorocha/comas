import type { ReactNode } from "react";
import SiteRootLayout, { siteRootMetadata, siteViewport } from "@/components/SiteRootLayout";
import { sitePageMetadata } from "@/lib/i18n/metadata";

// The site's defaults, then the English Home's (each key replaces the default, as nested layouts do).
export const generateMetadata = async () => ({ ...(await siteRootMetadata()), ...(await sitePageMetadata("home", "en")) });
export const viewport = siteViewport;

/** The English site's root layout: `<html lang="en">` from the route, so its pages prerender. */
export default function EnRootLayout({ children }: { children: ReactNode }) {
  return (
    <SiteRootLayout locale="en">
      <div lang="en" className="min-w-0">
        {children}
      </div>
    </SiteRootLayout>
  );
}

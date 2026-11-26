import type { Metadata } from "next";
import SiteRootLayout, { siteViewport } from "@/components/SiteRootLayout";
import NotFound from "@/app/(pt)/not-found";

/** Addresses no route matches: with two root layouts (pt, en) there is no single layout to hold them. */
export const metadata: Metadata = { title: "Página não encontrada · Gutto Rocha", robots: { index: false, follow: true } };
export const viewport = siteViewport;

export default function GlobalNotFound() {
  return (
    <SiteRootLayout locale="pt">
      <NotFound />
    </SiteRootLayout>
  );
}

import SiteRootLayout, { siteRootMetadata, siteViewport } from "@/components/SiteRootLayout";

// The share images (opengraph-image.tsx) live outside this group, under app/: inside a route group
// Next adds a hash to their address, and the pages link to the plain `<page>/opengraph-image`.
export const generateMetadata = siteRootMetadata;
export const viewport = siteViewport;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteRootLayout locale="pt">{children}</SiteRootLayout>;
}

import type { Metadata } from "next";
import ArticlesHubPage, { articlesHubCopy } from "@/components/pages/ArticlesHubPage";
import { SITE_NAME } from "@/lib/seo";

const { title, description } = articlesHubCopy;
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/artigos" },
  openGraph: { type: "website", siteName: SITE_NAME, title, description, url: "/artigos", locale: "pt_BR", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: title }] },
  twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
};

export default function Page() { return <ArticlesHubPage />; }

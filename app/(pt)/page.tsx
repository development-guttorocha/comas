import PageContent from "@/components/pages/HomePage";
import { sitePageMetadata } from "@/lib/i18n/metadata";
export const generateMetadata = () => sitePageMetadata("home", "pt");
export default function Page() { return <PageContent locale="pt" />; }

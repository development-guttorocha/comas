import PageContent from "@/components/pages/StoryPage";
import { sitePageMetadata } from "@/lib/i18n/metadata";
export const generateMetadata = () => sitePageMetadata("sobre", "pt");
export default function Page() { return <PageContent locale="pt" />; }

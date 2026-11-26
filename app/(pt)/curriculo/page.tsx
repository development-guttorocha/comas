import PageContent from "@/components/pages/CurriculumPage";
import { sitePageMetadata } from "@/lib/i18n/metadata";
export const generateMetadata = () => sitePageMetadata("curriculo", "pt");
export default function Page() { return <PageContent locale="pt" />; }

import CasesPage from "@/components/pages/CasesPage";
import { sitePageMetadata } from "@/lib/i18n/metadata";
export const generateMetadata = () => sitePageMetadata("cases", "en");
export default function Page() { return <CasesPage locale="en" />; }

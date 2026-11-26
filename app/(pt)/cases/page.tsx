import CasesPage from "@/components/pages/CasesPage";
import { sitePageMetadata } from "@/lib/i18n/metadata";
export const generateMetadata = () => sitePageMetadata("cases", "pt");
export default function Page() { return <CasesPage locale="pt" />; }

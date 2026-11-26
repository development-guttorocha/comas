import ContactPage from "@/components/pages/ContactPage";
import { sitePageMetadata } from "@/lib/i18n/metadata";
export const generateMetadata = () => sitePageMetadata("contato", "en");
export default function Page() { return <ContactPage locale="en" />; }

import ServicesHubPage from "@/components/pages/ServicesHubPage";
import { serviceMetadata, servicesHub } from "@/lib/services";

export const metadata = serviceMetadata(servicesHub);
export default function Page() { return <ServicesHubPage hub={servicesHub} />; }

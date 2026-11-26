import ServicePage from "@/components/pages/ServicePage";
import { headDeDesign, serviceMetadata } from "@/lib/services";

export const metadata = serviceMetadata(headDeDesign);
export default function Page() { return <ServicePage service={headDeDesign} />; }

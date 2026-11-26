import DesignSystemPage from "@/components/pages/DesignSystemPage";
import { designSystem, serviceMetadata } from "@/lib/services";

export const metadata = serviceMetadata(designSystem);
export default function Page() { return <DesignSystemPage service={designSystem} />; }

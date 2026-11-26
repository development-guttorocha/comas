import ResourcesHubPage from "@/components/pages/ResourcesHubPage";
import { resourceMetadata, resourcesHub } from "@/lib/resources";

export const metadata = resourceMetadata(resourcesHub);
export default function Page() { return <ResourcesHubPage hub={resourcesHub} />; }

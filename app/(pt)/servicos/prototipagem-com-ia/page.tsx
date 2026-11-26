import AiPrototypingPage from "@/components/pages/AiPrototypingPage";
import { aiPrototyping, serviceMetadata } from "@/lib/services";

export const metadata = serviceMetadata(aiPrototyping);
export default function Page() { return <AiPrototypingPage service={aiPrototyping} />; }

import CareerConsultingPage from "@/components/pages/CareerConsultingPage";
import { careerConsulting, resourceMetadata } from "@/lib/resources";

export const metadata = resourceMetadata(careerConsulting);
export default function Page() { return <CareerConsultingPage page={careerConsulting} />; }

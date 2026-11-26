import CareerTrackPage from "@/components/pages/CareerTrackPage";
import { careerTrack, resourceMetadata } from "@/lib/resources";

export const metadata = resourceMetadata(careerTrack);
export default function Page() { return <CareerTrackPage page={careerTrack} />; }

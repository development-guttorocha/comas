import SalarySurveyPage from "@/components/pages/SalarySurveyPage";
import { resourceMetadata, salarySurvey } from "@/lib/resources";

export const revalidate = 300;
export const metadata = resourceMetadata(salarySurvey);
export default function Page() { return <SalarySurveyPage page={salarySurvey} />; }

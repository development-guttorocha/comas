import SalaryGuidePage from "@/components/pages/SalaryGuidePage";
import { resourceMetadata, salaryGuide } from "@/lib/resources";

export const revalidate = 300;
export const metadata = resourceMetadata(salaryGuide);
export default function Page() { return <SalaryGuidePage page={salaryGuide} />; }

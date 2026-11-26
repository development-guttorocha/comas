import CareerKitAuthScreen from "@/components/recursos/CareerKitAuthScreen";
import CareerTrackKit from "@/components/recursos/CareerTrackKit";
import type { ServiceContact } from "@/components/servicos/ServiceShell";
import type { CareerKitSession } from "@/lib/careerKitAuth";
import type { CareerKitWorkbook } from "@/lib/careerKitWorkbook";
import type { CareerConsultingContent, CareerTrackContent } from "@/lib/resources";

/**
 * `/recursos/trilha-de-carreira/completa`:
 * Shows the 6-digit e-mail token login screen when unauthenticated, and the interactive
 * cloud-saved 4-module Career Clarity Kit once verified.
 */
export default function CareerTrackMaterial({
  page,
  consulting,
  contact,
  session,
  workbook,
}: {
  page: CareerTrackContent;
  consulting: CareerConsultingContent;
  contact: ServiceContact;
  session: CareerKitSession | null;
  workbook: CareerKitWorkbook | null;
}) {
  if (!session || !workbook) {
    return <CareerKitAuthScreen page={page} consulting={consulting} />;
  }

  return (
    <CareerTrackKit
      user={session.user}
      initialWorkbook={workbook}
      track={page}
      consulting={consulting}
      contact={contact}
    />
  );
}

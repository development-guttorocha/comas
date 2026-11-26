import type { Metadata } from "next";
import CareerTrackMaterial from "@/components/pages/CareerTrackMaterial";
import { getServiceContact } from "@/components/servicos/ServiceShell";
import { getCurrentCareerKitSession, loadCareerWorkbook } from "@/lib/careerKitAuth";
import { careerConsulting, careerTrack } from "@/lib/resources";

export const dynamic = "force-dynamic";

// Private interactive material opened after e-mail OTP verification: kept out of search indexing.
export const metadata: Metadata = {
  title: `${careerTrack.material.title} | Gutto Rocha`,
  robots: { index: false, follow: true },
};

export default async function Page() {
  const [session, contact] = await Promise.all([
    getCurrentCareerKitSession(),
    getServiceContact(careerConsulting.closing),
  ]);

  const workbook = session ? await loadCareerWorkbook(session.user.id) : null;

  return (
    <CareerTrackMaterial
      page={careerTrack}
      consulting={careerConsulting}
      contact={contact}
      session={session}
      workbook={workbook}
    />
  );
}

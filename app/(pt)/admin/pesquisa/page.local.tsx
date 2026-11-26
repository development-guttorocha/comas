import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import AdminSurvey from "@/components/admin/AdminSurvey";
import { buildAdminSurveyPayload } from "@/lib/admin/salarySurveyAdmin";
import { translationAdminAvailable } from "@/lib/translations/access";

export const metadata: Metadata = {
  title: "Pesquisa salarial · Admin · Gutto Rocha",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminSurveyPage() {
  if (!translationAdminAvailable((await headers()).get("host"))) notFound();
  return <AdminSurvey initial={await buildAdminSurveyPayload("pending")} />;
}

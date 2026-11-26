import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import AdminLeads from "@/components/admin/AdminLeads";
import { buildAdminLeadsPayload } from "@/lib/admin/leadsAdmin";
import { translationAdminAvailable } from "@/lib/translations/access";

export const metadata: Metadata = {
  title: "Contatos · Admin · Gutto Rocha",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  if (!translationAdminAvailable((await headers()).get("host"))) notFound();
  return <AdminLeads initial={await buildAdminLeadsPayload({ status: "new", kind: "all" })} />;
}

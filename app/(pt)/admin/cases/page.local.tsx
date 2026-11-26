import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import AdminHome from "@/components/admin/AdminHome";
import { loadOverview } from "@/lib/admin/overview";
import { translationAdminAvailable } from "@/lib/translations/access";

export const metadata: Metadata = { title: "Cases · Admin · Gutto Rocha", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!translationAdminAvailable((await headers()).get("host"))) notFound();
  return <AdminHome {...await loadOverview()} />;
}

import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import AdminScreenDesign from "@/components/admin/AdminScreenDesign";
import { translationAdminAvailable } from "@/lib/translations/access";

export const metadata: Metadata = { title: "Figma · Admin · Gutto Rocha", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminScreenDesignPage() {
  if (!translationAdminAvailable((await headers()).get("host"))) notFound();
  return <AdminScreenDesign />;
}

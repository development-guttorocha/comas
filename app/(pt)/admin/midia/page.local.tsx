import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import AdminGallery from "@/components/admin/AdminGallery";
import { translationAdminAvailable } from "@/lib/translations/access";

export const metadata: Metadata = { title: "Mídia · Admin · Gutto Rocha", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  if (!translationAdminAvailable((await headers()).get("host"))) notFound();
  return <AdminGallery />;
}

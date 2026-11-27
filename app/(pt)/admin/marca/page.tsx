import type { Metadata } from "next";
import AdminSocialBrand from "@/components/admin/AdminSocialBrand";
import { requireSocialSession } from "@/lib/social/auth";

export const metadata: Metadata = {
  title: "Marca · Admin · Comas",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminMarcaPage() {
  await requireSocialSession("/admin/marca");
  return <AdminSocialBrand />;
}

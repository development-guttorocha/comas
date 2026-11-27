import type { Metadata } from "next";
import AdminSocialMedia from "@/components/admin/AdminSocialMedia";
import { requireSocialSession } from "@/lib/social/auth";

export const metadata: Metadata = {
  title: "Mídia · Admin · Texto em Ciclo",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  await requireSocialSession("/admin/midia");
  return <AdminSocialMedia />;
}

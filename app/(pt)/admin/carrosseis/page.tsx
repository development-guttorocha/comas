import type { Metadata } from "next";
import AdminSocialPosts from "@/components/admin/AdminSocialPosts";
import { requireSocialSession } from "@/lib/social/auth";

export const metadata: Metadata = {
  title: "Carrosséis · Admin · Texto em Ciclo",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminCarrosseisPage() {
  await requireSocialSession("/admin/carrosseis");
  return <AdminSocialPosts />;
}

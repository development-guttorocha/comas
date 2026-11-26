import type { Metadata } from "next";
import AdminSocialPosts from "@/components/admin/AdminSocialPosts";

export const metadata: Metadata = {
  title: "Carrosséis · Admin · Texto em Ciclo",
  robots: { index: false, follow: false },
};

export default function AdminCarrosseisPage() {
  return <AdminSocialPosts />;
}

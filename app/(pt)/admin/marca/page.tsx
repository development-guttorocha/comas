import type { Metadata } from "next";
import AdminSocialBrand from "@/components/admin/AdminSocialBrand";

export const metadata: Metadata = {
  title: "Marca · Admin · Texto em Ciclo",
  robots: { index: false, follow: false },
};

export default function AdminMarcaPage() {
  return <AdminSocialBrand />;
}

import type { Metadata } from "next";
import AdminStudioList from "@/components/admin/studio/AdminStudioList";

export const metadata: Metadata = {
  title: "Estúdio · Admin · Texto em Ciclo",
  robots: { index: false, follow: false },
};

export default function AdminEstudioPage() {
  return <AdminStudioList />;
}

import type { Metadata } from "next";
import SocialPostEditor from "@/components/admin/SocialPostEditor";

export const metadata: Metadata = {
  title: "Editor de Carrossel · Admin · Texto em Ciclo",
  robots: { index: false, follow: false },
};

export default async function AdminCarrosselEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SocialPostEditor id={id} />;
}

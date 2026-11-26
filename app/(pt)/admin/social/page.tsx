import type { Metadata } from "next";
import SocialStudio from "@/components/social/SocialStudio";

export const metadata: Metadata = {
  title: "Social Studio · Admin · Texto em Ciclo",
  description: "Gerador de carrosséis e conteúdo editorial para Texto em Ciclo.",
  robots: { index: false, follow: false },
};

export default async function AdminSocialPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  return <SocialStudio initialPostId={params.id} />;
}

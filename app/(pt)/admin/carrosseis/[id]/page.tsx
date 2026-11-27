import type { Metadata } from "next";
import SocialPostEditor from "@/components/admin/SocialPostEditor";
import { requireSocialSession } from "@/lib/social/auth";

export const metadata: Metadata = {
  title: "Editor de Carrossel · Admin · Comas",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminCarrosselEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSocialSession(`/admin/carrosseis/${encodeURIComponent(id)}`);
  return <SocialPostEditor id={id} />;
}

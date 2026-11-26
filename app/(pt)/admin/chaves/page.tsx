import type { Metadata } from "next";
import AdminKeys from "@/components/admin/AdminKeys";
import { listKeys } from "@/lib/admin/apiKeys";
import { requireSocialSession } from "@/lib/social/auth";

export const metadata: Metadata = {
  title: "Chaves de API · Admin · Texto em Ciclo",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminKeysPage({
  searchParams,
}: {
  searchParams: Promise<{ abrir?: string }>;
}) {
  await requireSocialSession("/admin/chaves");
  const { abrir } = await searchParams;
  return <AdminKeys initial={await listKeys()} initialOpen={abrir} />;
}

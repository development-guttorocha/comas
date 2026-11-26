import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import AdminKeys from "@/components/admin/AdminKeys";
import { listKeys } from "@/lib/admin/apiKeys";
import { translationAdminAvailable } from "@/lib/translations/access";

export const metadata: Metadata = { title: "Chaves de API · Admin · Gutto Rocha", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminKeysPage({ searchParams }: { searchParams: Promise<{ abrir?: string }> }) {
  if (!translationAdminAvailable((await headers()).get("host"))) notFound();
  const { abrir } = await searchParams;
  return <AdminKeys initial={await listKeys()} initialOpen={abrir} />;
}

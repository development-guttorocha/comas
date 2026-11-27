import type { Metadata } from "next";
import AdminKeys from "@/components/admin/AdminKeys";
import { listAccessEmails, listKeys } from "@/lib/admin/apiKeys";
import { requireSocialSession } from "@/lib/social/auth";

export const metadata: Metadata = {
  title: "Conexões e Acesso · Admin · Texto em Ciclo",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminKeysPage({
  searchParams,
}: {
  searchParams: Promise<{ abrir?: string }>;
}) {
  const session = await requireSocialSession("/admin/chaves");
  const [{ abrir }, keys, accessEmails] = await Promise.all([
    searchParams,
    listKeys(),
    listAccessEmails(),
  ]);
  return (
    <AdminKeys
      initial={keys}
      initialEmails={accessEmails}
      currentUserEmail={session.email}
      initialOpen={abrir}
    />
  );
}

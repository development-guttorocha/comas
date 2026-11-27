import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginScreen } from "@/components/admin/AdminAuthGate";
import { getSocialSession, sanitizeNextPath } from "@/lib/social/auth";

export const metadata: Metadata = {
  title: "Entrar · Admin · Comas",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, session] = await Promise.all([searchParams, getSocialSession()]);
  const nextPath = sanitizeNextPath(next);

  if (session.authenticated) {
    redirect(nextPath);
  }

  return <AdminLoginScreen initialSession={session} nextPath={nextPath} />;
}

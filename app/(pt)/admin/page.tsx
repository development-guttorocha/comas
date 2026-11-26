import { redirect } from "next/navigation";
import { isSocialAuthenticated } from "@/lib/social/auth";

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  const authenticated = await isSocialAuthenticated();
  redirect(authenticated ? "/admin/estudio" : "/admin/login");
}

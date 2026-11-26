import { moved } from "@/lib/admin/moved";

/** The admin opens on Pendências: what is left to review comes first. */
export default async function AdminIndex({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return moved("/admin/pendencias", searchParams);
}

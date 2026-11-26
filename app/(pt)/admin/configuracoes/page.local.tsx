import { moved } from "@/lib/admin/moved";

/** Old address: Configurações tinha só as Chaves e o Figma. Kept so links and bookmarks still land. */
export default async function Moved({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return moved("/admin/chaves", searchParams);
}

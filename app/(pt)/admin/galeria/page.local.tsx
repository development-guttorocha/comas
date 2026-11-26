import { moved } from "@/lib/admin/moved";

/** Old address: Galeria virou Mídia. Kept so links and bookmarks still land. */
export default async function Moved({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return moved("/admin/midia", searchParams);
}

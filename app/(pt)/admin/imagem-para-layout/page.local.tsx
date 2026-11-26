import { moved } from "@/lib/admin/moved";

/** Old address: o Figma é uma aba de Mídia. Kept so links and bookmarks still land. */
export default async function Moved({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return moved("/admin/midia/figma", searchParams);
}

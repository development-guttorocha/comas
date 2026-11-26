import { moved } from "@/lib/admin/moved";

/** Old address: a esteira vive em Site › Home. Kept so links and bookmarks still land. */
export default async function Moved({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return moved("/admin/site/home/esteira", searchParams);
}

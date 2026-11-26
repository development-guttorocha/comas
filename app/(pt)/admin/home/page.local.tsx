import { moved } from "@/lib/admin/moved";

/** Old address: a Home vive em Site. Kept so links and bookmarks still land. */
export default async function Moved({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return moved("/admin/site/home", searchParams);
}

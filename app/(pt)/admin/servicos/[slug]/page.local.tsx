import { moved } from "@/lib/admin/moved";

/** Old address: os serviços vivem em Site. Kept so links and bookmarks still land. */
export default async function Moved({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  return moved(`/admin/site/servicos/${slug}`, searchParams);
}

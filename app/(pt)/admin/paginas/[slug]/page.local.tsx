import { moved } from "@/lib/admin/moved";

/** Old address: Páginas virou Site; rodapé, menu e 404 ficam em Em todas as páginas. Kept so links and bookmarks still land. */
export default async function Moved({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  return moved(`/admin/site/${slug === "rodape" || slug === "site" ? "todas-as-paginas" : slug}`, searchParams);
}

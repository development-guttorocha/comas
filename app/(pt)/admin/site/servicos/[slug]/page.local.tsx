import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ServiceEditor from "@/components/admin/ServiceEditor";
import { readService, SERVICE_FILES } from "@/lib/admin/serviceStore";
import { getCaseDataSource } from "@/lib/caseContent";
import { translationAdminAvailable } from "@/lib/translations/access";

export const metadata: Metadata = { title: "Editar serviço · Admin · Gutto Rocha", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminServiceEditor({ params }: { params: Promise<{ slug: string }> }) {
  if (!translationAdminAvailable((await headers()).get("host"))) notFound();
  const { slug } = await params;
  const entry = SERVICE_FILES.find(f => f.slug === slug);
  if (!entry) notFound();
  const [{ values, revision }, data] = await Promise.all([readService(entry.slug), getCaseDataSource()]);
  // The cases a service can show, by slug, for the "Cases" lists.
  const cases = data.cases.filter(c => c.slug !== "modelo").map(c => ({ slug: c.slug, label: `${c.company} · ${c.slug}` }));
  return <ServiceEditor slug={entry.slug} label={entry.label} path={entry.path} values={values as Parameters<typeof ServiceEditor>[0]["values"]} revision={revision} cases={cases} />;
}

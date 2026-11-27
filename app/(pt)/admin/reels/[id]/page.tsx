import type { Metadata } from "next";
import reelTracksData from "@/content/reel-tracks.json";
import type { ReelTrack } from "@/lib/reel/tracks";
import AdminSocialReels from "@/components/admin/AdminSocialReels";
import { requireSocialSession } from "@/lib/social/auth";

export const metadata: Metadata = {
  title: "Editor de Vídeo · Admin · Comas",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminReelEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSocialSession(`/admin/reels/${encodeURIComponent(id)}`);
  return <AdminSocialReels id={id} tracks={reelTracksData as ReelTrack[]} />;
}

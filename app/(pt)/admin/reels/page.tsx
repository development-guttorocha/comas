import type { Metadata } from "next";
import reelTracksData from "@/content/reel-tracks.json";
import type { ReelTrack } from "@/lib/reel/tracks";
import AdminReelsGallery from "@/components/admin/AdminReelsGallery";
import { requireSocialSession } from "@/lib/social/auth";

export const metadata: Metadata = {
  title: "Vídeos (Reels) · Admin · Comas",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminReelsPage() {
  await requireSocialSession("/admin/reels");
  return <AdminReelsGallery tracks={reelTracksData as ReelTrack[]} />;
}

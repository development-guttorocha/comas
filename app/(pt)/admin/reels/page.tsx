import type { Metadata } from "next";
import reelTracksData from "@/content/reel-tracks.json";
import type { ReelTrack } from "@/lib/reel/tracks";
import AdminSocialReels from "@/components/admin/AdminSocialReels";

export const metadata: Metadata = {
  title: "Reels · Admin · Texto em Ciclo",
  robots: { index: false, follow: false },
};

export default function AdminReelsPage() {
  return <AdminSocialReels tracks={reelTracksData as ReelTrack[]} />;
}

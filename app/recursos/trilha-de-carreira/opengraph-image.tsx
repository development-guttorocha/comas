import { shareCard } from "@/lib/og";
import { RESOURCES_ACCENT, careerTrack } from "@/lib/resources";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = careerTrack.seoTitle;
export default function Image() {
  return shareCard({ kicker: "Design Resources", title: careerTrack.hero.title, line: "Template gratuito, de júnior a Head de Design.", accent: RESOURCES_ACCENT, footer: "guttorocha.com.br/recursos" });
}

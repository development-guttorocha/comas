import { shareCard } from "@/lib/og";
import { RESOURCES_ACCENT, careerConsulting } from "@/lib/resources";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = careerConsulting.seoTitle;
export default function Image() {
  return shareCard({ kicker: "Design Resources", title: `${careerConsulting.hero.title} ${careerConsulting.hero.continuation}`, line: careerConsulting.card.summary, accent: RESOURCES_ACCENT, footer: "guttorocha.com.br/recursos" });
}

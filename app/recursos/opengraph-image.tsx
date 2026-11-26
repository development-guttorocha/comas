import { shareCard } from "@/lib/og";
import { RESOURCES_ACCENT, resourcesHub } from "@/lib/resources";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = resourcesHub.seoTitle;
export default function Image() {
  return shareCard({ kicker: "Design Resources", title: resourcesHub.hero.title, line: "Materiais gratuitos e consultoria de carreira para designers que querem crescer na carreira.", accent: RESOURCES_ACCENT, footer: "guttorocha.com.br/recursos" });
}

import { shareCard } from "@/lib/og";
import { RESOURCES_ACCENT, salarySurvey } from "@/lib/resources";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = salarySurvey.seoTitle;
export default function Image() {
  return shareCard({ kicker: "Design Resources", title: salarySurvey.hero.title, line: "Pesquisa anônima. Responda em 2 minutos.", accent: RESOURCES_ACCENT, footer: "guttorocha.com.br/recursos" });
}

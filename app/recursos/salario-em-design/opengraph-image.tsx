import { shareCard } from "@/lib/og";
import { RESOURCES_ACCENT, salaryGuide } from "@/lib/resources";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = salaryGuide.seoTitle;
export default function Image() {
  return shareCard({ kicker: "Design Resources", title: `${salaryGuide.hero.title} ${salaryGuide.hero.continuation}`, line: "CLT x PJ, faixas e quando pedir aumento.", accent: RESOURCES_ACCENT, footer: "guttorocha.com.br/recursos" });
}

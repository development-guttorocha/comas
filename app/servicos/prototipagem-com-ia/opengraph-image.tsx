import ServiceOgImage from "@/components/servicos/ServiceOgImage";
import { aiPrototyping } from "@/lib/services";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = aiPrototyping.seoTitle;
export default function Image() {
  return ServiceOgImage({ title: aiPrototyping.serviceName, line: aiPrototyping.card.summary, accent: aiPrototyping.accent.color, onAccent: aiPrototyping.accent.on });
}

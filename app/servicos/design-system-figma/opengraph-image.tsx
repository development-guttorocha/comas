import ServiceOgImage from "@/components/servicos/ServiceOgImage";
import { designSystem } from "@/lib/services";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = designSystem.seoTitle;
export default function Image() {
  return ServiceOgImage({ title: designSystem.serviceName, line: designSystem.card.summary, accent: designSystem.accent.color, onAccent: designSystem.accent.on });
}
